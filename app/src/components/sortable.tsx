'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Transaction } from './TransactionList';

export type SortKey = 'date' | 'description' | 'category' | 'amount';
export type SortDir = 'asc' | 'desc';
export interface SortState { key: SortKey; dir: SortDir }

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

const categoryOf = (t: Transaction) => t.category_name || t.category || '';

function compare(a: Transaction, b: Transaction, key: SortKey): number {
  switch (key) {
    case 'date':
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    case 'amount':
      return Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
    case 'description':
    case 'category': {
      const va = key === 'category' ? categoryOf(a) : a.description || '';
      const vb = key === 'category' ? categoryOf(b) : b.description || '';
      // Empty values always go last, whatever the direction
      if (!va || !vb) return 0;
      return collator.compare(va, vb);
    }
  }
}

function isEmpty(t: Transaction, key: SortKey) {
  if (key === 'category') return !categoryOf(t);
  if (key === 'description') return !t.description;
  return false;
}

/** Text columns start A→Z, date and amount start with the most recent / largest. */
const defaultDir = (key: SortKey): SortDir => (key === 'date' || key === 'amount' ? 'desc' : 'asc');

/**
 * Sort state for a transaction table: clicking a column sorts by it, clicking it
 * again flips the direction, and a third click goes back to the default order.
 */
export function useTransactionSort(transactions: Transaction[], initial: SortState = { key: 'date', dir: 'desc' }) {
  const [sort, setSort] = useState<SortState>(initial);

  const toggle = (key: SortKey) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: defaultDir(key) };
      if (s.dir === defaultDir(key)) return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return initial;
    });

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...transactions].sort((a, b) => {
      const ea = isEmpty(a, sort.key);
      const eb = isEmpty(b, sort.key);
      if (ea !== eb) return ea ? 1 : -1;
      const primary = compare(a, b, sort.key) * factor;
      // Ties: most recent first
      return primary || new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, sort]);

  return { sorted, sort, toggle };
}

/** Clickable column header with the current sort direction. */
export function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  column: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`font-medium ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group/sort inline-flex items-center gap-1 rounded transition-colors hover:text-fg ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-fg' : ''}`}
      >
        {label}
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${active ? '' : 'opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60'}`}
          aria-hidden
        />
      </button>
    </th>
  );
}

/** Category label with its colour dot. */
export function CategoryLabel({ t, className = '' }: { t: Transaction; className?: string }) {
  const name = categoryOf(t);
  if (!name) return <span className={`text-fg-subtle ${className}`}>—</span>;
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 text-fg-muted ${className}`}>
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: t.category_color || 'rgb(var(--fg-subtle))' }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
