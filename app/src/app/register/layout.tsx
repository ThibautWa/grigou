import type { Metadata } from 'next';
import AuthFrame from '@/components/layout/AuthFrame';

export const metadata: Metadata = {
    title: 'Créer un compte gratuit',
    description: 'Créez votre compte Grigou gratuitement et commencez à gérer votre budget en quelques minutes. Sans carte bancaire ni connexion à votre banque.',
    alternates: { canonical: '/register' },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <AuthFrame>{children}</AuthFrame>;
}
