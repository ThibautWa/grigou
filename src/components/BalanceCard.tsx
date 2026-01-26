'use client';

import BalanceAdjuster from './BalanceAdjuster';

interface BalanceCardProps {
    walletId: number;
    currentBalance: number;
    onBalanceAdjusted: () => void;
    title?: string;
}

export default function BalanceCard({
    walletId,
    currentBalance,
    onBalanceAdjusted,
    title = 'Solde Actuel',
}: BalanceCardProps) {
    const isPositive = currentBalance >= 0;

    return (
        <div className={`rounded-lg p-6 shadow-sm border-2 transition-colors ${isPositive
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        {title}
                    </h3>
                </div>

                {/* Badge info */}
                <div className="group relative">
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    {/* Tooltip */}
                    <div className="absolute right-0 top-8 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                        <p className="font-medium mb-1">💡 Astuce</p>
                        <p>Cliquez sur le montant pour ajuster votre solde si celui-ci ne correspond pas à votre relevé bancaire.</p>
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                </div>
            </div>

            {/* Solde ajustable */}
            <div className="flex justify-center py-2">
                <BalanceAdjuster
                    walletId={walletId}
                    currentBalance={currentBalance}
                    onBalanceAdjusted={onBalanceAdjusted}
                />
            </div>

            {/* Indicateur de statut */}
            <div className="mt-3 pt-3 border-t border-gray-200/50">
                <div className={`flex items-center justify-center gap-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {isPositive ? (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Solde positif</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Solde négatif - Attention</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}