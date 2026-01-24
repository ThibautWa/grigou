// Ce fichier doit être placé dans : app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = 'SELECT * FROM transactions';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE date >= $1 AND date <= $2';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';

    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const result = await pool.query(query, params);

    // Convertir les montants en nombres
    const transactions = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount)
    }));
    console.log('Fetched transactions:');
    console.log(transactions);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      amount,
      description,
      category,
      date,
      is_recurring,
      recurrence_type,
      recurrence_end_date
    } = body;

    if (!type || !amount || !description || !date) {
      return NextResponse.json(
        { error: 'Tous les champs requis doivent être remplis' },
        { status: 400 }
      );
    }

    if (type !== 'income' && type !== 'outcome') {
      return NextResponse.json(
        { error: 'Le type doit être "income" ou "outcome"' },
        { status: 400 }
      );
    }

    // Insertion avec les champs de récurrence
    const result = await pool.query(
      `INSERT INTO transactions 
       (type, amount, description, category, date, is_recurring, recurrence_type, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        type,
        amount,
        description,
        category,
        date,
        is_recurring || false,
        is_recurring ? recurrence_type : null,
        is_recurring && recurrence_end_date ? recurrence_end_date : null
      ]
    );

    const transaction = {
      ...result.rows[0],
      amount: parseFloat(result.rows[0].amount)
    };

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la transaction' },
      { status: 500 }
    );
  }
}