'use client';

import { useState, useEffect } from 'react';
import { Wallet } from '@/types/wallet';
import { ChevronsUpDown, Settings2, Wallet as WalletIcon } from 'lucide-react';

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
        return <div className="h-9 w-48 animate-pulse rounded-lg bg-surface-2" aria-label="Chargement des portefeuilles" />;
    }

    // Separate personal and shared wallets
    const ownedWallets = wallets.filter(w => !w.permission || w.permission === 'owner');
    const sharedWallets = wallets.filter(w => w.permission && w.permission !== 'owner');

    const permissionLabel: Record<string, string> = {
        admin: 'admin',
        write: 'édition',
        read: 'lecture',
    };

    return (
        <div className="flex items-center gap-1">
            <div className="relative">
                <WalletIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <select
                    value={selectedWalletId || ''}
                    onChange={(e) => onWalletChange(parseInt(e.target.value))}
                    aria-label="Portefeuille"
                    className="h-9 max-w-[10rem] cursor-pointer appearance-none truncate rounded-lg border border-line bg-surface pl-8 pr-8 text-sm font-medium text-fg transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:max-w-[16rem]"
                >
                    {ownedWallets.length > 0 && (
                        <optgroup label="Mes portefeuilles">
                            {ownedWallets.map((wallet) => (
                                <option key={wallet.id} value={wallet.id}>
                                    {wallet.name}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    {sharedWallets.length > 0 && (
                        <optgroup label="Partagés avec moi">
                            {sharedWallets.map((wallet) => (
                                <option key={wallet.id} value={wallet.id}>
                                    {wallet.name}
                                    {wallet.owner_name ? ` · ${wallet.owner_name}` : ''}
                                    {` (${permissionLabel[wallet.permission!] ?? wallet.permission})`}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
            </div>

            {onManageWallets && (
                <button onClick={onManageWallets} className="btn-icon h-9 w-9" title="Gérer les portefeuilles" aria-label="Gérer les portefeuilles">
                    <Settings2 className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
