import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/register',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Pages publiques (landing, auth, etc.)
      const isLandingPage = nextUrl.pathname === '/';
      const isAuthPage = nextUrl.pathname === '/login'
        || nextUrl.pathname === '/register'
        || nextUrl.pathname === '/forgot-password'
        || nextUrl.pathname === '/reset-password';

      // Routes API publiques
      const publicApiRoutes = ['/api/auth'];
      const isPublicApiRoute = publicApiRoutes.some(route =>
        nextUrl.pathname.startsWith(route)
      );

      if (isPublicApiRoute) {
        return true;
      }

      // Landing page : publique, mais redirige vers dashboard si connecté
      if (isLandingPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // Pages d'auth : redirige vers dashboard si déjà connecté
      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // Dashboard et toutes les autres routes protégées (y compris /api/*)
      if (!isLoggedIn) {
        return false; // Redirige vers /login
      }

      return true;
    },
  },
  providers: [], // Sera ajouté dans auth.ts
};