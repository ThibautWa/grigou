import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Transaction supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la transaction' },
      { status: 500 }
    );
  }
}
