'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useThemeColors } from '@/components/theme/ThemeProvider';
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
    icon: string;
    color: string;
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
    month: string;
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

interface Transaction {
    id: number;
    type: 'income' | 'outcome';
    amount: number;
    description: string | null;
    date: string;
    category: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
    '#34d399', '#06b6d4', '#6366f1', '#f97316', '#eab308',
    '#ec4899', '#a855f7', '#22c55e', '#3b82f6', '#14b8a6',
];

// HTML inline styles: CSS variables (follow the theme).
// Inside the page, the SVG charts get real values via useThemeColors().
const ACCENT = 'rgb(var(--accent))';
const ACCENT2 = 'rgb(var(--info))';
const INCOME_C = 'rgb(var(--positive))';
const EXPENSE_C = 'rgb(var(--negative))';
const PURPLE_C = 'rgb(var(--info))';

const GD = {
    bg: 'rgb(var(--canvas))',
    card: 'rgb(var(--surface))',
    card2: 'rgb(var(--surface-2))',
    card3: 'rgb(var(--surface-3))',
    border: 'rgb(var(--line))',
    border2: 'rgb(var(--line-strong))',
    text: 'rgb(var(--fg))',
    text2: 'rgb(var(--fg-muted))',
    muted: 'rgb(var(--fg-subtle))',
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
        <section className="card p-5 md:p-6">
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
        <div className="segmented" role="group">
            {options.map(opt => (
                <button key={opt.value} type="button" aria-pressed={value === opt.value} onClick={() => onChange(opt.value)} className="!px-2.5 !py-1 !text-xs">
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
    icon?: React.ReactNode;
}) {
    return (
        <div className="card flex flex-col gap-1.5 px-5 py-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-sm font-medium text-fg-muted">{label}</span>
                {icon && <span className="text-fg-subtle">{icon}</span>}
            </div>
            <span className="amount text-2xl" style={{ color: color ?? GD.text, lineHeight: 1.2 }}>
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
            background: GD.card,
            border: `1px solid ${GD.border}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            boxShadow: 'var(--shadow-pop)',
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


// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    // Real colour values for the SVG charts (follow the theme)
    const C = useThemeColors();
    const ACCENT = C.accent;
    const ACCENT2 = C.info;
    const INCOME_C = C.positive;
    const EXPENSE_C = C.negative;
    const PURPLE_C = C.info;
    const axisStyle = { fontSize: 11, fill: C['fg-subtle'] };
    const gridStyle = { stroke: C.line, strokeDasharray: '3 3', vertical: false };
    const GDs = { ...GD, card: C.surface };

    // ── Data state ──
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [walletId, setWalletId] = useState<number | null>(null);
    const [months, setMonths] = useState<number>(12);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Chart customization state ──
    const [revenueChartType, setRevenueChartType] = useState<BarVsExpenseChartType>('bar');
    const [showPredictedBars, setShowPredictedBars] = useState(true);
    const [cumulChartType, setCumulChartType] = useState<CumulativeChartType>('area');
    const [cumulGranularity, setCumulGranularity] = useState<CumulativeGranularity>('monthly');
    const [showTxOnHover, setShowTxOnHover] = useState(false);
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
            const [analyticsRes, txRes] = await Promise.all([
                fetch(`/api/analytics?walletId=${walletId}&months=${months}`),
                fetch(`/api/transactions?walletId=${walletId}`),
            ]);
            if (!analyticsRes.ok) throw new Error();
            setData(await analyticsRes.json());
            setTransactions(txRes.ok ? await txRes.json() : []);
        } catch {
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, [walletId, months]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const s = data?.summary;

    // ── Cumulative data ──
    const cumulData = (() => {
        if (!data) return [];
        return cumulGranularity === 'monthly' ? data.monthly : data.weekly;
    })();

    // ── Tooltip dédié pour le solde cumulé avec transactions au survol ──
    const CumulativeTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const value = payload[0]?.value;

        const point = cumulData.find((d: any) => d.month === label);
        const dateKey = point?.monthKey ?? label;

        const dayTx = showTxOnHover
            ? transactions.filter(t => t.date?.startsWith(dateKey))
            : [];

        return (
            <div style={{
                background: GD.card,
                border: `1px solid ${GD.border}`,
                borderRadius: 10,
                padding: '0.75rem 1rem',
                boxShadow: 'var(--shadow-pop)',
                fontSize: '0.8125rem',
                maxWidth: 300,
                minWidth: 180,
            }}>
                <p style={{ color: GD.text, fontWeight: 600, marginBottom: 6 }}>{label}</p>
                <p style={{ color: PURPLE_C, fontWeight: 700, margin: 0, marginBottom: showTxOnHover ? 8 : 0 }}>
                    Solde : {fmtFull(value)}
                </p>
                {showTxOnHover && dayTx.length > 0 && (
                    <div style={{ borderTop: `1px solid ${GD.border}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {dayTx.map((t, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <span style={{
                                    color: GD.text2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 170,
                                    fontSize: '0.75rem',
                                }}>
                                    {t.description || <em style={{ color: GD.muted }}>Sans description</em>}
                                </span>
                                <span style={{
                                    color: t.type === 'income' ? INCOME_C : EXPENSE_C,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    fontSize: '0.75rem',
                                }}>
                                    {t.type === 'income' ? '+' : '−'}{fmtFull(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {showTxOnHover && dayTx.length === 0 && (
                    <p style={{
                        color: GD.muted,
                        borderTop: `1px solid ${GD.border}`,
                        paddingTop: 8,
                        margin: 0,
                        fontStyle: 'italic',
                        fontSize: '0.75rem',
                    }}>
                        Aucune transaction ce jour
                    </p>
                )}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <AppHeader />

            <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pt-6 md:px-6 md:pt-8">
                <div>
                    <p className="eyebrow mb-1">Analyses</p>
                    <h1 className="text-2xl font-semibold">Évolution de vos finances</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={walletId ?? ''}
                        onChange={e => setWalletId(parseInt(e.target.value))}
                        aria-label="Portefeuille"
                        className="field h-9 w-auto !py-1"
                    >
                        {wallets.map(w => (
                            <option key={w.id} value={w.id}>
                                {w.name}{w.owner_name ? ` · ${w.owner_name}` : ''}
                            </option>
                        ))}
                    </select>
                    <select
                        value={months}
                        onChange={e => setMonths(parseInt(e.target.value))}
                        aria-label="Période"
                        className="field h-9 w-auto !py-1"
                    >
                        <option value={3}>3 derniers mois</option>
                        <option value={6}>6 derniers mois</option>
                        <option value={12}>12 derniers mois</option>
                        <option value={24}>24 derniers mois</option>
                    </select>
                    <button onClick={fetchData} className="btn-secondary h-9" title="Actualiser">
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        <span className="hidden sm:inline">Actualiser</span>
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">

                {error && (
                    <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center gap-3 py-20 text-fg-muted" role="status">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
                        <span className="text-sm">Chargement des analyses…</span>
                    </div>
                )}

                {!loading && data && s && (
                    <>
                        {/* ── KPIs ── */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                            <KpiCard
                                label="Solde actuel"
                                value={fmt(s.currentBalance)}
                                color={s.currentBalance >= 0 ? ACCENT : EXPENSE_C}
                            />
                            <KpiCard
                                label="Revenus ce mois"
                                value={fmt(s.currentMonth.income)}
                                color={ACCENT}
                                trend={s.currentMonth.income >= s.prevMonth.income ? 'up' : 'down'}
                                sub={s.prevMonth.income > 0 ? `vs ${fmt(s.prevMonth.income)} le mois dernier` : undefined}
                            />
                            <KpiCard
                                label="Dépenses ce mois"
                                value={fmt(s.currentMonth.outcome)}
                                color={EXPENSE_C}
                                trend={s.currentMonth.outcome <= s.prevMonth.outcome ? 'up' : 'down'}
                                sub={s.prevMonth.outcome > 0 ? `vs ${fmt(s.prevMonth.outcome)} le mois dernier` : undefined}
                            />
                            <KpiCard
                                label="Taux d'épargne"
                                value={`${s.savingsRate}%`}
                                color={s.savingsRate >= 0 ? ACCENT : EXPENSE_C}
                                sub={`sur ${months} mois · ${fmt(s.periodIncome - s.periodOutcome)} net`}
                            />
                        </div>

                        {/* ── Revenus vs Dépenses ── */}
                        <ChartCard
                            title="Revenus et dépenses"
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

                        {/* ── Solde cumulé ── */}
                        <ChartCard
                            title="Évolution du solde"
                            subtitle="La zone pointillée représente les prévisions basées sur vos récurrences"
                            controls={
                                <>
                                    <SegmentedControl<CumulativeGranularity>
                                        value={cumulGranularity}
                                        onChange={setCumulGranularity}
                                        options={[
                                            { value: 'monthly', label: 'Mensuel' },
                                            { value: 'weekly', label: 'Journalier' },
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
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        fontSize: '0.75rem',
                                        color: showTxOnHover ? GD.text : GD.text2,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: `1px solid ${showTxOnHover ? PURPLE_C : GD.border}`,
                                        background: showTxOnHover ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        transition: 'all 0.15s',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={showTxOnHover}
                                            onChange={e => setShowTxOnHover(e.target.checked)}
                                            style={{ accentColor: PURPLE_C, width: 13, height: 13 }}
                                        />
                                        Transactions
                                    </label>
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
                                        <XAxis dataKey="month" tick={axisStyle} interval={cumulGranularity === 'weekly' ? Math.floor(cumulData.length / 15) : 0} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CumulativeTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        <Area
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke={PURPLE_C}
                                            fill="url(#gc)"
                                            strokeWidth={2.5}
                                            name="Solde cumulé"
                                            dot={false}
                                            activeDot={{ r: 5, fill: PURPLE_C, stroke: GDs.card, strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={cumulData}>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="month" tick={axisStyle} interval={cumulGranularity === 'weekly' ? Math.floor(cumulData.length / 15) : 0} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} />
                                        <Tooltip content={<CumulativeTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke={PURPLE_C}
                                            strokeWidth={2.5}
                                            name="Solde cumulé"
                                            dot={false}
                                            activeDot={{ r: 5, fill: PURPLE_C, stroke: GDs.card, strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* ── Catégories ── */}
                        <ChartCard
                            title="Répartition par catégorie"
                            controls={
                                <>
                                    <SegmentedControl<'outcome' | 'income'>
                                        value={catTab}
                                        onChange={setCatTab}
                                        options={[
                                            { value: 'outcome', label: 'Dépenses' },
                                            { value: 'income', label: 'Revenus' },
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
                                                {data.categoryBreakdown[catTab].map((cat, i) => (
                                                    <Cell key={i} fill={cat.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={{ background: GD.card2, border: `1px solid ${GD.border2}`, borderRadius: 10, fontSize: 13 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
                                        {data.categoryBreakdown[catTab].slice(0, 10).map((cat, i) => (
                                            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '0.8125rem', color: GD.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    {cat.category}
                                                </span>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: GD.text, flexShrink: 0 }}>
                                                    {fmtFull(cat.total)}
                                                </span>
                                                <div style={{ width: 64, background: GD.card3, borderRadius: 9999, height: 5, flexShrink: 0 }}>
                                                    <div style={{ width: `${cat.percentage}%`, background: cat.color || PIE_COLORS[i % PIE_COLORS.length], height: 5, borderRadius: 9999 }} />
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
                                            tick={({ x, y, payload }: any) => {
                                                const cat = data.categoryBreakdown[catTab].find(c => c.category === payload.value);
                                                return (
                                                    <text x={x} y={y} textAnchor="end" dominantBaseline="middle" fill={GD.text2} fontSize={12}>
                                                        {payload.value}
                                                    </text>
                                                );
                                            }}
                                            width={120}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="total"
                                            name="Total"
                                            radius={[0, 4, 4, 0]}
                                        >
                                            {data.categoryBreakdown[catTab].slice(0, 12).map((cat, i) => (
                                                <Cell key={i} fill={cat.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* ── Solde net mensuel ── */}
                        <ChartCard
                            title="Solde net par mois"
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