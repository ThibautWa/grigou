'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transaction {
  id: number;
  type: 'income' | 'outcome';
  amount: number;
  description: string;
  category: string | null;
  date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionDeleted: () => void;
}

export default function TransactionList({
  transactions,
  onTransactionDeleted,
}: TransactionListProps) {
  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }

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
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune transaction pour cette période
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Catégorie
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Montant
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(transaction.date), 'dd MMM yyyy', { locale: fr })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {transaction.type === 'income' ? 'Revenu' : 'Dépense'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {transaction.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {transaction.category || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <span
                  className={
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {transaction.amount.toFixed(2)} €
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  onClick={() => handleDelete(transaction.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
