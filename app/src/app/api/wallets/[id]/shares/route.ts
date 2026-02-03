// app/api/wallets/[id]/shares/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canAdminWallet, isWalletOwner } from '@/lib/auth/wallet-permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/wallets/[id]/shares - Lister les partages d'un wallet
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json({ error: 'Invalid wallet ID' }, { status: 400 });
    }

    // Vérifier l'accès admin au wallet
    const canAdmin = await canAdminWallet(walletId, userId);
    if (!canAdmin) {
      return NextResponse.json(
        { error: 'Permission insuffisante pour voir les partages' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT 
        ws.id,
        ws.wallet_id,
        ws.user_id,
        ws.permission,
        ws.invited_at,
        ws.accepted_at,
        u.email,
        u.first_name,
        u.last_name,
        inviter.email as invited_by_email,
        inviter.first_name as invited_by_first_name,
        inviter.last_name as invited_by_last_name
       FROM wallet_shares ws
       JOIN users u ON u.id = ws.user_id
       LEFT JOIN users inviter ON inviter.id = ws.invited_by
       WHERE ws.wallet_id = $1
       ORDER BY ws.invited_at DESC`,
      [walletId]
    );

    const shares = result.rows.map(row => ({
      id: row.id,
      walletId: row.wallet_id,
      user: {
        id: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
      },
      permission: row.permission,
      invitedAt: row.invited_at,
      acceptedAt: row.accepted_at,
      invitedBy: row.invited_by_email ? {
        email: row.invited_by_email,
        firstName: row.invited_by_first_name,
        lastName: row.invited_by_last_name,
      } : null,
      status: row.accepted_at ? 'accepted' : 'pending',
    }));

    return NextResponse.json(shares);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des partages' },
      { status: 500 }
    );
  }
}

// POST /api/wallets/[id]/shares - Inviter un utilisateur à partager le wallet
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json({ error: 'Invalid wallet ID' }, { status: 400 });
    }

    // Vérifier l'accès admin au wallet
    const canAdmin = await canAdminWallet(walletId, userId);
    if (!canAdmin) {
      return NextResponse.json(
        { error: 'Permission insuffisante pour partager ce wallet' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, permission } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'L\'email est requis' },
        { status: 400 }
      );
    }

    if (!['read', 'write', 'admin'].includes(permission)) {
      return NextResponse.json(
        { error: 'Permission invalide. Valeurs acceptées: read, write, admin' },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur par email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucun utilisateur trouvé avec cet email' },
        { status: 404 }
      );
    }

    const targetUserId = userResult.rows[0].id;

    // Vérifier que l'utilisateur n'est pas le propriétaire
    const walletResult = await pool.query(
      'SELECT user_id FROM wallets WHERE id = $1',
      [walletId]
    );

    if (walletResult.rows[0].user_id === targetUserId) {
      return NextResponse.json(
        { error: 'Impossible de partager un wallet avec son propriétaire' },
        { status: 400 }
      );
    }

    // Vérifier si un partage existe déjà
    const existingShare = await pool.query(
      'SELECT id FROM wallet_shares WHERE wallet_id = $1 AND user_id = $2',
      [walletId, targetUserId]
    );

    if (existingShare.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ce wallet est déjà partagé avec cet utilisateur' },
        { status: 409 }
      );
    }

    // Créer le partage
    const result = await pool.query(
      `INSERT INTO wallet_shares (wallet_id, user_id, permission, invited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [walletId, targetUserId, permission, userId]
    );

    // Récupérer les infos complètes
    const shareResult = await pool.query(
      `SELECT 
        ws.id,
        ws.wallet_id,
        ws.user_id,
        ws.permission,
        ws.invited_at,
        ws.accepted_at,
        u.email,
        u.first_name,
        u.last_name
       FROM wallet_shares ws
       JOIN users u ON u.id = ws.user_id
       WHERE ws.id = $1`,
      [result.rows[0].id]
    );

    const share = shareResult.rows[0];

    return NextResponse.json({
      id: share.id,
      walletId: share.wallet_id,
      user: {
        id: share.user_id,
        email: share.email,
        firstName: share.first_name,
        lastName: share.last_name,
      },
      permission: share.permission,
      invitedAt: share.invited_at,
      acceptedAt: share.accepted_at,
      status: 'pending',
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Erreur lors du partage du wallet' },
      { status: 500 }
    );
  }
}
