// lib/auth/get-session.ts
import { auth } from './auth';

/**
 * Récupère la session de l'utilisateur connecté
 */
export async function getSession() {
  return await auth();
}

/**
 * Récupère la session de l'utilisateur actuel côté serveur
 * À utiliser dans les Server Components et les Route Handlers
 */
export async function getServerSession() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    user: session.user,
  };
}

/**
 * Récupère l'ID de l'utilisateur connecté
 * Lance une erreur UNAUTHORIZED si l'utilisateur n'est pas connecté
 */
export async function requireUserId(): Promise<number> {
  const session = await auth();

  // Debug - à supprimer après correction
  if (!session || !session.user) {
    console.error('❌ Session ou user manquant:', { session });
    throw new Error('UNAUTHORIZED');
  }

  // Récupérer l'ID avec assertion de type
  const userId = (session.user as any).id;

  if (!userId) {
    console.error('❌ User ID manquant dans session.user:', session.user);
    throw new Error('UNAUTHORIZED');
  }

  // Convertir en nombre
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  if (isNaN(userIdNum)) {
    console.error('❌ User ID invalide:', userId);
    throw new Error('UNAUTHORIZED');
  }

  return userIdNum;
}

/**
 * Récupère l'utilisateur connecté (avec toutes ses infos)
 */
export async function requireUser() {
  const session = await auth();

  if (!session || !session.user) {
    throw new Error('UNAUTHORIZED');
  }

  return session.user;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}