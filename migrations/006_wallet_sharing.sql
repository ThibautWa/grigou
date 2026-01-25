-- Migration: Préparation du partage de wallets entre utilisateurs
-- Date: 2026-01-25

-- ============================================
-- TABLE DE PARTAGE DES WALLETS
-- ============================================
-- Cette table permet de partager un wallet avec d'autres utilisateurs
-- Le propriétaire (owner) est défini dans wallets.user_id
-- Les collaborateurs sont définis ici avec leurs permissions

CREATE TABLE IF NOT EXISTS wallet_shares (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'read' CHECK (
        permission IN ('read', 'write', 'admin')
    ),
    -- 'read' = lecture seule (voir les transactions)
    -- 'write' = lecture + ajout/modification de transactions
    -- 'admin' = tout + modification du wallet + partage avec d'autres
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    
    -- Un utilisateur ne peut avoir qu'une seule permission par wallet
    UNIQUE(wallet_id, user_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_wallet_shares_wallet_id ON wallet_shares(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_shares_user_id ON wallet_shares(user_id);

-- ============================================
-- FONCTION POUR VÉRIFIER L'ACCÈS À UN WALLET
-- ============================================
-- Retourne le niveau de permission de l'utilisateur sur un wallet
-- 'owner' si propriétaire, 'read'/'write'/'admin' si partagé, NULL si pas d'accès

CREATE OR REPLACE FUNCTION get_wallet_permission(
    p_wallet_id INTEGER,
    p_user_id INTEGER
) RETURNS VARCHAR(20) AS $$
DECLARE
    v_owner_id INTEGER;
    v_permission VARCHAR(20);
BEGIN
    -- Vérifier si l'utilisateur est le propriétaire
    SELECT user_id INTO v_owner_id 
    FROM wallets 
    WHERE id = p_wallet_id;
    
    IF v_owner_id = p_user_id THEN
        RETURN 'owner';
    END IF;
    
    -- Vérifier les partages acceptés
    SELECT permission INTO v_permission
    FROM wallet_shares
    WHERE wallet_id = p_wallet_id 
      AND user_id = p_user_id
      AND accepted_at IS NOT NULL;
    
    RETURN v_permission; -- NULL si pas trouvé
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VUE POUR LES WALLETS ACCESSIBLES PAR UTILISATEUR
-- ============================================
-- Inclut les wallets possédés ET les wallets partagés

CREATE OR REPLACE VIEW user_accessible_wallets AS
SELECT 
    w.*,
    u.id as accessor_user_id,
    CASE 
        WHEN w.user_id = u.id THEN 'owner'
        ELSE ws.permission
    END as permission,
    CASE 
        WHEN w.user_id = u.id THEN TRUE
        ELSE FALSE
    END as is_owner
FROM wallets w
CROSS JOIN users u
LEFT JOIN wallet_shares ws ON ws.wallet_id = w.id AND ws.user_id = u.id AND ws.accepted_at IS NOT NULL
WHERE w.user_id = u.id 
   OR (ws.user_id = u.id AND ws.accepted_at IS NOT NULL);

-- ============================================
-- VÉRIFICATIONS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration partage de wallets terminée!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Nouveau:';
    RAISE NOTICE '  - Table wallet_shares';
    RAISE NOTICE '  - Fonction get_wallet_permission()';
    RAISE NOTICE '  - Vue user_accessible_wallets';
    RAISE NOTICE '';
    RAISE NOTICE 'Permissions disponibles:';
    RAISE NOTICE '  - owner: propriétaire (tous droits)';
    RAISE NOTICE '  - admin: gestion + partage';
    RAISE NOTICE '  - write: lecture + écriture';
    RAISE NOTICE '  - read: lecture seule';
    RAISE NOTICE '========================================';
END $$;
