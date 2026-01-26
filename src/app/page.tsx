'use client';

import { useState, useEffect } from 'react';
import { format, subMonths, addMonths, isFuture, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import TransactionForm from '@/components/TransactionForm';
import TransactionList, { Transaction } from '@/components/TransactionList';
import BudgetChart from '@/components/BudgetChart';
import StatsCard from '@/components/StatsCard';
import PredictedTransactions from '@/components/PredictedTransactions';
import WalletSelector from '@/components/WalletSelector';
import WalletManager from '@/components/WalletManager';
import UserMenu from '@/components/UserMenu';
import InvitationsList from '@/components/InvitationsList';
import BalanceAdjuster from '@/components/BalanceAdjuster';
import { useWallet } from '@/hooks/useWallet';

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
  cumulativeIncome: number;
  cumulativeOutcome: number;
  cumulativeBalance: number;
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

type ViewMode = 'current' | 'period' | 'prediction';

export default function Home() {
  const { selectedWalletId, selectWallet, isInitialized } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictedTransaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWalletManager, setShowWalletManager] = useState(false);

  // View mode: 'current' (default), 'period', or 'prediction'
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  // Date range for period mode
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Single date for prediction mode
  const [predictionDate, setPredictionDate] = useState(
    format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  );

  // Fetch data when wallet changes or dates change
  useEffect(() => {
    if (selectedWalletId && isInitialized) {
      fetchData();
    }
  }, [selectedWalletId, isInitialized, viewMode, dateRange, predictionDate]);

  const fetchData = async () => {
    if (!selectedWalletId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchStats(),
        fetchPredictions(),
      ]);

      if (viewMode === 'prediction') {
        await fetchMonthlyStats();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedWalletId) return;

    let url = `/api/transactions?walletId=${selectedWalletId}`;

    if (viewMode === 'period') {
      url += `&startDate=${dateRange.start}&endDate=${dateRange.end}`;
    } else if (viewMode === 'current') {
      // Current view: all transactions up to today
      url += `&endDate=${format(new Date(), 'yyyy-MM-dd')}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStats = async () => {
    if (!selectedWalletId) return;

    let url = `/api/stats?walletId=${selectedWalletId}`;

    if (viewMode === 'period') {
      url += `&startDate=${dateRange.start}&endDate=${dateRange.end}&includePredictions=false`;
    } else if (viewMode === 'prediction') {
      url += `&endDate=${predictionDate}&includePredictions=true`;
    } else {
      // Current view: up to today
      url += `&endDate=${format(new Date(), 'yyyy-MM-dd')}&includePredictions=false`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMonthlyStats = async () => {
    if (!selectedWalletId || viewMode !== 'prediction') return;

    const predDate = new Date(predictionDate);
    const monthStart = format(startOfMonth(predDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(predDate), 'yyyy-MM-dd');

    try {
      const response = await fetch(
        `/api/stats?walletId=${selectedWalletId}&startDate=${monthStart}&endDate=${monthEnd}&includePredictions=true`
      );
      const data = await response.json();
      setMonthlyStats(data);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchPredictions = async () => {
    if (!selectedWalletId) return;

    if (viewMode !== 'prediction') {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/predictions?walletId=${selectedWalletId}&startDate=${format(new Date(), 'yyyy-MM-dd')}&endDate=${predictionDate}`
      );
      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const handleTransactionAdded = () => {
    fetchData();
  };

  const handleTransactionDeleted = () => {
    fetchData();
  };

  const handleInvitationAccepted = (walletId: number) => {
    // @ts-ignore
    if (window.refreshWalletSelector) {
      // @ts-ignore
      window.refreshWalletSelector();
    }
    selectWallet(walletId);
  };

  const adjustDateRange = (months: number) => {
    const newStart = addMonths(new Date(dateRange.start), months);
    const newEnd = addMonths(new Date(dateRange.end), months);
    setDateRange({
      start: format(newStart, 'yyyy-MM-dd'),
      end: format(newEnd, 'yyyy-MM-dd'),
    });
  };

  const adjustPredictionDate = (months: number) => {
    const newDate = addMonths(new Date(predictionDate), months);
    setPredictionDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Determine which stats to display for monthly section
  const displayedMonthlyStats = viewMode === 'prediction' && monthlyStats ? monthlyStats : stats;

  if (!isInitialized) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-lg text-gray-600">Chargement...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-4xl font-bold text-gray-800">
            💰 Grigou - Gestionnaire de Budget
          </h1>

          <div className="flex items-center gap-4">
            <WalletSelector
              selectedWalletId={selectedWalletId}
              onWalletChange={selectWallet}
              onManageWallets={() => setShowWalletManager(true)}
            />
            <UserMenu />
          </div>
        </div>

        {/* Invitations en attente */}
        <InvitationsList onInvitationAccepted={handleInvitationAccepted} />

        {/* View Mode Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Mode :</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => setViewMode('current')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'current'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  📍 Vue actuelle
                </button>
                <button
                  onClick={() => setViewMode('period')}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${viewMode === 'period'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  📅 Période
                </button>
                <button
                  onClick={() => setViewMode('prediction')}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${viewMode === 'prediction'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  🔮 Prédiction
                </button>
              </div>
            </div>

            {/* Date Controls based on mode */}
            {viewMode === 'period' && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Du:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <span className="text-gray-500">au</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => adjustDateRange(-1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    ← Mois
                  </button>
                  <button
                    onClick={() => adjustDateRange(1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    Mois →
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'prediction' && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Prédiction au :</label>
                <input
                  type="date"
                  value={predictionDate}
                  onChange={(e) => setPredictionDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => adjustPredictionDate(-1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    ← Mois
                  </button>
                  <button
                    onClick={() => adjustPredictionDate(1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    Mois →
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'current' && (
              <div className="text-sm text-gray-600">
                📍 Solde au {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-lg text-gray-600">Chargement des données...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Monthly Stats Cards (Period) */}
            {displayedMonthlyStats && viewMode !== 'current' && (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  📅 {viewMode === 'prediction' ? 'Prévisions du mois' : 'Période sélectionnée'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? "Revenus du mois" : "Revenus"}
                    amount={displayedMonthlyStats.totalIncome}
                    type="income"
                    icon="↗"
                  />
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? "Dépenses du mois" : "Dépenses"}
                    amount={displayedMonthlyStats.totalOutcome}
                    type="outcome"
                    icon="↘"
                  />
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? "Solde du mois" : "Solde"}
                    amount={displayedMonthlyStats.balance}
                    type={displayedMonthlyStats.balance >= 0 ? 'income' : 'outcome'}
                    icon="="
                  />
                </div>
              </>
            )}

            {/* Cumulative Balance Card - Always shown */}
            {stats && (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  💰 Solde cumulé {viewMode === 'prediction' && 'prévisionnel'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <StatsCard
                    walletId={selectedWalletId!}
                    title="Revenus cumulés"
                    amount={stats.cumulativeIncome}
                    type="income"
                    icon="↗"
                  />
                  <StatsCard
                    walletId={selectedWalletId!}
                    title="Dépenses cumulées"
                    amount={stats.cumulativeOutcome}
                    type="outcome"
                    icon="↘"
                  />

                  {/* ========================================= */}
                  {/* CARTE SOLDE CUMULÉ AVEC AJUSTEMENT       */}
                  {/* ========================================= */}
                  <div className={`rounded-lg p-6 shadow-sm border ${stats.cumulativeBalance >= 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Solde cumulé</h3>
                      <span className="text-2xl">💰</span>
                    </div>

                    {viewMode === 'current' ? (
                      /* Mode "Vue actuelle" : Solde cliquable pour ajustement */
                      <BalanceAdjuster
                        walletId={selectedWalletId!}
                        currentBalance={stats.cumulativeBalance}
                        onBalanceAdjusted={fetchData}
                      />
                    ) : (
                      /* Modes "Période" ou "Prédiction" : Affichage simple */
                      <p className={`text-3xl font-bold ${stats.cumulativeBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                        {stats.cumulativeBalance.toFixed(2)} €
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Predicted Transactions */}
            {predictions.length > 0 && viewMode === 'prediction' && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  🔮 Transactions Prédites
                </h2>
                <PredictedTransactions predictions={predictions} />
              </div>
            )}

            {/* Transaction List - Only in current and period mode */}
            {viewMode !== 'prediction' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  📋 Historique des Transactions
                </h2>
                <TransactionList
                  transactions={transactions}
                  onTransactionDeleted={handleTransactionDeleted}
                  onTransactionUpdated={handleTransactionDeleted}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Wallet Manager Modal */}
      {showWalletManager && (
        <WalletManager
          onClose={() => setShowWalletManager(false)}
          onWalletCreated={() => {
            // @ts-ignore
            if (window.refreshWalletSelector) {
              // @ts-ignore
              window.refreshWalletSelector();
            }
          }}
        />
      )}
    </main>
  );
}