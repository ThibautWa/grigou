// components/WalletManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { WalletWithStats } from '@/types/wallet';
import DuplicateWalletModal from '@/components/DuplicateWalletModal';
import DeleteWalletModal from '@/components/DeleteWalletModal';
import WalletShareModal from '@/components/WalletShareModal';

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
    const [sharingWallet, setSharingWallet] = useState<WalletWithStats | null>(null);
    const [walletLimitError, setWalletLimitError] = useState<string | null>(null);

    // Nombre de portefeuilles actifs (non archivés) dont l'user est propriétaire
    const activeOwnedWallets = wallets.filter(
        w => !w.archived && (!(w as any).permission || (w as any).permission === 'owner')
    ).length;
    const STANDARD_LIMIT = 3;
    const isAtLimit = activeOwnedWallets >= STANDARD_LIMIT;

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
                setWalletLimitError(null);
                setFormData({ name: '', description: '', initial_balance: '0' });
                onWalletCreated?.();
            } else {
                const error = await response.json();
                if (error.code === 'WALLET_LIMIT_REACHED') {
                    setWalletLimitError(error.error);
                    setShowCreateForm(false);
                } else {
                    alert(`Erreur: ${error.error}`);
                }
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

    const handleShare = (wallet: WalletWithStats) => {
        setSharingWallet(wallet);
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
            <div className="modal-backdrop">
                <div className="modal-panel w-auto p-8">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 border-4 border-line-strong border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-lg">Chargement...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal-backdrop">
                <div className="modal-panel max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-fg">Gestion des portefeuilles</h2>
                        <button
                            onClick={onClose}
                            className="text-fg-subtle hover:text-fg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Limite de portefeuilles */}
                        {walletLimitError && (
                            <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
                                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                                <div>
                                    <p className="font-semibold text-warning text-sm">Limite atteinte</p>
                                    <p className="text-warning text-sm mt-0.5">{walletLimitError}</p>
                                    <p className="text-warning text-xs mt-1">
                                        Passez en compte <strong>Premium</strong> pour créer des portefeuilles illimités.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Compteur portefeuilles standard */}
                        {!walletLimitError && (
                            <div className="mb-4 flex items-center justify-between text-xs text-fg-muted">
                                <span>Portefeuilles actifs</span>
                                <span className={`font-semibold ${isAtLimit ? 'text-warning' : 'text-fg'}`}>
                                    {activeOwnedWallets} / {STANDARD_LIMIT}
                                </span>
                            </div>
                        )}

                        {/* Create button */}
                        {!showCreateForm && (
                            isAtLimit ? (
                                <div className="w-full mb-6 px-4 py-3 bg-surface-2 border border-line text-fg-subtle rounded-lg flex items-center justify-center gap-2 font-medium cursor-not-allowed select-none">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Limite de {STANDARD_LIMIT} portefeuilles atteinte
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setShowCreateForm(true); setWalletLimitError(null); }}
                                    className="btn-primary mb-6 w-full"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Créer un nouveau portefeuille
                                </button>
                            )
                        )}

                        {/* Create form */}
                        {showCreateForm && (
                            <form onSubmit={handleCreate} className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                                <h3 className="mb-4 text-sm font-semibold text-fg">Nouveau portefeuille</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="field-label">
                                            Nom du portefeuille *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="field"
                                            placeholder="Ex: Compte courant, Épargne..."
                                        />
                                    </div>

                                    <div>
                                        <label className="field-label">
                                            Description (optionnel)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="field"
                                            placeholder="Ex: Mon compte principal..."
                                        />
                                    </div>

                                    <div>
                                        <label className="field-label">
                                            Solde initial
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.initial_balance}
                                            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                                            className="field"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                    >
                                        Créer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setFormData({ name: '', description: '', initial_balance: '0' });
                                        }}
                                        className="btn-secondary"
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
                                        ? 'bg-surface-2 border-line-strong'
                                        : 'bg-surface border-line hover:border-accent/50'
                                        } transition-colors`}
                                >
                                    {editingWallet?.id === wallet.id ? (
                                        // Edit mode
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={editingWallet.name}
                                                onChange={(e) => setEditingWallet({ ...editingWallet, name: e.target.value })}
                                                className="field"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdate(wallet.id, { name: editingWallet.name })}
                                                    className="px-3 py-1 bg-accent text-accent-fg rounded text-sm hover:bg-accent-hover"
                                                >
                                                    Enregistrer
                                                </button>
                                                <button
                                                    onClick={() => setEditingWallet(null)}
                                                    className="px-3 py-1 bg-surface-3 text-fg rounded text-sm hover:bg-surface-3"
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-fg">{wallet.name}</h3>
                                                    {wallet.is_default && (
                                                        <span className="px-2 py-1 bg-accent/15 text-accent text-xs font-medium rounded">
                                                            Défaut
                                                        </span>
                                                    )}
                                                    {wallet.archived && (
                                                        <span className="px-2 py-1 bg-surface-3 text-fg-muted text-xs font-medium rounded">
                                                            Archivé
                                                        </span>
                                                    )}
                                                    {/* Indicateur de permission pour les wallets partagés */}
                                                    {(wallet as any).permission && (wallet as any).permission !== 'owner' && (
                                                        <span className="px-2 py-1 bg-info/15 text-info text-xs font-medium rounded">
                                                            Partagé ({(wallet as any).permission})
                                                        </span>
                                                    )}
                                                </div>
                                                {wallet.description && (
                                                    <p className="text-sm text-fg-muted mt-1">{wallet.description}</p>
                                                )}
                                                <div className="mt-2 flex gap-4 text-sm">
                                                    <span className="text-fg-muted">
                                                        Solde actuel: <strong className="text-fg">{formatCurrency(wallet.current_balance)}</strong>
                                                    </span>
                                                    <span className="text-fg-muted">
                                                        Transactions: <strong className="text-fg">{wallet.transaction_count}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-1 ml-4">
                                                {/* Bouton de partage - seulement pour les propriétaires */}
                                                {(!(wallet as any).permission || (wallet as any).permission === 'owner') && (
                                                    <button
                                                        onClick={() => handleShare(wallet)}
                                                        className="p-2 text-fg-muted hover:text-positive hover:bg-positive/10 rounded transition-colors"
                                                        title="Partager ce portefeuille"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Duplicate button */}
                                                <button
                                                    onClick={() => handleDuplicate(wallet)}
                                                    className="p-2 text-fg-muted hover:text-info hover:bg-info/10 rounded transition-colors"
                                                    title="Dupliquer ce portefeuille"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>

                                                {!wallet.is_default && !wallet.archived && (!(wallet as any).permission || (wallet as any).permission === 'owner') && (
                                                    <button
                                                        onClick={() => handleSetDefault(wallet.id)}
                                                        className="p-2 text-fg-muted hover:text-accent-hover hover:bg-accent/10 rounded transition-colors"
                                                        title="Définir comme portefeuille par défaut"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {(!(wallet as any).permission || (wallet as any).permission === 'owner' || (wallet as any).permission === 'admin') && (
                                                    <button
                                                        onClick={() => setEditingWallet(wallet)}
                                                        className="p-2 text-fg-muted hover:text-accent-hover hover:bg-accent/10 rounded transition-colors"
                                                        title="Renommer"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {(!(wallet as any).permission || (wallet as any).permission === 'owner' || (wallet as any).permission === 'admin') && (
                                                    <button
                                                        onClick={() => handleUpdate(wallet.id, { archived: !wallet.archived })}
                                                        className="p-2 text-fg-muted hover:text-warning hover:bg-warning/10 rounded transition-colors"
                                                        title={wallet.archived ? 'Désarchiver' : 'Archiver'}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {!wallet.is_default && (!(wallet as any).permission || (wallet as any).permission === 'owner') && (
                                                    <button
                                                        onClick={() => handleDelete(wallet)}
                                                        className="p-2 text-fg-muted hover:text-negative hover:bg-negative/10 rounded transition-colors"
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
                    <div className="px-6 py-4 border-t border-line bg-surface-2">
                        <button
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {duplicatingWallet && (
                <DuplicateWalletModal
                    sourceWallet={duplicatingWallet}
                    onClose={() => setDuplicatingWallet(null)}
                    onDuplicated={handleDuplicated}
                />
            )}

            {deletingWallet && (
                <DeleteWalletModal
                    wallet={deletingWallet}
                    onClose={() => setDeletingWallet(null)}
                    onDeleted={handleDeleted}
                />
            )}

            {sharingWallet && (
                <WalletShareModal
                    wallet={sharingWallet}
                    onClose={() => setSharingWallet(null)}
                />
            )}
        </>
    );
}