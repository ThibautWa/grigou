'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarClock, CalendarRange, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Loader2, Plus, TrendingDown, TrendingUp, Wallet as WalletIcon,
} from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import TransactionList, { Transaction } from '@/components/TransactionList';
import StatsCard from '@/components/StatsCard';
import WalletSelector from '@/components/WalletSelector';
import WalletManager from '@/components/WalletManager';
import InvitationsList from '@/components/InvitationsList';
import BalanceAdjuster from '@/components/BalanceAdjuster';
import AppHeader from '@/components/layout/AppHeader';
import UpcomingRecurring from '@/components/recurring/UpcomingRecurring';
import { useWallet } from '@/hooks/useWallet';
import { formatEUR } from '@/lib/format';
import { CategoryLabel, SortHeader, useTransactionSort } from '@/components/sortable';

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

/** One column of the calculation detail (income or expenses), sortable. */
const DetailList = ({ items, sign, empty }: { items: Transaction[]; sign: '+' | '−'; empty: string }) => {
  const { sorted, sort, toggle } = useTransactionSort(items, { key: 'date', dir: 'asc' });
  if (items.length === 0) return <p className="py-1 text-fg-subtle">{empty}</p>;
  return (
    <table className="w-full table-fixed">
      <thead>
        <tr className="text-xs text-fg-subtle">
          <SortHeader label="Date" column="date" sort={sort} onSort={toggle} className="w-14 pb-1.5" />
          <SortHeader label="Opération" column="description" sort={sort} onSort={toggle} className="pb-1.5" />
          <SortHeader label="Catégorie" column="category" sort={sort} onSort={toggle} className="hidden w-[32%] pb-1.5 pl-3 sm:table-cell" />
          <SortHeader label="Montant" column="amount" sort={sort} onSort={toggle} align="right" className="w-24 pb-1.5 pl-3" />
        </tr>
      </thead>
      <tbody>
        {sorted.map((t, i) => (
          <tr key={t.id ?? i}>
            <td className="amount py-1 align-baseline text-fg-subtle">{format(new Date(t.date), 'dd/MM', { locale: fr })}</td>
            <td className="truncate py-1 align-baseline text-fg-muted">
              {t.description || <span className="italic text-fg-subtle">Sans description</span>}
            </td>
            <td className="hidden py-1 pl-3 align-baseline sm:table-cell"><CategoryLabel t={t} className="max-w-full" /></td>
            <td className={`amount whitespace-nowrap py-1 pl-3 text-right align-baseline ${sign === '+' ? 'text-positive' : 'text-negative'}`}>
              {sign}{formatEUR(t.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

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

  const Total = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
    <div className={`mt-1 flex justify-between border-t border-line pt-2 font-semibold ${className}`}>
      <span>{label}</span>
      <span className="amount">{value}</span>
    </div>
  );

  return (
    <div className="card mb-8 overflow-hidden text-sm">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="grid gap-6 border-t border-line px-5 py-4 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Revenus</p>
            <DetailList items={incomeTransactions} sign="+" empty="Aucun revenu" />
            <Total label="Total revenus" value={`+${formatEUR(totalIncome)}`} className="text-positive" />
          </div>

          <div>
            <p className="eyebrow mb-2">Dépenses</p>
            <DetailList items={outcomeTransactions} sign="−" empty="Aucune dépense" />
            <Total label="Total dépenses" value={`−${formatEUR(totalOutcome)}`} className="text-negative" />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-baseline justify-between rounded-lg bg-surface-2 px-4 py-3 text-base font-semibold">
              <span className="text-fg">Flux net de la période</span>
              <span className={`amount ${balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                {balance >= 0 ? '+' : ''}{formatEUR(balance)}
              </span>
            </div>
          </div>

          {showCumulative && initialBalance !== undefined && cumulativeIncome !== undefined && cumulativeOutcome !== undefined && cumulativeBalance !== undefined && (
            <div className="space-y-1.5 md:col-span-2">
              <p className="eyebrow mb-2">
                Solde au {predictionDate ? format(new Date(predictionDate), 'dd/MM/yyyy') : ''}
              </p>
              <div className="flex justify-between"><span className="text-fg-muted">Solde initial</span><span className="amount text-fg">{formatEUR(initialBalance)}</span></div>
              <div className="flex justify-between"><span className="text-fg-muted">Revenus cumulés</span><span className="amount text-positive">+{formatEUR(cumulativeIncome)}</span></div>
              <div className="flex justify-between"><span className="text-fg-muted">Dépenses cumulées</span><span className="amount text-negative">−{formatEUR(cumulativeOutcome)}</span></div>
              <Total
                label={`Solde au ${predictionDate ? format(new Date(predictionDate), 'dd/MM/yyyy') : ''}`}
                value={formatEUR(cumulativeBalance)}
                className={`text-base ${cumulativeBalance >= 0 ? 'text-fg' : 'text-negative'}`}
              />
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
      // Recurring occurrences falling in the period count in its income / expenses
      url += `&startDate=${dateRange.start}&endDate=${dateRange.end}&includePredictions=true`;
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

  // Transactions fusionnées : réelles + prédites (current / period / prediction)
  const mergedTransactions: Transaction[] =
    (viewMode === 'current' || viewMode === 'period' || viewMode === 'prediction')
      ? [
        ...transactions,
        ...predictions.map((p, index) => {
          const cat = categories.find(c => c.id === (p as any).category_id) ?? categories.find(c => c.name === p.category);
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

  // Liste affichée :
  //  - en mode prédiction, le bloc cumulé ne montre que ce qui précède la date de prédiction
  //  - sinon, la liste fusionnée complète
  const displayedTransactions: Transaction[] =
    viewMode === 'prediction'
      ? mergedTransactions.filter(t => t.date.substring(0, 10) <= predictionDate)
      : mergedTransactions;

  // Transactions du seul mois sélectionné (bloc « Détail — Mois de ... »)
  // En mode prédiction on filtre sur le mois de la date de prédiction ;
  // dans les autres modes la liste est déjà bornée au bon intervalle.
  const monthDetailTransactions: Transaction[] =
    viewMode === 'prediction'
      ? (() => {
        const monthStart = format(startOfMonth(new Date(predictionDate)), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date(predictionDate)), 'yyyy-MM-dd');
        return mergedTransactions.filter(t => {
          const d = t.date.substring(0, 10);
          return d >= monthStart && d <= monthEnd;
        });
      })()
      : displayedTransactions;


  // Solde initial déduit depuis les valeurs cumulées (détail du mode prévision)
  const derivedInitialBalance = stats
    ? stats.cumulativeBalance - stats.cumulativeIncome + stats.cumulativeOutcome
    : 0;

  // Label du titre de la section flux
  const fluxTitle = viewMode === 'current'
    ? format(new Date(), 'MMMM yyyy', { locale: fr })
    : viewMode === 'prediction'
      ? `Prévisions · ${format(new Date(predictionDate), 'MMMM yyyy', { locale: fr })}`
      : `Du ${format(new Date(dateRange.start), 'd MMM yyyy', { locale: fr })} au ${format(new Date(dateRange.end), 'd MMM yyyy', { locale: fr })}`;

  // Label du titre du bloc dépliable flux
  const calcFluxTitle = viewMode === 'prediction'
    ? `Détail du calcul · ${format(new Date(predictionDate), 'MMMM yyyy', { locale: fr })}`
    : `Détail du calcul · ${format(new Date(), 'MMMM yyyy', { locale: fr })}`;

  const header = (
    <AppHeader
      actions={
        <WalletSelector
          selectedWalletId={selectedWalletId}
          onWalletChange={selectWallet}
          onManageWallets={() => setShowWalletManager(true)}
        />
      }
    />
  );

  const walletManager = showWalletManager && (
    <WalletManager
      onClose={() => setShowWalletManager(false)}
      onWalletCreated={() => {
        // @ts-ignore
        if (window.refreshWalletSelector) window.refreshWalletSelector();
      }}
    />
  );

  const Spinner = ({ label }: { label: string }) => (
    <div className="flex h-64 items-center justify-center gap-3 text-fg-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );

  if (!isInitialized) {
    return (
      <div className="min-h-screen">
        {header}
        <Spinner label="Chargement…" />
      </div>
    );
  }

  // New account: no wallet yet
  if (!selectedWalletId) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <InvitationsList onInvitationAccepted={handleInvitationAccepted} />
          <div className="card mx-auto max-w-md p-8 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <WalletIcon className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold">Créez votre premier portefeuille</h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              Un portefeuille regroupe les transactions d&apos;un compte : compte courant, épargne, budget commun…
            </p>
            <button onClick={() => setShowWalletManager(true)} className="btn-primary mt-6">
              <Plus className="h-4 w-4" aria-hidden />
              Créer un portefeuille
            </button>
          </div>
        </main>
        {walletManager}
      </div>
    );
  }

  const MODES: { value: ViewMode; label: string; Icon: typeof Clock }[] = [
    { value: 'current', label: 'Ce mois-ci', Icon: Clock },
    { value: 'period', label: 'Période', Icon: CalendarRange },
    { value: 'prediction', label: 'Prévision', Icon: CalendarClock },
  ];

  const StepButtons = ({ onStep }: { onStep: (m: number) => void }) => (
    <div className="flex">
      <button onClick={() => onStep(-1)} className="btn-icon h-9 w-9" aria-label="Mois précédent" title="Mois précédent">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={() => onStep(1)} className="btn-icon h-9 w-9" aria-label="Mois suivant" title="Mois suivant">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  const balanceTone = (v: number) => (v >= 0 ? 'positive' : 'negative') as 'positive' | 'negative';

  return (
    <div className="min-h-screen">
      {header}

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <InvitationsList onInvitationAccepted={handleInvitationAccepted} />

        {/* Page title + view mode */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Tableau de bord</p>
            <h1 className="text-2xl font-semibold first-letter:uppercase">{fluxTitle}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {viewMode === 'period' && (
              <div className="flex items-center gap-2">
                {/* The range can't be inverted: moving one bound past the other moves it too (any date, past or future) */}
                <input
                  type="date"
                  aria-label="Date de début"
                  value={dateRange.start}
                  onChange={(e) => {
                    const start = e.target.value;
                    if (!start) return;
                    // Start after the end (e.g. a future month): the end moves to the end of that month
                    setDateRange((r) => ({ start, end: start > r.end ? format(endOfMonth(parseISO(start)), 'yyyy-MM-dd') : r.end }));
                  }}
                  className="field h-9 w-auto !py-1"
                />
                <span className="text-sm text-fg-subtle">→</span>
                <input
                  type="date"
                  aria-label="Date de fin"
                  value={dateRange.end}
                  onChange={(e) => {
                    const end = e.target.value;
                    if (!end) return;
                    // End before the start: the start moves to the beginning of that month
                    setDateRange((r) => ({ start: end < r.start ? format(startOfMonth(parseISO(end)), 'yyyy-MM-dd') : r.start, end }));
                  }}
                  className="field h-9 w-auto !py-1"
                />
                <StepButtons onStep={adjustDateRange} />
              </div>
            )}
            {viewMode === 'prediction' && (
              <div className="flex items-center gap-2">
                <label htmlFor="prediction-date" className="text-sm text-fg-muted">Solde prévu au</label>
                <input id="prediction-date" type="date" value={predictionDate} onChange={(e) => setPredictionDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="field h-9 w-auto !py-1" />
                <StepButtons onStep={adjustPredictionDate} />
              </div>
            )}

            <div className="segmented" role="group" aria-label="Mode d'affichage">
              {MODES.map(({ value, label, Icon }) => (
                <button key={value} type="button" aria-pressed={viewMode === value} onClick={() => setViewMode(value)}>
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner label="Chargement des données…" />
        ) : (
          <>
            {/* KPIs */}
            {stats && displayedMonthlyStats && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                {viewMode === 'current' && (
                  <div className="card col-span-2 p-4 md:p-5 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-fg-muted">Solde actuel</p>
                      <span className="text-xs text-fg-subtle">au {format(new Date(), 'd MMM', { locale: fr })}</span>
                    </div>
                    <div className="mt-2">
                      <BalanceAdjuster walletId={selectedWalletId} currentBalance={stats.cumulativeBalance} onBalanceAdjusted={fetchData} />
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">Cliquez sur le montant pour l&apos;ajuster</p>
                  </div>
                )}

                {viewMode === 'period' && (
                  <StatsCard
                    className="col-span-2 lg:col-span-1"
                    title="Solde en fin de période"
                    amount={stats.cumulativeBalance}
                    tone={stats.cumulativeBalance >= 0 ? 'neutral' : 'negative'}
                    hint={`au ${format(new Date(dateRange.end), 'd MMM yyyy', { locale: fr })}`}
                  />
                )}

                {viewMode === 'prediction' && (
                  <StatsCard
                    className="col-span-2 lg:col-span-1"
                    title="Solde prévisionnel"
                    amount={stats.cumulativeBalance}
                    tone={stats.cumulativeBalance >= 0 ? 'neutral' : 'negative'}
                    hint={`au ${format(new Date(predictionDate), 'd MMM yyyy', { locale: fr })}`}
                  />
                )}

                <StatsCard
                  title={viewMode === 'period' ? 'Revenus de la période' : 'Revenus du mois'}
                  amount={displayedMonthlyStats.totalIncome}
                  tone="positive"
                  icon={<TrendingUp className="h-4 w-4" aria-hidden />}
                />
                <StatsCard
                  title={viewMode === 'period' ? 'Dépenses de la période' : 'Dépenses du mois'}
                  amount={displayedMonthlyStats.totalOutcome}
                  tone="negative"
                  icon={<TrendingDown className="h-4 w-4" aria-hidden />}
                />
                <StatsCard
                  title="Flux net"
                  amount={displayedMonthlyStats.balance}
                  tone={balanceTone(displayedMonthlyStats.balance)}
                  hint={displayedMonthlyStats.balance >= 0 ? 'Vous épargnez sur la période' : 'Vous dépensez plus que vous ne gagnez'}
                />
              </div>
            )}

            {/* Calculation details */}
            {displayedMonthlyStats && viewMode === 'current' && (
              <CalcDetail
                title={calcFluxTitle}
                transactions={monthDetailTransactions}
                totalIncome={displayedMonthlyStats.totalIncome}
                totalOutcome={displayedMonthlyStats.totalOutcome}
                balance={displayedMonthlyStats.balance}
              />
            )}
            {stats && viewMode === 'prediction' && (
              <CalcDetail
                title={`Détail du calcul · solde au ${format(new Date(predictionDate), 'dd/MM/yyyy')}`}
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
            )}

            {/* Transactions + form */}
            {viewMode !== 'prediction' && (
              <div className={`grid items-start gap-6 ${viewMode === 'current' ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
                <section className="card min-w-0" aria-labelledby="history-title">
                  <div className="card-header">
                    <h2 id="history-title" className="card-title">Transactions</h2>
                    <span className="text-xs text-fg-subtle">{displayedTransactions.length} opération{displayedTransactions.length > 1 ? 's' : ''}</span>
                  </div>
                  <TransactionList
                    transactions={displayedTransactions}
                    onTransactionDeleted={handleTransactionDeleted}
                    onTransactionUpdated={handleTransactionDeleted}
                  />
                </section>

                {viewMode === 'current' && (
                  <div className="min-w-0 space-y-6">
                    <section className="card" aria-labelledby="new-tx-title">
                      <div className="card-header">
                        <h2 id="new-tx-title" className="card-title">Nouvelle transaction</h2>
                      </div>
                      <div className="p-5">
                        <TransactionForm onTransactionAdded={handleTransactionAdded} selectedWalletId={selectedWalletId} />
                      </div>
                    </section>
                    <UpcomingRecurring walletId={selectedWalletId} days={10} refreshKey={transactions.length} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {walletManager}
    </div>
  );
}
