'use client';

import { ReactNode } from 'react';
import { formatEUR } from '@/lib/format';

export type KpiTone = 'neutral' | 'positive' | 'negative';

interface StatsCardProps {
  title: string;
  amount: number;
  tone?: KpiTone;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const toneClass: Record<KpiTone, string> = {
  neutral: 'text-fg',
  positive: 'text-positive',
  negative: 'text-negative',
};

/** KPI card: label, amount, optional hint line. */
export default function StatsCard({ title, amount, tone = 'neutral', hint, icon, className = '' }: StatsCardProps) {
  return (
    <div className={`card p-4 md:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg-muted">{title}</p>
        {icon && <span className="text-fg-subtle">{icon}</span>}
      </div>
      <p className={`amount mt-2 text-xl md:text-2xl ${toneClass[tone]}`}>{formatEUR(amount)}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
