// components/BalanceAdjuster.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, Loader2, Pencil } from 'lucide-react';
import { formatEUR, formatEURSigned } from '@/lib/format';

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

            setSuccess(`${formatEURSigned(data.difference)} ajusté`);
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

    const difference = parseFloat(inputValue) - currentBalance;
    const isValidInput = !isNaN(parseFloat(inputValue));

    return (
        <div className="relative">
            {success && (
                <div className="absolute -top-1 right-0 inline-flex items-center gap-1 rounded-md bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive animate-scale-in">
                    <Check className="h-3 w-3" aria-hidden />
                    {success}
                </div>
            )}

            {isEditing ? (
                <div className="space-y-2.5">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            aria-label="Nouveau solde"
                            aria-invalid={!!error}
                            className={`field balance-input amount !py-1.5 pr-8 text-xl ${error ? '!border-negative focus:!ring-negative/20' : ''}`}
                            placeholder="0,00"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle">€</span>
                    </div>

                    {isValidInput && Math.abs(difference) >= 0.01 && (
                        <p className="text-xs text-fg-muted">
                            Ajustement de{' '}
                            <span className={`amount ${difference > 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatEURSigned(difference)}
                            </span>
                        </p>
                    )}

                    {error && (
                        <p className="flex items-center gap-1 text-xs text-negative" role="alert">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2">
                        <button onClick={handleCancel} disabled={loading} className="btn-secondary !px-3 !py-1.5 text-xs">
                            Annuler
                        </button>
                        <button onClick={handleSubmit} disabled={loading || !isValidInput} className="btn-primary !px-3 !py-1.5 text-xs">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
                            {loading ? 'Ajustement…' : 'Ajuster'}
                        </button>
                    </div>
                    <p className="text-xs text-fg-subtle">
                        Saisissez le solde réel de votre compte : une transaction d&apos;ajustement est créée.
                    </p>
                </div>
            ) : (
                <button
                    onClick={handleStartEdit}
                    className="group -mx-1 flex items-center gap-2 rounded-md px-1 text-left"
                    title="Ajuster le solde au montant de votre relevé"
                >
                    <span className={`amount text-2xl ${currentBalance >= 0 ? 'text-fg' : 'text-negative'}`}>
                        {formatEUR(currentBalance)}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                    <span className="sr-only">Ajuster le solde</span>
                </button>
            )}
        </div>
    );
}
