// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, format } from 'date-fns';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';

// ============================================
// Logique de prédictions intégrée directement
// ============================================

interface RecurringTransaction {
  id: number;
  type: 'income' | 'outcome';
  amount: string;
  description: string | null;
  category_id: number | null;
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

function generatePredictionsForTransaction(
  transaction: RecurringTransaction,
  endDate: Date
): Array<{ type: 'income' | 'outcome'; amount: number; date: string }> {
  const predictions: Array<{ type: 'income' | 'outcome'; amount: number; date: string }> = [];
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
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      date: format(currentDate, 'yyyy-MM-dd'),
    });
  }

  return predictions;
}

async function getPredictions(
  walletId: number,
  startDate: string,
  endDate: string
): Promise<Array<{ type: 'income' | 'outcome'; amount: number; date: string }>> {
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(startDate);

  // Récupérer la date la plus ancienne des transactions récurrentes
  const oldestRecurringResult = await pool.query(
    `SELECT MIN(date) as oldest_date 
     FROM transactions 
     WHERE wallet_id = $1 AND is_recurring = true`,
    [walletId]
  );

  const oldestRecurringDate = oldestRecurringResult.rows[0]?.oldest_date || startDate;

  // Récupérer les transactions récurrentes
  const result = await pool.query<RecurringTransaction>(
    `SELECT * FROM transactions 
     WHERE wallet_id = $1
     AND is_recurring = TRUE 
     AND date <= $2
     AND (recurrence_end_date IS NULL OR recurrence_end_date >= $3)
     ORDER BY date ASC`,
    [walletId, endDate, oldestRecurringDate]
  );

  const recurringTransactions = result.rows;
  let allPredictions: Array<{ type: 'income' | 'outcome'; amount: number; date: string }> = [];

  for (const transaction of recurringTransactions) {
    const predictions = generatePredictionsForTransaction(transaction, endDateObj);
    allPredictions = [...allPredictions, ...predictions];
  }

  // Filtrer par date de début
  const filteredPredictions = allPredictions.filter(pred => {
    const predDate = new Date(pred.date);
    return predDate >= startDateObj && predDate <= endDateObj;
  });

  return filteredPredictions;
}

// ============================================
// Route principale
// ============================================

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
    const includePredictions = searchParams.get('includePredictions') === 'true';
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    const walletIdNum = parseInt(walletId);

    // Vérifier l'accès au wallet
    const hasAccess = await canReadWallet(walletIdNum, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès au wallet refusé' },
        { status: 403 }
      );
    }

    let params: any[] = [walletIdNum];
    let whereClause = 'WHERE wallet_id = $1';

    if (startDate && endDate) {
      whereClause += ' AND date >= $2 AND date <= $3';
      params.push(startDate, endDate);
    }

    // Get total income and outcome for the selected period
    const totalsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
      FROM transactions
      ${whereClause}
    `;

    const totalsResult = await pool.query(totalsQuery, params);
    const totals = totalsResult.rows[0];

    let periodIncome = parseFloat(totals.total_income);
    let periodOutcome = parseFloat(totals.total_outcome);

    // Calculate cumulative balance
    let cumulativeBalance = 0;
    let cumulativeIncome = 0;
    let cumulativeOutcome = 0;

    if (endDate) {
      const walletQuery = `SELECT initial_balance FROM wallets WHERE id = $1`;
      const walletResult = await pool.query(walletQuery, [walletIdNum]);
      const initialBalance = walletResult.rows[0] ? parseFloat(walletResult.rows[0].initial_balance) : 0;

      const allTransactionsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
        FROM transactions
        WHERE wallet_id = $1 AND date <= $2
      `;
      const allTransactionsResult = await pool.query(allTransactionsQuery, [walletIdNum, endDate]);
      const allTotals = allTransactionsResult.rows[0];

      cumulativeIncome = parseFloat(allTotals.total_income);
      cumulativeOutcome = parseFloat(allTotals.total_outcome);
      cumulativeBalance = initialBalance + cumulativeIncome - cumulativeOutcome;

      // Inclure les prédictions si demandé
      if (includePredictions) {
        try {
          // Récupérer la date la plus ancienne des transactions récurrentes
          const oldestRecurringQuery = `
            SELECT MIN(date) as oldest_date 
            FROM transactions 
            WHERE wallet_id = $1 AND is_recurring = true
          `;
          const oldestResult = await pool.query(oldestRecurringQuery, [walletIdNum]);
          const oldestDate = oldestResult.rows[0]?.oldest_date;

          if (oldestDate) {
            const formattedOldestDate = format(new Date(oldestDate), 'yyyy-MM-dd');

            // Obtenir toutes les prédictions jusqu'à endDate
            const allPredictions = await getPredictions(walletIdNum, formattedOldestDate, endDate);

            allPredictions.forEach((pred) => {
              if (pred.type === 'income') {
                cumulativeBalance += pred.amount;
                cumulativeIncome += pred.amount;
              } else {
                cumulativeBalance -= pred.amount;
                cumulativeOutcome += pred.amount;
              }
            });

            // Obtenir les prédictions pour la période sélectionnée
            if (startDate) {
              const periodPredictions = await getPredictions(walletIdNum, startDate, endDate);

              periodPredictions.forEach((pred) => {
                if (pred.type === 'income') {
                  periodIncome += pred.amount;
                } else {
                  periodOutcome += pred.amount;
                }
              });
            }
          }
        } catch (error) {
          console.error('Error calculating predictions:', error);
        }
      }
    }

    // Get monthly evolution
    const evolutionQuery = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as outcome
      FROM transactions
      ${whereClause}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `;

    const evolutionResult = await pool.query(evolutionQuery, params);

    const monthlyData = evolutionResult.rows.map((row) => {
      const income = parseFloat(row.income);
      const outcome = parseFloat(row.outcome);
      const monthlyBalance = income - outcome;

      return {
        month: row.month,
        income,
        outcome,
        balance: monthlyBalance,
        cumulative: 0,
        predicted_income: 0,
        predicted_outcome: 0,
      };
    });

    return NextResponse.json({
      totalIncome: periodIncome,
      totalOutcome: periodOutcome,
      balance: periodIncome - periodOutcome,
      cumulativeIncome,
      cumulativeOutcome,
      cumulativeBalance,
      monthlyData,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}