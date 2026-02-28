import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import styles from './PreviewGallery.module.css';

const AUTO_ROTATE_INTERVAL = 5000;
const SLIDE_DURATION = 600; // ms

const previewTabs = [
    { id: 'vue', label: '📊 Vue actuelle', image: '/screenshots/mode-vue-actuelle.png', alt: 'Mode vue actuelle - solde et statistiques du mois en cours' },
    { id: 'prediction', label: '🔮 Prédiction', image: '/screenshots/mode-prediction.png', alt: 'Mode prédiction - prévisions budgétaires futures' },
    { id: 'transactions', label: '📋 Transactions', image: '/screenshots/historique-des-transactions.png', alt: 'Historique des transactions avec catégories' },
    { id: 'wallets', label: '💼 Portefeuilles', image: '/screenshots/portefeuilles.png', alt: 'Gestion multi-portefeuilles' },
];

export default function PreviewGallery() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const slidingRef = useRef(false);
    const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

    const active = previewTabs[activeIndex];
    const prev = prevIndex !== null ? previewTabs[prevIndex] : null;

    const changeTab = useCallback((getNext: (current: number) => number) => {
        if (slidingRef.current) return;
        setActiveIndex(current => {
            const next = getNext(current);
            if (next === current) return current;
            slidingRef.current = true;
            setPrevIndex(current);
            setTimeout(() => {
                setPrevIndex(null);
                slidingRef.current = false;
            }, SLIDE_DURATION);
            return next;
        });
    }, []);

    const goToNext = useCallback(() => {
        changeTab(current => (current + 1) % previewTabs.length);
    }, [changeTab]);

    // Auto-rotation
    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(goToNext, AUTO_ROTATE_INTERVAL);
        return () => clearInterval(interval);
    }, [isPaused, goToNext]);

    const handleTabClick = (index: number) => {
        changeTab(() => index);
        setIsPaused(true);
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => setIsPaused(false), AUTO_ROTATE_INTERVAL * 2);
    };

    // Cleanup pause timer on unmount
    useEffect(() => {
        return () => {
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        };
    }, []);

    return (
        <div className="preview-container">
            <style>{`
                @keyframes slideOutLeft {
                    from { transform: translateX(0); opacity: 1; }
                    to   { transform: translateX(-100%); opacity: 0; }
                }
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0); opacity: 1; }
                }
                .preview-slide-track {
                    position: relative;
                    overflow: hidden;
                }
                .preview-slide-outgoing {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    animation: slideOutLeft ${SLIDE_DURATION}ms ease-in-out forwards;
                }
                .preview-slide-incoming {
                    animation: slideInFromRight ${SLIDE_DURATION}ms ease-in-out forwards;
                }
            `}</style>

            <div className="preview-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="preview-dot red" />
                    <span className="preview-dot yellow" />
                    <span className="preview-dot green" />
                    <span className="preview-url">grigou.fr</span>
                </div>
            </div>
            <div className="preview-tabs">
                {previewTabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        className={`preview-tab ${activeIndex === index ? 'active' : ''}`}
                        onClick={() => handleTabClick(index)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="preview-screenshot preview-slide-track">
                {/* Image sortante — slide vers la gauche */}
                {prev && (
                    <div className="preview-slide-outgoing" key={`out-${prevIndex}`}>
                        <Image
                            src={prev.image}
                            alt={prev.alt}
                            width={1280}
                            height={600}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                    </div>
                )}
                {/* Image entrante — slide depuis la droite */}
                <div
                    className={prev ? 'preview-slide-incoming' : undefined}
                    key={`in-${activeIndex}`}
                >
                    <Image
                        src={active.image}
                        alt={active.alt}
                        width={1280}
                        height={600}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        priority
                    />
                </div>
            </div>
        </div>
    );
}