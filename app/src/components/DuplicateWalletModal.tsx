'use client';

import { useState } from 'react';

interface DuplicateWalletModalProps {
    sourceWallet: {
        id: number;
        name: string;
        description?: string | null;
        initial_balance: number;
    };
    onClose: () => void;
    onDuplicated: () => void;
}

export default function DuplicateWalletModal({
    sourceWallet,
    onClose,
    onDuplicated,
}: DuplicateWalletModalProps) {
    const [formData, setFormData] = useState({
        newName: `${sourceWallet.name} (Copie)`,
        copyRecurringTransactions: true,
        copyInitialBalance: true,
        copyDescription: true,
        setAsDefault: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/wallets/${sourceWallet.id}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Wallet duplicated:', result);
                onDuplicated();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors de la duplication');
            }
        } catch (err) {
            console.error('Error duplicating wallet:', err);
            setError('Erreur lors de la duplication du portefeuille');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-panel max-w-md w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-fg">
                        Dupliquer le portefeuille
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-fg-subtle hover:text-fg transition-colors"
                        disabled={loading}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 bg-negative/10 border border-negative/30 text-negative px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Source info */}
                    <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded">
                        <p className="text-sm text-accent">
                            <strong>Source :</strong> {sourceWallet.name}
                        </p>
                        {sourceWallet.description && (
                            <p className="text-xs text-accent mt-1">
                                {sourceWallet.description}
                            </p>
                        )}
                    </div>

                    {/* New name */}
                    <div className="mb-4">
                        <label className="field-label">
                            Nom du nouveau portefeuille *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.newName}
                            onChange={(e) => setFormData({ ...formData, newName: e.target.value })}
                            className="field"
                            placeholder="Ex: Budget 2026"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-6">
                        <p className="text-sm font-medium text-fg mb-2">
                            Options de duplication :
                        </p>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyRecurringTransactions}
                                onChange={(e) =>
                                    setFormData({ ...formData, copyRecurringTransactions: e.target.checked })
                                }
                                className="mt-1 w-4 h-4 text-accent border-line-strong rounded focus:ring-accent/25"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-fg">
                                    Copier les transactions récurrentes
                                </span>
                                <p className="text-xs text-fg-muted">
                                    Les transactions récurrentes (salaire, loyer, etc.) seront copiées vers le nouveau portefeuille
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyInitialBalance}
                                onChange={(e) =>
                                    setFormData({ ...formData, copyInitialBalance: e.target.checked })
                                }
                                className="mt-1 w-4 h-4 text-accent border-line-strong rounded focus:ring-accent/25"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-fg">
                                    Copier le solde initial
                                </span>
                                <p className="text-xs text-fg-muted">
                                    Le nouveau portefeuille aura le même solde initial ({sourceWallet.initial_balance.toFixed(2)} €)
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyDescription}
                                onChange={(e) =>
                                    setFormData({ ...formData, copyDescription: e.target.checked })
                                }
                                className="mt-1 w-4 h-4 text-accent border-line-strong rounded focus:ring-accent/25"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-fg">
                                    Copier la description
                                </span>
                                <p className="text-xs text-fg-muted">
                                    Copier la description du portefeuille source
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.setAsDefault}
                                onChange={(e) =>
                                    setFormData({ ...formData, setAsDefault: e.target.checked })
                                }
                                className="mt-1 w-4 h-4 text-accent border-line-strong rounded focus:ring-accent/25"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-fg">
                                    Définir comme portefeuille par défaut
                                </span>
                                <p className="text-xs text-fg-muted">
                                    Le nouveau portefeuille deviendra le portefeuille par défaut
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Info box */}
                    <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded">
                        <p className="text-xs text-warning">
                            <strong>ℹ️ Note :</strong> Les transactions normales (non récurrentes) ne seront pas copiées.
                            Seul le nouveau portefeuille vide avec les mêmes paramètres et transactions récurrentes sera créé.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn-secondary flex-1"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Duplication...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Dupliquer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}