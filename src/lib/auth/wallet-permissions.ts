// lib/auth/wallet-permissions.ts
import pool from '@/lib/db';

export type WalletPermission = 'owner' | 'admin' | 'write' | 'read' | null;

/**
 * Vérifie si un utilisateur a accès à un wallet et retourne son niveau de permission
 */
export async function getWalletPermission(
  walletId: number,
  userId: number
): Promise<WalletPermission> {
  const result = await pool.query(
    `SELECT 
      CASE 
        WHEN w.user_id = $2 THEN 'owner'
        ELSE ws.permission
      END as permission
     FROM wallets w
     LEFT JOIN wallet_shares ws ON ws.wallet_id = w.id 
       AND ws.user_id = $2 
       AND ws.accepted_at IS NOT NULL
     WHERE w.id = $1
       AND (w.user_id = $2 OR ws.user_id = $2)`,
    [walletId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].permission as WalletPermission;
}

/**
 * Vérifie si l'utilisateur peut lire le wallet (toutes permissions)
 */
export async function canReadWallet(
  walletId: number,
  userId: number
): Promise<boolean> {
  const permission = await getWalletPermission(walletId, userId);
  return permission !== null;
}

/**
 * Vérifie si l'utilisateur peut écrire dans le wallet (write, admin, owner)
 */
export async function canWriteWallet(
  walletId: number,
  userId: number
): Promise<boolean> {
  const permission = await getWalletPermission(walletId, userId);
  return permission === 'owner' || permission === 'admin' || permission === 'write';
}

/**
 * Vérifie si l'utilisateur peut administrer le wallet (admin, owner)
 */
export async function canAdminWallet(
  walletId: number,
  userId: number
): Promise<boolean> {
  const permission = await getWalletPermission(walletId, userId);
  return permission === 'owner' || permission === 'admin';
}

/**
 * Vérifie si l'utilisateur est le propriétaire du wallet
 */
export async function isWalletOwner(
  walletId: number,
  userId: number
): Promise<boolean> {
  const permission = await getWalletPermission(walletId, userId);
  return permission === 'owner';
}

/**
 * Récupère tous les wallets accessibles par un utilisateur
 */
export async function getAccessibleWalletIds(userId: number): Promise<number[]> {
  const result = await pool.query(
    `SELECT DISTINCT w.id
     FROM wallets w
     LEFT JOIN wallet_shares ws ON ws.wallet_id = w.id 
       AND ws.user_id = $1 
       AND ws.accepted_at IS NOT NULL
     WHERE w.user_id = $1 OR ws.user_id = $1`,
    [userId]
  );

  return result.rows.map(row => row.id);
}

/**
 * Vérifie l'accès et retourne une erreur formatée si refusé
 */
export async function requireWalletAccess(
  walletId: number,
  userId: number,
  requiredPermission: 'read' | 'write' | 'admin' | 'owner' = 'read'
): Promise<{ allowed: boolean; permission: WalletPermission; error?: string }> {
  const permission = await getWalletPermission(walletId, userId);

  if (permission === null) {
    return {
      allowed: false,
      permission: null,
      error: 'Wallet non trouvé ou accès refusé',
    };
  }

  const permissionLevels: Record<WalletPermission & string, number> = {
    read: 1,
    write: 2,
    admin: 3,
    owner: 4,
  };

  const userLevel = permissionLevels[permission] || 0;
  const requiredLevel = permissionLevels[requiredPermission] || 0;

  if (userLevel < requiredLevel) {
    return {
      allowed: false,
      permission,
      error: `Permission insuffisante. Requis: ${requiredPermission}, actuel: ${permission}`,
    };
  }

  return { allowed: true, permission };
}
