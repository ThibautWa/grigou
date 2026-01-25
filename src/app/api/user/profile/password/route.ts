import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password';

export async function PATCH(request: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await request.json();

        const { currentPassword, newPassword } = body;

        // Validation des champs requis
        if (!currentPassword) {
            return NextResponse.json(
                { error: 'Le mot de passe actuel est requis' },
                { status: 400 }
            );
        }

        if (!newPassword) {
            return NextResponse.json(
                { error: 'Le nouveau mot de passe est requis' },
                { status: 400 }
            );
        }

        // Valider la force du nouveau mot de passe
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                {
                    error: 'Le nouveau mot de passe ne respecte pas les critères de sécurité',
                    details: passwordValidation.errors
                },
                { status: 400 }
            );
        }

        // Vérifier que le nouveau mot de passe est différent de l'ancien
        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: 'Le nouveau mot de passe doit être différent de l\'ancien' },
                { status: 400 }
            );
        }

        // Récupérer le hash du mot de passe actuel
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1 AND is_active = TRUE',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Utilisateur non trouvé' },
                { status: 404 }
            );
        }

        const currentPasswordHash = userResult.rows[0].password_hash;

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await verifyPassword(currentPassword, currentPasswordHash);
        if (!isCurrentPasswordValid) {
            // Log de tentative échouée
            try {
                await pool.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
                    [userId, 'PASSWORD_CHANGE_FAILED', 'user', userId, JSON.stringify({ reason: 'invalid_current_password' })]
                );
            } catch (auditError) {
                console.error('Failed to log audit event:', auditError);
            }

            return NextResponse.json(
                { error: 'Le mot de passe actuel est incorrect' },
                { status: 401 }
            );
        }

        // Hasher le nouveau mot de passe
        const newPasswordHash = await hashPassword(newPassword);

        // Mettre à jour le mot de passe
        await pool.query(
            `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
            [newPasswordHash, userId]
        );

        // Log d'audit
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4)`,
                [userId, 'PASSWORD_CHANGED', 'user', userId]
            );
        } catch (auditError) {
            console.error('Failed to log audit event:', auditError);
        }

        return NextResponse.json({
            message: 'Mot de passe changé avec succès',
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        console.error('Error changing password:', error);
        return NextResponse.json(
            { error: 'Erreur lors du changement de mot de passe' },
            { status: 500 }
        );
    }
}