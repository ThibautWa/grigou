import type { Metadata } from 'next';
import './globals.css';

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
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
