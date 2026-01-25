// lib/auth/auth.config.ts
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
      const isOnDashboard = nextUrl.pathname === '/' || nextUrl.pathname.startsWith('/api/');
      const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';

      // Routes API publiques
      const publicApiRoutes = ['/api/auth'];
      const isPublicApiRoute = publicApiRoutes.some(route => 
        nextUrl.pathname.startsWith(route)
      );

      if (isPublicApiRoute) {
        return true;
      }

      // Rediriger vers login si non connecté et accès au dashboard
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirige vers la page de login
      }

      // Rediriger vers le dashboard si connecté et sur une page d'auth
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
  },
  providers: [], // Sera ajouté dans auth.ts
};
