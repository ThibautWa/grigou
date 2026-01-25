import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { Wallet, CreateWalletDto, WalletWithStats } from '@/types/wallet';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/wallets - Récupérer tous les portefeuilles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    let query = `
      SELECT w.*
      ${includeStats ? `, 
        COALESCE(w.initial_balance + SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), w.initial_balance) as current_balance,
        COUNT(DISTINCT t.id) as transaction_count,
        MAX(t.date) as last_transaction_date
      ` : ''}
      FROM wallets w
      ${includeStats ? 'LEFT JOIN transactions t ON t.wallet_id = w.id' : ''}
      WHERE 1=1
    `;

    if (!includeArchived) {
      query += ' AND w.archived = FALSE';
    }

    if (includeStats) {
      query += ' GROUP BY w.id';
    }

    query += ' ORDER BY w.is_default DESC, w.created_at ASC';

    const result = await pool.query(query);

    // Convertir les strings en numbers pour les montants
    const wallets = result.rows.map((row) => ({
      ...row,
      initial_balance: parseFloat(row.initial_balance),
      current_balance: row.current_balance ? parseFloat(row.current_balance) : undefined,
      transaction_count: row.transaction_count ? parseInt(row.transaction_count) : undefined,
    }));

    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

// POST /api/wallets - Créer un nouveau portefeuille
export async function POST(request: NextRequest) {
  try {
    const body: CreateWalletDto = await request.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Wallet name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO wallets (name, description, initial_balance) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [
        body.name.trim(),
        body.description || null,
        body.initial_balance || 0,
      ]
    );

    const wallet = {
      ...result.rows[0],
      initial_balance: parseFloat(result.rows[0].initial_balance),
    };

    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}