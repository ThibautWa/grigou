import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includePredictions = searchParams.get('includePredictions') === 'true';

    let params: any[] = [];
    let whereClause = '';

    if (startDate && endDate) {
      whereClause = 'WHERE date >= $1 AND date <= $2';
      params = [startDate, endDate];
    }

    // Get total income and outcome ONLY for the selected period (real transactions)
    const totalsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
      FROM transactions
      ${whereClause}
    `;

    const totalsResult = await pool.query(totalsQuery, params);
    const totals = totalsResult.rows[0];

    // Initialize with real transactions
    let periodIncome = parseFloat(totals.total_income);
    let periodOutcome = parseFloat(totals.total_outcome);

    console.log('Real transactions for period - Income:', periodIncome, 'Outcome:', periodOutcome);

    // Calculate cumulative balance (everything from the beginning to endDate)
    let cumulativeBalance = 0;

    if (endDate) {
      // Get all real transactions until endDate
      const allTransactionsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
        FROM transactions
        WHERE date <= $1
      `;
      const allTransactionsResult = await pool.query(allTransactionsQuery, [endDate]);
      const allTotals = allTransactionsResult.rows[0];
      cumulativeBalance = parseFloat(allTotals.total_income) - parseFloat(allTotals.total_outcome);

      console.log('Real transactions balance:', cumulativeBalance);

      // Add predictions if requested
      if (includePredictions) {
        try {
          // Get the oldest recurring transaction date
          const oldestRecurringQuery = `
            SELECT MIN(date) as oldest_date 
            FROM transactions 
            WHERE is_recurring = true
          `;
          const oldestResult = await pool.query(oldestRecurringQuery);
          const oldestDate = oldestResult.rows[0]?.oldest_date;

          if (oldestDate) {
            const formattedOldestDate = format(new Date(oldestDate), 'yyyy-MM-dd');

            console.log('Fetching ALL predictions from', formattedOldestDate, 'to', endDate);

            // Fetch ALL predictions from the oldest recurring transaction to endDate
            const allPredictionsResponse = await fetch(
              `${request.nextUrl.origin}/api/predictions?startDate=${formattedOldestDate}&endDate=${endDate}`
            );

            if (allPredictionsResponse.ok) {
              const allPredictions = await allPredictionsResponse.json();

              console.log('All predictions fetched:', allPredictions.length);

              // Add all predicted amounts to cumulative balance
              allPredictions.forEach((pred: any) => {
                if (pred.type === 'income') {
                  cumulativeBalance += pred.amount;
                } else {
                  cumulativeBalance -= pred.amount;
                }
              });

              console.log('Cumulative balance after all predictions:', cumulativeBalance);
            }

            // ✅ NOW fetch predictions for the selected period ONLY (for the cards)
            if (startDate) {
              console.log('Fetching period predictions from', startDate, 'to', endDate);

              const periodPredictionsResponse = await fetch(
                `${request.nextUrl.origin}/api/predictions?startDate=${startDate}&endDate=${endDate}`
              );

              if (periodPredictionsResponse.ok) {
                const periodPredictions = await periodPredictionsResponse.json();

                console.log('Period predictions fetched:', periodPredictions.length);

                // Add period predictions to the display totals
                periodPredictions.forEach((pred: any) => {
                  if (pred.type === 'income') {
                    periodIncome += pred.amount;
                    console.log('Adding period income prediction:', pred.amount);
                  } else {
                    periodOutcome += pred.amount;
                    console.log('Adding period outcome prediction:', pred.amount);
                  }
                });

                console.log('Period totals with predictions - Income:', periodIncome, 'Outcome:', periodOutcome);
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
      totalIncome: periodIncome,      // ✅ Includes predictions for selected period
      totalOutcome: periodOutcome,    // ✅ Includes predictions for selected period
      balance: cumulativeBalance,      // ✅ Cumulative balance with all predictions
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