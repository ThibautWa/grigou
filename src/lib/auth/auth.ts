import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { verifyCredentials } from './user-service';
import { validateLoginData } from './validation';
import type { SessionUser } from '@/types/auth';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Validation des entrées
        const validationErrors = validateLoginData({ email, password });
        if (validationErrors.length > 0) {
          return null;
        }

        // Vérification des identifiants
        const { user, error } = await verifyCredentials(email, password);

        if (error || !user) {
          console.log('Login failed:', error);
          return null;
        }

        // Retourner l'utilisateur conforme à l'interface User de NextAuth
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // Stocker les données user dans le token JWT
        token.userId = user.id as number;
        token.email = user.email as string;
        token.firstName = user.firstName as string;
        token.lastName = user.lastName as string;
      }
      return token;
    },
    async session({ session, token }) {
      // Créer un objet SessionUser conforme à l'interface avec CASTS OBLIGATOIRES
      const sessionUser: SessionUser = {
        id: token.userId as number,
        email: token.email as string,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
      };

      // Retourner la session complète avec le user typé
      return {
        ...session,
        user: sessionUser,
      };
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 heures
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 heures
  },
  secret: process.env.NEXTAUTH_SECRET,
});
