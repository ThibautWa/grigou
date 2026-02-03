import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';  // ← Import du provider

export const metadata: Metadata = {
  title: 'Grigou - Gestionnaire de Budget',
  description: 'Application de gestion de budget personnel avec Next.js 15',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}