// components/TransactionForm.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface TransactionFormProps {
  onTransactionAdded: () => void;
  selectedWalletId: number;
}

export default function TransactionForm({ onTransactionAdded, selectedWalletId }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'outcome' as 'income' | 'outcome',
    amount: '',
    description: '',
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: false,
    recurrence_type: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly',
    recurrence_end_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          wallet_id: selectedWalletId, // Ajouter le wallet_id
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la transaction');
      }

      // Réinitialiser le formulaire
      setFormData({
        type: 'outcome',
        amount: '',
        description: '',
        category: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        is_recurring: false,
        recurrence_type: 'monthly',
        recurrence_end_date: '',
      });

      onTransactionAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'outcome' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="income">Revenu</option>
            <option value="outcome">Dépense</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant (€) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            placeholder="Ex: Courses, Salaire..."
          />
        </div>

        {/* Category */}
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
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Is Recurring */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_recurring"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_recurring" className="ml-2 text-sm font-medium text-gray-700">
            Transaction récurrente
          </label>
        </div>
      </div>

      {/* Recurrence Options */}
      {formData.is_recurring && (
        <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-blue-900">Options de récurrence</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurrence Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fréquence *
              </label>
              <select
                value={formData.recurrence_type}
                onChange={(e) => setFormData({
                  ...formData,
                  recurrence_type: e.target.value as typeof formData.recurrence_type
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={formData.is_recurring}
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="biweekly">Bimensuel (2 semaines)</option>
                <option value="monthly">Mensuel</option>
                <option value="bimonthly">Bimestriel (2 mois)</option>
                <option value="quarterly">Trimestriel</option>
                <option value="yearly">Annuel</option>
              </select>
            </div>

            {/* Recurrence End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={formData.date}
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour une récurrence sans fin
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Ajout en cours...' : 'Ajouter la transaction'}
        </button>
      </div>
    </form>
  );
}