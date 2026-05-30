-- Migration 010: Système de rôles utilisateurs
-- Rôles : 'standard' (défaut), 'premium', 'admin'

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20)
    NOT NULL DEFAULT 'standard'
    CHECK (role IN ('standard', 'premium', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Commentaire de documentation
COMMENT ON COLUMN users.role IS
  'standard = compte gratuit (limite 3 portefeuilles), premium = sans limite, admin = accès back-office';