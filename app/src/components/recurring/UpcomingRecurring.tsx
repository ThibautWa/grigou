'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import { formatEUR } from '@/lib/format';
import { occurrencesBetween, toDay } from '@/lib/recurrence';
import type { Transaction } from '../TransactionList';

interface Props {
  /** Fetches the wallet's transactions itself when `transactions` is not given. */
  walletId?: number | null;
  transactions?: Transaction[];
  days?: number;
  /** Change it to refetch (after an add / edit). */
  refreshKey?: number;
  showLink?: boolean;
}

function dayLabel(d: Date) {
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return format(d, 'EEE d MMM', { locale: fr });
}

/** Recurring income and expenses due in the next `days` days. */
export default function UpcomingRecurring({ walletId, transactions, days = 10, refreshKey = 0, showLink = true }: Props) {
  const [fetched, setFetched] = useState<Transaction[] | null>(null);

  useEffect(() => {
    if (transactions || !walletId) return;
    let cancelled = false;
    fetch(`/api/transactions?walletId=${walletId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => !cancelled && setFetched(rows))
      .catch(() => !cancelled && setFetched([]));
    return () => { cancelled = true; };
  }, [walletId, transactions, refreshKey]);

  const source = transactions ?? fetched;

  const upcoming = useMemo(() => {
    if (!source) return null;
    const today = toDay(new Date());
    const until = addDays(today, days);
    return source
      .filter((t) => t.is_recurring && t.recurrence_type)
      .flatMap((t) =>
        occurrencesBetween(t.date, t.recurrence_type!, today, until, t.recurrence_end_date).map((date) => ({ t, date }))
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [source, days]);

  const total = upcoming?.reduce((sum, { t }) => sum + (t.type === 'income' ? 1 : -1) * Number(t.amount), 0) ?? 0;

  return (
    <section className="card" aria-labelledby="upcoming-title">
      <div className="card-header">
        <h2 id="upcoming-title" className="card-title inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-fg-subtle" aria-hidden />
          Prochaines échéances
        </h2>
        <span className="text-xs text-fg-subtle">{days} jours</span>
      </div>

      {upcoming === null ? (
        <div className="space-y-2 p-5" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-surface-2" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-muted">Rien de prévu sur les {days} prochains jours.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {upcoming.map(({ t, date }) => (
            <li key={`${t.id}-${date.getTime()}`} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-fg">{t.description || t.category_name || 'Sans description'}</span>
                <span className="block text-xs text-fg-subtle first-letter:uppercase">{dayLabel(date)}</span>
              </span>
              <span className={`amount shrink-0 ${t.type === 'income' ? 'text-positive' : 'text-fg'}`}>
                {t.type === 'income' ? '+' : '−'}{formatEUR(Number(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {upcoming && upcoming.length > 0 && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
          <span className="text-fg-muted">Total</span>
          <span className={`amount font-semibold ${total >= 0 ? 'text-positive' : 'text-fg'}`}>
            {total >= 0 ? '+' : '−'}{formatEUR(Math.abs(total))}
          </span>
        </div>
      )}

      {showLink && (
        <div className="border-t border-line px-5 py-3">
          <Link href="/recurrences" className="text-sm font-medium text-accent hover:underline">
            Gérer les récurrences
          </Link>
        </div>
      )}
    </section>
  );
}
