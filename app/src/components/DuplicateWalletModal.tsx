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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        Dupliquer le portefeuille
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Source info */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                            <strong>Source :</strong> {sourceWallet.name}
                        </p>
                        {sourceWallet.description && (
                            <p className="text-xs text-blue-600 mt-1">
                                {sourceWallet.description}
                            </p>
                        )}
                    </div>

                    {/* New name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nom du nouveau portefeuille *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.newName}
                            onChange={(e) => setFormData({ ...formData, newName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Budget 2026"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Options de duplication :
                        </p>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyRecurringTransactions}
                                onChange={(e) =>
                                    setFormData({ ...formData, copyRecurringTransactions: e.target.checked })
                                }
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">
                                    Copier les transactions récurrentes
                                </span>
                                <p className="text-xs text-gray-600">
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
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">
                                    Copier le solde initial
                                </span>
                                <p className="text-xs text-gray-600">
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
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">
                                    Copier la description
                                </span>
                                <p className="text-xs text-gray-600">
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
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">
                                    Définir comme portefeuille par défaut
                                </span>
                                <p className="text-xs text-gray-600">
                                    Le nouveau portefeuille deviendra le portefeuille par défaut
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Info box */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
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
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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