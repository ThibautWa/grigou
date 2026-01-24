'use client';

import { useState, useEffect } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import BudgetChart from '@/components/BudgetChart';
import StatsCard from '@/components/StatsCard';
import PredictedTransactions from '@/components/PredictedTransactions';

interface Transaction {
  id: number;
  type: 'income' | 'outcome';
  amount: number;
  description: string;
  category: string | null;
  date: string;
}

interface PredictedTransaction {
  id: string;
  type: 'income' | 'outcome';
  amount: number;
  description: string;
  category: string | null;
  date: string;
  is_predicted: boolean;
  original_transaction_id: number;
}

interface Stats {
  totalIncome: number;
  totalOutcome: number;
  balance: number;
  monthlyData: Array<{
    month: string;
    income: number;
    outcome: number;
    balance: number;
    cumulative: number;
    predicted_income?: number;
    predicted_outcome?: number;
  }>;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictedTransaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 0), 'yyyy-MM-dd'),
    end: format(addMonths(new Date(), 0), 'yyyy-MM-dd'),
  });

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `/api/transactions?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/stats?startDate=${dateRange.start}&endDate=${dateRange.end}&includePredictions=true`
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await fetch(
        `/api/predictions?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const data = await response.json();
      console.log('Predictions received:', data);
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTransactions(), fetchStats(), fetchPredictions()]);
      setLoading(false);
    };
    loadData();
  }, [dateRange]);

  const handleTransactionAdded = () => {
    fetchTransactions();
    fetchStats();
    fetchPredictions();
  };

  const handleTransactionDeleted = () => {
    fetchTransactions();
    fetchStats();
    fetchPredictions();
  };

  const adjustDateRange = (months: number) => {
    const newStart = format(addMonths(new Date(dateRange.start), months), 'yyyy-MM-dd');
    const newEnd = format(addMonths(new Date(dateRange.end), months), 'yyyy-MM-dd');
    setDateRange({ start: newStart, end: newEnd });
  };

  // console.log(data);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          💰 Grigou - Gestionnaire de Budget
        </h1>

        {/* Date Range Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Période:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
              <span className="text-gray-500">—</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => adjustDateRange(-1)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                ← Mois précédent
              </button>
              <button
                onClick={() => adjustDateRange(1)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Mois suivant →
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Revenus"
              amount={stats.totalIncome}
              type="income"
              icon="↗"
            />
            <StatsCard
              title="Dépenses"
              amount={stats.totalOutcome}
              type="outcome"
              icon="↘"
            />
            <StatsCard
              title="Solde"
              amount={stats.balance}
              type={stats.balance >= 0 ? 'income' : 'outcome'}
              icon="="
            />
          </div>
        )}

        {/* Chart */}
        {stats && stats.monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Évolution du Budget
            </h2>
            <BudgetChart data={stats.monthlyData} />
          </div>
        )}

        {/* Predicted Transactions */}
        {predictions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🔮 Transactions Prédites (Récurrentes)
            </h2>
            <PredictedTransactions predictions={predictions} />
          </div>
        )}

        {/* Transaction Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibent text-gray-800 mb-4">
            Nouvelle Transaction
          </h2>
          <TransactionForm onTransactionAdded={handleTransactionAdded} />
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Historique des Transactions
          </h2>
          <TransactionList
            transactions={transactions}
            onTransactionDeleted={handleTransactionDeleted}
          />
        </div>
      </div>
    </main>
  );
}