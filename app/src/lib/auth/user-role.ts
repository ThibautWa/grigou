// lib/auth/user-role.ts
// Source unique de vérité pour les rôles et leurs restrictions.
// À importer partout où une décision de permissions est nécessaire.

import pool from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'standard' | 'premium' | 'admin';

export interface RoleLimits {
    maxWallets: number | null; // null = illimité
}

// ─── Limites par rôle ─────────────────────────────────────────────────────────
// Modifier ici uniquement pour changer une règle métier.

export const ROLE_LIMITS: Record<UserRole, RoleLimits> = {
    standard: {
        maxWallets: 3,
    },
    premium: {
        maxWallets: null,
    },
    admin: {
        maxWallets: null,
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Récupère le rôle d'un utilisateur depuis la base de données.
 * Retourne 'standard' par défaut si l'utilisateur n'est pas trouvé.
 */
export async function getUserRole(userId: number): Promise<UserRole> {
    const result = await pool.query<{ role: UserRole }>(
        'SELECT role FROM users WHERE id = $1',
        [userId],
    );
    return result.rows[0]?.role ?? 'standard';
}

/**
 * Retourne les limites associées au rôle d'un utilisateur.
 */
export async function getUserLimits(userId: number): Promise<RoleLimits> {
    const role = await getUserRole(userId);
    return ROLE_LIMITS[role];
}

/**
 * Vérifie si un utilisateur peut créer un portefeuille supplémentaire.
 * Retourne { allowed: true } ou { allowed: false, reason: string, limit: number }.
 */
export async function canCreateWallet(
    userId: number,
): Promise<{ allowed: true } | { allowed: false; reason: string; limit: number }> {
    const limits = await getUserLimits(userId);

    // Rôles sans limite
    if (limits.maxWallets === null) {
        return { allowed: true };
    }

    // Compter les portefeuilles non archivés appartenant à l'utilisateur
    const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
     FROM wallets
     WHERE user_id = $1 AND archived = FALSE`,
        [userId],
    );
    const current = parseInt(result.rows[0].count, 10);

    if (current >= limits.maxWallets) {
        return {
            allowed: false,
            reason: `Les comptes standard sont limités à ${limits.maxWallets} portefeuilles actifs.`,
            limit: limits.maxWallets,
        };
    }

    return { allowed: true };
}