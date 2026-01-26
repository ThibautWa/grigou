'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PredictedTransaction {
  id: string;
  type: 'income' | 'outcome';
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  is_predicted: boolean;
  original_transaction_id: number;
}

interface PredictedTransactionsProps {
  predictions: PredictedTransaction[];
}

export default function PredictedTransactions({
  predictions,
}: PredictedTransactionsProps) {
  if (predictions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune transaction prédite pour cette période
      </div>
    );
  }

  // Group by month
  const predictionsByMonth: { [key: string]: PredictedTransaction[] } = {};
  predictions.forEach((pred) => {
    const monthKey = pred.date.substring(0, 7); // YYYY-MM
    if (!predictionsByMonth[monthKey]) {
      predictionsByMonth[monthKey] = [];
    }
    predictionsByMonth[monthKey].push(pred);
  });

  return (
    <div className="space-y-6">
      {Object.keys(predictionsByMonth).sort().map((month) => {
        const monthPredictions = predictionsByMonth[month];
        const totalIncome = monthPredictions
          .filter(p => p.type === 'income')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalOutcome = monthPredictions
          .filter(p => p.type === 'outcome')
          .reduce((sum, p) => sum + p.amount, 0);
        const balance = totalIncome - totalOutcome;

        return (
          <div key={month} className="border border-blue-200 rounded-lg bg-blue-50/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
              </h3>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  +{totalIncome.toFixed(2)} €
                </span>
                <span className="text-red-600 font-medium">
                  -{totalOutcome.toFixed(2)} €
                </span>
                <span className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  = {balance.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-100/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      Catégorie
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {monthPredictions.map((prediction) => (
                    <tr key={prediction.id} className="hover:bg-blue-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                        {format(new Date(prediction.date), 'dd MMM', { locale: fr })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${prediction.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {prediction.type === 'income' ? 'Revenu' : 'Dépense'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {prediction.description}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {prediction.category || '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <span
                          className={
                            prediction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {prediction.type === 'income' ? '+' : '-'}
                          {prediction.amount.toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
