// components/DeleteWalletModal.tsx
'use client';

import { useState } from 'react';

interface DeleteWalletModalProps {
    wallet: {
        id: number;
        name: string;
        transaction_count: number;
    };
    onClose: () => void;
    onDeleted: () => void;
}

export default function DeleteWalletModal({
    wallet,
    onClose,
    onDeleted,
}: DeleteWalletModalProps) {
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState('');

    const hasTransactions = wallet.transaction_count > 0;
    const requiredConfirmText = wallet.name;

    const handleArchive = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/wallets/${wallet.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: true }),
            });

            if (response.ok) {
                onDeleted();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors de l\'archivage');
            }
        } catch (err) {
            console.error('Error archiving wallet:', err);
            setError('Erreur lors de l\'archivage du portefeuille');
        } finally {
            setLoading(false);
        }
    };

    const handleForceDelete = async () => {
        if (confirmText !== requiredConfirmText) {
            setError(`Veuillez taper exactement "${requiredConfirmText}" pour confirmer`);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/wallets/${wallet.id}?force=true`, {
                method: 'DELETE',
            });

            if (response.ok) {
                onDeleted();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors de la suppression');
            }
        } catch (err) {
            console.error('Error deleting wallet:', err);
            setError('Erreur lors de la suppression du portefeuille');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Supprimer le portefeuille
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
                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                            Portefeuille : {wallet.name}
                        </p>

                        {hasTransactions ? (
                            <div className="space-y-4">
                                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div>
                                            <p className="font-bold text-red-900">
                                                Ce portefeuille contient {wallet.transaction_count} transaction{wallet.transaction_count > 1 ? 's' : ''} !
                                            </p>
                                            <p className="text-sm text-red-800 mt-1">
                                                Toutes les transactions seront définitivement supprimées. Cette action est <strong>irréversible</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-blue-900">
                                                💡 Recommandation : Archiver plutôt que supprimer
                                            </p>
                                            <p className="text-sm text-blue-800 mt-1">
                                                L'archivage masque le portefeuille mais conserve toutes les données. Vous pourrez toujours consulter l'historique.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                                    <p className="font-medium text-gray-900 mb-2">
                                        Pour confirmer la suppression définitive, tapez le nom du portefeuille :
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Tapez : <code className="bg-gray-200 px-2 py-1 rounded">{requiredConfirmText}</code>
                                    </p>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder={`Tapez "${requiredConfirmText}"`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800">
                                    Êtes-vous sûr de vouloir supprimer ce portefeuille vide ?
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        {hasTransactions && (
                            <button
                                onClick={handleArchive}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Archiver (recommandé)
                            </button>
                        )}

                        <button
                            onClick={hasTransactions ? handleForceDelete : handleForceDelete}
                            disabled={loading || (hasTransactions && confirmText !== requiredConfirmText)}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Suppression...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Supprimer définitivement{hasTransactions && ` (${wallet.transaction_count} transaction${wallet.transaction_count > 1 ? 's' : ''})`}
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}