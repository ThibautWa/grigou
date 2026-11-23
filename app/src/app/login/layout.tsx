import type { Metadata } from 'next';
import AuthFrame from '@/components/layout/AuthFrame';

export const metadata: Metadata = {
    title: 'Connexion',
    description: 'Connectez-vous à Grigou pour suivre votre budget et vos dépenses.',
    alternates: { canonical: '/login' },
    robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <AuthFrame>{children}</AuthFrame>;
}
