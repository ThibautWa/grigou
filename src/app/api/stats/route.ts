// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { format } from 'date-fns';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';

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

    // Vérifier l'accès au wallet
    const hasAccess = await canReadWallet(parseInt(walletId), userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès au wallet refusé' },
        { status: 403 }
      );
    }

    let params: any[] = [parseInt(walletId)];
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
      const walletResult = await pool.query(walletQuery, [parseInt(walletId)]);
      const initialBalance = walletResult.rows[0] ? parseFloat(walletResult.rows[0].initial_balance) : 0;

      const allTransactionsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
        FROM transactions
        WHERE wallet_id = $1 AND date <= $2
      `;
      const allTransactionsResult = await pool.query(allTransactionsQuery, [parseInt(walletId), endDate]);
      const allTotals = allTransactionsResult.rows[0];

      cumulativeIncome = parseFloat(allTotals.total_income);
      cumulativeOutcome = parseFloat(allTotals.total_outcome);
      cumulativeBalance = initialBalance + cumulativeIncome - cumulativeOutcome;

      if (includePredictions) {
        try {
          const oldestRecurringQuery = `
            SELECT MIN(date) as oldest_date 
            FROM transactions 
            WHERE wallet_id = $1 AND is_recurring = true
          `;
          const oldestResult = await pool.query(oldestRecurringQuery, [parseInt(walletId)]);
          const oldestDate = oldestResult.rows[0]?.oldest_date;

          if (oldestDate) {
            const formattedOldestDate = format(new Date(oldestDate), 'yyyy-MM-dd');

            const allPredictionsResponse = await fetch(
              `${request.nextUrl.origin}/api/predictions?walletId=${walletId}&startDate=${formattedOldestDate}&endDate=${endDate}`
            );

            if (allPredictionsResponse.ok) {
              const allPredictions = await allPredictionsResponse.json();

              allPredictions.forEach((pred: any) => {
                if (pred.type === 'income') {
                  cumulativeBalance += pred.amount;
                  cumulativeIncome += pred.amount;
                } else {
                  cumulativeBalance -= pred.amount;
                  cumulativeOutcome += pred.amount;
                }
              });
            }

            if (startDate) {
              const periodPredictionsResponse = await fetch(
                `${request.nextUrl.origin}/api/predictions?walletId=${walletId}&startDate=${startDate}&endDate=${endDate}`
              );

              if (periodPredictionsResponse.ok) {
                const periodPredictions = await periodPredictionsResponse.json();

                periodPredictions.forEach((pred: any) => {
                  if (pred.type === 'income') {
                    periodIncome += pred.amount;
                  } else {
                    periodOutcome += pred.amount;
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching predictions:', error);
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
