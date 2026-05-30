import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import './grigou-dark-theme.css';
import './grigou-fonts.css';
import Providers from '@/components/Providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Grigou – Gestionnaire de Budget Personnel Gratuit',
    template: '%s | Grigou',
  },
  description: 'Gérez votre budget personnel gratuitement avec Grigou. Suivez vos dépenses, prévoyez vos finances et partagez vos portefeuilles. Sans pub, sans tracking.',
  keywords: ['budget personnel', 'gestion budget', 'suivi dépenses', 'prévision financière', 'portefeuille'],
  authors: [{ name: 'Grigou' }],
  openGraph: {
    title: 'Grigou – Gestionnaire de Budget Personnel',
    description: 'Suivez vos dépenses, prévoyez l\'avenir, reprenez le contrôle de vos finances.',
    url: 'https://grigou.fr',
    siteName: 'Grigou',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grigou – Budget Personnel Gratuit',
    description: 'Gérez vos finances simplement, sans pub ni tracking.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://grigou.fr' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}