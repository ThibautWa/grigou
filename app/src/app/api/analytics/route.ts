// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canReadWallet } from '@/lib/auth/wallet-permissions';
import {
    addDays, addMonths, addYears,
    isBefore, isAfter, format,
    startOfMonth, endOfMonth,
    subMonths, startOfDay,
} from 'date-fns';

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

function buildMonthlyBuckets(historyStart: Date, totalMonths: number, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    for (let i = 0; i < totalMonths; i++) {
        const d = addMonths(historyStart, i);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        buckets.push({
            label: format(d, 'MMM yy'),
            key: format(d, 'yyyy-MM'),
            start, end,
            income: 0, outcome: 0, balance: 0, cumulative: 0,
            predicted_income: 0, predicted_outcome: 0,
            is_future: startOfMonth(d) > startOfMonth(addMonths(now, 1)),
        });
    }
    return buckets;
}

function buildDailyBuckets(historyStart: Date, totalMonths: number, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    const rangeEnd = endOfMonth(addMonths(historyStart, totalMonths - 1));
    let day = startOfDay(historyStart);
    const futureThreshold = endOfMonth(addMonths(now, 1));

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
) {
    // Assign real transactions
    for (const tx of realTxs) {
        const d = parseLocalDate(tx.date);
        const bucket = buckets.find(b => d >= b.start && d <= b.end);
        if (!bucket) continue;
        if (tx.type === 'income') bucket.income += tx.amount;
        else bucket.outcome += tx.amount;
    }

    // Assign predictions
    for (const pred of predictions) {
        const d = parseLocalDate(pred.date);
        const bucket = buckets.find(b => d >= b.start && d <= b.end);
        if (!bucket) continue;
        if (pred.type === 'income') bucket.predicted_income += pred.amount;
        else bucket.predicted_outcome += pred.amount;
    }

    // Compute net balance and running cumulative
    let cumulative = anchorBalance;
    for (const b of buckets) {
        if (b.is_future) {
            // Semaine/mois entièrement futur : uniquement les prévisions récurrentes
            b.balance = b.predicted_income - b.predicted_outcome;
        } else {
            // Semaine/mois passé ou en cours : uniquement les transactions réelles
            // Les prédictions futures dans la même semaine seront dans les buckets suivants
            b.balance = b.income - b.outcome;
        }
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
        const monthsBack = Math.min(parseInt(searchParams.get('months') || '12'), 24);

        if (!walletId) {
            return NextResponse.json({ error: 'walletId requis' }, { status: 400 });
        }

        const hasAccess = await canReadWallet(parseInt(walletId), userId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const now = new Date();
        const historyStart = startOfMonth(subMonths(now, monthsBack - 1));
        const forecastEnd = endOfMonth(addMonths(now, 3));
        const totalMonths = monthsBack + 3; // history + 3 months forecast

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
            [parseInt(walletId), format(weeklyFetchStart, 'yyyy-MM-dd'), format(endOfMonth(addMonths(now, 1)), 'yyyy-MM-dd')],
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
            `SELECT id, type, amount, description, category, date::text,
              recurrence_type, recurrence_end_date::text
       FROM transactions
       WHERE wallet_id = $1
         AND is_recurring = TRUE
         AND date <= $2
         AND (recurrence_end_date IS NULL OR recurrence_end_date >= $3)`,
            [parseInt(walletId), format(forecastEnd, 'yyyy-MM-dd'), format(historyStart, 'yyyy-MM-dd')],
        );

        // Les prédictions commencent au début du mois+2 pour éviter
        // de doubler les transactions saisies manuellement dans le futur proche
        const tomorrow = startOfMonth(addMonths(now, 2));
        const allPredictions: TxEntry[] = [];
        for (const tx of recurResult.rows) {
            allPredictions.push(...generatePredictionsForRange(tx, tomorrow, forecastEnd));
        }

        // ── 5. Build monthly buckets ──────────────────────────────────────────────
        const monthlyBuckets = buildMonthlyBuckets(historyStart, totalMonths, now);
        fillBuckets(monthlyBuckets, realTxsMonthly, allPredictions, anchorBalance);

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
        const weeklyBuckets = buildDailyBuckets(historyStart, totalMonths, now);

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

        fillBuckets(weeklyBuckets, realTxs, allPredictions, weeklyAnchorBalance);

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
            [parseInt(walletId), format(historyStart, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')],
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

        // ── 8. Summary KPIs ───────────────────────────────────────────────────────
        const currentMonthKey = format(now, 'yyyy-MM');
        const prevMonthKey = format(subMonths(now, 1), 'yyyy-MM');
        const curMonth = monthly.find(m => m.monthKey === currentMonthKey);
        const prevMonth = monthly.find(m => m.monthKey === prevMonthKey);

        const totalIncome = realTxsMonthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalOutcome = realTxsMonthly.filter(t => t.type === 'outcome').reduce((s, t) => s + t.amount, 0);
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalOutcome) / totalIncome) * 100) : 0;

        return NextResponse.json({
            monthly,
            weekly,
            categoryBreakdown,
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