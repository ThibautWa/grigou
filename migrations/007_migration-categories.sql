-- Migration: Create categories table
-- À exécuter dans votre base de données PostgreSQL

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'outcome', 'both')),
    icon VARCHAR(50),
    color VARCHAR(7), -- Code couleur hex (#RRGGBB)
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Une catégorie système n'a pas de user_id
    -- Une catégorie utilisateur a obligatoirement un user_id
    CONSTRAINT check_user_or_system CHECK (
        (is_system = TRUE AND user_id IS NULL) OR 
        (is_system = FALSE AND user_id IS NOT NULL)
    ),
    
    -- Unicité du nom par utilisateur (ou pour les catégories système)
    CONSTRAINT unique_category_name UNIQUE (name, user_id, is_system)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON categories(is_system);

-- Modifier la table transactions pour référencer les catégories
-- D'abord, ajouter la colonne category_id
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Créer un index sur category_id
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- =====================================================
-- INSERTION DES CATÉGORIES SYSTÈME PAR DÉFAUT
-- =====================================================

-- Catégories de dépenses (outcome)
INSERT INTO categories (name, type, icon, color, is_system, sort_order) VALUES
    ('Alimentation', 'outcome', '🛒', '#22c55e', TRUE, 1),
    ('Restaurant', 'outcome', '🍽️', '#f97316', TRUE, 2),
    ('Transport', 'outcome', '🚗', '#3b82f6', TRUE, 3),
    ('Logement', 'outcome', '🏠', '#8b5cf6', TRUE, 4),
    ('Factures', 'outcome', '📄', '#64748b', TRUE, 5),
    ('Santé', 'outcome', '🏥', '#ef4444', TRUE, 6),
    ('Loisirs', 'outcome', '🎮', '#ec4899', TRUE, 7),
    ('Shopping', 'outcome', '🛍️', '#f59e0b', TRUE, 8),
    ('Éducation', 'outcome', '📚', '#06b6d4', TRUE, 9),
    ('Voyages', 'outcome', '✈️', '#14b8a6', TRUE, 10),
    ('Abonnements', 'outcome', '📱', '#6366f1', TRUE, 11),
    ('Cadeaux', 'outcome', '🎁', '#d946ef', TRUE, 12),
    ('Animaux', 'outcome', '🐾', '#a855f7', TRUE, 13),
    ('Autre dépense', 'outcome', '📦', '#94a3b8', TRUE, 99)
ON CONFLICT (name, user_id, is_system) DO NOTHING;

-- Catégories de revenus (income)
INSERT INTO categories (name, type, icon, color, is_system, sort_order) VALUES
    ('Salaire', 'income', '💰', '#22c55e', TRUE, 1),
    ('Freelance', 'income', '💼', '#3b82f6', TRUE, 2),
    ('Investissements', 'income', '📈', '#8b5cf6', TRUE, 3),
    ('Remboursement', 'income', '🔄', '#f97316', TRUE, 4),
    ('Ventes', 'income', '🏷️', '#ec4899', TRUE, 5),
    ('Cadeaux reçus', 'income', '🎁', '#d946ef', TRUE, 6),
    ('Allocations', 'income', '🏛️', '#64748b', TRUE, 7),
    ('Loyer perçu', 'income', '🏠', '#14b8a6', TRUE, 8),
    ('Autre revenu', 'income', '💵', '#94a3b8', TRUE, 99)
ON CONFLICT (name, user_id, is_system) DO NOTHING;

-- =====================================================
-- FONCTION POUR MIGRER LES ANCIENNES CATÉGORIES
-- =====================================================
-- Cette fonction migre les catégories textuelles existantes vers le nouveau système

CREATE OR REPLACE FUNCTION migrate_text_categories_to_ids() 
RETURNS void AS $$
DECLARE
    r RECORD;
    cat_id INTEGER;
BEGIN
    -- Pour chaque transaction avec une catégorie textuelle mais sans category_id
    FOR r IN 
        SELECT DISTINCT t.id, t.category, t.type, t.wallet_id, w.user_id
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.id
        WHERE t.category IS NOT NULL 
        AND t.category != ''
        AND t.category_id IS NULL
    LOOP
        -- Chercher d'abord dans les catégories système
        SELECT id INTO cat_id
        FROM categories
        WHERE LOWER(name) = LOWER(r.category)
        AND is_system = TRUE
        AND (type = r.type OR type = 'both')
        LIMIT 1;
        
        -- Si pas trouvé, chercher dans les catégories utilisateur
        IF cat_id IS NULL THEN
            SELECT id INTO cat_id
            FROM categories
            WHERE LOWER(name) = LOWER(r.category)
            AND user_id = r.user_id
            AND (type = r.type OR type = 'both')
            LIMIT 1;
        END IF;
        
        -- Si toujours pas trouvé, créer une catégorie utilisateur
        IF cat_id IS NULL THEN
            INSERT INTO categories (name, type, user_id, is_system, icon, color)
            VALUES (r.category, r.type, r.user_id, FALSE, '📌', '#94a3b8')
            RETURNING id INTO cat_id;
        END IF;
        
        -- Mettre à jour la transaction
        UPDATE transactions SET category_id = cat_id WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la migration (décommenter si nécessaire)
-- SELECT migrate_text_categories_to_ids();

-- =====================================================
-- NOTE: Après migration, vous pouvez supprimer l'ancienne colonne category
-- ALTER TABLE transactions DROP COLUMN IF EXISTS category;
-- =====================================================
