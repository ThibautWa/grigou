'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useThemeColors } from '@/components/theme/ThemeProvider';
import {
    BarChart, Bar,
    LineChart, Line,
    AreaChart, Area,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ReferenceArea, LabelList,
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

/** System category created by the balance adjuster (see api/wallets/[id]/adjust). */
const ADJUSTMENT_CATEGORY = 'Ajustement';

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

interface MonthVsAverageRow {
    category: string;
    color: string;
    current: number;   // spent this month, to date
    planned: number;   // recurring expenses still to come this month
    average: number;   // monthly average over the previous months
}

interface AnalyticsData {
    monthly: MonthlyData[];
    weekly: WeeklyData[];
    categoryBreakdown: { outcome: CategoryData[]; income: CategoryData[] };
    monthVsAverage?: { pastMonths: number; averageBasis?: 'period' | 'last12'; categories: MonthVsAverageRow[] };
    weeks?: MonthlyData[];
    period?: { from: string; to: string; days: number; historyDays: number };
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
type CatDisplayType = 'pie' | 'bar';
// 'weekly' is historical naming for the daily series
type CumulativeGranularity = 'monthly' | 'weeks' | 'weekly';
type RevenueGranularity = 'month' | 'week';

// ─── Period ───────────────────────────────────────────────────────────────────

type PeriodPreset = '7d' | '14d' | '28d' | '3' | '6' | '12' | '24' | '36' | '60' | 'ytd' | 'last-year' | 'all' | 'custom';

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
    { value: '7d', label: '7 derniers jours' },
    { value: '14d', label: '2 dernières semaines' },
    { value: '28d', label: '4 dernières semaines' },
    { value: '3', label: '3 derniers mois' },
    { value: '6', label: '6 derniers mois' },
    { value: '12', label: '12 derniers mois' },
    { value: '24', label: '2 dernières années' },
    { value: '36', label: '3 dernières années' },
    { value: '60', label: '5 dernières années' },
    { value: 'ytd', label: 'Cette année' },
    { value: 'last-year', label: "L'année dernière" },
    { value: 'all', label: 'Tout l\'historique' },
    { value: 'custom', label: 'Personnalisée…' },
];

/** Forecast after today: '1w' / '2w' in weeks (to that day), otherwise whole months. */
type Forecast = '0' | '1w' | '2w' | '1' | '3' | '6' | '12';
const FORECAST_OPTIONS: { value: Forecast; label: string }[] = [
    { value: '0', label: 'Sans prévision' },
    { value: '1w', label: '+ 1 semaine de prévision' },
    { value: '2w', label: '+ 2 semaines de prévision' },
    { value: '1', label: '+ 1 mois de prévision' },
    { value: '3', label: '+ 3 mois de prévision' },
    { value: '6', label: '+ 6 mois de prévision' },
    { value: '12', label: '+ 12 mois de prévision' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const ym = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const ymd = (d: Date) => `${ym(d)}-${pad2(d.getDate())}`;
const addMonthsYm = (n: number) => { const d = new Date(); return ym(new Date(d.getFullYear(), d.getMonth() + n, 1)); };
const addDaysYmd = (n: number) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** End of the period: today + forecast (a day for weeks, the end of a month otherwise). */
function forecastEnd(forecast: Forecast, shortPeriod: boolean): string {
    if (forecast === '1w') return addDaysYmd(7);
    if (forecast === '2w') return addDaysYmd(14);
    if (forecast === '0') return shortPeriod ? addDaysYmd(0) : addMonthsYm(0);
    return addMonthsYm(parseInt(forecast));
}

/** Query string for /api/analytics from the period controls. */
function periodQuery(preset: PeriodPreset, forecast: Forecast, customFrom: string, customTo: string): string {
    const year = new Date().getFullYear();
    if (preset.endsWith('d')) {
        const days = parseInt(preset);
        return `from=${addDaysYmd(1 - days)}&to=${forecastEnd(forecast, true)}`;
    }
    const to = forecastEnd(forecast, false);
    switch (preset) {
        case 'ytd': return `from=${year}-01&to=${to}`;
        case 'last-year': return `from=${year - 1}-01&to=${year - 1}-12`;
        case 'all': return `from=all&to=${to}`;
        case 'custom': return `from=${customFrom}&to=${customTo}`;
        default: return `from=${addMonthsYm(1 - parseInt(preset))}&to=${to}`;
    }
}

/** Remembered period controls (per browser; harmless if storage is unavailable). */
const PERIOD_STORAGE_KEY = 'grigou.analytics.period';
function loadPeriod(): { preset: PeriodPreset; forecast: unknown; from: string; to: string } | null {
    try {
        const raw = window.localStorage.getItem(PERIOD_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

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

/** Pie tooltip: amount and share, plus the detail of the grouped "Autres" slice. */
const CategoryTooltip = ({ active, payload, others }: any) => {
    if (!active || !payload?.length) return null;
    const cat = payload[0].payload as CategoryData;
    const isOthers = cat.category === 'Autres' && others?.length > 0;
    return (
        <div style={{
            background: GD.card,
            border: `1px solid ${GD.border}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            boxShadow: 'var(--shadow-pop)',
            fontSize: '0.8125rem',
            maxWidth: 280,
        }}>
            <p style={{ color: GD.text, fontWeight: 600, margin: 0 }}>
                {cat.category} : {fmtFull(Number(cat.total))}
            </p>
            {isOthers && (
                <div style={{ borderTop: `1px solid ${GD.border}`, marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {others.map((o: CategoryData) => (
                        <div key={o.category} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.75rem' }}>
                            <span style={{ color: GD.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.category}</span>
                            <span style={{ color: GD.text, fontWeight: 600, flexShrink: 0 }}>{fmtFull(Number(o.total))}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Tooltip for "Ce mois-ci vs moyenne": spent, still planned, average and gap. */
const MonthVsAverageTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload as MonthVsAverageRow;
    const projected = r.current + r.planned;
    const diff = projected - r.average;
    return (
        <div style={{
            background: GD.card,
            border: `1px solid ${GD.border}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            boxShadow: 'var(--shadow-pop)',
            fontSize: '0.8125rem',
            minWidth: 200,
        }}>
            <p style={{ color: GD.text, fontWeight: 600, marginBottom: 6 }}>{r.category}</p>
            <p style={{ color: GD.text2, margin: '2px 0' }}>Dépensé ce mois : <b style={{ color: GD.text }}>{fmtFull(r.current)}</b></p>
            {r.planned > 0 && (
                <p style={{ color: GD.text2, margin: '2px 0' }}>Encore prévu : <b style={{ color: GD.text }}>{fmtFull(r.planned)}</b></p>
            )}
            <p style={{ color: GD.text2, margin: '2px 0' }}>Moyenne mensuelle : <b style={{ color: GD.text }}>{fmtFull(r.average)}</b></p>
            {r.average > 0 && (
                <p style={{ color: diff > 0 ? EXPENSE_C : INCOME_C, margin: '6px 0 0', fontWeight: 600 }}>
                    {diff > 0 ? '+' : '−'}{fmtFull(Math.abs(diff))} par rapport à la moyenne
                </p>
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    // Real colour values for the SVG charts (follow the theme)
    const C = useThemeColors();
    const ACCENT = C.accent;
    const INCOME_C = C.positive;
    const EXPENSE_C = C.negative;
    const PURPLE_C = C.info;
    const axisStyle = { fontSize: 11, fill: C['fg-subtle'] };
    const gridStyle = { stroke: C.line, strokeDasharray: '3 3', vertical: false };
    const GDs = { ...GD, card: C.surface };

    // ── Data state ──
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [walletId, setWalletId] = useState<number | null>(null);
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('12');
    const [forecast, setForecast] = useState<Forecast>('3');
    const [customFrom, setCustomFrom] = useState<string>(() => addDaysYmd(-27));
    const [customTo, setCustomTo] = useState<string>(() => addDaysYmd(7));
    const [periodLoaded, setPeriodLoaded] = useState(false);
    useEffect(() => {
        const saved = loadPeriod();
        if (saved && PERIOD_OPTIONS.some((o) => o.value === saved.preset)) {
            setPeriodPreset(saved.preset);
            const f = String(saved.forecast);
            if (FORECAST_OPTIONS.some((o) => o.value === f)) setForecast(f as Forecast);
            if (DAY_RE.test(saved.from)) setCustomFrom(saved.from);
            if (DAY_RE.test(saved.to)) setCustomTo(saved.to);
        }
        setPeriodLoaded(true);
    }, []);
    useEffect(() => {
        if (!periodLoaded) return;
        try {
            window.localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ preset: periodPreset, forecast, from: customFrom, to: customTo }));
        } catch { /* storage unavailable */ }
    }, [periodLoaded, periodPreset, forecast, customFrom, customTo]);
    const customValid = DAY_RE.test(customFrom) && DAY_RE.test(customTo) && customFrom <= customTo;
    const query = periodPreset === 'custom' && !customValid ? null : periodQuery(periodPreset, forecast, customFrom, customTo);
    const forecastApplies = periodPreset !== 'custom' && periodPreset !== 'last-year';
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Chart customization state ──
    const [revenueChartType, setRevenueChartType] = useState<BarVsExpenseChartType>('bar');
    const [showPredictedBars, setShowPredictedBars] = useState(true);
    const [cumulChartType, setCumulChartType] = useState<CumulativeChartType>('area');
    // null = automatic, from the length of the period
    const [cumulGranChoice, setCumulGranularity] = useState<CumulativeGranularity | null>(null);
    const [revenueGranChoice, setRevenueGranularity] = useState<RevenueGranularity | null>(null);
    useEffect(() => { setCumulGranularity(null); setRevenueGranularity(null); }, [query]);
    const [showTxOnHover, setShowTxOnHover] = useState(false);
    const [catTab, setCatTab] = useState<'outcome' | 'income'>('outcome');

    // Balance adjustments are corrections, not real spending or income: leave
    // them out of the breakdown and recompute the shares without them.
    const catData: CategoryData[] = useMemo(() => {
        if (!data) return [];
        const rows = data.categoryBreakdown[catTab].filter((c) => c.category !== ADJUSTMENT_CATEGORY);
        const total = rows.reduce((sum, c) => sum + Number(c.total), 0);
        return rows.map((c) => ({ ...c, percentage: total > 0 ? Math.round((Number(c.total) / total) * 100) : 0 }));
    }, [data, catTab]);
    const [catDisplay, setCatDisplay] = useState<CatDisplayType>('pie');

    // Small categories are too thin to see in the ring: past the biggest ones,
    // everything under 3 % is grouped into one "Autres" slice (listed in its tooltip).
    const OTHERS_COLOR = C['fg-subtle'];
    const pieData = useMemo(() => {
        const total = catData.reduce((sum, c) => sum + Number(c.total), 0);
        if (total <= 0) return { slices: catData, others: [] as CategoryData[] };
        const sorted = [...catData].sort((a, b) => Number(b.total) - Number(a.total));
        const kept: CategoryData[] = [];
        const others: CategoryData[] = [];
        sorted.forEach((c, i) => {
            const share = Number(c.total) / total;
            if (i < 8 && (share >= 0.03 || i < 3)) kept.push(c);
            else others.push(c);
        });
        if (others.length <= 1) return { slices: sorted, others: [] as CategoryData[] };
        const othersTotal = others.reduce((sum, c) => sum + Number(c.total), 0);
        kept.push({
            category: 'Autres',
            icon: '',
            color: OTHERS_COLOR,
            total: othersTotal,
            percentage: Math.round((othersTotal / total) * 100),
        });
        return { slices: kept, others };
    }, [catData, OTHERS_COLOR]);
    // ── This month vs average: biggest categories first, adjustments left out ──
    const mva = useMemo(() => {
        const src = data?.monthVsAverage;
        if (!src) return null;
        const rows = src.categories
            .filter((c) => c.category !== ADJUSTMENT_CATEGORY)
            .filter((c) => c.current + c.planned > 0 || c.average >= 1)
            .sort((a, b) => Math.max(b.current + b.planned, b.average) - Math.max(a.current + a.planned, a.average));
        const top = rows.slice(0, 8);
        const sum = (k: 'current' | 'planned' | 'average') => rows.reduce((t, c) => t + c[k], 0);
        return { pastMonths: src.pastMonths, rows: top, hidden: rows.length - top.length, current: sum('current'), planned: sum('planned'), average: sum('average') };
    }, [data]);

    const catColor = (cat: CategoryData, i: number) => cat.color || PIE_COLORS[i % PIE_COLORS.length];
    const fmtPct = (cat: CategoryData) => (cat.percentage < 1 && Number(cat.total) > 0 ? '<1%' : `${cat.percentage}%`);

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

    // Latest request wins when the wallet / period changes quickly
    const requestId = useRef(0);

    const fetchData = useCallback(async () => {
        if (!walletId || !query || !periodLoaded) return;
        const id = ++requestId.current;
        setLoading(true);
        setError('');
        try {
            const [analyticsRes, txRes] = await Promise.all([
                fetch(`/api/analytics?walletId=${walletId}&${query}`),
                fetch(`/api/transactions?walletId=${walletId}`),
            ]);
            if (!analyticsRes.ok) throw new Error();
            const [analytics, tx] = await Promise.all([analyticsRes.json(), txRes.ok ? txRes.json() : []]);
            if (id !== requestId.current) return;
            setData(analytics);
            setTransactions(tx);
        } catch {
            if (id === requestId.current) setError('Erreur lors du chargement des données');
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [walletId, query, periodLoaded]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const s = data?.summary;
    const periodDays = data?.period?.days ?? 365;
    const historyDays = data?.period?.historyDays ?? 0;
    const periodText = periodPreset === 'ytd'
        ? 'depuis janvier'
        : periodPreset === 'last-year'
            ? `sur ${new Date().getFullYear() - 1}`
            : historyDays <= 31
                ? `sur ${historyDays} jour${historyDays > 1 ? 's' : ''}`
                : historyDays <= 98
                    ? `sur ${Math.round(historyDays / 7)} semaines`
                    : `sur ${Math.round(historyDays / 30.44)} mois`;
    const cumulGranularity: CumulativeGranularity = cumulGranChoice
        ?? (periodDays <= 45 ? 'weekly' : periodDays <= 190 ? 'weeks' : 'monthly');
    // Short periods: zoom the balance axis on the data instead of starting at 0
    const cumulYDomain: [any, any] = periodDays <= 190 ? ['auto', 'auto'] : [0, 'auto'];
    const revenueGranularity: RevenueGranularity = revenueGranChoice ?? (periodDays <= 120 ? 'week' : 'month');
    const revenueData = (revenueGranularity === 'week' ? data?.weeks : undefined) ?? data?.monthly ?? [];

    // ── Cumulative data ──
    const cumulData = (() => {
        if (!data) return [];
        if (cumulGranularity === 'weeks' && data.weeks) return data.weeks;
        return cumulGranularity === 'weekly' ? data.weekly : data.monthly;
    })();

    // ── "Aujourd'hui" marker: the point for the current month / day, and the last
    // point, so the forecast part after today can be shaded ──
    const todayKey = (() => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
        const key = cumulGranularity === 'monthly'
            ? monthKey
            : cumulGranularity === 'weeks'
                ? ymd(monday)
                : `${monthKey}-${pad(now.getDate())}`;
        return cumulData.some((d) => d.monthKey === key) ? key : undefined;
    })();
    const lastKey = cumulData.length ? cumulData[cumulData.length - 1].monthKey : undefined;
    // The x axis is keyed by monthKey (day labels such as "23 Nov" repeat across years)
    const cumulLabelByKey = new Map(cumulData.map((d) => [d.monthKey, d.month]));
    const cumulTick = (key: string) => cumulLabelByKey.get(key) ?? key;
    const todayMarkers = todayKey ? [
        lastKey && lastKey !== todayKey ? (
            <ReferenceArea key="forecast" x1={todayKey} x2={lastKey} fill={C['fg-subtle']} fillOpacity={0.08} ifOverflow="extendDomain" />
        ) : null,
        <ReferenceLine
            key="today"
            x={todayKey}
            stroke={ACCENT}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{ value: "Aujourd'hui", position: 'top', fill: ACCENT, fontSize: 11, fontWeight: 600 }}
        />,
    ] : null;

    // ── Tooltip dédié pour le solde cumulé avec transactions au survol ──
    const CumulativeTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const value = payload[0]?.value;

        const point = cumulData.find((d: any) => d.monthKey === label);
        const dateKey = label;

        // A week is keyed by its Monday: take the 7 days from it
        const weekEnd = cumulGranularity === 'weeks' && typeof dateKey === 'string'
            ? (() => { const [y, m, d] = dateKey.split('-').map(Number); return ymd(new Date(y, m - 1, d + 6)); })()
            : null;
        const dayTx = showTxOnHover
            ? transactions.filter(t => weekEnd
                ? t.date && t.date.slice(0, 10) >= dateKey && t.date.slice(0, 10) <= weekEnd
                : t.date?.startsWith(dateKey))
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
                <p style={{ color: GD.text, fontWeight: 600, marginBottom: 6 }}>{point?.month ?? label}</p>
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
                        {cumulGranularity === 'weeks' ? 'Aucune transaction cette semaine' : cumulGranularity === 'monthly' ? 'Aucune transaction ce mois' : 'Aucune transaction ce jour'}
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
                        value={periodPreset}
                        onChange={e => setPeriodPreset(e.target.value as PeriodPreset)}
                        aria-label="Période"
                        className="field h-9 w-auto !py-1"
                    >
                        {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {periodPreset === 'custom' ? (
                        <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                            <input
                                type="date"
                                value={customFrom}
                                max={customTo || undefined}
                                onChange={e => setCustomFrom(e.target.value)}
                                aria-label="Du"
                                className="field h-9 w-auto !py-1"
                            />
                            <span>→</span>
                            <input
                                type="date"
                                value={customTo}
                                min={customFrom || undefined}
                                onChange={e => setCustomTo(e.target.value)}
                                aria-label="Au"
                                className="field h-9 w-auto !py-1"
                            />
                        </div>
                    ) : forecastApplies && (
                        <select
                            value={forecast}
                            onChange={e => setForecast(e.target.value as Forecast)}
                            aria-label="Prévisions"
                            title="Mois de prévision affichés après aujourd'hui"
                            className="field h-9 w-auto !py-1"
                        >
                            {FORECAST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    )}
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

                {/* Full-page loader only the first time; afterwards the charts stay and update in place */}
                {loading && data && (
                    <div className="pointer-events-none fixed inset-x-0 top-14 z-30 h-0.5 animate-pulse bg-accent/70" role="progressbar" aria-label="Mise à jour" />
                )}
                {loading && !data && (
                    <div className="flex items-center justify-center gap-3 py-20 text-fg-muted" role="status">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
                        <span className="text-sm">Chargement des analyses…</span>
                    </div>
                )}

                {data && s && (
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
                                sub={`${periodText} · ${fmt(s.periodIncome - s.periodOutcome)} net`}
                            />
                        </div>

                        {/* ── Revenus vs Dépenses ── */}
                        <ChartCard
                            title="Revenus et dépenses"
                            subtitle="Barres opaques = réel · transparentes = prévisions"
                            controls={
                                <>
                                    <SegmentedControl<RevenueGranularity>
                                        value={revenueGranularity}
                                        onChange={setRevenueGranularity}
                                        options={[
                                            { value: 'month', label: 'Mois' },
                                            { value: 'week', label: 'Semaines' },
                                        ]}
                                    />
                                    <SegmentedControl<BarVsExpenseChartType>
                                        value={revenueChartType}
                                        onChange={setRevenueChartType}
                                        options={[
                                            { value: 'bar', label: 'Barres' },
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
                                    <BarChart data={revenueData} barCategoryGap="22%">
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
                                    <AreaChart data={revenueData}>
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
                            subtitle="La ligne marque aujourd'hui ; la zone grisée après elle est une prévision basée sur vos récurrences"
                            controls={
                                <>
                                    <SegmentedControl<CumulativeGranularity>
                                        value={cumulGranularity}
                                        onChange={setCumulGranularity}
                                        options={[
                                            { value: 'monthly', label: 'Mensuel' },
                                            { value: 'weeks', label: 'Hebdo' },
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
                                    <AreaChart data={cumulData} margin={{ top: 22, right: 8 }}>
                                        <defs>
                                            <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={PURPLE_C} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={PURPLE_C} stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="monthKey" tickFormatter={cumulTick} tick={axisStyle} interval={Math.floor(cumulData.length / 15)} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} domain={cumulYDomain} />
                                        <Tooltip content={<CumulativeTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        {todayMarkers}
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
                                    <LineChart data={cumulData} margin={{ top: 22, right: 8 }}>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="monthKey" tickFormatter={cumulTick} tick={axisStyle} interval={Math.floor(cumulData.length / 15)} />
                                        <YAxis tick={axisStyle} tickFormatter={fmt} width={80} domain={cumulYDomain} />
                                        <Tooltip content={<CumulativeTooltip />} />
                                        <ReferenceLine y={0} stroke={GD.border2} strokeDasharray="4 4" />
                                        {todayMarkers}
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
                            title={catTab === 'outcome' ? 'Dépenses par catégorie' : 'Revenus par catégorie'}
                            subtitle={`Part de chaque catégorie ${periodText}, hors ajustements de solde`}
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
                                            { value: 'pie', label: 'Anneau' },
                                            { value: 'bar', label: 'Barres' },
                                        ]}
                                    />
                                </>
                            }
                        >
                            {catData.length === 0 ? (
                                <p style={{ color: GD.muted, textAlign: 'center', padding: '3rem 0', fontSize: '0.875rem' }}>
                                    Aucune donnée pour cette période.
                                </p>
                            ) : catDisplay === 'pie' ? (
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <ResponsiveContainer width={220} height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData.slices}
                                                dataKey="total"
                                                nameKey="category"
                                                cx="50%" cy="50%"
                                                outerRadius={95}
                                                innerRadius={52}
                                                paddingAngle={2}
                                                minAngle={4}
                                                stroke={GDs.card}
                                                strokeWidth={1}
                                            >
                                                {pieData.slices.map((cat, i) => (
                                                    <Cell key={i} fill={catColor(cat, i)} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CategoryTooltip others={pieData.others} />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
                                        {pieData.slices.map((cat, i) => (
                                            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: catColor(cat, i), flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '0.8125rem', color: GD.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    {cat.category}
                                                    {cat.category === 'Autres' && pieData.others.length > 0 && (
                                                        <span style={{ color: GD.muted, fontSize: '0.75rem' }}>({pieData.others.length})</span>
                                                    )}
                                                </span>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: GD.text, flexShrink: 0 }}>
                                                    {fmtFull(cat.total)}
                                                </span>
                                                <div style={{ width: 64, background: GD.card3, borderRadius: 9999, height: 5, flexShrink: 0 }}>
                                                    <div style={{ width: `${cat.percentage}%`, background: catColor(cat, i), height: 5, borderRadius: 9999 }} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: GD.muted, width: 28, textAlign: 'right', flexShrink: 0 }}>
                                                    {fmtPct(cat)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={Math.max(240, catData.length * 36)}>
                                    <BarChart
                                        data={catData.slice(0, 12)}
                                        layout="vertical"
                                        margin={{ left: 8 }}
                                    >
                                        <CartesianGrid horizontal={false} stroke={GD.border} />
                                        <XAxis type="number" tick={axisStyle} tickFormatter={fmt} />
                                        <YAxis
                                            type="category"
                                            dataKey="category"
                                            tick={({ x, y, payload }: any) => {
                                                const cat = catData.find(c => c.category === payload.value);
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
                                            {catData.slice(0, 12).map((cat, i) => (
                                                <Cell key={i} fill={cat.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>


                        {/* ── Ce mois-ci vs moyenne ── */}
                        {mva && mva.rows.length > 0 && (
                            <ChartCard
                                title="Ce mois-ci par rapport à votre moyenne"
                                subtitle={mva.pastMonths > 0
                                    ? `Dépenses du mois en cours (à ce jour + récurrences encore prévues) comparées à la moyenne des ${mva.pastMonths} mois précédents`
                                    : 'Pas encore de mois précédent pour calculer une moyenne'}
                            >
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1.5rem', fontSize: '0.8125rem', color: GD.text2, marginBottom: '0.75rem' }}>
                                    <span>
                                        Ce mois-ci : <b style={{ color: GD.text }}>{fmt(mva.current)}</b>
                                        {mva.planned > 0 && <> + {fmt(mva.planned)} prévus</>}
                                    </span>
                                    {mva.pastMonths > 0 && (
                                        <span>Moyenne : <b style={{ color: GD.text }}>{fmt(mva.average)}</b> / mois</span>
                                    )}
                                    {mva.hidden > 0 && <span style={{ color: GD.muted }}>{mva.hidden} petite(s) catégorie(s) non affichée(s)</span>}
                                </div>
                                <ResponsiveContainer width="100%" height={Math.max(220, mva.rows.length * 52)}>
                                    <BarChart data={mva.rows} layout="vertical" margin={{ left: 8, right: 56 }} barGap={2} barCategoryGap="22%">
                                        <CartesianGrid horizontal={false} stroke={GD.border} />
                                        <XAxis type="number" tick={axisStyle} tickFormatter={fmt} />
                                        <YAxis type="category" dataKey="category" tick={{ ...axisStyle, fill: GD.text2, fontSize: 12 }} width={120} />
                                        <Tooltip content={<MonthVsAverageTooltip />} cursor={{ fill: C['fg-subtle'], fillOpacity: 0.08 }} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: GD.text2 }} />
                                        <Bar dataKey="current" stackId="month" name="Ce mois-ci" fill={ACCENT} />
                                        <Bar dataKey="planned" stackId="month" name="Encore prévu" fill={`color-mix(in srgb, ${ACCENT} 35%, transparent)`} radius={[0, 4, 4, 0]}>
                                            <LabelList
                                                content={(props: any) => {
                                                    const r = mva.rows[props.index];
                                                    if (!r || r.average <= 0) return null;
                                                    const pct = Math.round(((r.current + r.planned) / r.average - 1) * 100);
                                                    return (
                                                        <text
                                                            x={props.x + props.width + 6}
                                                            y={props.y + props.height / 2}
                                                            dominantBaseline="middle"
                                                            fontSize={11}
                                                            fontWeight={600}
                                                            fill={pct > 5 ? EXPENSE_C : pct < -5 ? INCOME_C : C['fg-subtle']}
                                                        >
                                                            {pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct)} %
                                                        </text>
                                                    );
                                                }}
                                            />
                                        </Bar>
                                        {mva.pastMonths > 0 && (
                                            <Bar dataKey="average" name="Moyenne mensuelle" fill={`color-mix(in srgb, ${C['fg-subtle']} 55%, transparent)`} radius={[0, 4, 4, 0]} />
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}