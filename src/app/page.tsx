'use client';

import { useState, useEffect } from 'react';
import { format, subMonths, addMonths, isFuture, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import StatsCard from '@/components/StatsCard';
import PredictedTransactions from '@/components/PredictedTransactions';
import WalletSelector from '@/components/WalletSelector';
import WalletManager from '@/components/WalletManager';
import { useWallet } from '@/hooks/useWallet';
import UserMenu from '@/components/UserMenu';
import InvitationsList from '@/components/InvitationsList';


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
  const [showWalletManager, setShowWalletManager] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [futureTransactions, setFutureTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictedTransaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  // État pour mode prédiction
  const [targetDate, setTargetDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));

  // État pour mode période
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: today,
  });

  const fetchTransactions = async () => {
    if (!selectedWalletId) return;

    try {
      let start, end;

      if (viewMode === 'current') {
        start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        end = today;
      } else if (viewMode === 'prediction') {
        const targetDateObj = new Date(targetDate);
        start = format(startOfMonth(targetDateObj), 'yyyy-MM-dd');
        end = targetDate;
      } else {
        start = dateRange.start;
        end = dateRange.end;
      }

      const response = await fetch(
        `/api/transactions?walletId=${selectedWalletId}&startDate=${start}&endDate=${end}`
      );
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchFutureTransactions = async () => {
    if (!selectedWalletId) return;

    if (viewMode !== 'prediction') {
      setFutureTransactions([]);
      return;
    }

    try {
      const targetDateObj = new Date(targetDate);
      const start = format(startOfMonth(targetDateObj), 'yyyy-MM-dd');

      const response = await fetch(
        `/api/transactions?walletId=${selectedWalletId}&startDate=${start}&endDate=${targetDate}`
      );
      const data = await response.json();

      const futureNonRecurring = data.filter((t: any) =>
        !t.is_recurring && isFuture(new Date(t.date))
      );

      setFutureTransactions(futureNonRecurring);
    } catch (error) {
      console.error('Error fetching future transactions:', error);
    }
  };

  const fetchStats = async () => {
    if (!selectedWalletId) return;

    try {
      let start, end;

      if (viewMode === 'current') {
        start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        end = today;
      } else if (viewMode === 'prediction') {
        const targetDateObj = new Date(targetDate);
        start = format(startOfMonth(targetDateObj), 'yyyy-MM-dd');
        end = targetDate;
      } else {
        start = dateRange.start;
        end = dateRange.end;
      }

      const response = await fetch(
        `/api/stats?walletId=${selectedWalletId}&startDate=${start}&endDate=${end}&includePredictions=true`
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMonthlyStats = async () => {
    if (!selectedWalletId) return;

    if (viewMode !== 'prediction') {
      setMonthlyStats(null);
      return;
    }

    try {
      // Pour les stats mensuelles, on prend tout le mois
      const targetDateObj = new Date(targetDate);
      const start = format(startOfMonth(targetDateObj), 'yyyy-MM-dd');
      const end = format(endOfMonth(targetDateObj), 'yyyy-MM-dd');

      const response = await fetch(
        `/api/stats?walletId=${selectedWalletId}&startDate=${start}&endDate=${end}&includePredictions=true`
      );
      const data = await response.json();
      setMonthlyStats(data);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchPredictions = async () => {
    if (!selectedWalletId) return;

    try {
      let start, end;

      if (viewMode === 'current') {
        start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        end = today;
      } else if (viewMode === 'prediction') {
        const targetDateObj = new Date(targetDate);
        start = format(startOfMonth(targetDateObj), 'yyyy-MM-dd');
        end = targetDate;
      } else {
        start = dateRange.start;
        end = dateRange.end;
      }

      const response = await fetch(
        `/api/predictions?walletId=${selectedWalletId}&startDate=${start}&endDate=${end}`
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
      if (!selectedWalletId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchTransactions(),
        fetchStats(),
        fetchMonthlyStats(),
        fetchPredictions(),
        fetchFutureTransactions()
      ]);
      setLoading(false);
    };

    if (isInitialized) {
      loadData();
    }
  }, [selectedWalletId, dateRange, targetDate, viewMode, isInitialized]);

  const handleTransactionAdded = () => {
    fetchTransactions();
    fetchStats();
    fetchMonthlyStats();
    fetchPredictions();
    fetchFutureTransactions();
  };

  const handleTransactionDeleted = () => {
    fetchTransactions();
    fetchStats();
    fetchMonthlyStats();
    fetchPredictions();
    fetchFutureTransactions();
  };

  const adjustDateRange = (months: number) => {
    if (viewMode === 'prediction') {
      const newDate = format(addMonths(new Date(targetDate), months), 'yyyy-MM-dd');
      setTargetDate(newDate);
    } else if (viewMode === 'period') {
      const newStart = format(addMonths(new Date(dateRange.start), months), 'yyyy-MM-dd');
      const newEnd = format(addMonths(new Date(dateRange.end), months), 'yyyy-MM-dd');
      setDateRange({ start: newStart, end: newEnd });
    }
  };

  // Attendre l'initialisation du wallet
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }

  // Afficher un message si aucun portefeuille n'est sélectionné
  if (!selectedWalletId) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            💰 Grigou - Gestionnaire de Budget
          </h1>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 text-center shadow-lg max-w-2xl mx-auto">
            <svg className="w-20 h-20 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-semibold text-yellow-900 mb-3">
              Aucun portefeuille disponible
            </h2>
            <p className="text-yellow-800 mb-6">
              Vous devez créer au moins un portefeuille pour commencer à gérer votre budget.
            </p>
            <button
              onClick={() => setShowWalletManager(true)}
              className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold text-lg shadow-md hover:shadow-lg"
            >
              Créer mon premier portefeuille
            </button>
          </div>

          {showWalletManager && (
            <WalletManager
              onClose={() => setShowWalletManager(false)}
              onWalletCreated={() => {
                setShowWalletManager(false);
                // Recharger la page pour récupérer le nouveau portefeuille
                window.location.reload();
              }}
            />
          )}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const allPredictions = [
    ...predictions,
    ...futureTransactions.map(t => ({
      id: `future-${t.id}`,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      is_predicted: false,
      original_transaction_id: t.id,
    }))
  ];

  // Utiliser monthlyStats pour les cartes du mois en mode prédiction
  const displayedMonthlyStats = viewMode === 'prediction' && monthlyStats ? monthlyStats : stats;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-4xl font-bold text-gray-800">
            💰 Grigou - Gestionnaire de Budget
          </h1>

          <WalletSelector
            selectedWalletId={selectedWalletId}
            onWalletChange={selectWallet}
            onManageWallets={() => setShowWalletManager(true)}
          />
          <UserMenu />
        </div>
        <InvitationsList onInvitationAccepted={(walletId) => {
          // Rafraîchir la liste des wallets après acceptation
          window.location.reload();
        }} />

        {/* View Mode Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Current View Mode */}
            {viewMode === 'current' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-800">
                    📊 Solde au {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('period')}
                    className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
                  >
                    📅 Voir une période
                  </button>
                  <button
                    onClick={() => setViewMode('prediction')}
                    className="px-4 py-2 text-sm bg-purple-500 text-white hover:bg-purple-600 rounded transition-colors"
                  >
                    🔮 Voir une prédiction
                  </button>
                </div>
              </>
            )}

            {/* Period View Mode */}
            {viewMode === 'period' && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">📅 Période:</label>
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
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => adjustDateRange(-1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    ← Mois précédent
                  </button>
                  <button
                    onClick={() => adjustDateRange(1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    Mois suivant →
                  </button>
                  <button
                    onClick={() => setViewMode('current')}
                    className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
                  >
                    Retour aujourd'hui
                  </button>
                </div>
              </>
            )}

            {/* Prediction View Mode */}
            {viewMode === 'prediction' && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">
                    🔮 Prédiction au:
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="border border-purple-400 rounded px-3 py-1 text-sm bg-purple-50"
                  />
                  <span className="text-purple-600 text-sm font-medium">
                    Mode Prédiction
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => adjustDateRange(-1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    ← Mois précédent
                  </button>
                  <button
                    onClick={() => adjustDateRange(1)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    Mois suivant →
                  </button>
                  <button
                    onClick={() => setViewMode('current')}
                    className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
                  >
                    Retour aujourd'hui
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Monthly Stats Cards */}
        {displayedMonthlyStats && (
          <>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              {viewMode === 'current' && "📅 Ce mois-ci"}
              {viewMode === 'period' && "📅 Période sélectionnée"}
              {viewMode === 'prediction' && "📅 Prévisions du mois"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard
                title={viewMode === 'prediction' ? "Revenus du mois" : "Revenus"}
                amount={displayedMonthlyStats.totalIncome}
                walletId={selectedWalletId}
                type="income"
                icon="↗"
              />
              <StatsCard
                title={viewMode === 'prediction' ? "Dépenses du mois" : "Dépenses"}
                amount={displayedMonthlyStats.totalOutcome}
                walletId={selectedWalletId}
                type="outcome"
                icon="↘"
              />
              <StatsCard
                title={viewMode === 'prediction' ? "Solde du mois" : "Solde"}
                amount={displayedMonthlyStats.balance}
                walletId={selectedWalletId}
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
                title="Revenus cumulés"
                amount={stats.cumulativeIncome}
                walletId={selectedWalletId}
                type="income"
                icon="↗"
              />
              <StatsCard
                title="Dépenses cumulées"
                amount={stats.cumulativeOutcome}
                walletId={selectedWalletId}
                type="outcome"
                icon="↘"
              />
              <StatsCard
                title="Solde cumulé"
                amount={stats.cumulativeBalance}
                walletId={selectedWalletId}
                type={stats.cumulativeBalance >= 0 ? 'income' : 'outcome'}
                icon="="
              />
            </div>
          </>
        )}

        {/* Predicted Transactions */}
        {allPredictions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🔮 Transactions {viewMode === 'prediction' ? 'Prédites' : 'Récurrentes'}
            </h2>
            <PredictedTransactions predictions={allPredictions} />
          </div>
        )}

        {/* Transaction Form */}
        {viewMode !== 'prediction' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Nouvelle Transaction
            </h2>
            <TransactionForm
              onTransactionAdded={handleTransactionAdded}
              selectedWalletId={selectedWalletId}
            />
          </div>
        )}

        {/* Transaction List */}
        {viewMode !== 'prediction' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Historique des Transactions
            </h2>
            <TransactionList
              transactions={transactions}
              onTransactionDeleted={handleTransactionDeleted}
            />
          </div>
        )}

        {/* Wallet Manager Modal */}
        {showWalletManager && (
          <WalletManager
            onClose={() => setShowWalletManager(false)}
            onWalletCreated={() => {
              setShowWalletManager(false);
              // Recharger la page pour récupérer le nouveau portefeuille
              window.location.reload();
            }}
          />
        )}
      </div>
    </main>
  );
}