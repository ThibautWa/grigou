-- Migration pour ajouter les fonctionnalités de récurrence

-- Ajouter les colonnes de récurrence à la table transactions
ALTER TABLE transactions 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly')),
ADD COLUMN recurrence_end_date DATE;

-- Créer un index pour les requêtes de récurrence
CREATE INDEX idx_transactions_recurring ON transactions(is_recurring) WHERE is_recurring = TRUE;

-- Mettre à jour les transactions existantes
UPDATE transactions SET is_recurring = FALSE WHERE is_recurring IS NULL;

-- Exemples de données récurrentes
INSERT INTO transactions (type, amount, description, category, date, is_recurring, recurrence_type, recurrence_end_date) VALUES
    ('outcome', 800.00, 'Loyer mensuel', 'Logement', '2025-02-01', TRUE, 'monthly', '2026-12-31'),
    ('outcome', 50.00, 'Abonnement Netflix', 'Loisirs', '2025-02-01', TRUE, 'monthly', NULL),
    ('income', 3000.00, 'Salaire', 'Travail', '2025-02-01', TRUE, 'monthly', NULL),
    ('outcome', 120.00, 'Électricité', 'Factures', '2025-02-01', TRUE, 'bimonthly', NULL);
