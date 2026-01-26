// app/api/wallets/[id]/adjust/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { canWriteWallet } from '@/lib/auth/wallet-permissions';
import { format, isToday, parseISO } from 'date-fns';

interface AdjustmentRequest {
    newBalance: number;
    currentBalance?: number; // Solde actuel affiché par le frontend (prioritaire)
    date?: string; // Format YYYY-MM-DD, par défaut aujourd'hui
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const client = await pool.connect();

    try {
        // Vérifier l'authentification
        let userId: number;
        try {
            userId = await requireUserId();
        } catch (error) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await params;
        const walletId = parseInt(id);

        if (isNaN(walletId)) {
            return NextResponse.json(
                { error: 'ID de portefeuille invalide' },
                { status: 400 }
            );
        }

        // Vérifier les permissions d'écriture
        const hasAccess = await canWriteWallet(walletId, userId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Accès au wallet refusé' },
                { status: 403 }
            );
        }

        const body: AdjustmentRequest = await request.json();
        const { newBalance, currentBalance: frontendBalance, date } = body;

        // Valider le nouveau solde
        if (typeof newBalance !== 'number' || isNaN(newBalance)) {
            return NextResponse.json(
                { error: 'Le nouveau solde doit être un nombre valide' },
                { status: 400 }
            );
        }

        // Vérifier que la date est aujourd'hui (ou non spécifiée = aujourd'hui)
        const adjustmentDate = date ? parseISO(date) : new Date();
        if (!isToday(adjustmentDate)) {
            return NextResponse.json(
                { error: 'L\'ajustement de solde n\'est possible que pour le jour actuel' },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Déterminer le solde actuel
        let currentBalance: number;

        if (typeof frontendBalance === 'number' && !isNaN(frontendBalance)) {
            // Utiliser le solde fourni par le frontend (plus précis car c'est ce que l'utilisateur voit)
            currentBalance = frontendBalance;
        } else {
            // Recalculer le solde si non fourni (fallback)
            const walletResult = await client.query(
                `SELECT 
          w.initial_balance,
          COALESCE(
            (SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
             FROM transactions t 
             WHERE t.wallet_id = w.id),
            0
          ) as transactions_total
         FROM wallets w
         WHERE w.id = $1`,
                [walletId]
            );

            if (walletResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: 'Portefeuille non trouvé' },
                    { status: 404 }
                );
            }

            const { initial_balance, transactions_total } = walletResult.rows[0];
            currentBalance = parseFloat(initial_balance) + parseFloat(transactions_total);
        }

        const difference = newBalance - currentBalance;

        // Vérifier que le wallet existe
        const walletCheck = await client.query(
            'SELECT id FROM wallets WHERE id = $1',
            [walletId]
        );
        if (walletCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: 'Portefeuille non trouvé' },
                { status: 404 }
            );
        }

        // Si la différence est nulle, pas besoin de créer de transaction
        if (Math.abs(difference) < 0.01) {
            await client.query('ROLLBACK');
            return NextResponse.json({
                message: 'Le solde est déjà correct',
                currentBalance,
                newBalance,
                difference: 0,
                transactionCreated: false,
            });
        }

        // Récupérer la catégorie "Ajustement"
        const categoryResult = await client.query(
            `SELECT id FROM categories 
       WHERE name = 'Ajustement' AND is_system = TRUE
       LIMIT 1`
        );

        let categoryId: number | null = null;
        if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id;
        } else {
            // Créer la catégorie si elle n'existe pas
            const newCategoryResult = await client.query(
                `INSERT INTO categories (name, type, icon, color, user_id, is_system, is_active, sort_order)
         VALUES ('Ajustement', 'both', '⚖️', '#6366f1', NULL, TRUE, TRUE, 100)
         RETURNING id`
            );
            categoryId = newCategoryResult.rows[0].id;
        }

        // Créer la transaction d'ajustement
        const transactionType = difference > 0 ? 'income' : 'outcome';
        const transactionAmount = Math.abs(difference);
        const formattedDate = format(adjustmentDate, 'yyyy-MM-dd');

        // Description avec le contexte de l'ajustement
        const description = difference > 0
            ? `Ajustement de solde (+${transactionAmount.toFixed(2)} €)`
            : `Ajustement de solde (-${transactionAmount.toFixed(2)} €)`;

        const transactionResult = await client.query(
            `INSERT INTO transactions (
        wallet_id, type, amount, description, category_id, date, 
        is_recurring, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, type, amount, description, category_id, date`,
            [walletId, transactionType, transactionAmount, description, categoryId, formattedDate]
        );

        await client.query('COMMIT');

        const createdTransaction = transactionResult.rows[0];

        return NextResponse.json({
            message: 'Solde ajusté avec succès',
            previousBalance: currentBalance,
            newBalance,
            difference,
            transactionCreated: true,
            transaction: {
                id: createdTransaction.id,
                type: createdTransaction.type,
                amount: parseFloat(createdTransaction.amount),
                description: createdTransaction.description,
                categoryId: createdTransaction.category_id,
                date: createdTransaction.date,
            },
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adjusting balance:', error);
        return NextResponse.json(
            { error: 'Erreur lors de l\'ajustement du solde' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// GET pour récupérer le solde actuel (utile pour le composant)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Vérifier l'authentification
        let userId: number;
        try {
            userId = await requireUserId();
        } catch (error) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await params;
        const walletId = parseInt(id);

        if (isNaN(walletId)) {
            return NextResponse.json(
                { error: 'ID de portefeuille invalide' },
                { status: 400 }
            );
        }

        // Vérifier les permissions de lecture
        const { canReadWallet } = await import('@/lib/auth/wallet-permissions');
        const hasAccess = await canReadWallet(walletId, userId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Accès au wallet refusé' },
                { status: 403 }
            );
        }

        const result = await pool.query(
            `SELECT 
        w.initial_balance,
        COALESCE(
          (SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
           FROM transactions t 
           WHERE t.wallet_id = w.id),
          0
        ) as transactions_total
       FROM wallets w
       WHERE w.id = $1`,
            [walletId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Portefeuille non trouvé' },
                { status: 404 }
            );
        }

        const { initial_balance, transactions_total } = result.rows[0];
        const currentBalance = parseFloat(initial_balance) + parseFloat(transactions_total);

        return NextResponse.json({
            walletId,
            currentBalance,
            initialBalance: parseFloat(initial_balance),
            transactionsTotal: parseFloat(transactions_total),
        });

    } catch (error) {
        console.error('Error getting balance:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération du solde' },
            { status: 500 }
        );
    }
}