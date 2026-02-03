import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Récupérer une catégorie spécifique
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = await requireUserId();

        const result = await pool.query(
            `SELECT * FROM categories 
       WHERE id = $1 
       AND (is_system = TRUE OR user_id = $2)`,
            [parseInt(id), userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Catégorie non trouvée' },
                { status: 404 }
            );
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error fetching category:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération de la catégorie' },
            { status: 500 }
        );
    }
}

// PATCH - Mettre à jour une catégorie (seulement les catégories utilisateur)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = await requireUserId();
        const body = await request.json();

        // Vérifier que la catégorie existe et appartient à l'utilisateur
        const existingResult = await pool.query(
            `SELECT * FROM categories WHERE id = $1`,
            [parseInt(id)]
        );

        if (existingResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Catégorie non trouvée' },
                { status: 404 }
            );
        }

        const category = existingResult.rows[0];

        // On ne peut pas modifier les catégories système
        if (category.is_system) {
            return NextResponse.json(
                { error: 'Impossible de modifier une catégorie système' },
                { status: 403 }
            );
        }

        // Vérifier que la catégorie appartient à l'utilisateur
        if (category.user_id !== userId) {
            return NextResponse.json(
                { error: 'Accès refusé' },
                { status: 403 }
            );
        }

        // Construire la requête de mise à jour
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (body.name !== undefined) {
            if (!body.name || body.name.trim() === '') {
                return NextResponse.json(
                    { error: 'Le nom ne peut pas être vide' },
                    { status: 400 }
                );
            }

            // Vérifier l'unicité du nouveau nom
            const nameCheck = await pool.query(
                `SELECT id FROM categories 
         WHERE LOWER(name) = LOWER($1) 
         AND id != $2
         AND (user_id = $3 OR is_system = TRUE)`,
                [body.name.trim(), parseInt(id), userId]
            );

            if (nameCheck.rows.length > 0) {
                return NextResponse.json(
                    { error: 'Une catégorie avec ce nom existe déjà' },
                    { status: 409 }
                );
            }

            updates.push(`name = $${paramIndex}`);
            values.push(body.name.trim());
            paramIndex++;
        }

        if (body.type !== undefined) {
            if (!['income', 'outcome', 'both'].includes(body.type)) {
                return NextResponse.json(
                    { error: 'Type invalide' },
                    { status: 400 }
                );
            }
            updates.push(`type = $${paramIndex}`);
            values.push(body.type);
            paramIndex++;
        }

        if (body.icon !== undefined) {
            updates.push(`icon = $${paramIndex}`);
            values.push(body.icon);
            paramIndex++;
        }

        if (body.color !== undefined) {
            updates.push(`color = $${paramIndex}`);
            values.push(body.color);
            paramIndex++;
        }

        if (body.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex}`);
            values.push(body.is_active);
            paramIndex++;
        }

        if (body.sort_order !== undefined) {
            updates.push(`sort_order = $${paramIndex}`);
            values.push(body.sort_order);
            paramIndex++;
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'Aucun champ à mettre à jour' },
                { status: 400 }
            );
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(parseInt(id));

        const query = `
      UPDATE categories 
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
        console.error('Error updating category:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la mise à jour de la catégorie' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer une catégorie (seulement les catégories utilisateur)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = await requireUserId();

        // Vérifier que la catégorie existe
        const existingResult = await pool.query(
            `SELECT * FROM categories WHERE id = $1`,
            [parseInt(id)]
        );

        if (existingResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Catégorie non trouvée' },
                { status: 404 }
            );
        }

        const category = existingResult.rows[0];

        // On ne peut pas supprimer les catégories système
        if (category.is_system) {
            return NextResponse.json(
                { error: 'Impossible de supprimer une catégorie système' },
                { status: 403 }
            );
        }

        // Vérifier que la catégorie appartient à l'utilisateur
        if (category.user_id !== userId) {
            return NextResponse.json(
                { error: 'Accès refusé' },
                { status: 403 }
            );
        }

        // Vérifier si des transactions utilisent cette catégorie
        const transactionCheck = await pool.query(
            `SELECT COUNT(*) as count FROM transactions WHERE category_id = $1`,
            [parseInt(id)]
        );

        const transactionCount = parseInt(transactionCheck.rows[0].count);

        if (transactionCount > 0) {
            // Option: désactiver au lieu de supprimer, ou forcer avec un paramètre
            const searchParams = request.nextUrl.searchParams;
            const force = searchParams.get('force') === 'true';

            if (!force) {
                return NextResponse.json(
                    {
                        error: `Cette catégorie est utilisée par ${transactionCount} transaction(s). Utilisez ?force=true pour supprimer quand même.`,
                        transactionCount
                    },
                    { status: 409 }
                );
            }

            // Si force=true, les transactions auront category_id = NULL (grâce à ON DELETE SET NULL)
        }

        await pool.query('DELETE FROM categories WHERE id = $1', [parseInt(id)]);

        return NextResponse.json({
            success: true,
            message: 'Catégorie supprimée',
            transactionsAffected: transactionCount
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la suppression de la catégorie' },
            { status: 500 }
        );
    }
}