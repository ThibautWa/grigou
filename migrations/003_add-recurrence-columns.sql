-- Migration SQL pour ajouter les colonnes de récurrence à la table transactions
-- Ce script vérifie si les colonnes existent déjà avant de les ajouter

-- Ajouter la colonne is_recurring si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'is_recurring'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ajouter la colonne recurrence_type si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'recurrence_type'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN recurrence_type VARCHAR(20);
    END IF;
END $$;

-- Ajouter la colonne recurrence_end_date si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'recurrence_end_date'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN recurrence_end_date DATE;
    END IF;
END $$;

-- Ajouter un index pour améliorer les performances des requêtes sur les transactions récurrentes
CREATE INDEX IF NOT EXISTS idx_transactions_recurring 
ON transactions(is_recurring, date) 
WHERE is_recurring = TRUE;

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
