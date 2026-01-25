// app/api/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { CreateWalletDto } from '@/types/wallet';
import { requireUserId } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/wallets - Récupérer tous les portefeuilles accessibles par l'utilisateur
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    let userId: number;
    try {
      userId = await requireUserId();
    } catch (error) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Requête pour récupérer les wallets possédés ET les wallets partagés
    let query = `
      SELECT 
        w.*,
        CASE 
          WHEN w.user_id = $1 THEN 'owner'
          ELSE ws.permission
        END as permission,
        CASE 
          WHEN w.user_id = $1 THEN NULL
          ELSE CONCAT(owner.first_name, ' ', owner.last_name)
        END as owner_name,
        owner.email as owner_email
        ${includeStats ? `, 
          COALESCE(w.initial_balance + (
            SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)
            FROM transactions t WHERE t.wallet_id = w.id
          ), w.initial_balance) as current_balance,
          (SELECT COUNT(*) FROM transactions t WHERE t.wallet_id = w.id) as transaction_count,
          (SELECT MAX(t.date) FROM transactions t WHERE t.wallet_id = w.id) as last_transaction_date
        ` : ''}
      FROM wallets w
      LEFT JOIN wallet_shares ws ON ws.wallet_id = w.id AND ws.user_id = $1 AND ws.accepted_at IS NOT NULL
      LEFT JOIN users owner ON owner.id = w.user_id
      WHERE (w.user_id = $1 OR (ws.user_id = $1 AND ws.accepted_at IS NOT NULL))
    `;

    const params: any[] = [userId];

    if (!includeArchived) {
      query += ' AND w.archived = FALSE';
    }

    query += ' ORDER BY w.user_id = $1 DESC, w.is_default DESC, w.created_at ASC';

    const result = await pool.query(query, params);

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

// POST /api/wallets - Créer un nouveau portefeuille pour l'utilisateur
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    let userId: number;
    try {
      userId = await requireUserId();
    } catch (error) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body: CreateWalletDto = await request.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Wallet name is required' },
        { status: 400 }
      );
    }

    // Vérifier si c'est le premier portefeuille de l'utilisateur
    const existingWallets = await pool.query(
      'SELECT COUNT(*) as count FROM wallets WHERE user_id = $1',
      [userId]
    );
    const isFirstWallet = parseInt(existingWallets.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO wallets (user_id, name, description, initial_balance, is_default) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        userId,
        body.name.trim(),
        body.description || null,
        body.initial_balance || 0,
        isFirstWallet, // Le premier portefeuille est automatiquement le défaut
      ]
    );

    const wallet = {
      ...result.rows[0],
      initial_balance: parseFloat(result.rows[0].initial_balance),
      permission: 'owner',
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
