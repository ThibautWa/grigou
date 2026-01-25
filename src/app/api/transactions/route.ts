// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

    let query = 'SELECT * FROM transactions WHERE wallet_id = $1';
    const params: any[] = [parseInt(walletId)];

    if (startDate && endDate) {
      query += ' AND date >= $2 AND date <= $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);

    // Convertir les montants en nombres
    const transactions = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount)
    }));

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
      wallet_id,
      type,
      amount,
      description,
      category,
      date,
      is_recurring,
      recurrence_type,
      recurrence_end_date
    } = body;

    // Validation
    if (!wallet_id) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

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

    // Vérifier que le portefeuille existe
    const walletCheck = await pool.query(
      'SELECT id FROM wallets WHERE id = $1',
      [wallet_id]
    );

    if (walletCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Insertion avec wallet_id
    const result = await pool.query(
      `INSERT INTO transactions 
       (wallet_id, type, amount, description, category, date, is_recurring, recurrence_type, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        wallet_id,
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