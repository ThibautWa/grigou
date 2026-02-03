'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import CategorySelector from './CategorySelector';
import CategoryManager from './CategoryManager';

interface TransactionFormProps {
  onTransactionAdded: () => void;
  selectedWalletId: number;
}

export default function TransactionForm({ onTransactionAdded, selectedWalletId }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'outcome' as 'income' | 'outcome',
    amount: '',
    description: '',
    category_id: null as number | null,
    date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: false,
    recurrence_type: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly',
    recurrence_end_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation de la catégorie (obligatoire)
    if (!formData.category_id) {
      setError('Veuillez sélectionner une catégorie');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          wallet_id: selectedWalletId,
          amount: parseFloat(formData.amount),
          description: formData.description.trim() || null, // Description optionnelle
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
        category_id: null,
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

  // Réinitialiser la catégorie quand le type change
  const handleTypeChange = (newType: 'income' | 'outcome') => {
    setFormData({
      ...formData,
      type: newType,
      category_id: null, // Reset la catégorie car elle dépend du type
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('outcome')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${formData.type === 'outcome'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                Dépense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${formData.type === 'income'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                Revenu
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="0.00"
            />
          </div>

          {/* Category (obligatoire) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie *
            </label>
            <CategorySelector
              value={formData.category_id}
              onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
              type={formData.type}
              required={true}
              onManageCategories={() => setShowCategoryManager(true)}
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

          {/* Description (optionnel) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Courses au supermarché, Prime de fin d'année..."
            />
          </div>

          {/* Is Recurring */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Transaction récurrente
                </span>
                <p className="text-xs text-gray-500">
                  Cette transaction se répètera automatiquement
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Recurrence Options */}
        {formData.is_recurring && (
          <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Options de récurrence
            </h4>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                  Date de fin <span className="text-gray-400 font-normal">(optionnel)</span>
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Ajout en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter la transaction
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal de gestion des catégories */}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          initialType={formData.type}
        />
      )}
    </>
  );
}