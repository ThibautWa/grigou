// app/page.tsx — Landing page publique
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import './landing.css';

export default async function LandingPage() {
    const session = await auth();

    // Si déjà connecté, rediriger vers le dashboard
    if (session?.user) {
        redirect('/dashboard');
    }

    return (
        <div className="landing">
            {/* FLOATING AUTH */}
            <div className="floating-auth">
                <Link href="/login" className="float-login">Se connecter</Link>
                <Link href="/register" className="float-signup">Créer un compte</Link>
            </div>

            {/* HERO */}
            <section className="hero">
                <div className="particles-bg" />
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="dot" />
                        100% gratuit &bull; Open source
                    </div>
                    <h1>
                        Reprenez le contrôle de votre <span className="highlight">budget</span>
                    </h1>
                    <p className="hero-tagline">Le gestionnaire de budget populaire, simple et gratuit</p>
                    <p className="hero-subtitle">
                        Suivez vos dépenses, anticipez vos finances et partagez vos portefeuilles — sans jamais connecter votre banque.
                    </p>
                    <div className="hero-actions">
                        <Link href="/register" className="btn-cta btn-cta-large">
                            Commencer gratuitement
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </Link>
                        <a href="#preview" className="btn-secondary">Voir l&apos;aperçu</a>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <div className="hero-stat-value">∞</div>
                            <div className="hero-stat-label">Portefeuilles</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">100%</div>
                            <div className="hero-stat-label">Privé &amp; sécurisé</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">0€</div>
                            <div className="hero-stat-label">Toujours gratuit</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features">
                <div className="section-center">
                    <span className="section-label">Fonctionnalités</span>
                    <h2 className="section-title">Tout ce qu&apos;il faut pour<br />maîtriser vos finances</h2>
                    <p className="section-desc">
                        Une suite complète d&apos;outils financiers, conçue pour être simple à utiliser et puissante dans les détails.
                    </p>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">💼</div>
                            <h3>Multi-portefeuilles</h3>
                            <p>Gérez autant de portefeuilles que nécessaire : compte courant, épargne, budget vacances, projets... chacun avec son propre solde et historique.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>Statistiques en temps réel</h3>
                            <p>Visualisez vos revenus, dépenses et solde cumulé mois par mois grâce à des graphiques interactifs et des indicateurs clairs.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔄</div>
                            <h3>Transactions récurrentes</h3>
                            <p>Enregistrez vos charges fixes — loyer, abonnements, salaire — et laissez Grigou prédire automatiquement votre budget futur.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🏷️</div>
                            <h3>Catégories personnalisées</h3>
                            <p>Créez vos propres catégories avec icônes et couleurs, ou utilisez les catégories système. Classez chaque dépense à votre façon.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">👥</div>
                            <h3>Partage de portefeuilles</h3>
                            <p>Invitez votre partenaire ou colocataire à collaborer avec des droits granulaires : lecture, écriture ou administration complète.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔮</div>
                            <h3>Prévisions budgétaires</h3>
                            <p>Projetez votre solde dans le futur grâce aux transactions récurrentes. Anticipez les mois difficiles avant qu&apos;ils n&apos;arrivent.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* APP PREVIEW */}
            <section id="preview" className="preview-section">
                <div className="section-center">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-label">Aperçu</span>
                        <h2 className="section-title" style={{ maxWidth: 600, margin: '0 auto 0.5rem' }}>Une interface pensée pour la clarté</h2>
                        <p className="section-desc" style={{ maxWidth: 520, margin: '0 auto' }}>
                            Pas de superflu. Chaque écran va droit au but pour vous aider à comprendre votre situation financière en un coup d&apos;œil.
                        </p>
                    </div>
                    <div className="preview-container">
                        <div className="preview-toolbar">
                            <span className="preview-dot red" />
                            <span className="preview-dot yellow" />
                            <span className="preview-dot green" />
                            <span className="preview-url">grigou.app/dashboard</span>
                        </div>
                        <div className="preview-body">
                            <div className="preview-sidebar">
                                <div className="preview-sidebar-title">Portefeuilles</div>
                                <div className="preview-wallet active">
                                    <div className="preview-wallet-icon" style={{ background: 'var(--accent-glow)' }}>💳</div>
                                    <div>
                                        <div className="preview-wallet-name">Compte courant</div>
                                        <div className="preview-wallet-balance">2 847,50 €</div>
                                    </div>
                                </div>
                                <div className="preview-wallet">
                                    <div className="preview-wallet-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>🏦</div>
                                    <div>
                                        <div className="preview-wallet-name">Livret A</div>
                                        <div className="preview-wallet-balance">12 400,00 €</div>
                                    </div>
                                </div>
                                <div className="preview-wallet">
                                    <div className="preview-wallet-icon" style={{ background: 'rgba(6,182,212,0.1)' }}>✈️</div>
                                    <div>
                                        <div className="preview-wallet-name">Vacances 2026</div>
                                        <div className="preview-wallet-balance">850,00 €</div>
                                    </div>
                                </div>
                                <div className="preview-wallet">
                                    <div className="preview-wallet-icon" style={{ background: 'rgba(244,63,94,0.1)' }}>👥</div>
                                    <div>
                                        <div className="preview-wallet-name">Budget coloc</div>
                                        <div className="preview-wallet-balance">420,75 €</div>
                                    </div>
                                </div>
                            </div>
                            <div className="preview-main">
                                <div className="preview-header-row">
                                    <div>
                                        <div className="preview-balance-label">Solde actuel</div>
                                        <div className="preview-balance-amount">2 847,50 €</div>
                                        <div className="preview-balance-change">▲ +342,00 € ce mois</div>
                                    </div>
                                    <div className="btn-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', pointerEvents: 'none' }}>+ Transaction</div>
                                </div>
                                <div className="preview-chart">
                                    <svg viewBox="0 0 600 130" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgba(52,211,153,0.3)" />
                                                <stop offset="100%" stopColor="rgba(52,211,153,0)" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0,90 C50,85 100,70 150,75 C200,80 250,45 300,50 C350,55 400,30 450,35 C500,40 550,20 600,15 L600,130 L0,130 Z" fill="url(#cg)" />
                                        <path d="M0,90 C50,85 100,70 150,75 C200,80 250,45 300,50 C350,55 400,30 450,35 C500,40 550,20 600,15" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                                    </svg>
                                </div>
                                <div className="preview-tx-list">
                                    <div className="preview-tx">
                                        <div className="preview-tx-left">
                                            <div className="preview-tx-icon">🛒</div>
                                            <div>
                                                <div className="preview-tx-name">Courses Carrefour</div>
                                                <div className="preview-tx-cat">Alimentation</div>
                                            </div>
                                        </div>
                                        <div className="preview-tx-amount expense">-67,30 €</div>
                                    </div>
                                    <div className="preview-tx">
                                        <div className="preview-tx-left">
                                            <div className="preview-tx-icon">💰</div>
                                            <div>
                                                <div className="preview-tx-name">Salaire Février</div>
                                                <div className="preview-tx-cat">Revenus</div>
                                            </div>
                                        </div>
                                        <div className="preview-tx-amount income">+2 450,00 €</div>
                                    </div>
                                    <div className="preview-tx">
                                        <div className="preview-tx-left">
                                            <div className="preview-tx-icon">🏠</div>
                                            <div>
                                                <div className="preview-tx-name">Loyer</div>
                                                <div className="preview-tx-cat">Logement &bull; Récurrent</div>
                                            </div>
                                        </div>
                                        <div className="preview-tx-amount expense">-750,00 €</div>
                                    </div>
                                    <div className="preview-tx">
                                        <div className="preview-tx-left">
                                            <div className="preview-tx-icon">🎬</div>
                                            <div>
                                                <div className="preview-tx-name">Netflix</div>
                                                <div className="preview-tx-cat">Loisirs &bull; Récurrent</div>
                                            </div>
                                        </div>
                                        <div className="preview-tx-amount expense">-15,49 €</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how">
                <div className="section-center">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-label">Comment ça marche</span>
                        <h2 className="section-title">Opérationnel en 3 minutes</h2>
                        <p className="section-desc" style={{ margin: '0 auto' }}>
                            Pas de configuration complexe. Créez votre compte et commencez immédiatement.
                        </p>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <h3>Créez votre compte</h3>
                            <p>Inscription rapide avec email. Votre premier portefeuille est créé automatiquement.</p>
                        </div>
                        <div className="step">
                            <h3>Ajoutez vos transactions</h3>
                            <p>Enregistrez vos revenus et dépenses manuellement. Configurez les récurrences pour automatiser les prévisions.</p>
                        </div>
                        <div className="step">
                            <h3>Visualisez et anticipez</h3>
                            <p>Consultez vos statistiques, analysez vos habitudes et projetez votre budget dans le futur.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HIGHLIGHTS */}
            <section className="highlight-section">
                <div className="section-center">
                    <div className="highlight-grid">
                        <div className="highlight-item">
                            <h3>0 pub</h3>
                            <p>Aucune publicité. Jamais.</p>
                        </div>
                        <div className="highlight-item">
                            <h3>0 tracking</h3>
                            <p>Vos données restent les vôtres</p>
                        </div>
                        <div className="highlight-item">
                            <h3>HTTPS</h3>
                            <p>Connexion chiffrée de bout en bout</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="cta-section">
                <div className="section-center" style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="section-title">Prêt à reprendre le contrôle de vos finances ?</h2>
                    <p className="section-desc" style={{ maxWidth: 480, margin: '0 auto 2.5rem' }}>
                        Rejoignez Grigou et commencez dès aujourd&apos;hui à mieux comprendre où va votre argent.
                    </p>
                    <div className="hero-actions">
                        <Link href="/register" className="btn-cta btn-cta-large">
                            Créer mon compte gratuitement
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </Link>
                        <Link href="/login" className="btn-secondary">
                            J&apos;ai déjà un compte
                        </Link>
                    </div>
                    <ul className="cta-perks">
                        <li>
                            <span className="check">
                                <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                            </span>
                            Inscription en 30 secondes
                        </li>
                        <li>
                            <span className="check">
                                <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                            </span>
                            Aucune carte bancaire requise
                        </li>
                        <li>
                            <span className="check">
                                <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                            </span>
                            Données hébergées en France
                        </li>
                    </ul>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-logo">Grigou</div>
                    <div className="footer-text">Gestionnaire de budget personnel — Hébergé en France</div>
                </div>
            </footer>
        </div>
    );
}