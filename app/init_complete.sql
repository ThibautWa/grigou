-- init.sql - Script d'initialisation complet de la base de données Grigou
-- Ce fichier remplace votre init.sql existant et inclut la fonctionnalité multi-portefeuilles

-- ============================================
-- 1. SUPPRESSION DES TABLES EXISTANTES (si nécessaire)
-- ============================================
-- Décommenter ces lignes si vous voulez repartir de zéro
-- DROP TABLE IF EXISTS recurring_transactions CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS wallets CASCADE;

-- ============================================
-- 2. CRÉATION DE LA TABLE WALLETS
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    initial_balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_default BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_wallets_is_default ON wallets(is_default);
CREATE INDEX IF NOT EXISTS idx_wallets_archived ON wallets(archived);

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS trigger_update_wallet_timestamp ON wallets;
CREATE TRIGGER trigger_update_wallet_timestamp
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_updated_at();

-- Insertion du portefeuille par défaut
INSERT INTO wallets (name, description, initial_balance, is_default) 
VALUES ('Mon portefeuille principal', 'Portefeuille par défaut', 0.00, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CRÉATION DE LA TABLE TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS trigger_update_transaction_timestamp ON transactions;
CREATE TRIGGER trigger_update_transaction_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_updated_at();

-- ============================================
-- 4. CRÉATION DE LA TABLE RECURRING_TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    recurrence_type VARCHAR(50) NOT NULL CHECK (
        recurrence_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    ),
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_wallet_id ON recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_start_date ON recurring_transactions(start_date);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_end_date ON recurring_transactions(end_date);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_recurrence_type ON recurring_transactions(recurrence_type);

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recurring_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS trigger_update_recurring_transaction_timestamp ON recurring_transactions;
CREATE TRIGGER trigger_update_recurring_transaction_timestamp
    BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transaction_updated_at();

-- ============================================
-- 5. DONNÉES DE DÉMONSTRATION (OPTIONNEL)
-- ============================================
-- Décommenter pour insérer des données de test

/*
-- Créer quelques portefeuilles de démonstration
INSERT INTO wallets (name, description, initial_balance) VALUES
    ('Compte Courant', 'Mon compte bancaire principal', 1500.00),
    ('Livret A', 'Compte épargne', 5000.00),
    ('Compte Commun', 'Compte partagé avec conjoint', 800.00)
ON CONFLICT DO NOTHING;

-- Récupérer les IDs des portefeuilles
DO $$
DECLARE
    compte_courant_id INTEGER;
    livret_a_id INTEGER;
BEGIN
    SELECT id INTO compte_courant_id FROM wallets WHERE name = 'Compte Courant' LIMIT 1;
    SELECT id INTO livret_a_id FROM wallets WHERE name = 'Livret A' LIMIT 1;
    
    IF compte_courant_id IS NOT NULL THEN
        -- Insérer des transactions de démonstration
        INSERT INTO transactions (wallet_id, date, amount, type, category, description) VALUES
            (compte_courant_id, CURRENT_DATE - INTERVAL '10 days', 2500.00, 'income', 'salary', 'Salaire mensuel'),
            (compte_courant_id, CURRENT_DATE - INTERVAL '8 days', 65.50, 'expense', 'food', 'Courses Carrefour'),
            (compte_courant_id, CURRENT_DATE - INTERVAL '5 days', 45.00, 'expense', 'transport', 'Essence'),
            (compte_courant_id, CURRENT_DATE - INTERVAL '3 days', 120.00, 'expense', 'leisure', 'Restaurant'),
            (compte_courant_id, CURRENT_DATE - INTERVAL '1 day', 30.00, 'expense', 'utilities', 'Abonnement Netflix');
        
        -- Insérer des transactions récurrentes de démonstration
        INSERT INTO recurring_transactions 
            (wallet_id, name, amount, type, category, recurrence_type, start_date, day_of_month, description) 
        VALUES
            (compte_courant_id, 'Salaire', 2500.00, 'income', 'salary', 'monthly', CURRENT_DATE, 1, 'Salaire mensuel'),
            (compte_courant_id, 'Loyer', 850.00, 'expense', 'housing', 'monthly', CURRENT_DATE, 5, 'Loyer mensuel'),
            (compte_courant_id, 'Assurance Auto', 65.00, 'expense', 'insurance', 'monthly', CURRENT_DATE, 15, 'Assurance mensuelle'),
            (compte_courant_id, 'Electricité', 80.00, 'expense', 'utilities', 'monthly', CURRENT_DATE, 20, 'Facture électricité');
    END IF;
    
    IF livret_a_id IS NOT NULL THEN
        -- Transaction d'épargne
        INSERT INTO transactions (wallet_id, date, amount, type, category, description) VALUES
            (livret_a_id, CURRENT_DATE - INTERVAL '10 days', 500.00, 'income', 'savings', 'Virement épargne mensuel');
        
        -- Transaction récurrente d'épargne
        INSERT INTO recurring_transactions 
            (wallet_id, name, amount, type, category, recurrence_type, start_date, day_of_month, description) 
        VALUES
            (livret_a_id, 'Épargne mensuelle', 500.00, 'income', 'savings', 'monthly', CURRENT_DATE, 2, 'Virement automatique épargne');
    END IF;
END $$;
*/

-- ============================================
-- 6. VUES UTILES (OPTIONNEL)
-- ============================================

-- Vue pour obtenir le solde actuel de chaque portefeuille
CREATE OR REPLACE VIEW wallet_balances AS
SELECT 
    w.id,
    w.name,
    w.description,
    w.initial_balance,
    COALESCE(SUM(
        CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
    ), 0) as transaction_sum,
    w.initial_balance + COALESCE(SUM(
        CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
    ), 0) as current_balance,
    COUNT(t.id) as transaction_count,
    MAX(t.date) as last_transaction_date,
    w.is_default,
    w.archived,
    w.created_at
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.name, w.description, w.initial_balance, w.is_default, w.archived, w.created_at;

-- Vue pour les statistiques mensuelles par portefeuille
CREATE OR REPLACE VIEW monthly_wallet_stats AS
SELECT 
    w.id as wallet_id,
    w.name as wallet_name,
    DATE_TRUNC('month', t.date) as month,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_balance,
    COUNT(*) as transaction_count
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
WHERE t.date IS NOT NULL
GROUP BY w.id, w.name, DATE_TRUNC('month', t.date)
ORDER BY w.id, month DESC;

-- ============================================
-- 7. FONCTIONS UTILES (OPTIONNEL)
-- ============================================

-- Fonction pour obtenir le solde d'un portefeuille à une date donnée
CREATE OR REPLACE FUNCTION get_wallet_balance_at_date(
    p_wallet_id INTEGER,
    p_date DATE
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_balance DECIMAL(10, 2);
BEGIN
    SELECT 
        w.initial_balance + COALESCE(SUM(
            CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
        ), 0)
    INTO v_balance
    FROM wallets w
    LEFT JOIN transactions t ON t.wallet_id = w.id AND t.date <= p_date
    WHERE w.id = p_wallet_id
    GROUP BY w.id, w.initial_balance;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. VÉRIFICATIONS FINALES
-- ============================================

-- Vérifier que tout est bien créé
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Base de données Grigou initialisée!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  - wallets';
    RAISE NOTICE '  - transactions';
    RAISE NOTICE '  - recurring_transactions';
    RAISE NOTICE '';
    RAISE NOTICE 'Vues créées:';
    RAISE NOTICE '  - wallet_balances';
    RAISE NOTICE '  - monthly_wallet_stats';
    RAISE NOTICE '';
    RAISE NOTICE 'Portefeuilles: % trouvé(s)', (SELECT COUNT(*) FROM wallets);
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
