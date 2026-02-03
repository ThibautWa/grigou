'use client';

import { Stats } from "fs";
import { useEffect, useState } from "react";

interface StatsCardProps {
  walletId: number;
  title: string;
  amount: number;
  type: 'income' | 'outcome';
  icon: string;
}

export default function StatsCard({ walletId, title, amount, type, icon }: StatsCardProps) {
  const bgColor = type === 'income' ? 'bg-green-50' : 'bg-red-50';
  const textColor = type === 'income' ? 'text-green-600' : 'text-red-600';
  const borderColor = type === 'income' ? 'border-green-200' : 'border-red-200';
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`/api/stats?walletId=${walletId}`)
      .then(res => res.json())
      .then(data => setStats(data));
  }, [walletId]); // Re-fetch quand le portefeuille change

return (
  <div className={`${bgColor} border ${borderColor} rounded-lg p-6 shadow-sm`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${textColor}`}>
          {amount.toFixed(2)} €
        </p>
      </div>
      <div className={`text-4xl ${textColor}`}>{icon}</div>
    </div>
  </div>
);
}
