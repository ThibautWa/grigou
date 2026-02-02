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

    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.wallet_id = $1
    `;
    const params: any[] = [parseInt(walletId)];

    if (startDate && endDate) {
      query += ' AND t.date >= $2 AND t.date <= $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

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
      description,  // Optionnel maintenant
      category_id,  // Obligatoire maintenant
      date,
      is_recurring,
      recurrence_type,
      recurrence_end_date
    } = body;

    // Validation du wallet_id
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

    // Validation des champs obligatoires
    if (!type || amount === undefined || amount === null || !date) {
      return NextResponse.json(
        { error: 'Les champs type, amount et date sont requis' },
        { status: 400 }
      );
    }

    // Validation du type
    if (type !== 'income' && type !== 'outcome') {
      return NextResponse.json(
        { error: 'Le type doit être "income" ou "outcome"' },
        { status: 400 }
      );
    }

    // Validation du montant
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être un nombre positif' },
        { status: 400 }
      );
    }

    // Validation de la catégorie (obligatoire)
    if (!category_id) {
      return NextResponse.json(
        { error: 'La catégorie est obligatoire' },
        { status: 400 }
      );
    }

    // Vérifier que la catégorie existe et est accessible
    const categoryCheck = await pool.query(
      `SELECT id FROM categories 
       WHERE id = $1 
       AND (is_system = TRUE OR user_id = $2)
       AND is_active = TRUE`,
      [category_id, userId]
    );

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Catégorie invalide ou inaccessible' },
        { status: 400 }
      );
    }

    // Insertion de la transaction
    const result = await pool.query(
      `INSERT INTO transactions 
       (wallet_id, type, amount, description, category_id, date, is_recurring, recurrence_type, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        wallet_id,
        type,
        amount,
        description || null,
        category_id,
        date,
        is_recurring || false,
        is_recurring ? recurrence_type : null,
        is_recurring && recurrence_end_date ? recurrence_end_date : null
      ]
    );

    // Récupérer la transaction avec les infos de catégorie
    const transactionWithCategory = await pool.query(
      `SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1`,
      [result.rows[0].id]
    );

    const transaction = {
      ...transactionWithCategory.rows[0],
      amount: parseFloat(transactionWithCategory.rows[0].amount)
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