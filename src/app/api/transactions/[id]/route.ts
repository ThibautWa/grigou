import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canWriteWallet } from '@/lib/auth/wallet-permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Récupérer une transaction spécifique
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await requireUserId();

    const result = await pool.query(
      `SELECT t.*, w.user_id as wallet_owner_id
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE t.id = $1`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    const transaction = result.rows[0];

    // Vérifier l'accès au wallet
    const hasAccess = await canWriteWallet(transaction.wallet_id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la transaction' },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour une transaction
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    const body = await request.json();

    // Récupérer la transaction existante pour vérifier les permissions
    const existingResult = await pool.query(
      `SELECT t.*, w.user_id as wallet_owner_id
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE t.id = $1`,
      [parseInt(id)]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    const existingTransaction = existingResult.rows[0];

    // Vérifier l'accès en écriture au wallet
    const hasAccess = await canWriteWallet(existingTransaction.wallet_id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Type
    if (body.type !== undefined) {
      if (!['income', 'outcome'].includes(body.type)) {
        return NextResponse.json(
          { error: 'Type invalide. Utilisez "income" ou "outcome"' },
          { status: 400 }
        );
      }
      updates.push(`type = $${paramIndex}`);
      values.push(body.type);
      paramIndex++;
    }

    // Montant
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: 'Montant invalide' },
          { status: 400 }
        );
      }
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    // Description
    if (body.description !== undefined) {
      if (!body.description || body.description.trim() === '') {
        return NextResponse.json(
          { error: 'La description est requise' },
          { status: 400 }
        );
      }
      updates.push(`description = $${paramIndex}`);
      values.push(body.description.trim());
      paramIndex++;
    }

    // Catégorie
    if (body.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(body.category || null);
      paramIndex++;
    }

    // Date
    if (body.date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date)) {
        return NextResponse.json(
          { error: 'Format de date invalide. Utilisez YYYY-MM-DD' },
          { status: 400 }
        );
      }
      updates.push(`date = $${paramIndex}`);
      values.push(body.date);
      paramIndex++;
    }

    // Transaction récurrente
    if (body.is_recurring !== undefined) {
      updates.push(`is_recurring = $${paramIndex}`);
      values.push(body.is_recurring);
      paramIndex++;

      // Si on désactive la récurrence, nettoyer les champs associés
      if (!body.is_recurring) {
        updates.push(`recurrence_type = NULL`);
        updates.push(`recurrence_end_date = NULL`);
      }
    }

    // Type de récurrence
    if (body.recurrence_type !== undefined && body.is_recurring !== false) {
      const validRecurrenceTypes = ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly'];
      if (body.recurrence_type && !validRecurrenceTypes.includes(body.recurrence_type)) {
        return NextResponse.json(
          { error: 'Type de récurrence invalide' },
          { status: 400 }
        );
      }
      updates.push(`recurrence_type = $${paramIndex}`);
      values.push(body.recurrence_type);
      paramIndex++;
    }

    // Date de fin de récurrence
    if (body.recurrence_end_date !== undefined && body.is_recurring !== false) {
      if (body.recurrence_end_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(body.recurrence_end_date)) {
          return NextResponse.json(
            { error: 'Format de date de fin invalide. Utilisez YYYY-MM-DD' },
            { status: 400 }
          );
        }
      }
      updates.push(`recurrence_end_date = $${paramIndex}`);
      values.push(body.recurrence_end_date || null);
      paramIndex++;
    }

    // Vérifier qu'il y a des champs à mettre à jour
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      );
    }

    // Ajouter updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Ajouter l'ID pour la clause WHERE
    values.push(parseInt(id));

    const query = `
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une transaction
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await requireUserId();

    // Récupérer la transaction pour vérifier les permissions
    const existingResult = await pool.query(
      `SELECT t.*, w.user_id as wallet_owner_id
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE t.id = $1`,
      [parseInt(id)]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    const transaction = existingResult.rows[0];

    // Vérifier l'accès en écriture au wallet
    const hasAccess = await canWriteWallet(transaction.wallet_id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    await pool.query('DELETE FROM transactions WHERE id = $1', [parseInt(id)]);

    return NextResponse.json({ success: true, message: 'Transaction supprimée' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la transaction' },
      { status: 500 }
    );
  }
}