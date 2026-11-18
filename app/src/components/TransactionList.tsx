'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import EditTransactionModal from './EditTransactionModal';
import { Inbox, Loader2, Pencil, Repeat, Trash2 } from 'lucide-react';
import { formatEUR } from '@/lib/format';

export interface Transaction {
  id: number;
  type: 'income' | 'outcome';
  amount: number;
  description: string | null;
  category: string | null;
  category_id: number | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  date: string;
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_end_date?: string | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionDeleted: () => void;
  onTransactionUpdated?: () => void;
}

export default function TransactionList({
  transactions,
  onTransactionDeleted,
  onTransactionUpdated
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      onTransactionDeleted();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erreur lors de la suppression de la transaction');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleUpdated = () => {
    if (onTransactionUpdated) {
      onTransactionUpdated();
    } else {
      onTransactionDeleted(); // Fallback pour rafraîchir la liste
    }
  };

  const getRecurrenceLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      biweekly: 'Bi-hebdomadaire',
      monthly: 'Mensuel',
      bimonthly: 'Bi-mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel',
    };
    return labels[type] || type;
  };

  if (transactions.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle">
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-fg">Aucune transaction sur cette période</p>
        <p className="mt-1 text-sm text-fg-muted">Les opérations que vous ajoutez apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-fg-subtle">
              <th scope="col" className="px-5 py-2.5 font-medium">Opération</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Catégorie</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">Date</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Montant</th>
              <th scope="col" className="w-20 px-3 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {transactions.map((transaction) => {
              const predicted = (transaction as any).is_predicted === true;
              const isIncome = transaction.type === 'income';
              const categoryName = transaction.category_name || transaction.category;
              return (
                <tr key={transaction.id} className={`group transition-colors hover:bg-surface-2 ${predicted ? 'text-fg-muted' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className={`truncate font-medium ${predicted ? 'text-fg-muted' : 'text-fg'}`}>
                        {transaction.description || <span className="font-normal italic text-fg-subtle">Sans description</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-subtle">
                        <span className="sm:hidden">{format(new Date(transaction.date), 'd MMM', { locale: fr })}</span>
                        {categoryName && <span className="md:hidden">{categoryName}</span>}
                        {predicted && <span className="badge bg-info/10 !px-1.5 !py-0 text-info">Prévu</span>}
                        {transaction.is_recurring && !predicted && (
                          <span className="inline-flex items-center gap-1">
                            <Repeat className="h-3 w-3" aria-hidden />
                            {getRecurrenceLabel(transaction.recurrence_type || '')}
                            {transaction.recurrence_end_date && ` · jusqu'au ${format(new Date(transaction.recurrence_end_date), 'dd/MM/yyyy')}`}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    {categoryName ? (
                      <span className="inline-flex items-center gap-2 text-fg-muted">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: transaction.category_color || 'rgb(var(--fg-subtle))' }}
                          aria-hidden
                        />
                        <span className="truncate">{categoryName}</span>
                      </span>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-fg-muted sm:table-cell">
                    {format(new Date(transaction.date), 'd MMM yyyy', { locale: fr })}
                  </td>
                  <td className={`amount whitespace-nowrap px-3 py-3 text-right ${isIncome ? 'text-positive' : 'text-fg'} ${predicted ? 'opacity-70' : ''}`}>
                    {isIncome ? '+' : '−'}{formatEUR(transaction.amount)}
                  </td>
                  <td className="px-3 py-3">
                    {!predicted && (
                      <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <button onClick={() => handleEdit(transaction)} className="btn-icon" title="Modifier" aria-label="Modifier la transaction">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="btn-icon hover:!bg-negative/10 hover:!text-negative disabled:opacity-50"
                          title="Supprimer"
                          aria-label="Supprimer la transaction"
                        >
                          {deletingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
