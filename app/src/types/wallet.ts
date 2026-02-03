export interface Wallet {
    id: number;
    name: string;
    description?: string | null;
    initial_balance: number;
    created_at: Date;
    updated_at: Date;
    is_default: boolean;
    archived: boolean;
}

export interface CreateWalletDto {
    name: string;
    description?: string;
    initial_balance?: number;
}

export interface UpdateWalletDto {
    name?: string;
    description?: string;
    initial_balance?: number;
    is_default?: boolean;
    archived?: boolean;
}

export interface WalletWithStats extends Wallet {
    current_balance: number;
    transaction_count: number;
    last_transaction_date?: Date | null;
}