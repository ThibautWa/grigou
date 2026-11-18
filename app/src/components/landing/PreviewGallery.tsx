'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const AUTO_ROTATE_INTERVAL = 6000;

const previewTabs = [
    { id: 'vue', label: 'Tableau de bord', image: '/screenshots/mode-vue-actuelle.png', alt: 'Tableau de bord : solde et indicateurs du mois en cours' },
    { id: 'prediction', label: 'Prévision', image: '/screenshots/mode-prediction.png', alt: 'Mode prévision : solde projeté à une date future' },
    { id: 'transactions', label: 'Transactions', image: '/screenshots/historique-des-transactions.png', alt: 'Historique des transactions avec catégories' },
    { id: 'analyses', label: 'Analyses', image: '/screenshots/analyses.png', alt: 'Analyses : revenus, dépenses et évolution du solde' },
];

/** Screenshots of the app, rotating automatically (paused on hover and after a click). */
export default function PreviewGallery() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const goToNext = useCallback(() => setActiveIndex((i) => (i + 1) % previewTabs.length), []);

    useEffect(() => {
        if (isPaused) return;
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (media.matches) return;
        const interval = setInterval(goToNext, AUTO_ROTATE_INTERVAL);
        return () => clearInterval(interval);
    }, [isPaused, goToNext]);

    useEffect(() => () => {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
    }, []);

    const select = (index: number) => {
        setActiveIndex(index);
        setIsPaused(true);
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(() => setIsPaused(false), AUTO_ROTATE_INTERVAL * 2);
    };

    return (
        <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            <div className="mb-4 flex justify-center">
                <div className="segmented max-w-full overflow-x-auto" role="tablist" aria-label="Aperçu de l'application">
                    {previewTabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeIndex === index}
                            aria-pressed={activeIndex === index}
                            onClick={() => select(index)}
                            className="shrink-0"
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-surface p-2" style={{ boxShadow: 'var(--shadow-pop)' }}>
                <div className="relative overflow-hidden rounded-xl border border-line">
                    {previewTabs.map((tab, index) => {
                        const visible = index === activeIndex;
                        const position = visible ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0';
                        return (
                            <div key={tab.id} className={`transition-opacity duration-500 ${position}`} aria-hidden={!visible}>
                                {/* One capture per theme */}
                                <Image src={tab.image} alt={tab.alt} width={1280} height={760} priority={index === 0} className="block h-auto w-full dark:hidden" />
                                <Image src={tab.image.replace('.png', '-dark.png')} alt={tab.alt} width={1280} height={760} priority={index === 0} className="hidden h-auto w-full dark:block" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
