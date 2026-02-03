import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface DuplicateOptions {
    newName: string;
    copyRecurringTransactions?: boolean;
    copyInitialBalance?: boolean;
    copyDescription?: boolean;
    setAsDefault?: boolean;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    const client = await pool.connect();

    try {
        const { id } = await params;
        const walletId = parseInt(id);

        if (isNaN(walletId)) {
            return NextResponse.json(
                { error: 'Invalid wallet ID' },
                { status: 400 }
            );
        }

        const body: DuplicateOptions = await request.json();

        if (!body.newName || body.newName.trim() === '') {
            return NextResponse.json(
                { error: 'New wallet name is required' },
                { status: 400 }
            );
        }

        // Démarrer une transaction
        await client.query('BEGIN');

        // Récupérer le portefeuille source
        const sourceWalletResult = await client.query(
            'SELECT * FROM wallets WHERE id = $1',
            [walletId]
        );

        if (sourceWalletResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: 'Source wallet not found' },
                { status: 404 }
            );
        }

        const sourceWallet = sourceWalletResult.rows[0];

        // Si on veut définir comme défaut, retirer le statut des autres
        if (body.setAsDefault) {
            await client.query('UPDATE wallets SET is_default = FALSE');
        }

        // Créer le nouveau portefeuille
        const newWalletResult = await client.query(
            `INSERT INTO wallets (name, description, initial_balance, is_default) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [
                body.newName.trim(),
                body.copyDescription ? sourceWallet.description : null,
                body.copyInitialBalance ? sourceWallet.initial_balance : 0,
                body.setAsDefault || false,
            ]
        );

        const newWallet = newWalletResult.rows[0];

        // Variable pour stocker le nombre de transactions récurrentes copiées
        let recurringTransactionsCopied = 0;

        // Copier les transactions récurrentes si demandé
        if (body.copyRecurringTransactions) {
            const recurringTransactions = await client.query(
                `SELECT type, amount, description, category, date, 
                recurrence_type, recurrence_end_date
         FROM transactions 
         WHERE wallet_id = $1 AND is_recurring = TRUE`,
                [walletId]
            );

            recurringTransactionsCopied = recurringTransactions.rows.length;

            for (const transaction of recurringTransactions.rows) {
                await client.query(
                    `INSERT INTO transactions 
           (wallet_id, type, amount, description, category, date, 
            is_recurring, recurrence_type, recurrence_end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        newWallet.id,
                        transaction.type,
                        transaction.amount,
                        transaction.description,
                        transaction.category,
                        transaction.date,
                        true,
                        transaction.recurrence_type,
                        transaction.recurrence_end_date,
                    ]
                );
            }
        }

        // Valider la transaction
        await client.query('COMMIT');

        // Retourner le nouveau portefeuille avec les infos de duplication
        const result = {
            ...newWallet,
            initial_balance: parseFloat(newWallet.initial_balance),
            duplicated_from: sourceWallet.name,
            recurring_transactions_copied: recurringTransactionsCopied,
        };

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error duplicating wallet:', error);
        return NextResponse.json(
            { error: 'Failed to duplicate wallet' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}