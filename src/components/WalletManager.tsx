'use client';

import { useState, useEffect } from 'react';
import { WalletWithStats } from '@/types/wallet';
import DuplicateWalletModal from '@/components/DuplicateWalletModal';
import DeleteWalletModal from '@/components/DeleteWalletModal';

interface WalletManagerProps {
    onClose: () => void;
    onWalletCreated?: () => void;
}

export default function WalletManager({ onClose, onWalletCreated }: WalletManagerProps) {
    const [wallets, setWallets] = useState<WalletWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletWithStats | null>(null);
    const [duplicatingWallet, setDuplicatingWallet] = useState<WalletWithStats | null>(null);
    const [deletingWallet, setDeletingWallet] = useState<WalletWithStats | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        initial_balance: '0',
    });

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const response = await fetch('/api/wallets?includeStats=true&includeArchived=true');
            if (response.ok) {
                const data = await response.json();
                setWallets(data);
            }
        } catch (error) {
            console.error('Error fetching wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || undefined,
                    initial_balance: parseFloat(formData.initial_balance) || 0,
                }),
            });

            if (response.ok) {
                await fetchWallets();
                setShowCreateForm(false);
                setFormData({ name: '', description: '', initial_balance: '0' });
                onWalletCreated?.();
            } else {
                const error = await response.json();
                alert(`Erreur: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating wallet:', error);
            alert('Erreur lors de la création du portefeuille');
        }
    };

    const handleUpdate = async (walletId: number, updates: any) => {
        try {
            const response = await fetch(`/api/wallets/${walletId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (response.ok) {
                await fetchWallets();
                setEditingWallet(null);
            } else {
                const error = await response.json();
                alert(`Erreur: ${error.error}`);
            }
        } catch (error) {
            console.error('Error updating wallet:', error);
            alert('Erreur lors de la mise à jour du portefeuille');
        }
    };

    const handleDelete = (wallet: WalletWithStats) => {
        if (wallet.is_default) {
            alert('Impossible de supprimer le portefeuille par défaut. Veuillez d\'abord définir un autre portefeuille comme défaut.');
            return;
        }

        setDeletingWallet(wallet);
    };

    const handleSetDefault = async (walletId: number) => {
        await handleUpdate(walletId, { is_default: true });
    };

    const handleDuplicate = (wallet: WalletWithStats) => {
        setDuplicatingWallet(wallet);
    };

    const handleDuplicated = async () => {
        await fetchWallets();
        onWalletCreated?.();
    };

    const handleDeleted = async () => {
        await fetchWallets();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-lg">Chargement...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Gestion des portefeuilles</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Create button */}
                        {!showCreateForm && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full mb-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Créer un nouveau portefeuille
                            </button>
                        )}

                        {/* Create form */}
                        {showCreateForm && (
                            <form onSubmit={handleCreate} className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900">Nouveau portefeuille</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nom du portefeuille *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ex: Compte courant, Épargne..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description (optionnel)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ex: Mon compte principal..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Solde initial
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.initial_balance}
                                            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Créer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setFormData({ name: '', description: '', initial_balance: '0' });
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Wallets list */}
                        <div className="space-y-3">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet.id}
                                    className={`p-4 border rounded-lg ${wallet.archived
                                        ? 'bg-gray-50 border-gray-300'
                                        : 'bg-white border-gray-200 hover:border-blue-300'
                                        } transition-colors`}
                                >
                                    {editingWallet?.id === wallet.id ? (
                                        // Edit mode
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={editingWallet.name}
                                                onChange={(e) => setEditingWallet({ ...editingWallet, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdate(wallet.id, { name: editingWallet.name })}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                                >
                                                    Enregistrer
                                                </button>
                                                <button
                                                    onClick={() => setEditingWallet(null)}
                                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">{wallet.name}</h3>
                                                    {wallet.is_default && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                            Défaut
                                                        </span>
                                                    )}
                                                    {wallet.archived && (
                                                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                                            Archivé
                                                        </span>
                                                    )}
                                                </div>
                                                {wallet.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{wallet.description}</p>
                                                )}
                                                <div className="mt-2 flex gap-4 text-sm">
                                                    <span className="text-gray-600">
                                                        Solde actuel: <strong className="text-gray-900">{formatCurrency(wallet.current_balance)}</strong>
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Transactions: <strong className="text-gray-900">{wallet.transaction_count}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-1 ml-4">
                                                {/* Duplicate button */}
                                                <button
                                                    onClick={() => handleDuplicate(wallet)}
                                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                    title="Dupliquer ce portefeuille"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>

                                                {!wallet.is_default && !wallet.archived && (
                                                    <button
                                                        onClick={() => handleSetDefault(wallet.id)}
                                                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Définir comme portefeuille par défaut"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setEditingWallet(wallet)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Renommer"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>

                                                <button
                                                    onClick={() => handleUpdate(wallet.id, { archived: !wallet.archived })}
                                                    className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                                    title={wallet.archived ? 'Désarchiver' : 'Archiver'}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                    </svg>
                                                </button>

                                                {!wallet.is_default && (
                                                    <button
                                                        onClick={() => handleDelete(wallet)}
                                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>

            {/* Duplicate Modal */}
            {duplicatingWallet && (
                <DuplicateWalletModal
                    sourceWallet={duplicatingWallet}
                    onClose={() => setDuplicatingWallet(null)}
                    onDuplicated={handleDuplicated}
                />
            )}

            {/* Delete Modal */}
            {deletingWallet && (
                <DeleteWalletModal
                    wallet={deletingWallet}
                    onClose={() => setDeletingWallet(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </>
    );
}