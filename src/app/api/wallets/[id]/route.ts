import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { UpdateWalletDto } from '@/types/wallet';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/wallets/[id] - Récupérer un portefeuille spécifique
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const walletId = parseInt(id);

        if (isNaN(walletId)) {
            return NextResponse.json(
                { error: 'Invalid wallet ID' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `SELECT w.*,
        COALESCE(w.initial_balance + SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), w.initial_balance) as current_balance,
        COUNT(DISTINCT t.id) as transaction_count,
        MAX(t.date) as last_transaction_date
       FROM wallets w
       LEFT JOIN transactions t ON t.wallet_id = w.id
       WHERE w.id = $1
       GROUP BY w.id`,
            [walletId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        const wallet = {
            ...result.rows[0],
            initial_balance: parseFloat(result.rows[0].initial_balance),
            current_balance: parseFloat(result.rows[0].current_balance),
            transaction_count: parseInt(result.rows[0].transaction_count),
        };

        return NextResponse.json(wallet);
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return NextResponse.json(
            { error: 'Failed to fetch wallet' },
            { status: 500 }
        );
    }
}

// PATCH /api/wallets/[id] - Mettre à jour un portefeuille
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const walletId = parseInt(id);

        if (isNaN(walletId)) {
            return NextResponse.json(
                { error: 'Invalid wallet ID' },
                { status: 400 }
            );
        }

        const body: UpdateWalletDto = await request.json();

        // Construire la requête UPDATE dynamiquement
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (body.name !== undefined) {
            if (body.name.trim() === '') {
                return NextResponse.json(
                    { error: 'Wallet name cannot be empty' },
                    { status: 400 }
                );
            }
            updates.push(`name = $${paramIndex++}`);
            values.push(body.name.trim());
        }

        if (body.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(body.description || null);
        }

        if (body.initial_balance !== undefined) {
            updates.push(`initial_balance = $${paramIndex++}`);
            values.push(body.initial_balance);
        }

        if (body.is_default !== undefined) {
            if (body.is_default) {
                // Si on veut définir ce portefeuille comme défaut,
                // retirer le statut de tous les autres
                await pool.query('UPDATE wallets SET is_default = FALSE');
            }
            updates.push(`is_default = $${paramIndex++}`);
            values.push(body.is_default);
        }

        if (body.archived !== undefined) {
            updates.push(`archived = $${paramIndex++}`);
            values.push(body.archived);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Ajouter l'ID comme dernier paramètre
        values.push(walletId);

        const query = `
      UPDATE wallets
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        const updatedWallet = {
            ...result.rows[0],
            initial_balance: parseFloat(result.rows[0].initial_balance),
        };

        return NextResponse.json(updatedWallet);
    } catch (error) {
        console.error('Error updating wallet:', error);
        return NextResponse.json(
            { error: 'Failed to update wallet' },
            { status: 500 }
        );
    }
}

// DELETE /api/wallets/[id] - Supprimer un portefeuille
export async function DELETE(
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

        // Récupérer le paramètre force de l'URL
        const url = new URL(request.url);
        const force = url.searchParams.get('force') === 'true';

        // Vérifier si c'est le portefeuille par défaut
        const checkDefault = await client.query(
            'SELECT is_default, name FROM wallets WHERE id = $1',
            [walletId]
        );

        if (checkDefault.rows.length === 0) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        const wallet = checkDefault.rows[0];

        if (wallet.is_default) {
            return NextResponse.json(
                { error: 'Cannot delete the default wallet. Please set another wallet as default first.' },
                { status: 400 }
            );
        }

        // Vérifier le nombre de transactions
        const transactionCheck = await client.query(
            'SELECT COUNT(*) as count FROM transactions WHERE wallet_id = $1',
            [walletId]
        );

        const transactionCount = parseInt(transactionCheck.rows[0].count);

        // Si le portefeuille a des transactions et que force=false
        if (transactionCount > 0 && !force) {
            return NextResponse.json(
                {
                    error: `Cannot delete wallet with ${transactionCount} transaction(s). Please delete or move transactions first, or archive the wallet instead.`,
                    transaction_count: transactionCount,
                    can_force: true, // Indique que la suppression forcée est possible
                },
                { status: 400 }
            );
        }

        // Démarrer une transaction SQL
        await client.query('BEGIN');

        // Si force=true, supprimer d'abord toutes les transactions
        if (transactionCount > 0) {
            await client.query(
                'DELETE FROM transactions WHERE wallet_id = $1',
                [walletId]
            );
        }

        // Supprimer le portefeuille
        await client.query('DELETE FROM wallets WHERE id = $1', [walletId]);

        // Valider la transaction
        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Wallet deleted successfully',
            deleted: true,
            transactions_deleted: transactionCount,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting wallet:', error);
        return NextResponse.json(
            { error: 'Failed to delete wallet' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}