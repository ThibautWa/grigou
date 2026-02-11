import crypto from 'crypto';
import pool from '@/lib/db';
import { hashPassword } from './password';
import { normalizeEmail } from './validation';
import { sendPasswordResetEmail } from '@/lib/email/email-service';

const TOKEN_EXPIRY_HOURS = 1;
const MAX_RESET_REQUESTS_PER_HOUR = 3; // Rate limiting par user

/**
 * Hash un token avec SHA-256 (pour stockage en BDD)
 */
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un token cryptographiquement sécurisé
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Demande de réinitialisation de mot de passe
 * Retourne toujours true pour ne pas révéler si l'email existe
 */
export async function requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
): Promise<{ success: true }> {
    const client = await pool.connect();

    try {
        const normalizedEmail = normalizeEmail(email);

        // Chercher l'utilisateur
        // Chercher l'utilisateur
        const userResult = await client.query(
            'SELECT id, first_name, email, is_active FROM users WHERE email = $1',
            [normalizedEmail]
        );

        console.log('🔍 Reset demandé pour:', normalizedEmail, '→ trouvé:', userResult.rows.length > 0);

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            console.log('⚠️ Utilisateur non trouvé ou inactif, pas d\'envoi email');
            return { success: true };
        }

        const user = userResult.rows[0];

        // Rate limiting : max N demandes par heure par utilisateur
        const recentRequests = await client.query(
            `SELECT COUNT(*) as count FROM password_reset_tokens 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [user.id]
        );

        if (parseInt(recentRequests.rows[0].count) >= MAX_RESET_REQUESTS_PER_HOUR) {
            // On log mais on retourne quand même success (anti-énumération)
            console.warn(`Rate limit atteint pour password reset, user_id: ${user.id}`);

            // Log d'audit
            await client.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [user.id, 'PASSWORD_RESET_RATE_LIMITED', 'user', user.id, ipAddress, userAgent,
                JSON.stringify({ email: normalizedEmail })]
            );

            return { success: true };
        }

        // Invalider les tokens précédents non utilisés
        await client.query(
            `UPDATE password_reset_tokens 
       SET used_at = NOW() 
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
            [user.id]
        );

        // Générer un nouveau token
        const token = generateToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

        // Stocker le token hashé
        await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
            [user.id, tokenHash, expiresAt, ipAddress, userAgent]
        );

        // Log d'audit
        await client.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, 'PASSWORD_RESET_REQUESTED', 'user', user.id, ipAddress, userAgent,
            JSON.stringify({ email: normalizedEmail })]
        );

        // Envoyer l'email (en arrière-plan, ne pas bloquer la réponse)
        sendPasswordResetEmail(user.email, user.first_name, token).catch((err) => {
            console.error('Erreur envoi email de reset:', err);
        });

        return { success: true };
    } finally {
        client.release();
    }
}

/**
 * Valide un token de réinitialisation
 */
export async function validateResetToken(
    token: string
): Promise<{ valid: boolean; userId?: number }> {
    const tokenHash = hashToken(token);

    const result = await pool.query(
        `SELECT prt.user_id, prt.expires_at, prt.used_at, u.is_active
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1`,
        [tokenHash]
    );

    if (result.rows.length === 0) {
        return { valid: false };
    }

    const row = result.rows[0];

    // Vérifications
    if (row.used_at) return { valid: false };
    if (new Date(row.expires_at) < new Date()) return { valid: false };
    if (!row.is_active) return { valid: false };

    return { valid: true, userId: row.user_id };
}

/**
 * Réinitialise le mot de passe avec un token valide
 */
export async function resetPasswordWithToken(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const tokenHash = hashToken(token);

        // Récupérer et verrouiller le token (FOR UPDATE évite les race conditions)
        const tokenResult = await client.query(
            `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
       FOR UPDATE OF prt`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Token invalide ou expiré' };
        }

        const row = tokenResult.rows[0];

        if (row.used_at) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Ce lien a déjà été utilisé' };
        }

        if (new Date(row.expires_at) < new Date()) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Ce lien a expiré. Veuillez en demander un nouveau.' };
        }

        if (!row.is_active) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Compte désactivé' };
        }

        // Hasher le nouveau mot de passe
        const passwordHash = await hashPassword(newPassword);

        // Mettre à jour le mot de passe
        await client.query(
            `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2`,
            [passwordHash, row.user_id]
        );

        // Marquer le token comme utilisé
        await client.query(
            `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
            [row.id]
        );

        // Invalider toutes les sessions existantes (sécurité)
        await client.query(
            `DELETE FROM sessions WHERE user_id = $1`,
            [row.user_id]
        );

        // Révoquer tous les refresh tokens
        await client.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
            [row.user_id]
        );

        // Log d'audit
        await client.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [row.user_id, 'PASSWORD_RESET_COMPLETED', 'user', row.user_id, ipAddress, userAgent]
        );

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur reset password:', error);
        return { success: false, error: 'Une erreur est survenue' };
    } finally {
        client.release();
    }
}