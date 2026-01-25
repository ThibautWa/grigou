'use client';

import { useState, useEffect } from 'react';

const WALLET_STORAGE_KEY = 'grigou_selected_wallet_id';

export function useWallet() {
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializeWallet = async () => {
            // 1. Vérifier si un portefeuille est déjà sélectionné dans localStorage
            const storedWalletId = localStorage.getItem(WALLET_STORAGE_KEY);

            if (storedWalletId) {
                // Vérifier que ce portefeuille existe toujours
                try {
                    const response = await fetch(`/api/wallets/${storedWalletId}`);
                    if (response.ok) {
                        setSelectedWalletId(parseInt(storedWalletId));
                        setIsInitialized(true);
                        return;
                    } else {
                        // Le portefeuille stocké n'existe plus, nettoyer le localStorage
                        localStorage.removeItem(WALLET_STORAGE_KEY);
                    }
                } catch (error) {
                    console.error('Error checking stored wallet:', error);
                    localStorage.removeItem(WALLET_STORAGE_KEY);
                }
            }

            // 2. Aucun portefeuille dans localStorage ou il n'existe plus
            // Charger le portefeuille par défaut depuis l'API
            try {
                const response = await fetch('/api/wallets?includeArchived=false');
                if (response.ok) {
                    const wallets = await response.json();

                    if (wallets.length > 0) {
                        // Sélectionner le portefeuille par défaut ou le premier disponible
                        const defaultWallet = wallets.find((w: any) => w.is_default) || wallets[0];
                        setSelectedWalletId(defaultWallet.id);
                        localStorage.setItem(WALLET_STORAGE_KEY, defaultWallet.id.toString());
                    }
                }
            } catch (error) {
                console.error('Error loading default wallet:', error);
            }

            setIsInitialized(true);
        };

        initializeWallet();
    }, []);

    // Sauvegarder le portefeuille sélectionné dans le localStorage
    const selectWallet = (walletId: number) => {
        setSelectedWalletId(walletId);
        localStorage.setItem(WALLET_STORAGE_KEY, walletId.toString());
    };

    return {
        selectedWalletId,
        selectWallet,
        isInitialized,
    };
}