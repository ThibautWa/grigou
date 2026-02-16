// components/landing/LandingClient.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import LandingAuthModal from './LandingAuthModal';
import PreviewGallery from './PreviewGallery';

type AuthTab = 'login' | 'register';

export default function LandingClient() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<AuthTab>('register');

    const openModal = useCallback((tab: AuthTab) => {
        setModalTab(tab);
        setModalOpen(true);
    }, []);

    return (
        <>
            {/* FLOATING AUTH */}
            <div className="floating-auth">
                <button className="float-login" onClick={() => openModal('login')}>
                    Se connecter
                </button>
                <button className="float-signup" onClick={() => openModal('register')}>
                    Créer un compte
                </button>
            </div>

            {/* HERO */}
            <section className="hero">
                <div className="hero-content">
                    <h1>
                        Le gestionnaire de budget <span className="highlight">populaire, simple et gratuit</span>
                    </h1>
                    <p className="hero-text">
                        Suivez vos dépenses, anticipez vos finances et partagez vos portefeuilles sans avoir besoin de connecter votre banque.
                    </p>
                    <p className="hero-tagline">Reprenez le contrôle de votre budget</p>
                    <div className="hero-actions">
                        <button className="btn-cta btn-cta-large" onClick={() => openModal('register')}>
                            Commencer gratuitement
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                        <a href="#preview" className="btn-secondary">Voir l&apos;aperçu</a>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <div className="hero-stat-value">3</div>
                            <div className="hero-stat-label">Portefeuilles</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">100%</div>
                            <div className="hero-stat-label">Privé &amp; sécurisé</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">0€</div>
                            <div className="hero-stat-label">gratuit</div>
                        </div>
                    </div>
                </div >
            </section >

            {/* FEATURES */}
            < section id="features" >
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
                            <p>Enregistrez vos charges fixes, loyer, abonnements, salaire, et laissez Grigou prédire automatiquement votre budget futur.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🏷️</div>
                            <h3>Catégories personnalisées</h3>
                            <p>Créez vos propres catégories avec icônes et couleurs. Classez chaque dépense à votre façon.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">👥</div>
                            <h3>Partage de portefeuilles</h3>
                            <p>Invitez vos proches à collaborer avec des droits accordé : consultation, modification ou administration complète.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔮</div>
                            <h3>Prévisions budgétaires</h3>
                            <p>Projetez votre solde dans le futur grâce aux transactions récurrentes. Anticipez les mois difficiles avant qu&apos;ils n&apos;arrivent.</p>
                        </div>
                    </div>
                </div>
            </section >

            {/* APP PREVIEW */}
            <section id="preview" className="preview-section">
                <div className="section-center">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-label">Aperçu</span>
                        <h2 className="section-title" style={{ maxWidth: 600, margin: '0 auto 0.5rem' }}>Une interface pensée pour la clarté</h2>
                        <p className="section-desc" style={{ maxWidth: 520, margin: '0 auto' }}>
                            Une interface simple pour vous aider à comprendre votre situation financière en un coup d&apos;œil.
                        </p>
                    </div>
                    <PreviewGallery />
                </div>
            </section>

            {/* HOW IT WORKS */}
            < section id="how" >
                <div className="section-center">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-label">Comment ça marche</span>
                        <h2 className="section-title">Rapidement opérationnel</h2>
                        <p className="section-desc" style={{ margin: '0 auto' }}>
                            Pas de configuration complexe. Créez votre compte et commencez immédiatement.
                        </p>
                    </div>
                    <div className="steps">
                        <div className="step"><h3>Créez votre compte</h3><p>Inscription rapide avec email. Votre premier portefeuille est créé automatiquement.</p></div>
                        <div className="step"><h3>Ajoutez vos transactions</h3><p>Enregistrez vos revenus et dépenses manuellement. Configurez les récurrences pour automatiser les prévisions.</p></div>
                        <div className="step"><h3>Visualisez et anticipez</h3><p>Consultez vos statistiques, analysez vos habitudes et projetez votre budget dans le futur.</p></div>
                    </div>
                </div>
            </section >

            {/* HIGHLIGHTS */}
            < section className="highlight-section" >
                <div className="section-center">
                    <div className="highlight-grid">
                        <div className="highlight-item"><h3>0 pub</h3><p>Aucune publicité</p></div>
                        <div className="highlight-item"><h3>0 tracking</h3><p>Vos données restent les vôtres</p></div>
                    </div>
                </div>
            </section >

            {/* CTA FINAL */}
            < section className="cta-section" >
                <div className="section-center" style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="section-title">Prêt à reprendre le contrôle de vos finances ?</h2>
                    <p className="section-desc" style={{ maxWidth: 480, margin: '0 auto 2.5rem' }}>
                        Rejoignez Grigou et commencez dès aujourd&apos;hui à mieux comprendre où va votre argent.
                    </p>
                    <div className="hero-actions">
                        <button className="btn-cta btn-cta-large" onClick={() => openModal('register')}>
                            Créer mon compte gratuitement
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                        <button className="btn-secondary" onClick={() => openModal('login')}>
                            J&apos;ai déjà un compte
                        </button>
                    </div>
                    <ul className="cta-perks">
                        <li>
                            <span className="check"><svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
                            Inscription rapide
                        </li>
                        <li>
                            <span className="check"><svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
                            Aucune carte bancaire requise
                        </li>
                        <li>
                            <span className="check"><svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
                            Données hébergées en France
                        </li>
                    </ul>
                </div>
            </section >

            {/* FOOTER */}
            < footer className="footer" >
                <div className="footer-inner">
                    <div className="footer-logo">Grigou</div>
                    <div className="footer-text">Gestionnaire de budget personnel hébergé en France</div>
                </div>
            </footer >

            {/* AUTH MODAL */}
            < LandingAuthModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)
                }
                defaultTab={modalTab}
            />
        </>
    );
}