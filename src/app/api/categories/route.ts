import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET - Récupérer les catégories (système + utilisateur)
export async function GET(request: NextRequest) {
    try {
        const userId = await requireUserId();
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type'); // 'income', 'outcome', ou null pour tout

        let query = `
      SELECT * FROM categories 
      WHERE (is_system = TRUE OR user_id = $1)
      AND is_active = TRUE
    `;
        const values: any[] = [userId];

        if (type && ['income', 'outcome'].includes(type)) {
            query += ` AND (type = $2 OR type = 'both')`;
            values.push(type);
        }

        query += ` ORDER BY is_system DESC, sort_order ASC, name ASC`;

        const result = await pool.query(query, values);

        return NextResponse.json(result.rows);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération des catégories' },
            { status: 500 }
        );
    }
}

// POST - Créer une nouvelle catégorie personnalisée
export async function POST(request: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await request.json();

        const { name, type, icon, color } = body;

        // Validation
        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: 'Le nom de la catégorie est requis' },
                { status: 400 }
            );
        }

        if (!type || !['income', 'outcome', 'both'].includes(type)) {
            return NextResponse.json(
                { error: 'Le type doit être "income", "outcome" ou "both"' },
                { status: 400 }
            );
        }

        // Vérifier si une catégorie avec ce nom existe déjà pour cet utilisateur
        const existingCheck = await pool.query(
            `SELECT id FROM categories 
       WHERE LOWER(name) = LOWER($1) 
       AND (user_id = $2 OR is_system = TRUE)
       AND (type = $3 OR type = 'both' OR $3 = 'both')`,
            [name.trim(), userId, type]
        );

        if (existingCheck.rows.length > 0) {
            return NextResponse.json(
                { error: 'Une catégorie avec ce nom existe déjà' },
                { status: 409 }
            );
        }

        // Créer la catégorie
        const result = await pool.query(
            `INSERT INTO categories (name, type, icon, color, user_id, is_system)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
            [
                name.trim(),
                type,
                icon || '📌',
                color || '#94a3b8',
                userId
            ]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la création de la catégorie' },
            { status: 500 }
        );
    }
}