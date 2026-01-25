// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canWriteWallet } from '@/lib/auth/wallet-permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    let userId: number;
    try {
      userId = await requireUserId();
    } catch (error) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Récupérer la transaction pour vérifier le wallet
    const transactionResult = await pool.query(
      'SELECT wallet_id FROM transactions WHERE id = $1',
      [id]
    );

    if (transactionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    const walletId = transactionResult.rows[0].wallet_id;

    // Vérifier l'accès en écriture au wallet
    const hasAccess = await canWriteWallet(walletId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Permission insuffisante pour supprimer cette transaction' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 RETURNING *',
      [id]
    );

    return NextResponse.json({ message: 'Transaction supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la transaction' },
      { status: 500 }
    );
  }
}
