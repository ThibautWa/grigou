// app/api/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/invitations - Lister les invitations reçues (en attente)
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, accepted, all

    let whereClause = 'WHERE ws.user_id = $1';
    if (status === 'pending') {
      whereClause += ' AND ws.accepted_at IS NULL';
    } else if (status === 'accepted') {
      whereClause += ' AND ws.accepted_at IS NOT NULL';
    }

    const result = await pool.query(
      `SELECT 
        ws.id,
        ws.wallet_id,
        ws.permission,
        ws.invited_at,
        ws.accepted_at,
        w.name as wallet_name,
        w.description as wallet_description,
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        inviter.email as invited_by_email,
        inviter.first_name as invited_by_first_name,
        inviter.last_name as invited_by_last_name
       FROM wallet_shares ws
       JOIN wallets w ON w.id = ws.wallet_id
       JOIN users owner ON owner.id = w.user_id
       LEFT JOIN users inviter ON inviter.id = ws.invited_by
       ${whereClause}
       ORDER BY ws.invited_at DESC`,
      [userId]
    );

    const invitations = result.rows.map(row => ({
      id: row.id,
      wallet: {
        id: row.wallet_id,
        name: row.wallet_name,
        description: row.wallet_description,
      },
      permission: row.permission,
      invitedAt: row.invited_at,
      acceptedAt: row.accepted_at,
      owner: {
        id: row.owner_id,
        email: row.owner_email,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
      },
      invitedBy: {
        email: row.invited_by_email,
        firstName: row.invited_by_first_name,
        lastName: row.invited_by_last_name,
      },
      status: row.accepted_at ? 'accepted' : 'pending',
    }));

    return NextResponse.json(invitations);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des invitations' },
      { status: 500 }
    );
  }
}
