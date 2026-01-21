import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let params: any[] = [];
    let whereClause = '';

    if (startDate && endDate) {
      whereClause = 'WHERE date >= $1 AND date <= $2';
      params = [startDate, endDate];
    }

    // Get total income and outcome
    const totalsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) as total_outcome
      FROM transactions
      ${whereClause}
    `;

    const totalsResult = await pool.query(totalsQuery, params);
    const totals = totalsResult.rows[0];

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

    // Calculate balance
    const balance = parseFloat(totals.total_income) - parseFloat(totals.total_outcome);

    // Calculate monthly balances
    let runningBalance = 0;
    const monthlyData = evolutionResult.rows.map((row) => {
      const income = parseFloat(row.income);
      const outcome = parseFloat(row.outcome);
      const monthlyBalance = income - outcome;
      runningBalance += monthlyBalance;

      return {
        month: row.month,
        income,
        outcome,
        balance: monthlyBalance,
        cumulative: runningBalance,
      };
    });

    return NextResponse.json({
      totalIncome: parseFloat(totals.total_income),
      totalOutcome: parseFloat(totals.total_outcome),
      balance,
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
