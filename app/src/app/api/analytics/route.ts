// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';
import {
    addDays, addWeeks, addMonths, addYears,
    isBefore, isAfter, format,
    startOfMonth, endOfMonth,
    subMonths, startOfDay, endOfDay, differenceInCalendarMonths,
    startOfWeek, differenceInCalendarDays,
} from 'date-fns';

/** Longest period served at once (10 years, ~3 650 daily points). */
const MAX_MONTHS = 120;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function parseMonth(ym: string): Date {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1);
}

// ─── Prediction helpers ───────────────────────────────────────────────────────

type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

function getNextOccurrence(date: Date, type: RecurrenceType): Date {
    switch (type) {
        case 'daily': return addDays(date, 1);
        case 'weekly': return addWeeks(date, 1);
        case 'biweekly': return addWeeks(date, 2);
        case 'monthly': return addMonths(date, 1);
        case 'bimonthly': return addMonths(date, 2);
        case 'quarterly': return addMonths(date, 3);
        case 'yearly': return addYears(date, 1);
        default: return addMonths(date, 1);
    }
}

interface RecurringTx {
    id: number;
    type: 'income' | 'outcome';
    amount: string;
    description: string;
    category: string | null;
    date: string;
    recurrence_type: RecurrenceType;
    recurrence_end_date: string | null;
}

type TxEntry = { date: string; type: 'income' | 'outcome'; amount: number; category: string | null };

function generatePredictionsForRange(
    tx: RecurringTx,
    rangeStart: Date,
    rangeEnd: Date,
): TxEntry[] {
    const results: TxEntry[] = [];
    let cur = new Date(tx.date);
    const limit = tx.recurrence_end_date
        ? (isBefore(new Date(tx.recurrence_end_date), rangeEnd)
            ? new Date(tx.recurrence_end_date)
            : rangeEnd)
        : rangeEnd;

    while (true) {
        cur = getNextOccurrence(cur, tx.recurrence_type);
        if (isAfter(cur, limit)) break;
        if (cur >= rangeStart && cur <= rangeEnd) {
            results.push({
                date: format(cur, 'yyyy-MM-dd'),
                type: tx.type,
                amount: parseFloat(tx.amount),
                category: tx.category,
            });
        }
    }
    return results;
}

// ─── Bucket builders ─────────────────────────────────────────────────────────

interface Bucket {
    label: string;       // display label
    key: string;         // sort key
    start: Date;
    end: Date;
    income: number;
    outcome: number;
    balance: number;
    cumulative: number;
    predicted_income: number;
    predicted_outcome: number;
    is_future: boolean;
}

function buildMonthlyBuckets(historyStart: Date, rangeEnd: Date, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    const totalMonths = differenceInCalendarMonths(rangeEnd, historyStart) + 1;
    for (let i = 0; i < totalMonths; i++) {
        const d = addMonths(startOfMonth(historyStart), i);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        buckets.push({
            label: format(d, 'MMM yy'),
            key: format(d, 'yyyy-MM'),
            start, end,
            income: 0, outcome: 0, balance: 0, cumulative: 0,
            predicted_income: 0, predicted_outcome: 0,
            is_future: startOfMonth(d) > startOfMonth(now),
        });
    }
    return buckets;
}

/** Weeks start on Monday; a week is keyed by its Monday ('yyyy-MM-dd'). */
const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

function buildWeeklyBuckets(historyStart: Date, rangeEnd: Date, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    let w = weekStart(historyStart);
    const thisWeek = weekStart(now);
    while (w <= rangeEnd) {
        buckets.push({
            label: format(w < historyStart ? historyStart : w, 'dd MMM yy'),
            key: format(w, 'yyyy-MM-dd'),
            start: new Date(w),
            end: addDays(w, 6),
            income: 0, outcome: 0, balance: 0, cumulative: 0,
            predicted_income: 0, predicted_outcome: 0,
            is_future: w > thisWeek,
        });
        w = addWeeks(w, 1);
    }
    return buckets;
}

