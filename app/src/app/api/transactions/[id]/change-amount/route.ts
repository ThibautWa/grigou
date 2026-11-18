// app/api/transactions/[id]/change-amount/route.ts
//
// Changes the amount of a recurring transaction from a given date onwards,
// without rewriting past occurrences: the current series ends the day before
// the first occurrence on/after `from`, and a new series starts on that
// occurrence with the new amount (same category, description, frequency and
// end date).
import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canWriteWallet } from '@/lib/auth/wallet-permissions';
import { firstOccurrenceOnOrAfter, ymd } from '@/lib/recurrence';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const { amount, from } = await request.json();

  if (typeof amount !== 'number' || !(amount > 0)) {
    return NextResponse.json({ error: 'Le montant doit être un nombre positif' }, { status: 400 });
  }
  if (typeof from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Dates as text: no timezone conversion on the way out of Postgres
    const existing = await client.query(
      `SELECT id, wallet_id, type, amount, description, category_id, is_recurring,
              recurrence_type, date::text AS date, recurrence_end_date::text AS recurrence_end_date
       FROM transactions WHERE id = $1`,
      [parseInt(id)]
    );
    const tx = existing.rows[0];
    if (!tx) return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 });
    if (!(await canWriteWallet(tx.wallet_id, userId))) {
      return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
    }
    if (!tx.is_recurring) {
      return NextResponse.json({ error: "Cette transaction n'est pas récurrente" }, { status: 400 });
    }

    const first = firstOccurrenceOnOrAfter(tx.date, tx.recurrence_type, new Date(`${from}T00:00:00`), tx.recurrence_end_date);
    if (!first) {
      return NextResponse.json({ error: 'Aucune échéance à partir de cette date (la récurrence est terminée)' }, { status: 400 });
    }

    await client.query('BEGIN');

    // The change starts at the very first occurrence: simply update the series.
    if (ymd(first) === tx.date) {
      await client.query(`UPDATE transactions SET amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [amount, tx.id]);
      await client.query('COMMIT');
      return NextResponse.json({ id: tx.id, from: tx.date, split: false });
    }

    await client.query(
      `UPDATE transactions SET recurrence_end_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [ymd(subDays(first, 1)), tx.id]
    );
    const created = await client.query(
      `INSERT INTO transactions
         (wallet_id, type, amount, description, category_id, date, is_recurring, recurrence_type, recurrence_end_date)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
       RETURNING id`,
      [tx.wallet_id, tx.type, amount, tx.description, tx.category_id, ymd(first), tx.recurrence_type, tx.recurrence_end_date]
    );
    await client.query('COMMIT');

    return NextResponse.json({ id: created.rows[0].id, from: ymd(first), split: true }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error changing recurring amount:', error);
    return NextResponse.json({ error: 'Erreur lors du changement de montant' }, { status: 500 });
  } finally {
    client.release();
  }
}
