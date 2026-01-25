-- Migration pour ajouter la fonctionnalité multi-portefeuilles

-- 1. Créer la table wallets
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

-- 2. Créer un index sur is_default pour optimiser les requêtes
CREATE INDEX idx_wallets_is_default ON wallets(is_default);
CREATE INDEX idx_wallets_archived ON wallets(archived);

-- 3. Créer un portefeuille par défaut
INSERT INTO wallets (name, description, initial_balance, is_default) 
VALUES ('Mon portefeuille principal', 'Portefeuille par défaut', 0.00, TRUE);

-- 4. Ajouter la colonne wallet_id aux tables existantes
-- (supposant que vous avez une table transactions)
ALTER TABLE IF EXISTS transactions 
ADD COLUMN IF NOT EXISTS wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE;

-- 5. Ajouter la colonne wallet_id à la table recurring_transactions
ALTER TABLE IF EXISTS recurring_transactions 
ADD COLUMN IF NOT EXISTS wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE;

-- 6. Mettre à jour les transactions existantes avec le portefeuille par défaut
UPDATE transactions 
SET wallet_id = (SELECT id FROM wallets WHERE is_default = TRUE LIMIT 1)
WHERE wallet_id IS NULL;

UPDATE recurring_transactions 
SET wallet_id = (SELECT id FROM wallets WHERE is_default = TRUE LIMIT 1)
WHERE wallet_id IS NULL;

-- 7. Rendre wallet_id obligatoire après migration
ALTER TABLE IF EXISTS transactions 
ALTER COLUMN wallet_id SET NOT NULL;

ALTER TABLE IF EXISTS recurring_transactions 
ALTER COLUMN wallet_id SET NOT NULL;

-- 8. Créer des index pour optimiser les requêtes par portefeuille
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_wallet_id ON recurring_transactions(wallet_id);

-- 9. Créer une fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Créer le trigger sur la table wallets
DROP TRIGGER IF EXISTS trigger_update_wallet_timestamp ON wallets;
CREATE TRIGGER trigger_update_wallet_timestamp
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_updated_at();

-- 11. Ajouter une contrainte pour s'assurer qu'il y a toujours au moins un portefeuille par défaut
-- (Cette contrainte sera gérée au niveau application pour plus de flexibilité)
