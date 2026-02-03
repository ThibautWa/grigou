-- Migration: Ajouter la catégorie système "Ajustement"
-- Cette catégorie est utilisée pour les ajustements manuels de solde

-- Vérifier si la catégorie existe déjà avant de l'insérer
INSERT INTO categories (name, type, icon, color, user_id, is_system, is_active, sort_order)
SELECT 'Ajustement', 'both', '⚖️', '#6366f1', NULL, TRUE, TRUE, 100
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE name = 'Ajustement' AND is_system = TRUE
);

-- Alternative si vous voulez forcer la mise à jour ou l'insertion
-- INSERT INTO categories (name, type, icon, color, user_id, is_system, is_active, sort_order)
-- VALUES ('Ajustement', 'both', '⚖️', '#6366f1', NULL, TRUE, TRUE, 100)
-- ON CONFLICT (name, user_id) DO NOTHING;
