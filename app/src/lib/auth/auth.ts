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

        // Récupérer l'utilisateur
        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
          [String(email).toLowerCase()]
        );

        if (result.rows.length === 0) {
          throw new Error('Email ou mot de passe incorrect');
        }

        const user = result.rows[0];

        // Vérifier le mot de passe
        const isValid = await verifyPassword(
          String(password),
          user.password_hash
        );

        if (!isValid) {
          throw new Error('Email ou mot de passe incorrect');
        }

        // Mettre à jour last_login_at
        await pool.query(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );

        // Retourner l'utilisateur avec toutes les infos nécessaires
        const userData = {
          id: user.id.toString(),
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
        };

        console.log('✅ User authorized:', userData);
        return userData;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Lors de la connexion initiale
      if (user) {
        token.id = user.id;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.email = user.email;
        token.name = user.name;
        console.log('✅ JWT callback (initial):', {
          id: token.id,
          firstName: token.firstName,
          lastName: token.lastName
        });
      }

      // Lors de la mise à jour de la session (trigger === 'update')
      if (trigger === 'update' && session) {
        // Mettre à jour le token avec les nouvelles données
        if (session.user) {
          token.firstName = (session.user as any).firstName || token.firstName;
          token.lastName = (session.user as any).lastName || token.lastName;
          token.email = (session.user as any).email || token.email;
          token.name = (session.user as any).name || `${token.firstName} ${token.lastName}`;
          console.log('✅ JWT callback (update):', {
            firstName: token.firstName,
            lastName: token.lastName
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Ajouter les infos du token dans la session
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).firstName = token.firstName as string;
        (session.user as any).lastName = token.lastName as string;
        (session.user as any).email = token.email as string;
        (session.user as any).name = token.name as string;

        console.log('✅ Session callback:', {
          id: (session.user as any).id,
          firstName: (session.user as any).firstName,
          lastName: (session.user as any).lastName
        });
      } else {
        console.error('❌ Session callback - token ou user manquant');
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  debug: true, // Active les logs de debug NextAuth
});