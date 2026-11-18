// components/landing/LandingClient.tsx
'use client';

import Link from 'next/link';
import {
    ArrowRight, BarChart3, CalendarClock, Check, Layers, Repeat, Tags, Users,
    LucideIcon,
} from 'lucide-react';
import Logo from '../layout/Logo';
import { ThemeIconButton } from '../theme/ThemeToggle';
import PreviewGallery from './PreviewGallery';

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
    {
        Icon: Layers,
        title: 'Plusieurs portefeuilles',
        text: 'Compte courant, épargne, budget vacances : chaque portefeuille a son solde et son historique.',
    },
    {
        Icon: Repeat,
        title: 'Transactions récurrentes',
        text: 'Loyer, abonnements, salaire : saisis une fois, répétés automatiquement.',
    },
    {
        Icon: CalendarClock,
        title: 'Prévisions',
        text: 'Projetez votre solde à n’importe quelle date et repérez les mois serrés à l’avance.',
    },
    {
        Icon: BarChart3,
        title: 'Analyses',
        text: 'Revenus, dépenses, taux d’épargne et répartition par catégorie, mois par mois.',
    },
    {
        Icon: Tags,
        title: 'Catégories à votre façon',
        text: 'Créez vos catégories avec leurs couleurs pour classer chaque dépense.',
    },
    {
        Icon: Users,
        title: 'Budgets partagés',
        text: 'Invitez un proche en lecture, en édition ou en administration.',
    },
];

const STEPS = [
    { title: 'Créez votre compte', text: 'Une adresse e-mail suffit. Votre premier portefeuille est prêt immédiatement.' },
    { title: 'Ajoutez vos opérations', text: 'Saisissez revenus et dépenses, et déclarez vos charges récurrentes.' },
    { title: 'Anticipez', text: 'Suivez votre solde, analysez vos habitudes et projetez la fin du mois.' },
];

const PERKS = ['Sans connexion bancaire', 'Sans publicité ni pistage', 'Hébergé en France'];

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Grigou',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    description: 'Application de gestion de budget personnel gratuite.',
    url: 'https://grigou.fr',
};

export default function LandingClient() {
    return (
        <div className="min-h-screen">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 md:px-6">
                    <Logo href="/" />
                    <nav className="hidden items-center gap-6 text-sm text-fg-muted md:flex" aria-label="Sections">
                        <a href="#fonctionnalites" className="hover:text-fg">Fonctionnalités</a>
                        <a href="#apercu" className="hover:text-fg">Aperçu</a>
                        <a href="#confidentialite" className="hover:text-fg">Confidentialité</a>
                    </nav>
                    <div className="ml-auto flex items-center gap-1.5">
                        <ThemeIconButton />
                        <Link href="/login" className="btn-ghost hidden sm:inline-flex">Se connecter</Link>
                        <Link href="/register" className="btn-primary">Créer un compte</Link>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:px-6 md:pt-24">
                    <div className="max-w-3xl">
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                            Gratuit, sans publicité
                        </p>
                        <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
                            Votre budget, clair aujourd’hui et prévisible demain.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
                            Grigou suit vos dépenses, prévoit votre solde des mois à venir et se partage avec vos proches,
                            sans jamais vous demander l’accès à votre banque.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link href="/register" className="btn-primary !px-5 !py-2.5 text-[15px]">
                                Commencer gratuitement
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                            <a href="#apercu" className="btn-secondary !px-5 !py-2.5 text-[15px]">Voir l’application</a>
                        </div>
                        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                            {PERKS.map((p) => (
                                <li key={p} className="inline-flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" aria-hidden />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Preview */}
                <section id="apercu" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 md:px-6">
                    <PreviewGallery />
                </section>

                {/* Features */}
                <section id="fonctionnalites" className="scroll-mt-20 border-y border-line bg-surface">
                    <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
                        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
                            <div>
                                <p className="eyebrow mb-3">Fonctionnalités</p>
                                <h2 className="text-3xl font-semibold leading-tight">L’essentiel pour tenir un budget, rien de superflu.</h2>
                                <p className="mt-4 text-fg-muted">
                                    Pas de synchronisation bancaire ni de conseils sponsorisés : vous saisissez, Grigou calcule et anticipe.
                                </p>
                            </div>
                            <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
                                {FEATURES.map(({ Icon, title, text }) => (
                                    <div key={title}>
                                        <dt className="flex items-center gap-3 font-semibold text-fg">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                                <Icon className="h-4 w-4" aria-hidden />
                                            </span>
                                            {title}
                                        </dt>
                                        <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{text}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </section>

                {/* Steps */}
                <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
                    <p className="eyebrow mb-3">Prise en main</p>
                    <h2 className="text-3xl font-semibold">Opérationnel en quelques minutes</h2>
                    <ol className="mt-10 grid gap-8 md:grid-cols-3">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="border-t border-line-strong pt-5">
                                <span className="amount text-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
                                <h3 className="mt-2 font-semibold">{step.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* Privacy */}
                <section id="confidentialite" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-20 md:px-6">
                    <div className="card grid gap-8 p-8 md:grid-cols-3 md:p-10">
                        <div className="md:col-span-1">
                            <p className="eyebrow mb-3">Confidentialité</p>
                            <h2 className="text-2xl font-semibold leading-tight">Vos chiffres ne regardent que vous.</h2>
                        </div>
                        <dl className="grid gap-6 sm:grid-cols-3 md:col-span-2">
                            <div>
                                <dt className="amount text-3xl text-fg">0</dt>
                                <dd className="mt-1 text-sm text-fg-muted">publicité, aujourd’hui comme demain</dd>
                            </div>
                            <div>
                                <dt className="amount text-3xl text-fg">0</dt>
                                <dd className="mt-1 text-sm text-fg-muted">traceur ou outil de pistage</dd>
                            </div>
                            <div>
                                <dt className="amount text-3xl text-fg">FR</dt>
                                <dd className="mt-1 text-sm text-fg-muted">données hébergées en France</dd>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="border-t border-line">
                    <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-6">
                        <div>
                            <h2 className="text-2xl font-semibold">Prêt à y voir plus clair ?</h2>
                            <p className="mt-1.5 text-fg-muted">Créez votre compte gratuitement, sans carte bancaire.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/register" className="btn-primary !px-5 !py-2.5">
                                Créer mon compte
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                            <Link href="/login" className="btn-secondary !px-5 !py-2.5">J’ai déjà un compte</Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-line">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <Logo href="/" size={22} />
                    <p>Gestionnaire de budget personnel, hébergé en France.</p>
                </div>
            </footer>
        </div>
    );
}
