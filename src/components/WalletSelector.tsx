// components/WalletSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Wallet } from '@/types/wallet';

interface WalletWithSharing extends Wallet {
    permission?: 'owner' | 'admin' | 'write' | 'read';
    owner_name?: string;
}

interface WalletSelectorProps {
    selectedWalletId: number | null;
    onWalletChange: (walletId: number) => void;
    onManageWallets?: () => void;
}

export default function WalletSelector({
    selectedWalletId,
    onWalletChange,
    onManageWallets,
}: WalletSelectorProps) {
    const [wallets, setWallets] = useState<WalletWithSharing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const response = await fetch('/api/wallets?includeArchived=false');
            if (response.ok) {
                const data = await response.json();
                setWallets(data);

                // Si aucun portefeuille n'est sélectionné, sélectionner le portefeuille par défaut
                if (!selectedWalletId && data.length > 0) {
                    const defaultWallet = data.find((w: Wallet) => w.is_default) || data[0];
                    onWalletChange(defaultWallet.id);
                }
            }
        } catch (error) {
            console.error('Error fetching wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Rafraîchir la liste quand les invitations sont acceptées
    const refreshWallets = () => {
        fetchWallets();
    };

    // Exposer la fonction de rafraîchissement
    useEffect(() => {
        // @ts-ignore
        window.refreshWalletSelector = refreshWallets;
        return () => {
            // @ts-ignore
            delete window.refreshWalletSelector;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-500">
                <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Chargement...</span>
            </div>
        );
    }

    // Séparer les wallets personnels et partagés
    const ownedWallets = wallets.filter(w => !w.permission || w.permission === 'owner');
    const sharedWallets = wallets.filter(w => w.permission && w.permission !== 'owner');

    const getPermissionLabel = (permission: string) => {
        switch (permission) {
            case 'admin': return '👑';
            case 'write': return '✏️';
            case 'read': return '👁️';
            default: return '';
        }
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                </svg>
                <select
                    value={selectedWalletId || ''}
                    onChange={(e) => onWalletChange(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium cursor-pointer hover:border-gray-400 transition-colors min-w-[200px]"
                >
                    {/* Wallets personnels */}
                    {ownedWallets.length > 0 && (
                        <optgroup label="📁 Mes portefeuilles">
                            {ownedWallets.map((wallet) => (
                                <option key={wallet.id} value={wallet.id}>
                                    {wallet.name}
                                    {wallet.is_default && ' ⭐'}
                                </option>
                            ))}
                        </optgroup>
                    )}

                    {/* Wallets partagés */}
                    {sharedWallets.length > 0 && (
                        <optgroup label="🤝 Partagés avec moi">
                            {sharedWallets.map((wallet) => (
                                <option key={wallet.id} value={wallet.id}>
                                    {getPermissionLabel(wallet.permission!)} {wallet.name}
                                    {wallet.owner_name && ` (${wallet.owner_name})`}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </div>

            {onManageWallets && (
                <button
                    onClick={onManageWallets}
                    className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    title="Gérer les portefeuilles"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                    Gérer
                </button>
            )}
        </div>
    );
}
