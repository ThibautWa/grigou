'use client';

import { useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import CategorySelector from './CategorySelector';
import CategoryManager from './CategoryManager';

interface TransactionFormProps {
  onTransactionAdded: () => void;
  selectedWalletId: number;
  /** Start with "Transaction récurrente" ticked (used on the Récurrences page). */
  defaultRecurring?: boolean;
}

export default function TransactionForm({ onTransactionAdded, selectedWalletId, defaultRecurring = false }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'outcome' as 'income' | 'outcome',
    amount: '',
    description: '',
    category_id: null as number | null,
    date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: defaultRecurring,
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
        is_recurring: defaultRecurring,
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
          <div className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2.5 text-sm text-negative" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}

        {/* Type */}
        <div className="segmented grid w-full grid-cols-2" role="group" aria-label="Type de transaction">
          <button type="button" aria-pressed={formData.type === 'outcome'} onClick={() => handleTypeChange('outcome')} className="justify-center">
            <ArrowDownRight className={`h-4 w-4 ${formData.type === 'outcome' ? 'text-negative' : ''}`} aria-hidden />
            Dépense
          </button>
          <button type="button" aria-pressed={formData.type === 'income'} onClick={() => handleTypeChange('income')} className="justify-center">
            <ArrowUpRight className={`h-4 w-4 ${formData.type === 'income' ? 'text-positive' : ''}`} aria-hidden />
            Revenu
          </button>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="tx-amount" className="field-label">Montant</label>
          <div className="relative">
            <input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="field amount pr-8 text-lg"
              required
              placeholder="0,00"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle">€</span>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="field-label">Catégorie</label>
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
          <label htmlFor="tx-date" className="field-label">Date</label>
          <input
            id="tx-date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="field"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="tx-description" className="field-label">
            Description <span className="font-normal text-fg-subtle">(facultatif)</span>
          </label>
          <input
            id="tx-description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="field"
            placeholder="Courses, loyer, prime…"
          />
        </div>

        {/* Recurrence */}
        <div className="rounded-lg border border-line">
          <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
            <input
              type="checkbox"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-line-strong"
            />
            <span>
              <span className="block text-sm font-medium text-fg">Transaction récurrente</span>
              <span className="block text-xs text-fg-muted">Elle sera répétée automatiquement</span>
            </span>
          </label>

          {formData.is_recurring && (
            <div className="grid grid-cols-2 gap-3 border-t border-line bg-surface-2/60 px-3 py-3">
              <div>
                <label htmlFor="tx-frequency" className="field-label text-xs">Fréquence</label>
                <select
                  id="tx-frequency"
                  value={formData.recurrence_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurrence_type: e.target.value as typeof formData.recurrence_type
                  })}
                  className="field"
                  required={formData.is_recurring}
                >
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="biweekly">Toutes les 2 semaines</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="bimonthly">Tous les 2 mois</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="yearly">Annuelle</option>
                </select>
              </div>
              <div>
                <label htmlFor="tx-end" className="field-label text-xs">Jusqu&apos;au</label>
                <input
                  id="tx-end"
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  className="field"
                  min={formData.date}
                />
              </div>
              <p className="col-span-2 text-xs text-fg-subtle">Sans date de fin, la récurrence continue indéfiniment.</p>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {loading ? 'Ajout en cours…' : 'Ajouter la transaction'}
        </button>
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