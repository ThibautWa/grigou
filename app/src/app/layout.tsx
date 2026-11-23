import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import { themeInitScript } from '@/components/theme/theme-script';

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
  metadataBase: new URL('https://grigou.fr'),
  title: {
    default: 'Grigou – Application de gestion de budget gratuite',
    template: '%s | Grigou',
  },
  description: 'Grigou, l’application de gestion de budget personnel gratuite : suivez vos dépenses, prévoyez votre solde et partagez vos budgets. Sans pub, sans connexion bancaire.',
  keywords: ['gestion de budget', 'budget personnel', 'application budget', 'suivi des dépenses', 'prévision de solde', 'budget partagé'],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}