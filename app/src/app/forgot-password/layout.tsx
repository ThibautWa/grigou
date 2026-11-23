import type { Metadata } from 'next';
import AuthFrame from '@/components/layout/AuthFrame';

export const metadata: Metadata = {
    title: 'Mot de passe oublié',
    robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <AuthFrame>{children}</AuthFrame>;
}
