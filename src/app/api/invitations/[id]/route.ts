// app/api/invitations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/invitations/[id] - Accepter une invitation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return NextResponse.json({ error: 'Invalid invitation ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body; // 'accept' ou 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Valeurs acceptées: accept, reject' },
        { status: 400 }
      );
    }

    // Vérifier que l'invitation appartient à l'utilisateur
    const invitationCheck = await pool.query(
      `SELECT ws.*, w.name as wallet_name 
       FROM wallet_shares ws
       JOIN wallets w ON w.id = ws.wallet_id
       WHERE ws.id = $1 AND ws.user_id = $2 AND ws.accepted_at IS NULL`,
      [invitationId, userId]
    );

    if (invitationCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation non trouvée ou déjà traitée' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      // Supprimer l'invitation
      await pool.query(
        'DELETE FROM wallet_shares WHERE id = $1',
        [invitationId]
      );

      return NextResponse.json({
        message: 'Invitation refusée',
        action: 'rejected',
      });
    }

    // Accepter l'invitation
    const result = await pool.query(
      `UPDATE wallet_shares 
       SET accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [invitationId]
    );

    return NextResponse.json({
      message: 'Invitation acceptée',
      action: 'accepted',
      walletId: result.rows[0].wallet_id,
      walletName: invitationCheck.rows[0].wallet_name,
      permission: result.rows[0].permission,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error handling invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de l\'invitation' },
      { status: 500 }
    );
  }
}

// DELETE /api/invitations/[id] - Refuser/supprimer une invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return NextResponse.json({ error: 'Invalid invitation ID' }, { status: 400 });
    }

    // Vérifier que l'invitation appartient à l'utilisateur
    const result = await pool.query(
      'DELETE FROM wallet_shares WHERE id = $1 AND user_id = $2 RETURNING *',
      [invitationId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Invitation supprimée',
      deleted: true,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
