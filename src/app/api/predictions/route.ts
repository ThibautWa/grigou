// app/api/predictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, format } from 'date-fns';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';

interface RecurringTransaction {
  id: number;
  type: 'income' | 'outcome';
  amount: string;
  description: string;
  category: string | null;
  date: string;
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
  recurrence_end_date: string | null;
}

function getNextOccurrence(startDate: Date, recurrenceType: string): Date {
  switch (recurrenceType) {
    case 'daily':
      return addDays(startDate, 1);
    case 'weekly':
      return addWeeks(startDate, 1);
    case 'biweekly':
      return addWeeks(startDate, 2);
    case 'monthly':
      return addMonths(startDate, 1);
    case 'bimonthly':
      return addMonths(startDate, 2);
    case 'quarterly':
      return addMonths(startDate, 3);
    case 'yearly':
      return addYears(startDate, 1);
    default:
      return addMonths(startDate, 1);
  }
}

function generatePredictions(transaction: RecurringTransaction, endDate: Date): any[] {
  const predictions = [];
  let currentDate = new Date(transaction.date);
  const maxDate = transaction.recurrence_end_date
    ? new Date(transaction.recurrence_end_date)
    : endDate;

  const limitDate = isBefore(maxDate, endDate) ? maxDate : endDate;

  while (true) {
    currentDate = getNextOccurrence(currentDate, transaction.recurrence_type);

    if (isAfter(currentDate, limitDate)) {
      break;
    }

    predictions.push({
      id: `predicted-${transaction.id}-${currentDate.getTime()}`,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      date: format(currentDate, 'yyyy-MM-dd'),
      is_predicted: true,
      original_transaction_id: transaction.id,
    });
  }

  return predictions;
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    let userId: number;
    try {
      userId = await requireUserId();
    } catch (error) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    // Vérifier l'accès au wallet
    const hasAccess = await canReadWallet(parseInt(walletId), userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès au wallet refusé' },
        { status: 403 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const oldestRecurringResult = await pool.query(
      `SELECT MIN(date) as oldest_date 
       FROM transactions 
       WHERE wallet_id = $1 AND is_recurring = true`,
      [parseInt(walletId)]
    );

    const oldestRecurringDate = oldestRecurringResult.rows[0]?.oldest_date || startDate;

    const result = await pool.query<RecurringTransaction>(
      `SELECT * FROM transactions 
       WHERE wallet_id = $1
       AND is_recurring = TRUE 
       AND date <= $2
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= $3)
       ORDER BY date ASC`,
      [parseInt(walletId), endDate, oldestRecurringDate]
    );

    const recurringTransactions = result.rows;
    let allPredictions: any[] = [];

    for (const transaction of recurringTransactions) {
      const predictions = generatePredictions(transaction, endDateObj);
      allPredictions = [...allPredictions, ...predictions];
    }

    const filteredPredictions = allPredictions.filter(pred => {
      const predDate = new Date(pred.date);
      return predDate >= startDateObj && predDate <= endDateObj;
    });

    filteredPredictions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(filteredPredictions);
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des prédictions' },
      { status: 500 }
    );
  }
}
