'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    BarChart, Bar,
    LineChart, Line,
    AreaChart, Area,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyData {
    month: string;
    monthKey: string;
    income: number;
    outcome: number;
    balance: number;
    cumulative: number;
    predicted_income: number;
    predicted_outcome: number;
    is_future: boolean;
}

interface CategoryData {
    category: string;
    total: number;
    percentage: number;
}

interface Summary {
    currentBalance: number;
    currentMonth: { income: number; outcome: number; balance: number };
    prevMonth: { income: number; outcome: number; balance: number };
    savingsRate: number;
    periodIncome: number;
    periodOutcome: number;
}

interface WeeklyData {
    month: string;      // label "14 Jan"
    monthKey: string;
    cumulative: number;
    balance: number;
    is_future: boolean;
}

interface AnalyticsData {
    monthly: MonthlyData[];
    weekly: WeeklyData[];
    categoryBreakdown: { outcome: CategoryData[]; income: CategoryData[] };
    summary: Summary;
}

interface Wallet {
    id: number;
    name: string;
    is_default?: boolean;
    permission?: string;
    owner_name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
    '#34d399', '#06b6d4', '#6366f1', '#f97316', '#eab308',
    '#ec4899', '#a855f7', '#22c55e', '#3b82f6', '#14b8a6',
];

const ACCENT = '#34d399';
const ACCENT2 = '#06b6d4';
const INCOME_C = '#34d399';
const EXPENSE_C = '#ef4444';
const PURPLE_C = '#6366f1';