function buildDailyBuckets(historyStart: Date, rangeEnd: Date, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    let day = startOfDay(historyStart);
    const futureThreshold = startOfDay(now);

    while (day <= rangeEnd) {
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
        buckets.push({
            label: format(day, 'dd MMM'),
            key: format(day, 'yyyy-MM-dd'),
            start: new Date(day),
            end: dayEnd,
            income: 0, outcome: 0, balance: 0, cumulative: 0,
            predicted_income: 0, predicted_outcome: 0,
            is_future: day > futureThreshold,
        });
        day = addDays(day, 1);
    }
    return buckets;
}

// Parse "yyyy-MM-dd" sans décalage UTC (minuit heure locale)
function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function fillBuckets(
    buckets: Bucket[],
    realTxs: TxEntry[],
    predictions: TxEntry[],
    anchorBalance: number,
    keyOf: (date: string) => string,
) {
    const byKey = new Map(buckets.map(b => [b.key, b]));

    // Assign real transactions
    for (const tx of realTxs) {
        const bucket = byKey.get(keyOf(tx.date));
        if (!bucket) continue;
        if (tx.type === 'income') bucket.income += tx.amount;
        else bucket.outcome += tx.amount;
    }

    // Assign predictions
    for (const pred of predictions) {
        const bucket = byKey.get(keyOf(pred.date));
        if (!bucket) continue;
        if (pred.type === 'income') bucket.predicted_income += pred.amount;
        else bucket.predicted_outcome += pred.amount;
    }

    // Compute net balance and running cumulative.
    // On somme toujours réel + prévisions récurrentes. Les prédictions ne sont
    // générées que pour des dates strictement postérieures à aujourd'hui et les
    // occurrences futures ne sont jamais stockées en base : aucun double comptage.
    let cumulative = anchorBalance;
    for (const b of buckets) {
        b.balance = (b.income - b.outcome) + (b.predicted_income - b.predicted_outcome);
        cumulative += b.balance;
        b.cumulative = cumulative;
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        let userId: number;
        try {
            userId = await requireUserId();
        } catch {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const walletId = searchParams.get('walletId');
        const fromParam = searchParams.get('from');   // 'yyyy-MM' or 'all'
        const toParam = searchParams.get('to');       // 'yyyy-MM'
        const monthsBack = Math.min(Math.max(parseInt(searchParams.get('months') || '12') || 12, 1), MAX_MONTHS);

        if (!walletId) {
            return NextResponse.json({ error: 'walletId requis' }, { status: 400 });
        }

        const hasAccess = await canReadWallet(parseInt(walletId), userId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const now = new Date();

        // ── 0. Period: [from, to], each a month ('yyyy-MM') or a day ('yyyy-MM-dd').
        // Defaults to the last `months` months + 3 months of forecast.
        // `from=all` starts at the first transaction.
        let historyStart = startOfMonth(subMonths(now, monthsBack - 1));
        if (fromParam === 'all') {
            const first = await pool.query(
                `SELECT MIN(date)::text AS d FROM transactions WHERE wallet_id = $1`,
                [parseInt(walletId)],
            );
            if (first.rows[0]?.d) historyStart = startOfMonth(parseLocalDate(first.rows[0].d));
        } else if (fromParam && MONTH_RE.test(fromParam)) {
            historyStart = parseMonth(fromParam);
        } else if (fromParam && DAY_RE.test(fromParam)) {
            historyStart = parseLocalDate(fromParam);
        }
        let rangeEnd = toParam && MONTH_RE.test(toParam)
            ? endOfMonth(parseMonth(toParam))
            : toParam && DAY_RE.test(toParam)
                ? endOfDay(parseLocalDate(toParam))
                : endOfMonth(addMonths(now, 3));
        if (rangeEnd < historyStart) rangeEnd = endOfDay(historyStart);
        if (differenceInCalendarMonths(rangeEnd, historyStart) + 1 > MAX_MONTHS) {
            // Keep the end, drop the oldest months
            historyStart = startOfMonth(subMonths(rangeEnd, MAX_MONTHS - 1));
        }
        // Recurrences are projected up to the end of the period (nothing if it is in the past)
        const forecastEnd = rangeEnd;

        // ── 1. Real transactions ──────────────────────────────────────────────────
        const weeklyFetchStart = historyStart; // daily buckets start exactly at historyStart
        const txResult = await pool.query(
            `SELECT date::text, type, amount::float, category, description, is_recurring
       FROM transactions
       WHERE wallet_id = $1
         AND date >= $2
         AND date <= $3
       ORDER BY date ASC`,
            // On charge jusqu'à la fin du mois courant pour inclure les transactions
            // saisies manuellement avec une date dans le futur proche (même mois)
            [parseInt(walletId), format(weeklyFetchStart, 'yyyy-MM-dd'), format(rangeEnd, 'yyyy-MM-dd')],
        );
        const realTxs = txResult.rows as TxEntry[];
        // Pour les buckets mensuels on filtre à partir de historyStart
        const realTxsMonthly = realTxs.filter(tx => tx.date >= format(historyStart, 'yyyy-MM-dd'));

        // ── 2. Anchor balance (everything before historyStart) ────────────────────
        // Inclut initial_balance du wallet + toutes les transactions avant historyStart
        const anchorResult = await pool.query(
            `SELECT (
         (SELECT COALESCE(initial_balance, 0) FROM wallets WHERE id = $1)
         + COALESCE((
             SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
             FROM transactions WHERE wallet_id = $1 AND date < $2
           ), 0)
       )::float AS balance`,
            [parseInt(walletId), format(historyStart, 'yyyy-MM-dd')],
        );
        const anchorBalance: number = parseFloat(anchorResult.rows[0]?.balance ?? '0');

        // ── 3. Current balance (for KPI) ─────────────────────────────────────────
        const balResult = await pool.query(
            `SELECT (
         (SELECT COALESCE(initial_balance, 0) FROM wallets WHERE id = $1)
         + COALESCE((
             SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
             FROM transactions WHERE wallet_id = $1
           ), 0)
       )::float AS balance`,
            [parseInt(walletId)],
        );
        const currentBalance: number = parseFloat(balResult.rows[0]?.balance ?? '0');

        // ── 4. Recurring transactions → future predictions ────────────────────────
        const recurResult = await pool.query<RecurringTx>(
            `SELECT t.id, t.type, t.amount, t.description,
              COALESCE(c.name, t.category, 'Sans catégorie') AS category,
              t.date::text, t.recurrence_type, t.recurrence_end_date::text
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.wallet_id = $1
         AND t.is_recurring = TRUE
         AND t.date <= $2
         AND (t.recurrence_end_date IS NULL OR t.recurrence_end_date >= $3)`,
            [parseInt(walletId), format(forecastEnd, 'yyyy-MM-dd'), format(historyStart, 'yyyy-MM-dd')],
        );

        // Les prédictions couvrent toutes les occurrences récurrentes strictement
        // postérieures à aujourd'hui. Les occurrences passées/du jour sont déjà des
        // lignes réelles (ancrage) ; les occurrences futures ne sont jamais stockées.
        const predictionStart = startOfDay(addDays(now, 1));
        const allPredictions: TxEntry[] = [];
        for (const tx of recurResult.rows) {
            allPredictions.push(...generatePredictionsForRange(tx, predictionStart, forecastEnd));
        }

        // ── 5. Build monthly buckets ──────────────────────────────────────────────
        const monthlyBuckets = buildMonthlyBuckets(historyStart, rangeEnd, now);
        fillBuckets(monthlyBuckets, realTxsMonthly, allPredictions, anchorBalance, d => d.slice(0, 7));

        const monthly = monthlyBuckets.map(b => ({
            month: b.label,
            monthKey: b.key,
            income: b.income,
            outcome: b.outcome,
            balance: b.balance,
            cumulative: b.cumulative,
            predicted_income: b.predicted_income,
            predicted_outcome: b.predicted_outcome,
            is_future: b.is_future,
        }));

        // ── 6. Build weekly buckets ───────────────────────────────────────────────
        const weeklyBuckets = buildDailyBuckets(historyStart, rangeEnd, now);

        // L'ancre hebdo doit tenir compte du fait que le premier bucket peut
        // commencer avant historyStart (lundi de la semaine contenant historyStart)
        const weeklyRangeStart = historyStart;
        const weeklyAnchorResult = await pool.query(
            `SELECT (
         (SELECT COALESCE(initial_balance, 0) FROM wallets WHERE id = $1)
         + COALESCE((
             SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
             FROM transactions WHERE wallet_id = $1 AND date < $2
           ), 0)
       )::float AS balance`,
            [parseInt(walletId), format(weeklyRangeStart, 'yyyy-MM-dd')],
        );
        const weeklyAnchorBalance: number = parseFloat(weeklyAnchorResult.rows[0]?.balance ?? '0');

        fillBuckets(weeklyBuckets, realTxs, allPredictions, weeklyAnchorBalance, d => d);

        // ── 6b. Real weekly buckets (Monday → Sunday) ─────────────────────────────
        const weekBuckets = buildWeeklyBuckets(historyStart, rangeEnd, now);
        fillBuckets(weekBuckets, realTxsMonthly, allPredictions, anchorBalance,
            d => format(weekStart(parseLocalDate(d)), 'yyyy-MM-dd'));
        const weeks = weekBuckets.map(b => ({
            month: b.label,
            monthKey: b.key,
            income: b.income,
            outcome: b.outcome,
            balance: b.balance,
            cumulative: b.cumulative,
            predicted_income: b.predicted_income,
            predicted_outcome: b.predicted_outcome,
            is_future: b.is_future,
        }));

        const weekly = weeklyBuckets.map(b => ({
            month: b.label,   // reuse field name so frontend is identical
            monthKey: b.key,
            cumulative: b.cumulative,
            balance: b.balance,
            is_future: b.is_future,
        }));

        // ── 7. Category breakdown ─────────────────────────────────────────────────
        const catResult = await pool.query(
            `SELECT
         COALESCE(c.name, t.category, 'Sans catégorie') AS category,
         COALESCE(c.icon, '')                            AS icon,
         COALESCE(c.color, '#94a3b8')                   AS color,
         t.type,
         SUM(t.amount)::float                           AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.wallet_id = $1
         AND t.date >= $2
         AND t.date <= $3
       GROUP BY COALESCE(c.name, t.category, 'Sans catégorie'), c.icon, c.color, t.type
       ORDER BY total DESC`,
            [parseInt(walletId), format(historyStart, 'yyyy-MM-dd'), format(rangeEnd < now ? rangeEnd : now, 'yyyy-MM-dd')],
        );

        const categoryBreakdown: {
            outcome: { category: string; icon: string; color: string; total: number; percentage: number }[];
            income: { category: string; icon: string; color: string; total: number; percentage: number }[];
        } = { outcome: [], income: [] };

        const totals = { income: 0, outcome: 0 };
        for (const row of catResult.rows) totals[row.type as 'income' | 'outcome'] += row.total;
        for (const row of catResult.rows) {
            const t = totals[row.type as 'income' | 'outcome'] || 1;
            categoryBreakdown[row.type as 'income' | 'outcome'].push({
                category: row.category,
                icon: row.icon,
                color: row.color,
                total: row.total,
                percentage: Math.round((row.total / t) * 100),
            });
        }

        // ── 7b. This month vs monthly average, per expense category ─────────────
        // Average over the full months of the period before this one that have any
        // spending (a wallet younger than the period is not diluted by empty months).
        // A period with fewer than 3 such months (a few weeks, say) falls back to
        // the last 12 months, so the comparison stays meaningful.
        const twelveMonthsAgo = startOfMonth(subMonths(now, 12));
        const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const catMonthResult = await pool.query(
            `SELECT
         COALESCE(c.name, t.category, 'Sans catégorie') AS category,
         COALESCE(c.color, '#94a3b8')                   AS color,
         to_char(t.date, 'YYYY-MM')                      AS month,
         SUM(t.amount)::float                           AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.wallet_id = $1
         AND t.type = 'outcome'
         AND t.date >= $2
         AND t.date <= $3
       GROUP BY 1, 2, 3`,
            [parseInt(walletId), format(historyStart < twelveMonthsAgo ? historyStart : twelveMonthsAgo, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')],
        );
        const curKey = format(now, 'yyyy-MM');
        // First / last month entirely inside the period
        const periodFirstKey = format(historyStart.getDate() === 1 ? historyStart : addMonths(startOfMonth(historyStart), 1), 'yyyy-MM');
        const periodLastKey = format(rangeEnd.getTime() >= endOfMonth(rangeEnd).getTime() - 1000 ? rangeEnd : subMonths(rangeEnd, 1), 'yyyy-MM');
        const spendRows = catMonthResult.rows.filter(r => r.category !== 'Ajustement'); // balance corrections, not spending
        let avgFrom = periodFirstKey;
        let avgTo = periodLastKey;
        const monthsWithSpending = (from: string, to: string) =>
            new Set(spendRows.filter(r => r.month !== curKey && r.month >= from && r.month <= to).map(r => r.month as string));
        let pastMonths = monthsWithSpending(avgFrom, avgTo);
        let averageBasis: 'period' | 'last12' = 'period';
        if (pastMonths.size < 3) {
            avgFrom = format(twelveMonthsAgo, 'yyyy-MM');
            avgTo = format(subMonths(now, 1), 'yyyy-MM');
            pastMonths = monthsWithSpending(avgFrom, avgTo);
            averageBasis = 'last12';
        }
        const byCat = new Map<string, { category: string; color: string; current: number; pastTotal: number; planned: number }>();
        const catEntry = (category: string, color = '#94a3b8') => {
            let e = byCat.get(category);
            if (!e) { e = { category, color, current: 0, pastTotal: 0, planned: 0 }; byCat.set(category, e); }
            return e;
        };
        for (const row of spendRows) {
            const e = catEntry(row.category, row.color);
            if (row.month === curKey) e.current += row.total;
            else if (pastMonths.has(row.month)) e.pastTotal += row.total;
        }
        // Recurring expenses still to come this month (predictions start tomorrow)
        const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        const curMonthPredictions: TxEntry[] = [];
        for (const tx of recurResult.rows) {
            curMonthPredictions.push(...generatePredictionsForRange(tx, predictionStart, endOfMonth(now)));
        }
        for (const pred of curMonthPredictions) {
            if (pred.type !== 'outcome' || pred.date > currentMonthEnd || pred.date < currentMonthStart) continue;
            catEntry(pred.category ?? 'Sans catégorie').planned += pred.amount;
        }
        const pastCount = pastMonths.size;
        const monthVsAverage = {
            pastMonths: pastCount,
            averageBasis,
            categories: Array.from(byCat.values()).map(e => ({
                category: e.category,
                color: e.color,
                current: e.current,
                planned: e.planned,
                average: pastCount > 0 ? e.pastTotal / pastCount : 0,
            })),
        };

        // ── 8. Summary KPIs ───────────────────────────────────────────────────────
        const currentMonthKey = format(now, 'yyyy-MM');
        const prevMonthKey = format(subMonths(now, 1), 'yyyy-MM');
        const kpiResult = await pool.query(
            `SELECT to_char(date, 'YYYY-MM') AS month,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)::float AS income,
              COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount END), 0)::float AS outcome
       FROM transactions
       WHERE wallet_id = $1 AND date >= $2 AND date <= $3
       GROUP BY 1`,
            [parseInt(walletId), format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')],
        );
        const curMonth = kpiResult.rows.find(r => r.month === currentMonthKey);
        const prevMonth = kpiResult.rows.find(r => r.month === prevMonthKey);

        const totalIncome = realTxsMonthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalOutcome = realTxsMonthly.filter(t => t.type === 'outcome').reduce((s, t) => s + t.amount, 0);
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalOutcome) / totalIncome) * 100) : 0;

        return NextResponse.json({
            monthly,
            weekly,
            categoryBreakdown,
            monthVsAverage,
            weeks,
            period: {
                from: format(historyStart, 'yyyy-MM-dd'),
                to: format(rangeEnd, 'yyyy-MM-dd'),
                days: differenceInCalendarDays(rangeEnd, historyStart) + 1,
                historyDays: Math.max(0, differenceInCalendarDays(rangeEnd < now ? rangeEnd : now, historyStart) + 1),
            },
            summary: {
                currentBalance,
                currentMonth: {
                    income: curMonth?.income ?? 0,
                    outcome: curMonth?.outcome ?? 0,
                    balance: (curMonth?.income ?? 0) - (curMonth?.outcome ?? 0),
                },
                prevMonth: {
                    income: prevMonth?.income ?? 0,
                    outcome: prevMonth?.outcome ?? 0,
                    balance: (prevMonth?.income ?? 0) - (prevMonth?.outcome ?? 0),
                },
                savingsRate,
                periodIncome: totalIncome,
                periodOutcome: totalOutcome,
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Erreur analytics' }, { status: 500 });
    }
}