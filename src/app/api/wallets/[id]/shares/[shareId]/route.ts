// app/api/wallets/[id]/shares/[shareId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canAdminWallet, isWalletOwner } from '@/lib/auth/wallet-permissions';

interface RouteParams {
  params: Promise<{ id: string; shareId: string }>;
}

// PATCH /api/wallets/[id]/shares/[shareId] - Modifier la permission d'un partage
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id, shareId } = await params;
    const walletId = parseInt(id);
    const shareIdInt = parseInt(shareId);

    if (isNaN(walletId) || isNaN(shareIdInt)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    // Seul le propriétaire peut modifier les permissions admin
    const isOwner = await isWalletOwner(walletId, userId);
    const canAdmin = await canAdminWallet(walletId, userId);

    if (!canAdmin) {
      return NextResponse.json(
        { error: 'Permission insuffisante' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission } = body;

    if (!['read', 'write', 'admin'].includes(permission)) {
      return NextResponse.json(
        { error: 'Permission invalide' },
        { status: 400 }
      );
    }

    // Si on veut donner admin, seul le propriétaire peut le faire
    if (permission === 'admin' && !isOwner) {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut accorder la permission admin' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `UPDATE wallet_shares 
       SET permission = $1
       WHERE id = $2 AND wallet_id = $3
       RETURNING *`,
      [permission, shareIdInt, walletId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Partage non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: result.rows[0].id,
      permission: result.rows[0].permission,
      message: 'Permission mise à jour',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error updating share:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE /api/wallets/[id]/shares/[shareId] - Supprimer un partage
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id, shareId } = await params;
    const walletId = parseInt(id);
    const shareIdInt = parseInt(shareId);

    if (isNaN(walletId) || isNaN(shareIdInt)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    // Vérifier si l'utilisateur est admin du wallet OU si c'est son propre partage
    const canAdmin = await canAdminWallet(walletId, userId);
    
    // Vérifier si c'est le partage de l'utilisateur lui-même (il peut se retirer)
    const shareCheck = await pool.query(
      'SELECT user_id FROM wallet_shares WHERE id = $1 AND wallet_id = $2',
      [shareIdInt, walletId]
    );

    if (shareCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Partage non trouvé' },
        { status: 404 }
      );
    }

    const isOwnShare = shareCheck.rows[0].user_id === userId;

    if (!canAdmin && !isOwnShare) {
      return NextResponse.json(
        { error: 'Permission insuffisante pour supprimer ce partage' },
        { status: 403 }
      );
    }

    await pool.query(
      'DELETE FROM wallet_shares WHERE id = $1 AND wallet_id = $2',
      [shareIdInt, walletId]
    );

    return NextResponse.json({
      message: 'Partage supprimé',
      deleted: true,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error deleting share:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
