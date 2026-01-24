import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, format } from 'date-fns';

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

function getNextOccurrence(
  startDate: Date,
  recurrenceType: string
): Date {
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

function generatePredictions(
  transaction: RecurringTransaction,
  endDate: Date
): any[] {
  const predictions = [];
  let currentDate = new Date(transaction.date);
  const maxDate = transaction.recurrence_end_date
    ? new Date(transaction.recurrence_end_date)
    : endDate;

  // Limiter à la date la plus proche (recurrence_end_date ou endDate)
  const limitDate = isBefore(maxDate, endDate) ? maxDate : endDate;

  // Générer les occurrences futures
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
  console.log('Generated predictions:', predictions);
  return predictions;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Récupérer la date la plus ancienne des transactions récurrentes
    const oldestRecurringResult = await pool.query(
      `SELECT MIN(date) as oldest_date 
       FROM transactions 
       WHERE is_recurring = true`
    );
    
    const oldestRecurringDate = oldestRecurringResult.rows[0]?.oldest_date || startDate;

    // Récupérer TOUTES les transactions récurrentes actives
    // en utilisant la date la plus ancienne comme référence
    const result = await pool.query<RecurringTransaction>(
      `SELECT * FROM transactions 
       WHERE is_recurring = TRUE 
       AND date <= $1
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= $2)
       ORDER BY date ASC`,
      [endDate, oldestRecurringDate]  // ✅ Utilisation de la date la plus ancienne
    );

    console.log('Date range:', startDate, 'to', endDate);
    console.log('Oldest recurring date:', oldestRecurringDate);
    console.log('Recurring transactions found:', result.rows.length);

    const recurringTransactions = result.rows;
    let allPredictions: any[] = [];

    // Générer les prédictions pour chaque transaction récurrente
    for (const transaction of recurringTransactions) {
      const predictions = generatePredictions(transaction, endDateObj);
      allPredictions = [...allPredictions, ...predictions];
    }

    // Filtrer uniquement par la période demandée
    const filteredPredictions = allPredictions.filter(pred => {
      const predDate = new Date(pred.date);
      return predDate >= startDateObj && predDate <= endDateObj;
    });

    // Trier par date
    filteredPredictions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Predictions generated:', filteredPredictions.length);

    return NextResponse.json(filteredPredictions);
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des prédictions' },
      { status: 500 }
    );
  }
}