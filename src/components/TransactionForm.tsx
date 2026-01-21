'use client';

import { useState } from 'react';

interface TransactionFormProps {
  onTransactionAdded: () => void;
}

export default function TransactionForm({ onTransactionAdded }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'outcome' as 'income' | 'outcome',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
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
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la transaction');
      }

      // Reset form
      setFormData({
        type: 'outcome',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as 'income' | 'outcome' })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="income">Revenu</option>
            <option value="outcome">Dépense</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant (€) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Courses, Salaire..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Alimentation, Logement..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Section de récurrence */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center mb-4">
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

        {formData.is_recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fréquence *
              </label>
              <select
                value={formData.recurrence_type}
                onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Quotidien (tous les jours)</option>
                <option value="weekly">Hebdomadaire (toutes les semaines)</option>
                <option value="biweekly">Bi-hebdomadaire (toutes les 2 semaines)</option>
                <option value="monthly">Mensuel (tous les mois)</option>
                <option value="bimonthly">Bi-mensuel (tous les 2 mois)</option>
                <option value="quarterly">Trimestriel (tous les 3 mois)</option>
                <option value="yearly">Annuel (tous les ans)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={formData.date}
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour une récurrence illimitée
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Ajout en cours...' : 'Ajouter la transaction'}
      </button>
    </form>
  );
}
