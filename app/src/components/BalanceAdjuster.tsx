// components/BalanceAdjuster.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface BalanceAdjusterProps {
    walletId: number;
    currentBalance: number;
    onBalanceAdjusted: () => void;
}

export default function BalanceAdjuster({
    walletId,
    currentBalance,
    onBalanceAdjusted,
}: BalanceAdjusterProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus sur l'input quand on passe en mode édition
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditing) {
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isEditing]);

    const handleStartEdit = () => {
        setInputValue(currentBalance.toFixed(2));
        setIsEditing(true);
        setError('');
        setSuccess('');
    };

    const handleCancel = () => {
        setIsEditing(false);
        setInputValue('');
        setError('');
    };

    const handleSubmit = async () => {
        const newBalance = parseFloat(inputValue);

        if (isNaN(newBalance)) {
            setError('Veuillez entrer un montant valide');
            return;
        }

        // Vérifier si la valeur a changé
        if (Math.abs(newBalance - currentBalance) < 0.01) {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/wallets/${walletId}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newBalance,
                    currentBalance, // Envoyer le solde actuellement affiché pour un calcul précis
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'ajustement');
            }

            setSuccess(
                data.difference > 0
                    ? `+${data.difference.toFixed(2)} € ajouté`
                    : `${data.difference.toFixed(2)} € ajusté`
            );
            setIsEditing(false);

            // Rafraîchir les données
            onBalanceAdjusted();

            // Effacer le message de succès après 3 secondes
            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const difference = parseFloat(inputValue) - currentBalance;
    const isValidInput = !isNaN(parseFloat(inputValue));

    return (
        <div className="relative">
            {/* Message de succès */}
            {success && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full whitespace-nowrap animate-fade-in">
                    ✓ {success}
                </div>
            )}

            {isEditing ? (
                <div className="flex flex-col items-center gap-2">
                    {/* Input d'édition */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="number"
                                step="0.01"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                                className={`w-40 px-3 py-2 text-2xl font-bold text-center border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${error
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-blue-300 focus:ring-blue-500'
                                    }`}
                                placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                                €
                            </span>
                        </div>
                    </div>

                    {/* Aperçu de la différence */}
                    {isValidInput && Math.abs(difference) >= 0.01 && (
                        <div className={`text-sm font-medium ${difference > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {difference > 0 ? '↑' : '↓'} {difference > 0 ? '+' : ''}{difference.toFixed(2)} €
                            <span className="text-gray-500 ml-1">
                                (transaction d'ajustement)
                            </span>
                        </div>
                    )}

                    {/* Erreur */}
                    {error && (
                        <div className="text-sm text-red-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !isValidInput}
                            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Ajustement...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Ajuster
                                </>
                            )}
                        </button>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                        Entrez le solde réel de votre compte. Une transaction d'ajustement sera créée automatiquement.
                    </p>
                </div>
            ) : (
                /* Affichage normal - cliquable */
                <button
                    onClick={handleStartEdit}
                    className="group flex flex-col items-center cursor-pointer transition-all hover:scale-105"
                    title="Cliquez pour ajuster le solde"
                >
                    <span className={`text-3xl font-bold transition-colors ${currentBalance >= 0 ? 'text-blue-600 group-hover:text-blue-700' : 'text-red-600 group-hover:text-red-700'
                        }`}>
                        {formatCurrency(currentBalance)}
                    </span>

                    {/* Indicateur d'édition au survol */}
                    <span className="mt-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Cliquer pour ajuster
                    </span>
                </button>
            )}
        </div>
    );
}