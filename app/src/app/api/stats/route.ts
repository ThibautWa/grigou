import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, format } from 'date-fns';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';

// ============================================
// Logique de prédictions intégrée directement
// (évite les fetch() HTTP internes qui échouent)
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

/**
 * Récupère les prédictions pour un wallet entre deux dates
 */
async function getPredictions(
  walletId: number,
  startDate: string,
  endDate: string
): Promise<Array<{ type: 'income' | 'outcome'; amount: number; date: string }>> {
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(startDate);

  const result = await pool.query<RecurringTransaction>(
    `SELECT * FROM transactions 
     WHERE wallet_id = $1
     AND is_recurring = TRUE 
     AND date <= $2
     AND (recurrence_end_date IS NULL OR recurrence_end_date >= $3)
     ORDER BY date ASC`,
    [walletId, endDate, startDate]
  );

  const recurringTransactions = result.rows;
  let allPredictions: Array<{ type: 'income' | 'outcome'; amount: number; date: string }> = [];

  for (const transaction of recurringTransactions) {
    const predictions = generatePredictionsForTransaction(transaction, endDateObj);
    allPredictions = [...allPredictions, ...predictions];
  }

  // Filtrer pour ne garder que les prédictions dans la plage demandée
  const filtered = allPredictions.filter(pred => {
    const predDate = new Date(pred.date);
    return predDate >= startDateObj && predDate <= endDateObj;
  });

  return filtered;
}

// ============================================
// Route principale GET /api/stats
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

    // Wallet ID est obligatoire
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

    // Construire la requête pour les totaux de la période sélectionnée
    let params: any[] = [walletIdNum];
    let whereClause = 'WHERE wallet_id = $1';

    if (startDate && endDate) {
      whereClause += ' AND date >= $2 AND date <= $3';
      params.push(startDate, endDate);
    } else if (endDate) {
      whereClause += ' AND date <= $2';
      params.push(endDate);
    }

    // Totaux des transactions réelles pour la période
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

    // ============================================
    // CALCUL DU SOLDE CUMULÉ
    // ============================================
    let cumulativeBalance = 0;
    let cumulativeIncome = 0;
    let cumulativeOutcome = 0;

    const effectiveEndDate = endDate || format(new Date(), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Récupérer le solde initial du wallet
    const walletQuery = `SELECT initial_balance FROM wallets WHERE id = $1`;
    const walletResult = await pool.query(walletQuery, [walletIdNum]);
    const initialBalance = walletResult.rows[0]
      ? parseFloat(walletResult.rows[0].initial_balance)
      : 0;

    // 2. Transactions réelles jusqu'à aujourd'hui (passé)
    const allTransactionsQuery = `
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
  FROM transactions
  WHERE wallet_id = $1 AND date <= $2
`;
    const allTransactionsResult = await pool.query(allTransactionsQuery, [walletIdNum, today]);
    const allTotals = allTransactionsResult.rows[0];

    cumulativeIncome = parseFloat(allTotals.total_income);
    cumulativeOutcome = parseFloat(allTotals.total_outcome);

    // 2b. Transactions réelles futures (saisies manuellement après aujourd'hui)
    //     jusqu'à endDate — elles sont réelles donc on les inclut toujours
    if (effectiveEndDate > today) {
      const futureRealQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
    FROM transactions
    WHERE wallet_id = $1 AND date > $2 AND date <= $3
  `;
      const futureRealResult = await pool.query(futureRealQuery, [walletIdNum, today, effectiveEndDate]);
      const futureRealTotals = futureRealResult.rows[0];
      cumulativeIncome += parseFloat(futureRealTotals.total_income);
      cumulativeOutcome += parseFloat(futureRealTotals.total_outcome);
    }

    cumulativeBalance = initialBalance + cumulativeIncome - cumulativeOutcome;

    // 3. Ajouter les prédictions récurrentes FUTURES (après aujourd'hui jusqu'à endDate)
    if (includePredictions && effectiveEndDate > today) {
      try {
        const futurePredictions = await getPredictions(walletIdNum, today, effectiveEndDate);

        futurePredictions.forEach((pred) => {
          if (pred.type === 'income') {
            cumulativeBalance += pred.amount;
            cumulativeIncome += pred.amount;
          } else {
            cumulativeBalance -= pred.amount;
            cumulativeOutcome += pred.amount;
          }
        });
      } catch (predError) {
        console.error('Error fetching predictions for cumulative:', predError);
      }
    }

    // 4. Ajouter les prédictions de la période pour les totaux affichés
    //    (section "Prévisions du mois")
    if (includePredictions && startDate && endDate) {
      try {
        const periodPredictions = await getPredictions(walletIdNum, startDate, endDate);

        periodPredictions.forEach((pred) => {
          if (pred.type === 'income') {
            periodIncome += pred.amount;
          } else {
            periodOutcome += pred.amount;
          }
        });
      } catch (predError) {
        console.error('Error fetching period predictions:', predError);
      }
    }

    // ============================================
    // DONNÉES MENSUELLES POUR LE GRAPHIQUE
    // ============================================
    const monthlyDataQuery = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as outcome
      FROM transactions
      WHERE wallet_id = $1 AND date <= $2
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `;
    const monthlyDataResult = await pool.query(monthlyDataQuery, [walletIdNum, effectiveEndDate]);

    let runningTotal = initialBalance;
    const monthlyData = monthlyDataResult.rows.map(row => {
      const income = parseFloat(row.income);
      const outcome = parseFloat(row.outcome);
      const balance = income - outcome;
      runningTotal += balance;
      return {
        month: row.month,
        income,
        outcome,
        balance,
        cumulative: runningTotal,
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
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}