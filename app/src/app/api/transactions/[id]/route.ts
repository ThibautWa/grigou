// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canWriteWallet, canReadWallet } from '@/lib/auth/wallet-permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Récupérer une transaction spécifique
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await requireUserId();

    const result = await pool.query(
      `SELECT 
        t.id,
        t.wallet_id,
        t.type,
        t.amount,
        t.description,
        t.category_id,
        t.date,
        t.is_recurring,
        t.recurrence_type,
        t.recurrence_end_date,
        t.created_at,
        t.updated_at,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
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
    const hasAccess = await canReadWallet(transaction.wallet_id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...transaction,
      amount: parseFloat(transaction.amount)
    });
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

    // Récupérer la transaction existante
    const existingResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
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
        { error: 'Permission insuffisante pour modifier cette transaction' },
        { status: 403 }
      );
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Type
    if (body.type !== undefined) {
      if (body.type !== 'income' && body.type !== 'outcome') {
        return NextResponse.json(
          { error: 'Le type doit être "income" ou "outcome"' },
          { status: 400 }
        );
      }
      updates.push(`type = $${paramIndex}`);
      values.push(body.type);
      paramIndex++;
    }

    // Amount
    if (body.amount !== undefined) {
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return NextResponse.json(
          { error: 'Le montant doit être un nombre positif' },
          { status: 400 }
        );
      }
      updates.push(`amount = $${paramIndex}`);
      values.push(body.amount);
      paramIndex++;
    }

    // Description (optionnel, peut être null)
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(body.description || null);
      paramIndex++;
    }

    // Category ID (obligatoire si fourni)
    if (body.category_id !== undefined) {
      if (body.category_id === null) {
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
        [body.category_id, userId]
      );

      if (categoryCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Catégorie invalide ou inaccessible' },
          { status: 400 }
        );
      }

      updates.push(`category_id = $${paramIndex}`);
      values.push(body.category_id);
      paramIndex++;
    }

    // Date
    if (body.date !== undefined) {
      updates.push(`date = $${paramIndex}`);
      values.push(body.date);
      paramIndex++;
    }

    // Récurrence
    if (body.is_recurring !== undefined) {
      updates.push(`is_recurring = $${paramIndex}`);
      values.push(body.is_recurring);
      paramIndex++;

      if (body.is_recurring) {
        if (body.recurrence_type) {
          updates.push(`recurrence_type = $${paramIndex}`);
          values.push(body.recurrence_type);
          paramIndex++;
        }
        if (body.recurrence_end_date !== undefined) {
          updates.push(`recurrence_end_date = $${paramIndex}`);
          values.push(body.recurrence_end_date || null);
          paramIndex++;
        }
      } else {
        // Si on désactive la récurrence, nettoyer les champs
        updates.push(`recurrence_type = NULL`);
        updates.push(`recurrence_end_date = NULL`);
      }
    } else {
      // Mise à jour des champs de récurrence individuellement
      if (body.recurrence_type !== undefined) {
        updates.push(`recurrence_type = $${paramIndex}`);
        values.push(body.recurrence_type);
        paramIndex++;
      }
      if (body.recurrence_end_date !== undefined) {
        updates.push(`recurrence_end_date = $${paramIndex}`);
        values.push(body.recurrence_end_date || null);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      );
    }

    // Ajouter updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Ajouter l'ID à la fin des paramètres
    values.push(parseInt(id));

    const query = `
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

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
      [parseInt(id)]
    );

    const transaction = {
      ...transactionWithCategory.rows[0],
      amount: parseFloat(transactionWithCategory.rows[0].amount)
    };

    return NextResponse.json(transaction);
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

    // Récupérer la transaction
    const existingResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
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
        { error: 'Permission insuffisante pour supprimer cette transaction' },
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