'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import Image from 'next/image';
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

// ============================================================
// Composant bloc dépliable de détail des calculs
// ============================================================
interface CalcDetailProps {
  title: string;
  transactions: Transaction[];
  totalIncome: number;
  totalOutcome: number;
  balance: number;
  // Pour le bloc solde cumulé (mode prédiction uniquement)
  showCumulative?: boolean;
  initialBalance?: number;
  cumulativeIncome?: number;
  cumulativeOutcome?: number;
  cumulativeBalance?: number;
  predictionDate?: string;
}

function CalcDetail({
  title,
  transactions,
  totalIncome,
  totalOutcome,
  balance,
  showCumulative,
  initialBalance,
  cumulativeIncome,
  cumulativeOutcome,
  cumulativeBalance,
  predictionDate,
}: CalcDetailProps) {
  const [open, setOpen] = useState(false);

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const outcomeTransactions = transactions.filter(t => t.type === 'outcome');

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 mb-8 text-sm overflow-hidden">
      {/* Header cliquable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-3 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
      >
        <span className="font-medium">💡 {title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenu dépliable */}
      {open && (
        <div className="px-6 pb-5 pt-1 border-t border-gray-700">

          {/* --- Revenus --- */}
          {incomeTransactions.length > 0 && (
            <div className="mb-4">
              <p className="text-green-400 font-semibold mb-2 uppercase tracking-wide text-xs">Revenus</p>
              <div className="space-y-1 font-mono">
                {incomeTransactions.map((t, i) => (
                  <div key={t.id ?? i} className="flex justify-between text-gray-300">
                    <span className="truncate max-w-xs text-gray-400">
                      {format(new Date(t.date), 'dd/MM', { locale: fr })}
                      {' · '}
                      {t.description || <span className="italic text-gray-500">Sans description</span>}
                      {(t as any).is_predicted && (
                        <span className="ml-1 text-blue-400 text-xs">(prévu)</span>
                      )}
                    </span>
                    <span className="text-green-400 ml-4 flex-shrink-0">+{formatAmount(t.amount)} €</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-green-400 font-bold">
                  <span>Total revenus</span>
                  <span>+{formatAmount(totalIncome)} €</span>
                </div>
              </div>
            </div>
          )}

          {/* --- Dépenses --- */}
          {outcomeTransactions.length > 0 && (
            <div className="mb-4">
              <p className="text-red-400 font-semibold mb-2 uppercase tracking-wide text-xs">Dépenses</p>
              <div className="space-y-1 font-mono">
                {outcomeTransactions.map((t, i) => (
                  <div key={t.id ?? i} className="flex justify-between text-gray-300">
                    <span className="truncate max-w-xs text-gray-400">
                      {format(new Date(t.date), 'dd/MM', { locale: fr })}
                      {' · '}
                      {t.description || <span className="italic text-gray-500">Sans description</span>}
                      {(t as any).is_predicted && (
                        <span className="ml-1 text-blue-400 text-xs">(prévu)</span>
                      )}
                    </span>
                    <span className="text-red-400 ml-4 flex-shrink-0">−{formatAmount(t.amount)} €</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-red-400 font-bold">
                  <span>Total dépenses</span>
                  <span>−{formatAmount(totalOutcome)} €</span>
                </div>
              </div>
            </div>
          )}

          {/* --- Solde de la période --- */}
          <div className="border-t border-gray-600 pt-3 mt-2 font-mono">
            <div className="flex justify-between font-bold text-base">
              <span className="text-gray-200">= Solde de la période</span>
              <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                {balance >= 0 ? '+' : ''}{formatAmount(balance)} €
              </span>
            </div>
          </div>

          {/* --- Bloc cumulé (mode prédiction) --- */}
          {showCumulative && initialBalance !== undefined && cumulativeIncome !== undefined && cumulativeOutcome !== undefined && cumulativeBalance !== undefined && (
            <div className="border-t border-gray-600 pt-3 mt-4 font-mono space-y-1">
              <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-2">
                Solde au {predictionDate ? format(new Date(predictionDate), 'dd/MM/yyyy') : ''}
              </p>
              <div className="flex justify-between text-gray-300">
                <span>Solde initial</span>
                <span className="text-white">{formatAmount(initialBalance)} €</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>+ Revenus cumulés</span>
                <span>+{formatAmount(cumulativeIncome)} €</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>− Dépenses cumulées</span>
                <span>−{formatAmount(cumulativeOutcome)} €</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-600 pt-2 mt-1">
                <span className="text-gray-200">
                  = Solde au {predictionDate ? format(new Date(predictionDate), 'dd/MM/yyyy') : ''}
                </span>
                <span className={cumulativeBalance >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatAmount(cumulativeBalance)} €
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Dashboard principal
// ============================================================
export default function Home() {
  const { selectedWalletId, selectWallet, isInitialized } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictedTransaction[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; icon: string; color: string }>>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWalletManager, setShowWalletManager] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('current');

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const [predictionDate, setPredictionDate] = useState(
    format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  );

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
        fetchCategories(),
      ]);
      if (viewMode === 'prediction' || viewMode === 'current') {
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
      url += `&startDate=${format(startOfMonth(new Date()), 'yyyy-MM-dd')}&endDate=${format(new Date(), 'yyyy-MM-dd')}`;
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
    if (!selectedWalletId) return;
    let monthStart: string;
    let monthEnd: string;
    let includePredictions = false;

    if (viewMode === 'prediction') {
      const predDate = new Date(predictionDate);
      monthStart = format(startOfMonth(predDate), 'yyyy-MM-dd');
      monthEnd = format(endOfMonth(predDate), 'yyyy-MM-dd');
      includePredictions = true;
    } else if (viewMode === 'current') {
      const today = new Date();
      monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      includePredictions = true;
    } else {
      return;
    }

    try {
      const response = await fetch(
        `/api/stats?walletId=${selectedWalletId}&startDate=${monthStart}&endDate=${monthEnd}&includePredictions=${includePredictions}`
      );
      const data = await response.json();
      setMonthlyStats(data);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchPredictions = async () => {
    if (!selectedWalletId) return;
    if (viewMode === 'prediction') {
      try {
        const response = await fetch(
          `/api/predictions?walletId=${selectedWalletId}&startDate=${format(new Date(), 'yyyy-MM-dd')}&endDate=${predictionDate}`
        );
        const data = await response.json();
        setPredictions(data);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      }
    } else if (viewMode === 'current') {
      try {
        const response = await fetch(
          `/api/predictions?walletId=${selectedWalletId}&startDate=${format(startOfMonth(new Date()), 'yyyy-MM-dd')}&endDate=${format(endOfMonth(new Date()), 'yyyy-MM-dd')}`
        );
        const data = await response.json();
        setPredictions(data);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      }
    } else if (viewMode === 'period') {
      try {
        const response = await fetch(
          `/api/predictions?walletId=${selectedWalletId}&startDate=${dateRange.start}&endDate=${dateRange.end}`
        );
        const data = await response.json();
        setPredictions(data);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      }
    } else {
      setPredictions([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleTransactionAdded = () => fetchData();
  const handleTransactionDeleted = () => fetchData();

  const handleInvitationAccepted = (walletId: number) => {
    // @ts-ignore
    if (window.refreshWalletSelector) window.refreshWalletSelector();
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

  const displayedMonthlyStats = viewMode === 'period' ? stats : monthlyStats;

  // Transactions affichées : réelles + prédites (fusionnées et triées)
  const displayedTransactions = (viewMode === 'current' || viewMode === 'period')
    ? [
      ...transactions,
      ...predictions.map((p, index) => {
        const cat = categories.find(c => c.name === p.category);
        return {
          id: -(index + 1),
          type: p.type,
          amount: p.amount,
          description: p.description,
          category: p.category,
          category_id: cat?.id ?? null,
          category_name: cat?.name ?? p.category,
          category_icon: cat?.icon ?? null,
          category_color: cat?.color ?? null,
          date: p.date,
          is_recurring: true,
          recurrence_type: 'Mensuel',
          is_predicted: true,
        } as Transaction;
      }),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : transactions;

  // Solde initial déduit depuis les valeurs cumulées
  const derivedInitialBalance = stats
    ? stats.cumulativeBalance - stats.cumulativeIncome + stats.cumulativeOutcome
    : 0;

  // Label du titre de la section flux
  const fluxTitle = viewMode === 'current'
    ? `Mois en cours (${format(new Date(), 'MMMM yyyy', { locale: fr })})`
    : viewMode === 'prediction'
      ? 'Prévisions du mois'
      : 'Période sélectionnée';

  // Label du titre du bloc dépliable flux
  const calcFluxTitle = viewMode === 'current'
    ? `Détail — Mois de ${format(new Date(), 'MMMM yyyy', { locale: fr })}`
    : viewMode === 'prediction'
      ? `Détail — Mois de ${format(new Date(predictionDate), 'MMMM yyyy', { locale: fr })}`
      : `Détail — Du ${format(new Date(dateRange.start), 'dd/MM/yyyy')} au ${format(new Date(dateRange.end), 'dd/MM/yyyy')}`;

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
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 overflow-hidden">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 flex items-center gap-3 min-w-0">
            <Image src="/clear-logo.png" alt="Grigou Logo" width={48} height={48} className="object-contain" priority />
            Grigou - Gestionnaire de Budget
          </h1>
          <div className="flex items-center gap-4 flex-shrink-0">
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Mode :</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => setViewMode('current')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'current' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  📍 Vue actuelle
                </button>
                <button
                  onClick={() => setViewMode('period')}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${viewMode === 'period' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  📅 Période
                </button>
                <button
                  onClick={() => setViewMode('prediction')}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${viewMode === 'prediction' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  🔮 Prédiction
                </button>
              </div>
            </div>

            {viewMode === 'period' && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Du:</label>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="border border-gray-300 rounded px-3 py-1 text-sm" />
                <span className="text-gray-500">au</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="border border-gray-300 rounded px-3 py-1 text-sm" />
                <div className="flex gap-1 ml-2">
                  <button onClick={() => adjustDateRange(-1)} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">← Mois</button>
                  <button onClick={() => adjustDateRange(1)} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">Mois →</button>
                </div>
              </div>
            )}

            {viewMode === 'prediction' && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Prédiction au :</label>
                <input type="date" value={predictionDate} onChange={(e) => setPredictionDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="border border-gray-300 rounded px-3 py-1 text-sm" />
                <div className="flex gap-1 ml-2">
                  <button onClick={() => adjustPredictionDate(-1)} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">← Mois</button>
                  <button onClick={() => adjustPredictionDate(1)} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">Mois →</button>
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
            {/* =============================================
                SECTION 1 : Flux de la période / du mois
            ============================================= */}
            {displayedMonthlyStats && (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  📅 {fluxTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? 'Revenus du mois' : 'Revenus'}
                    amount={displayedMonthlyStats.totalIncome}
                    type="income"
                    icon="↗"
                  />
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? 'Dépenses du mois' : 'Dépenses'}
                    amount={displayedMonthlyStats.totalOutcome}
                    type="outcome"
                    icon="↘"
                  />
                  <StatsCard
                    walletId={selectedWalletId!}
                    title={viewMode === 'prediction' ? 'Solde du mois' : 'Solde'}
                    amount={displayedMonthlyStats.balance}
                    type={displayedMonthlyStats.balance >= 0 ? 'income' : 'outcome'}
                    icon="="
                  />
                </div>

                {/* Bloc dépliable — détail des transactions de la période */}
                <CalcDetail
                  title={calcFluxTitle}
                  transactions={displayedTransactions}
                  totalIncome={displayedMonthlyStats.totalIncome}
                  totalOutcome={displayedMonthlyStats.totalOutcome}
                  balance={displayedMonthlyStats.balance}
                />
              </>
            )}

            {/* =============================================
                SECTION 2 : Solde cumulé
            ============================================= */}
            {stats && (
              viewMode === 'current' ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    💰 Solde actuel
                    <span className="text-gray-500 ml-1 text-sm">
                      ( {format(new Date(), 'EEEE dd MMMM', { locale: fr })} )
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={`rounded-lg p-6 shadow-sm border ${stats.cumulativeBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <BalanceAdjuster
                        walletId={selectedWalletId!}
                        currentBalance={stats.cumulativeBalance}
                        onBalanceAdjusted={fetchData}
                      />
                    </div>
                  </div>
                </>
              ) : viewMode === 'prediction' ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    💰 Solde actuel prévisionnel
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <StatsCard walletId={selectedWalletId!} title="Revenus cumulés" amount={stats.cumulativeIncome} type="income" icon="↗" />
                    <StatsCard walletId={selectedWalletId!} title="Dépenses cumulées" amount={stats.cumulativeOutcome} type="outcome" icon="↘" />
                    <div className={`rounded-lg p-6 shadow-sm border ${stats.cumulativeBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Solde cumulé</h3>
                      </div>
                      <p className={`text-3xl font-bold ${stats.cumulativeBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {stats.cumulativeBalance.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {/* Bloc dépliable — détail du solde cumulé */}
                  <CalcDetail
                    title={`Détail — Solde au ${format(new Date(predictionDate), 'dd/MM/yyyy')}`}
                    transactions={displayedTransactions}
                    totalIncome={stats.cumulativeIncome}
                    totalOutcome={stats.cumulativeOutcome}
                    balance={stats.cumulativeBalance - derivedInitialBalance}
                    showCumulative
                    initialBalance={derivedInitialBalance}
                    cumulativeIncome={stats.cumulativeIncome}
                    cumulativeOutcome={stats.cumulativeOutcome}
                    cumulativeBalance={stats.cumulativeBalance}
                    predictionDate={predictionDate}
                  />
                </>
              ) : null
            )}

            {/* Transaction Form - current mode only */}
            {viewMode === 'current' && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">📝 Ajouter une Transaction</h2>
                <TransactionForm onTransactionAdded={handleTransactionAdded} selectedWalletId={selectedWalletId!} />
              </div>
            )}

            {/* Transaction List */}
            {viewMode !== 'prediction' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">📋 Historique des Transactions</h2>
                <TransactionList
                  transactions={displayedTransactions}
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
            if (window.refreshWalletSelector) window.refreshWalletSelector();
          }}
        />
      )}
    </main>
  );
}