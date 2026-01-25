'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Transaction {
    id: number;
    type: 'income' | 'outcome';
    amount: number;
    description: string;
    category: string | null;
    date: string;
    is_recurring?: boolean;
    recurrence_type?: string;
    recurrence_end_date?: string | null;
}

interface EditTransactionModalProps {
    transaction: Transaction;
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditTransactionModal({
    transaction,
    onClose,
    onUpdated,
}: EditTransactionModalProps) {
    const [formData, setFormData] = useState({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category || '',
        date: format(new Date(transaction.date), 'yyyy-MM-dd'),
        is_recurring: transaction.is_recurring || false,
        recurrence_type: transaction.recurrence_type || 'monthly',
        recurrence_end_date: transaction.recurrence_end_date
            ? format(new Date(transaction.recurrence_end_date), 'yyyy-MM-dd')
            : '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/transactions/${transaction.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: formData.type,
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    category: formData.category || null,
                    date: formData.date,
                    is_recurring: formData.is_recurring,
                    recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
                    recurrence_end_date: formData.is_recurring && formData.recurrence_end_date
                        ? formData.recurrence_end_date
                        : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la mise à jour');
            }

            onUpdated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const getRecurrenceLabel = (type: string) => {
        const labels: Record<string, string> = {
            daily: 'Quotidien',
            weekly: 'Hebdomadaire',
            biweekly: 'Bi-hebdomadaire (2 semaines)',
            monthly: 'Mensuel',
            bimonthly: 'Bimestriel (2 mois)',
            quarterly: 'Trimestriel',
            yearly: 'Annuel',
        };
        return labels[type] || type;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modifier la transaction
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
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type de transaction
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.type === 'income'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="income"
                                        checked={formData.type === 'income'}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'outcome' })}
                                        className="sr-only"
                                    />
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                    Revenu
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.type === 'outcome'
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="outcome"
                                        checked={formData.type === 'outcome'}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'outcome' })}
                                        className="sr-only"
                                    />
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                    </svg>
                                    Dépense
                                </label>
                            </div>
                        </div>

                        {/* Montant */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Montant (€) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Courses, Salaire..."
                            />
                        </div>

                        {/* Catégorie */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Catégorie
                            </label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Alimentation, Transport..."
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Transaction récurrente */}
                        <div className="border-t border-gray-200 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_recurring}
                                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">
                                        Transaction récurrente
                                    </span>
                                    <p className="text-xs text-gray-500">
                                        Cette transaction se répète automatiquement
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Options de récurrence */}
                        {formData.is_recurring && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                    Options de récurrence
                                </h4>

                                {/* Fréquence */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fréquence
                                    </label>
                                    <select
                                        value={formData.recurrence_type}
                                        onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    >
                                        <option value="daily">Quotidien</option>
                                        <option value="weekly">Hebdomadaire</option>
                                        <option value="biweekly">Bi-hebdomadaire (2 semaines)</option>
                                        <option value="monthly">Mensuel</option>
                                        <option value="bimonthly">Bimestriel (2 mois)</option>
                                        <option value="quarterly">Trimestriel</option>
                                        <option value="yearly">Annuel</option>
                                    </select>
                                </div>

                                {/* Date de fin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date de fin (optionnel)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.recurrence_end_date}
                                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                                        min={formData.date}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Laisser vide pour une récurrence sans fin
                                    </p>
                                </div>

                                {/* Aperçu */}
                                <div className="bg-white border border-blue-100 rounded p-3">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">Aperçu :</span>{' '}
                                        {formData.type === 'income' ? 'Revenu' : 'Dépense'} de{' '}
                                        <span className={formData.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                            {parseFloat(formData.amount || '0').toFixed(2)} €
                                        </span>{' '}
                                        {getRecurrenceLabel(formData.recurrence_type).toLowerCase()} à partir du{' '}
                                        {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : '...'}
                                        {formData.recurrence_end_date && (
                                            <> jusqu'au {new Date(formData.recurrence_end_date).toLocaleDateString('fr-FR')}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
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
                        form="edit-form"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}