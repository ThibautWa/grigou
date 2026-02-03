// lib/auth/user-service.ts
import pool from '@/lib/db';
import { User, UserCreateDto } from '@/types/auth';
import { hashPassword, verifyPassword } from './password';
import { normalizeEmail, sanitizeName } from './validation';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Crée un nouvel utilisateur
 */
export async function createUser(data: UserCreateDto): Promise<User> {
  const client = await pool.connect();

  try {
    const email = normalizeEmail(data.email);
    const firstName = sanitizeName(data.firstName);
    const lastName = sanitizeName(data.lastName);
    const passwordHash = await hashPassword(data.password);

    // Vérifier si l'email existe déjà
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, email_verified, 
                 email_verified_at, created_at, updated_at, last_login_at, is_active`,
      [email, passwordHash, firstName, lastName]
    );

    const user = mapRowToUser(result.rows[0]);

    // Log d'audit
    await logAuditEvent(client, user.id, 'USER_REGISTERED', 'user', user.id);

    return user;
  } finally {
    client.release();
  }
}

/**
 * Trouve un utilisateur par email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);

  const result = await pool.query(
    `SELECT id, email, first_name, last_name, email_verified, 
            email_verified_at, created_at, updated_at, last_login_at, is_active
     FROM users 
     WHERE email = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * Trouve un utilisateur par ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, email, first_name, last_name, email_verified, 
            email_verified_at, created_at, updated_at, last_login_at, is_active
     FROM users 
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * Vérifie les identifiants de connexion
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ user: User | null; error?: string }> {
  const client = await pool.connect();

  try {
    const normalizedEmail = normalizeEmail(email);

    // Récupérer l'utilisateur avec le hash du mot de passe et les infos de verrouillage
    const result = await client.query(
      `SELECT id, email, password_hash, first_name, last_name, email_verified, 
              email_verified_at, created_at, updated_at, last_login_at, is_active,
              failed_login_attempts, locked_until
       FROM users 
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Ne pas révéler si l'email existe ou non
      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    const row = result.rows[0];

    // Vérifier si le compte est actif
    if (!row.is_active) {
      return { user: null, error: 'ACCOUNT_DISABLED' };
    }

    // Vérifier si le compte est verrouillé
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(row.locked_until).getTime() - Date.now()) / 60000
      );
      return { 
        user: null, 
        error: `ACCOUNT_LOCKED:${remainingMinutes}` 
      };
    }

    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, row.password_hash);

    if (!isPasswordValid) {
      // Incrémenter le compteur d'échecs
      const newFailedAttempts = row.failed_login_attempts + 1;
      
      let lockUntil = null;
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }

      await client.query(
        `UPDATE users 
         SET failed_login_attempts = $1, locked_until = $2
         WHERE id = $3`,
        [newFailedAttempts, lockUntil, row.id]
      );

      // Log d'audit
      await logAuditEvent(client, row.id, 'LOGIN_FAILED', 'user', row.id, {
        attempts: newFailedAttempts,
        locked: !!lockUntil,
      });

      if (lockUntil) {
        return { 
          user: null, 
          error: `ACCOUNT_LOCKED:${LOCKOUT_DURATION_MINUTES}` 
        };
      }

      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    // Connexion réussie - Réinitialiser les compteurs et mettre à jour last_login
    await client.query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [row.id]
    );

    // Log d'audit
    await logAuditEvent(client, row.id, 'LOGIN_SUCCESS', 'user', row.id);

    const user = mapRowToUser(row);
    return { user };
  } finally {
    client.release();
  }
}

/**
 * Met à jour la dernière connexion
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [userId]
  );
}

/**
 * Change le mot de passe d'un utilisateur
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const client = await pool.connect();

  try {
    // Vérifier le mot de passe actuel
    const result = await client.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const isValid = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return false;
    }

    // Mettre à jour avec le nouveau mot de passe
    const newHash = await hashPassword(newPassword);
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    // Log d'audit
    await logAuditEvent(client, userId, 'PASSWORD_CHANGED', 'user', userId);

    return true;
  } finally {
    client.release();
  }
}

/**
 * Log un événement d'audit
 */
async function logAuditEvent(
  client: any,
  userId: number | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, entityType, entityId, ipAddress, userAgent, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    // Ne pas faire échouer l'opération principale si le log échoue
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Convertit une ligne de la base de données en objet User
 */
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    emailVerified: row.email_verified,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    isActive: row.is_active,
  };
}