const GD = {
    bg: '#0a0e17',
    card: '#111827',
    card2: '#1a2235',
    card3: '#1e293b',
    border: 'rgba(148,163,184,0.10)',
    border2: 'rgba(148,163,184,0.18)',
    text: '#f1f5f9',
    text2: '#94a3b8',
    muted: '#64748b',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Chart type options ───────────────────────────────────────────────────────

type BarVsExpenseChartType = 'bar' | 'area';
type CumulativeChartType = 'line' | 'area';
type NetBalanceChartType = 'bar' | 'line';
type CatDisplayType = 'pie' | 'bar';
type CumulativeGranularity = 'monthly' | 'weekly';

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function ChartCard({
    title,
    children,
    controls,
    subtitle,
}: {
    title: string;
    children: React.ReactNode;
    controls?: React.ReactNode;
    subtitle?: string;
}) {
    return (
        <section
            style={{
                background: GD.card,
                border: `1px solid ${GD.border}`,
                borderRadius: 16,
                padding: '1.5rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ color: GD.text, fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>{title}</h2>
                    {subtitle && (
                        <p style={{ color: GD.muted, fontSize: '0.75rem', marginTop: 4 }}>{subtitle}</p>
                    )}
                </div>
                {controls && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {controls}
                    </div>
                )}
            </div>
            {children}
        </section>
    );
}

function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
}) {
    return (
        <div style={{
            display: 'flex',
            background: GD.card2,
            borderRadius: 8,
            padding: 2,
            border: `1px solid ${GD.border}`,
        }}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: value === opt.value ? ACCENT : 'transparent',
                        color: value === opt.value ? '#0a0e17' : GD.text2,
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function KpiCard({
    label,
    value,
    sub,
    trend,
    color,
    icon,
}: {
    label: string;
    value: string;
    sub?: string;
    trend?: 'up' | 'down' | null;
    color?: string;
    icon?: string;
}) {
    return (
        <div
            style={{
                background: GD.card,
                border: `1px solid ${GD.border}`,
                borderRadius: 14,
                padding: '1.125rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: GD.muted, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                    {label}
                </span>
                {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
            </div>
            <span style={{ color: color ?? GD.text, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.15 }}>
                {value}
            </span>
            {sub && (
                <span style={{ color: GD.muted, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {trend === 'up' && <span style={{ color: INCOME_C }}>↑</span>}
                    {trend === 'down' && <span style={{ color: EXPENSE_C }}>↓</span>}
                    {sub}
                </span>
            )}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: GD.card2,
            border: `1px solid ${GD.border2}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            fontSize: '0.8125rem',
        }}>
            <p style={{ color: GD.text, fontWeight: 600, marginBottom: 6 }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color, margin: '2px 0' }}>
                    {p.name} : <span style={{ fontWeight: 600 }}>{fmtFull(p.value)}</span>
                </p>
            ))}
        </div>
    );
};

const axisStyle = { fontSize: 11, fill: GD.muted };
const gridStyle = { stroke: GD.border, strokeDasharray: '3 3' };

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    // ── Data state ──
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [walletId, setWalletId] = useState<number | null>(null);
    const [months, setMonths] = useState<number>(12);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Chart customization state ──
    const [revenueChartType, setRevenueChartType] = useState<BarVsExpenseChartType>('bar');
    const [showPredictedBars, setShowPredictedBars] = useState(true);
    const [cumulChartType, setCumulChartType] = useState<CumulativeChartType>('area');
    const [cumulGranularity, setCumulGranularity] = useState<CumulativeGranularity>('monthly');
    const [netChartType, setNetChartType] = useState<NetBalanceChartType>('bar');
    const [catTab, setCatTab] = useState<'outcome' | 'income'>('outcome');
    const [catDisplay, setCatDisplay] = useState<CatDisplayType>('pie');

    // Load wallets
    useEffect(() => {
        fetch('/api/wallets?includeArchived=false')
            .then(r => r.json())
            .then((ws: Wallet[]) => {
                setWallets(ws);
                if (ws.length > 0) {
                    const def = ws.find(w => !w.permission || w.permission === 'owner');
                    setWalletId((def ?? ws[0]).id);
                }
            })
            .catch(() => setError('Impossible de charger les portefeuilles'));
    }, []);

    const fetchData = useCallback(async () => {
        if (!walletId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/analytics?walletId=${walletId}&months=${months}`);
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch {
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, [walletId, months]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const s = data?.summary;

    // ── Cumulative data — use precomputed data from API ──
    const cumulData = (() => {
        if (!data) return [];
        return cumulGranularity === 'monthly' ? data.monthly : data.weekly;
    })();

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="grigou-dark"
            style={{
                minHeight: '100vh',
                background: GD.bg,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            {/* ── Header ── */}
            <header style={{
                borderBottom: `1px solid ${GD.border}`,
                background: GD.card,
                padding: '0.875rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                position: 'sticky',
                top: 0,
                zIndex: 40,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <Link
                        href="/dashboard"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.8125rem',
                            color: GD.muted,
                            textDecoration: 'none',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 8,
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = GD.text)}
                        onMouseLeave={e => (e.currentTarget.style.color = GD.muted)}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Tableau de bord
                    </Link>
                    <span style={{ color: GD.border2 }}>·</span>
                    <h1 style={{ color: GD.text, fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        📊 Analyses
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <select
                        value={walletId ?? ''}
                        onChange={e => setWalletId(parseInt(e.target.value))}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: 8,
                            border: `1px solid ${GD.border2}`,
                            background: GD.card2,
                            color: GD.text,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                        }}
                    >
                        {wallets.map(w => (
                            <option key={w.id} value={w.id}>
                                {w.name}{w.owner_name ? ` (${w.owner_name})` : ''}
                            </option>
                        ))}
                    </select>

                    <select
                        value={months}
                        onChange={e => setMonths(parseInt(e.target.value))}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: 8,
                            border: `1px solid ${GD.border2}`,
                            background: GD.card2,
                            color: GD.text,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                        }}
                    >
                        <option value={3}>3 derniers mois</option>
                        <option value={6}>6 derniers mois</option>
                        <option value={12}>12 derniers mois</option>
                        <option value={24}>24 derniers mois</option>
                    </select>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: 8,
                            border: `1px solid ${GD.border2}`,
                            background: 'transparent',
                            color: GD.text2,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Actualiser
                    </button>
                </div>
            </header>

            {/* ── Body ── */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 10,
                        padding: '0.875rem 1.25rem',
                        color: '#fca5a5',
                        fontSize: '0.875rem',
                    }}>
                        {error}
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '5rem 0', color: GD.muted }}>
                        <div style={{
                            width: 24, height: 24,
                            border: `2px solid ${GD.border2}`,
                            borderTopColor: ACCENT,
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                        <span style={{ fontSize: '0.9375rem' }}>Chargement des analyses…</span>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {!loading && data && s && (
                    <>
                        {/* ── KPIs ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <KpiCard
                                label="Solde actuel"
                                value={fmt(s.currentBalance)}
                                color={s.currentBalance >= 0 ? ACCENT : EXPENSE_C}
                                icon="💰"
                            />
                            <KpiCard
                                label="Revenus ce mois"
                                value={fmt(s.currentMonth.income)}
                                color={ACCENT}
                                icon="📈"
                                trend={s.currentMonth.income >= s.prevMonth.income ? 'up' : 'down'}
                                sub={s.prevMonth.income > 0 ? `vs ${fmt(s.prevMonth.income)} le mois dernier` : undefined}
                            />
                            <KpiCard
                                label="Dépenses ce mois"
                                value={fmt(s.currentMonth.outcome)}
                                color={EXPENSE_C}
                                icon="📉"
                                trend={s.currentMonth.outcome <= s.prevMonth.outcome ? 'up' : 'down'}
                                sub={s.prevMonth.outcome > 0 ? `vs ${fmt(s.prevMonth.outcome)} le mois dernier` : undefined}
                            />
                            <KpiCard
                                label="Taux d'épargne"
                                value={`${s.savingsRate}%`}
                                color={s.savingsRate >= 0 ? ACCENT : EXPENSE_C}
                                icon="🏦"
                                sub={`sur ${months} mois · ${fmt(s.periodIncome - s.periodOutcome)} net`}
                            />
                        </div>

                        {/* ── Solde cumulé ── */}
                        <ChartCard
                            title="📈 Évolution du solde cumulé"
                            subtitle="La zone pointillée représente les prévisions basées sur vos récurrences"
                            controls={
                                <>
                                    <SegmentedControl<CumulativeGranularity>
                                        value={cumulGranularity}
                                        onChange={setCumulGranularity}
                                        options={[
                                            { value: 'monthly', label: 'Mensuel' },
                                            { value: 'weekly', label: 'Hebdo' },
                                        ]}
                                    />
                                    <SegmentedControl<CumulativeChartType>
                                        value={cumulChartType}
                                        onChange={setCumulChartType}
                                        options={[
                                            { value: 'area', label: '◟ Aire' },
                                            { value: 'line', label: '— Ligne' },
                                        ]}
                                    />
                                </>
                            }
                        >
                            <ResponsiveContainer width="100%" height={300}>
                                {cumulChartType === 'area' ? (
                                    <AreaChart data={cumulData}>
                                        <defs>
                                            <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={PURPLE_C} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={PURPLE_C} stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        <Area
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke={PURPLE_C}
                                            fill="url(#gc)"
                                            strokeWidth={2.5}
                                            name="Solde cumulé"
                                            dot={false}
                                            activeDot={{ r: 5, fill: PURPLE_C, stroke: GD.card, strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={cumulData}>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke={PURPLE_C}
                                            strokeWidth={2.5}
                                            name="Solde cumulé"
                                            dot={false}
                                            activeDot={{ r: 5, fill: PURPLE_C, stroke: GD.card, strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* ── Revenus vs Dépenses ── */}
                        <ChartCard
                            title="📅 Revenus vs Dépenses"
                            subtitle="Barres opaques = réel · transparentes = prévisions"
                            controls={
                                <>
                                    <SegmentedControl<BarVsExpenseChartType>
                                        value={revenueChartType}
                                        onChange={setRevenueChartType}
                                        options={[
                                            { value: 'bar', label: '▋ Barres' },
                                            { value: 'area', label: '◟ Aires' },
                                        ]}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: GD.text2, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={showPredictedBars}
                                            onChange={e => setShowPredictedBars(e.target.checked)}
                                            style={{ accentColor: ACCENT, width: 14, height: 14 }}
                                        />
                                        Prévisions
                                    </label>
                                </>
                            }
                        >
                            <ResponsiveContainer width="100%" height={300}>
                                {revenueChartType === 'bar' ? (
                                    <BarChart data={data.monthly} barCategoryGap="22%">
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: GD.text2 }} />
                                        <Bar dataKey="income" fill={INCOME_C} name="Revenus" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey="outcome" fill={EXPENSE_C} name="Dépenses" radius={[3, 3, 0, 0]} />
                                        {showPredictedBars && <Bar dataKey="predicted_income" fill={INCOME_C} name="Revenus prévus" radius={[3, 3, 0, 0]} opacity={0.35} />}
                                        {showPredictedBars && <Bar dataKey="predicted_outcome" fill={EXPENSE_C} name="Dépenses prévues" radius={[3, 3, 0, 0]} opacity={0.35} />}
                                    </BarChart>
                                ) : (
                                    <AreaChart data={data.monthly}>
                                        <defs>
                                            <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={INCOME_C} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={INCOME_C} stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={EXPENSE_C} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={EXPENSE_C} stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: GD.text2 }} />
                                        <Area type="monotone" dataKey="income" stroke={INCOME_C} fill="url(#gi)" name="Revenus" strokeWidth={2} />
                                        <Area type="monotone" dataKey="outcome" stroke={EXPENSE_C} fill="url(#ge)" name="Dépenses" strokeWidth={2} />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* ── Catégories ── */}
                        <ChartCard
                            title="🏷️ Répartition par catégorie"
                            controls={
                                <>
                                    <SegmentedControl<'outcome' | 'income'>
                                        value={catTab}
                                        onChange={setCatTab}
                                        options={[
                                            { value: 'outcome', label: '💸 Dépenses' },
                                            { value: 'income', label: '💰 Revenus' },
                                        ]}
                                    />
                                    <SegmentedControl<CatDisplayType>
                                        value={catDisplay}
                                        onChange={setCatDisplay}
                                        options={[
                                            { value: 'pie', label: '◔ Camembert' },
                                            { value: 'bar', label: '▋ Barres' },
                                        ]}
                                    />
                                </>
                            }
                        >
                            {data.categoryBreakdown[catTab].length === 0 ? (
                                <p style={{ color: GD.muted, textAlign: 'center', padding: '3rem 0', fontSize: '0.875rem' }}>
                                    Aucune donnée pour cette période.
                                </p>
                            ) : catDisplay === 'pie' ? (
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <ResponsiveContainer width={220} height={220}>
                                        <PieChart>
                                            <Pie
                                                data={data.categoryBreakdown[catTab]}
                                                dataKey="total"
                                                nameKey="category"
                                                cx="50%" cy="50%"
                                                outerRadius={95}
                                                innerRadius={52}
                                                paddingAngle={2}
                                            >
                                                {data.categoryBreakdown[catTab].map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={{ background: GD.card2, border: `1px solid ${GD.border2}`, borderRadius: 10, fontSize: 13 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
                                        {data.categoryBreakdown[catTab].slice(0, 10).map((cat, i) => (
                                            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '0.8125rem', color: GD.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {cat.category}
                                                </span>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: GD.text, flexShrink: 0 }}>
                                                    {fmtFull(cat.total)}
                                                </span>
                                                <div style={{ width: 64, background: GD.card3, borderRadius: 9999, height: 5, flexShrink: 0 }}>
                                                    <div style={{ width: `${cat.percentage}%`, background: PIE_COLORS[i % PIE_COLORS.length], height: 5, borderRadius: 9999 }} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: GD.muted, width: 28, textAlign: 'right', flexShrink: 0 }}>
                                                    {cat.percentage}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={Math.max(240, data.categoryBreakdown[catTab].length * 36)}>
                                    <BarChart
                                        data={data.categoryBreakdown[catTab].slice(0, 12)}
                                        layout="vertical"
                                        margin={{ left: 8 }}
                                    >
                                        <CartesianGrid horizontal={false} stroke={GD.border} />
                                        <XAxis type="number" tick={axisStyle} tickFormatter={fmt} />
                                        <YAxis
                                            type="category"
                                            dataKey="category"
                                            tick={{ fontSize: 12, fill: GD.text2 }}
                                            width={110}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="total"
                                            name="Total"
                                            radius={[0, 4, 4, 0]}
                                        >
                                            {data.categoryBreakdown[catTab].slice(0, 12).map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* ── Solde net mensuel ── */}
                        <ChartCard
                            title="⚖️ Solde mensuel net"
                            subtitle="Revenus − Dépenses · vert = excédent · rouge = déficit · transparent = prévision"
                            controls={
                                <SegmentedControl<NetBalanceChartType>
                                    value={netChartType}
                                    onChange={setNetChartType}
                                    options={[
                                        { value: 'bar', label: '▋ Barres' },
                                        { value: 'line', label: '— Ligne' },
                                    ]}
                                />
                            }
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                {netChartType === 'bar' ? (
                                    <BarChart data={data.monthly} barCategoryGap="30%">
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} />
                                        <Bar dataKey="balance" name="Solde net" radius={[3, 3, 0, 0]}>
                                            {data.monthly.map((m, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={m.balance >= 0 ? INCOME_C : EXPENSE_C}
                                                    opacity={m.is_future ? 0.35 : 1}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <LineChart data={data.monthly}>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        <Line
                                            type="monotone"
                                            dataKey="balance"
                                            stroke={ACCENT2}
                                            strokeWidth={2.5}
                                            name="Solde net"
                                            dot={(props: any) => {
                                                const val = data.monthly[props.index]?.balance ?? 0;
                                                return (
                                                    <circle
                                                        key={props.key}
                                                        cx={props.cx} cy={props.cy} r={4}
                                                        fill={val >= 0 ? INCOME_C : EXPENSE_C}
                                                        stroke={GD.card} strokeWidth={2}
                                                    />
                                                );
                                            }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </ChartCard>
                    </>
                )}
            </main>
        </div>
    );
}