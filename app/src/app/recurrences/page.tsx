'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, CircleStop, Loader2, Pencil, Plus, Repeat, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import WalletSelector from '@/components/WalletSelector';
import WalletManager from '@/components/WalletManager';
import StatsCard from '@/components/StatsCard';
import TransactionForm from '@/components/TransactionForm';
import EditTransactionModal from '@/components/EditTransactionModal';
import UpcomingRecurring from '@/components/recurring/UpcomingRecurring';
import { CategoryLabel } from '@/components/sortable';
import type { Transaction } from '@/components/TransactionList';
import { useWallet } from '@/hooks/useWallet';
import { formatEUR } from '@/lib/format';
import {
  PER_MONTH,
  RECURRENCE_LABELS,
  RecurrenceType,
  firstOccurrenceOnOrAfter,
  nextOccurrence,
  toDay,
  ymd,
} from '@/lib/recurrence';

interface Recurring {
  t: Transaction;
  type: RecurrenceType;
  amount: number;
  /** Equivalent amount per month (a yearly 600 € counts for 50 €). */
  monthly: number;
  next: Date | null;
  ended: boolean;
  endDate: Date | null;
}

const fmtDay = (d: Date) => format(d, 'd MMM yyyy', { locale: fr });

function toRecurring(t: Transaction, today: Date): Recurring {
  const type = (t.recurrence_type || 'monthly') as RecurrenceType;
  const next = firstOccurrenceOnOrAfter(t.date, type, today, t.recurrence_end_date);
  const amount = Number(t.amount);
  return {
    t,
    type,
    amount,
    monthly: amount * (PER_MONTH[type] ?? 1),
    next,
    ended: next === null,
    endDate: t.recurrence_end_date ? toDay(t.recurrence_end_date) : null,
  };
}

/**
 * A recurring item and its amount changes. Changing the amount "from a date"
 * ends the current row the day before and starts a new one, so one item can be
 * made of several consecutive rows (segments).
 */
interface Series {
  key: number;
  segments: Recurring[];
  /** Segment of the next occurrence (or the last one when the series has ended). */
  current: Recurring;
  /** Scheduled amount changes after the current segment. */
  upcoming: Recurring[];
  ended: boolean;
}

const sameItem = (a: Transaction, b: Transaction) =>
  a.type === b.type && (a.description || '') === (b.description || '') && a.category_id === b.category_id && a.recurrence_type === b.recurrence_type;

function buildSeries(rows: Recurring[]): Series[] {
  const sorted = [...rows].sort((a, b) => toDay(a.t.date).getTime() - toDay(b.t.date).getTime());
  const chains: Recurring[][] = [];
  for (const r of sorted) {
    const chain = chains.find((c) => {
      const last = c[c.length - 1];
      return last.endDate && sameItem(last.t, r.t) && ymd(addDays(last.endDate, 1)) === ymd(toDay(r.t.date));
    });
    if (chain) chain.push(r); else chains.push([r]);
  }
  return chains.map((segments) => {
    const i = segments.findIndex((r) => !r.ended);
    const current = i === -1 ? segments[segments.length - 1] : segments[i];
    return { key: segments[0].t.id, segments, current, upcoming: i === -1 ? [] : segments.slice(i + 1), ended: i === -1 };
  });
}

/** Segment in effect on `date` (the first one if the date is before the series starts). */
function segmentAt(s: Series, date: Date): Recurring {
  let found = s.segments[0];
  for (const r of s.segments) if (toDay(r.t.date) <= date) found = r;
  return found;
}

/** Last occurrence strictly before `date` (to tell the user what still counts). */
function lastBefore(r: Recurring, date: Date): Date | null {
  let d = toDay(r.t.date);
  if (d >= date) return null;
  let prev = d;
  while (d < date) { prev = d; d = nextOccurrence(d, r.type); }
  return prev;
}

