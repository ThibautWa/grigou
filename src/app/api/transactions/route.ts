// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canReadWallet, canWriteWallet } from '@/lib/auth/wallet-permissions';

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

    let query = 'SELECT * FROM transactions WHERE wallet_id = $1';
    const params: any[] = [parseInt(walletId)];

    if (startDate && endDate) {
      query += ' AND date >= $2 AND date <= $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);

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
    // Vérifier l'authentification
    let userId: number;
    try {
      userId = await requireUserId();
    } catch (error) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

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

    if (!wallet_id) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    // Vérifier l'accès en écriture au wallet
    const hasAccess = await canWriteWallet(wallet_id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Permission insuffisante pour ajouter une transaction' },
        { status: 403 }
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
