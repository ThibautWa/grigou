import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { validateEmail, normalizeEmail, validateName, sanitizeName } from '@/lib/auth/validation';

// GET - Récupérer le profil de l'utilisateur connecté
export async function GET() {
    try {
        const userId = await requireUserId();

        const result = await pool.query(
            `SELECT id, email, first_name, last_name, email_verified, 
              email_verified_at, created_at, updated_at, last_login_at
       FROM users 
       WHERE id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        const user = result.rows[0];

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                emailVerified: user.email_verified,
                emailVerifiedAt: user.email_verified_at,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLoginAt: user.last_login_at,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération du profil' },
            { status: 500 }
        );
    }
}

// PATCH - Mettre à jour le profil de l'utilisateur connecté
export async function PATCH(request: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await request.json();

        const { firstName, lastName, email } = body;

        // Validation
        const errors: { field: string; message: string }[] = [];

        // Valider le prénom
        if (firstName !== undefined) {
            if (!firstName || firstName.trim() === '') {
                errors.push({ field: 'firstName', message: 'Le prénom est requis' });
            } else if (!validateName(firstName)) {
                errors.push({
                    field: 'firstName',
                    message: 'Le prénom doit contenir entre 2 et 100 caractères alphabétiques'
                });
            }
        }

        // Valider le nom
        if (lastName !== undefined) {
            if (!lastName || lastName.trim() === '') {
                errors.push({ field: 'lastName', message: 'Le nom est requis' });
            } else if (!validateName(lastName)) {
                errors.push({
                    field: 'lastName',
                    message: 'Le nom doit contenir entre 2 et 100 caractères alphabétiques'
                });
            }
        }

        // Valider l'email
        if (email !== undefined) {
            if (!email || email.trim() === '') {
                errors.push({ field: 'email', message: 'L\'email est requis' });
            } else if (!validateEmail(email)) {
                errors.push({ field: 'email', message: 'Format d\'email invalide' });
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({ errors }, { status: 400 });
        }

        // Vérifier si l'email est déjà utilisé par un autre utilisateur
        if (email) {
            const normalizedEmail = normalizeEmail(email);
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [normalizedEmail, userId]
            );

            if (existingUser.rows.length > 0) {
                return NextResponse.json(
                    { error: 'Cette adresse email est déjà utilisée' },
                    { status: 409 }
                );
            }
        }

        // Construire la requête de mise à jour
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (firstName !== undefined) {
            updates.push(`first_name = $${paramIndex}`);
            values.push(sanitizeName(firstName));
            paramIndex++;
        }

        if (lastName !== undefined) {
            updates.push(`last_name = $${paramIndex}`);
            values.push(sanitizeName(lastName));
            paramIndex++;
        }

        if (email !== undefined) {
            updates.push(`email = $${paramIndex}`);
            values.push(normalizeEmail(email));
            paramIndex++;

            // Si l'email change, réinitialiser la vérification
            updates.push(`email_verified = FALSE`);
            updates.push(`email_verified_at = NULL`);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'Aucun champ à mettre à jour' },
                { status: 400 }
            );
        }

        // Ajouter updated_at
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        // Ajouter l'ID utilisateur
        values.push(userId);

        const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, email_verified, 
                email_verified_at, created_at, updated_at, last_login_at
    `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        const updatedUser = result.rows[0];

        // Log d'audit
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
                [
                    userId,
                    'PROFILE_UPDATED',
                    'user',
                    userId,
                    JSON.stringify({
                        updatedFields: Object.keys(body).filter(k => body[k] !== undefined)
                    })
                ]
            );
        } catch (auditError) {
            console.error('Failed to log audit event:', auditError);
        }

        return NextResponse.json({
            message: 'Profil mis à jour avec succès',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                emailVerified: updatedUser.email_verified,
                emailVerifiedAt: updatedUser.email_verified_at,
                createdAt: updatedUser.created_at,
                updatedAt: updatedUser.updated_at,
                lastLoginAt: updatedUser.last_login_at,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la mise à jour du profil' },
            { status: 500 }
        );
    }
}