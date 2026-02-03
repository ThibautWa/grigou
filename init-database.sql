-- Script d'initialisation de la base de données Grigou
-- À exécuter une seule fois lors du premier déploiement

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP
);

-- Index sur l'email pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table des portefeuilles
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    initial_balance DECIMAL(15, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_default ON wallets(user_id, is_default);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'outcome', 'both')),
    icon VARCHAR(10),
    color VARCHAR(7),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category UNIQUE (user_id, name, type),
    CONSTRAINT unique_system_category UNIQUE (name, type) WHERE is_system = TRUE
);

-- Index pour les catégories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'outcome')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    category VARCHAR(100),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly')),
    recurrence_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les transactions
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Table de partage des portefeuilles
CREATE TABLE IF NOT EXISTS wallet_shares (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
    invited_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    CONSTRAINT unique_wallet_user UNIQUE (wallet_id, user_id)
);

-- Index pour les partages
CREATE INDEX IF NOT EXISTS idx_wallet_shares_wallet_id ON wallet_shares(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_shares_user_id ON wallet_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_shares_accepted ON wallet_shares(accepted_at);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les logs d'audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insérer les catégories système par défaut
INSERT INTO categories (name, type, icon, color, is_system, sort_order) VALUES
-- Catégories de dépenses
('Alimentation', 'outcome', '🛒', '#22c55e', TRUE, 1),
('Restaurant', 'outcome', '🍽️', '#3b82f6', TRUE, 2),
('Transport', 'outcome', '🚗', '#f97316', TRUE, 3),
('Logement', 'outcome', '🏠', '#8b5cf6', TRUE, 4),
('Factures', 'outcome', '📄', '#ef4444', TRUE, 5),
('Santé', 'outcome', '🏥', '#ec4899', TRUE, 6),
('Loisirs', 'outcome', '🎮', '#f59e0b', TRUE, 7),
('Shopping', 'outcome', '🛍️', '#06b6d4', TRUE, 8),
('Éducation', 'outcome', '📚', '#14b8a6', TRUE, 9),
('Voyage', 'outcome', '✈️', '#6366f1', TRUE, 10),
('Téléphone', 'outcome', '📱', '#d946ef', TRUE, 11),
('Cadeaux', 'outcome', '🎁', '#a855f7', TRUE, 12),
('Animaux', 'outcome', '🐾', '#64748b', TRUE, 13),
('Autres dépenses', 'outcome', '📦', '#94a3b8', TRUE, 14),

-- Catégories de revenus
('Salaire', 'income', '💰', '#22c55e', TRUE, 1),
('Freelance', 'income', '💼', '#3b82f6', TRUE, 2),
('Investissement', 'income', '📈', '#8b5cf6', TRUE, 3),
('Prime', 'income', '🎁', '#f59e0b', TRUE, 4),
('Remboursement', 'income', '🔄', '#06b6d4', TRUE, 5),
('Autres revenus', 'income', '💵', '#14b8a6', TRUE, 6),

-- Catégorie spéciale pour ajustements
('Ajustement de solde', 'both', '⚖️', '#64748b', TRUE, 100)
ON CONFLICT DO NOTHING;

-- Afficher un message de succès
DO $$
BEGIN
    RAISE NOTICE 'Base de données initialisée avec succès!';
END $$;