// ------------------------------------------------------------------
// Modal shell
// ------------------------------------------------------------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop z-50" onClick={onClose}>
      <div className="modal-panel w-full max-w-md" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChangeAmountModal({ s, onClose, onDone }: { s: Series; onClose: () => void; onDone: () => void }) {
  const r0 = s.current;
  const [amount, setAmount] = useState(r0.amount.toFixed(2));
  const [from, setFrom] = useState(ymd(r0.next ?? toDay(new Date())));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fromDay = toDay(from || ymd(new Date()));
  const r = segmentAt(s, fromDay);
  const effective = firstOccurrenceOnOrAfter(r.t.date, r.type, fromDay, r.t.recurrence_end_date);
  const previous = effective ? lastBefore(r, effective) : null;
  const nextChange = s.segments.find((x) => toDay(x.t.date) > fromDay);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    if (!(value > 0)) return setError('Saisissez un montant positif.');
    setSaving(true);
    setError('');
    const res = await fetch(`/api/transactions/${r.t.id}/change-amount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: value, from }),
    });
    setSaving(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Erreur lors de la modification.');
    onDone();
  };

  return (
    <Modal title="Changer le montant" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">{r0.t.description || r0.t.category_name}</span> · {RECURRENCE_LABELS[r0.type].toLowerCase()}, actuellement {formatEUR(r0.amount)}
        </p>
        <div>
          <label htmlFor="ca-amount" className="field-label">Nouveau montant (€)</label>
          <input id="ca-amount" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </div>
        <div>
          <label htmlFor="ca-from" className="field-label">À partir du</label>
          <input id="ca-from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          {effective ? (
            <>
              Nouveau montant appliqué dès l&apos;échéance du <span className="font-medium text-fg">{fmtDay(effective)}</span>
              {nextChange ? <>, jusqu&apos;au changement déjà prévu le {fmtDay(toDay(nextChange.t.date))}.</> : '.'}
              {previous && <> Les échéances jusqu&apos;au {fmtDay(previous)} restent à {formatEUR(r.amount)}.</>}
            </>
          ) : (
            'Aucune échéance après cette date : la récurrence est terminée.'
          )}
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving || !effective}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StopModal({ s, onClose, onDone }: { s: Series; onClose: () => void; onDone: () => void }) {
  const first = s.segments[0];
  const minDay = ymd(addDays(toDay(first.t.date), 1));
  const r0 = s.current;
  const [from, setFrom] = useState(ymd(r0.next && r0.next > toDay(first.t.date) ? r0.next : toDay(minDay)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fromDay = from ? toDay(from) : null;
  // Rows starting on/after the stop date are dropped (scheduled changes), the one before is ended.
  const dropped = fromDay ? s.segments.filter((r) => toDay(r.t.date) >= fromDay) : [];
  const kept = fromDay ? [...s.segments].reverse().find((r) => toDay(r.t.date) < fromDay) : undefined;
  const last = kept && fromDay ? lastBefore(kept, fromDay) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kept || !fromDay) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/transactions/${kept.t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurrence_end_date: ymd(subDays(fromDay, 1)) }),
    });
    for (const r of dropped) await fetch(`/api/transactions/${r.t.id}`, { method: 'DELETE' });
    setSaving(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Erreur lors de l'arrêt.");
    onDone();
  };

  return (
    <Modal title="Arrêter la récurrence" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">{r0.t.description || r0.t.category_name}</span> · {formatEUR(r0.amount)}, {RECURRENCE_LABELS[r0.type].toLowerCase()}
        </p>
        <div>
          <label htmlFor="stop-from" className="field-label">Plus d&apos;échéance à partir du</label>
          <input id="stop-from" type="date" className="field" min={minDay} value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          {last ? (
            <>
              Dernière échéance comptée : <span className="font-medium text-fg">{fmtDay(last)}</span>. Le passé ne change pas.
              {dropped.length > 0 && <> Le changement de montant prévu le {fmtDay(toDay(dropped[0].t.date))} sera annulé.</>}
            </>
          ) : 'Choisissez une date après la première échéance.'}
        </p>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-danger" disabled={saving || !last}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Arrêter
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------
// List
// ------------------------------------------------------------------
type Action = 'amount' | 'stop' | 'edit' | 'delete';

function RecurringTable({ items, onAction, ended = false }: { items: Series[]; onAction: (a: Action, s: Series) => void; ended?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-fg-subtle">
            <th scope="col" className="px-5 py-2.5 font-medium">Libellé</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Catégorie</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">{ended ? 'Terminée le' : 'Prochaine'}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Montant</th>
            <th scope="col" className="w-28 px-3 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((s) => {
            const r = s.current;
            const income = r.t.type === 'income';
            const when = ended ? r.endDate : r.next;
            const change = s.upcoming[0];
            return (
              <tr key={s.key} className="group transition-colors hover:bg-surface-2">
                <td className="px-5 py-3">
                  <span className={`block truncate font-medium ${ended ? 'text-fg-muted' : 'text-fg'}`}>
                    {r.t.description || <span className="font-normal italic text-fg-subtle">Sans description</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-fg-subtle">
                    <span>{RECURRENCE_LABELS[r.type]}</span>
                    {!ended && !change && r.endDate && <span>· jusqu&apos;au {fmtDay(r.endDate)}</span>}
                    {when && <span className="sm:hidden">· {fmtDay(when)}</span>}
                  </span>
                </td>
                <td className="hidden px-3 py-3 md:table-cell"><CategoryLabel t={r.t} /></td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-fg-muted sm:table-cell">{when ? fmtDay(when) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span className={`amount ${ended ? 'text-fg-muted' : income ? 'text-positive' : 'text-fg'}`}>
                    {income ? '+' : '−'}{formatEUR(r.amount)}
                  </span>
                  {r.type !== 'monthly' && (
                    <span className="block text-xs text-fg-subtle">≈ {formatEUR(r.monthly)}/mois</span>
                  )}
                  {change && (
                    <span className="block text-xs text-fg-subtle">
                      puis {formatEUR(change.amount)} dès le {format(toDay(change.t.date), 'd MMM', { locale: fr })}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    {!ended && (
                      <>
                        <button className="btn-icon" title="Changer le montant" aria-label="Changer le montant" onClick={() => onAction('amount', s)}>
                          <TrendingUp className="h-4 w-4" />
                        </button>
                        <button className="btn-icon" title="Arrêter" aria-label="Arrêter la récurrence" onClick={() => onAction('stop', s)}>
                          <CircleStop className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button className="btn-icon" title="Modifier" aria-label="Modifier" onClick={() => onAction('edit', s)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn-icon hover:!bg-negative/10 hover:!text-negative" title="Supprimer" aria-label="Supprimer" onClick={() => onAction('delete', s)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, items, total, onAction }: { title: string; items: Series[]; total: number; onAction: (a: Action, s: Series) => void }) {
  return (
    <section className="card min-w-0">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <span className="text-xs text-fg-subtle">
          {items.length} ligne{items.length > 1 ? 's' : ''} · <span className="amount">{formatEUR(total)}</span>/mois
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-muted">Aucune ligne pour l'instant.</p>
      ) : (
        <RecurringTable items={items} onAction={onAction} />
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export default function RecurrencesPage() {
  const { selectedWalletId, selectWallet, isInitialized } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState('');
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<Series | null>(null);
  const [stopping, setStopping] = useState<Series | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    if (!selectedWalletId) return;
    setError('');
    try {
      const res = await fetch(`/api/transactions?walletId=${selectedWalletId}`);
      if (!res.ok) throw new Error();
      setTransactions(await res.json());
    } catch {
      setError('Impossible de charger les récurrences.');
      setTransactions([]);
    }
  }, [selectedWalletId]);

  useEffect(() => { setTransactions(null); load(); }, [load]);

  const { active, ended, income, outcome, incomeTotal, outcomeTotal } = useMemo(() => {
    const today = toDay(new Date());
    const series = buildSeries((transactions ?? []).filter((t) => t.is_recurring).map((t) => toRecurring(t, today)));
    const active = series.filter((s) => !s.ended);
    const ended = series
      .filter((s) => s.ended)
      .sort((a, b) => (b.current.endDate?.getTime() ?? 0) - (a.current.endDate?.getTime() ?? 0));
    const byMonthly = (a: Series, b: Series) => b.current.monthly - a.current.monthly;
    const income = active.filter((s) => s.current.t.type === 'income').sort(byMonthly);
    const outcome = active.filter((s) => s.current.t.type === 'outcome').sort(byMonthly);
    const sum = (ss: Series[]) => ss.reduce((acc, s) => acc + s.current.monthly, 0);
    return { active, ended, income, outcome, incomeTotal: sum(income), outcomeTotal: sum(outcome) };
  }, [transactions]);

  const remaining = incomeTotal - outcomeTotal;

  const onAction = async (action: Action, s: Series) => {
    if (action === 'amount') return setChanging(s);
    if (action === 'stop') return setStopping(s);
    if (action === 'edit') return setEditing(s.current.t);
    const label = s.current.t.description || s.current.t.category_name || 'cette récurrence';
    if (!confirm(`Supprimer « ${label} » ?\n\nToutes ses échéances, passées comprises, disparaîtront de vos comptes. Pour simplement ne plus la compter à l'avenir, utilisez plutôt « Arrêter ».`)) return;
    for (const r of s.segments) {
      const res = await fetch(`/api/transactions/${r.t.id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Erreur lors de la suppression.'); break; }
    }
    load();
  };

  const done = () => { setChanging(null); setStopping(null); setEditing(null); setAdding(false); load(); };

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader
        actions={
          <WalletSelector selectedWalletId={selectedWalletId} onWalletChange={selectWallet} onManageWallets={() => setShowWalletManager(true)} />
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Récurrences</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Revenus et charges fixes</h1>
          </div>
          {selectedWalletId && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter une récurrence
            </button>
          )}
        </div>

        {isInitialized && !selectedWalletId ? (
          <div className="card px-5 py-14 text-center">
            <Wallet className="mx-auto mb-3 h-6 w-6 text-fg-subtle" aria-hidden />
            <p className="text-sm text-fg-muted">Créez d'abord un portefeuille depuis le tableau de bord.</p>
          </div>
        ) : transactions === null ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-fg-subtle" /></div>
        ) : (
          <>
            {error && <p className="mb-4 text-sm text-negative">{error}</p>}

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
              <StatsCard title="Revenus fixes" amount={incomeTotal} tone="positive" hint="par mois" />
              <StatsCard title="Charges fixes" amount={outcomeTotal} tone="negative" hint="par mois" />
              <StatsCard
                title="Reste après charges fixes"
                amount={remaining}
                tone={remaining >= 0 ? 'neutral' : 'negative'}
                hint={incomeTotal > 0 ? `${Math.round((outcomeTotal / incomeTotal) * 100)} % des revenus fixes partent en charges` : 'par mois'}
              />
            </div>

            {active.length === 0 && ended.length === 0 ? (
              <div className="card px-5 py-14 text-center">
                <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle">
                  <Repeat className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm font-medium text-fg">Aucune récurrence</p>
                <p className="mt-1 text-sm text-fg-muted">Ajoutez votre loyer, votre salaire ou vos abonnements pour les suivre ici.</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-6">
                  <Section title="Dépenses" items={outcome} total={outcomeTotal} onAction={onAction} />
                  <Section title="Revenus" items={income} total={incomeTotal} onAction={onAction} />

                  {ended.length > 0 && (
                    <details className="card group/ended">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-fg-muted hover:text-fg">
                        Terminées ({ended.length})
                        <ChevronDown className="h-4 w-4 transition-transform group-open/ended:rotate-180" aria-hidden />
                      </summary>
                      <div className="border-t border-line">
                        <RecurringTable items={ended} onAction={onAction} ended />
                      </div>
                    </details>
                  )}
                </div>

                <div className="lg:sticky lg:top-20 lg:self-start">
                  <UpcomingRecurring transactions={transactions} days={30} showLink={false} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {adding && selectedWalletId && (
        <Modal title="Ajouter une récurrence" onClose={() => setAdding(false)}>
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <TransactionForm selectedWalletId={selectedWalletId} onTransactionAdded={done} defaultRecurring />
          </div>
        </Modal>
      )}
      {changing && <ChangeAmountModal s={changing} onClose={() => setChanging(null)} onDone={done} />}
      {stopping && <StopModal s={stopping} onClose={() => setStopping(null)} onDone={done} />}
      {editing && <EditTransactionModal transaction={editing} onClose={() => setEditing(null)} onUpdated={done} />}
      {showWalletManager && (
        <WalletManager
          onClose={() => setShowWalletManager(false)}
          onWalletCreated={() => {
            // @ts-ignore
            if (window.refreshWalletSelector) window.refreshWalletSelector();
          }}
        />
      )}
    </div>
  );
}
