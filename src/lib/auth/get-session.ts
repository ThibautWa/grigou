// lib/auth/get-session.ts
import { auth } from './auth';
import { SessionUser } from '@/types/auth';

/**
 * Récupère la session de l'utilisateur actuel côté serveur
 * À utiliser dans les Server Components et les Route Handlers
 */
export async function getServerSession(): Promise<{ user: SessionUser } | null> {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return {
    user: session.user as SessionUser,
  };
}

/**
 * Récupère l'ID de l'utilisateur actuel ou lance une erreur
 * À utiliser dans les Route Handlers protégés
 */
export async function requireUserId(): Promise<number> {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }

  return session.user.id;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}
