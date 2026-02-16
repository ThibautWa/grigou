import { useState } from 'react';
import Image from 'next/image';
import styles from './PreviewGallery.module.css';


const previewTabs = [
    { id: 'vue', label: '📊 Vue actuelle', image: '/screenshots/mode-vue-actuelle.png', alt: 'Mode vue actuelle - solde et statistiques du mois en cours' },
    { id: 'prediction', label: '🔮 Prédiction', image: '/screenshots/mode-prediction.png', alt: 'Mode prédiction - prévisions budgétaires futures' },
    { id: 'transactions', label: '📋 Transactions', image: '/screenshots/historique-des-transactions.png', alt: 'Historique des transactions avec catégories' },
    { id: 'wallets', label: '💼 Portefeuilles', image: '/screenshots/portefeuilles.png', alt: 'Gestion multi-portefeuilles' },
];

export default function PreviewGallery() {
    const [activeTab, setActiveTab] = useState('vue');
    const active = previewTabs.find(t => t.id === activeTab)!;

    return (
        <div className="preview-container">
            <div className="preview-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="preview-dot red" />
                    <span className="preview-dot yellow" />
                    <span className="preview-dot green" />
                    <span className="preview-url">grigou.fr</span>
                </div>
            </div>
            <div className="preview-tabs">
                {previewTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`preview-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="preview-screenshot">
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
    );
}