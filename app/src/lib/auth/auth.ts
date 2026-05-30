// lib/auth/auth.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { verifyPassword } from './password';
import pool from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials;

        if (!email || !password) {
          throw new Error('Email et mot de passe requis');
        }

        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
          [String(email).toLowerCase()]
        );

        if (result.rows.length === 0) {
          throw new Error('Email ou mot de passe incorrect');
        }

        const user = result.rows[0];

        const isValid = await verifyPassword(
          String(password),
          user.password_hash
        );

        if (!isValid) {
          throw new Error('Email ou mot de passe incorrect');
        }

        await pool.query(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );

        // ← role ajouté ici
        return {
          id: user.id.toString(),
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role ?? 'standard',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role ?? 'standard'; // ← ajout
      }

      if (trigger === 'update' && session) {
        if (session.user) {
          token.firstName = (session.user as any).firstName || token.firstName;
          token.lastName = (session.user as any).lastName || token.lastName;
          token.email = (session.user as any).email || token.email;
          token.name = (session.user as any).name || `${token.firstName} ${token.lastName}`;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).firstName = token.firstName as string;
        (session.user as any).lastName = token.lastName as string;
        (session.user as any).email = token.email as string;
        (session.user as any).name = token.name as string;
        (session.user as any).role = token.role ?? 'standard'; // ← ajout
      } else {
        console.error('❌ Session callback - token ou user manquant');
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: true,
});