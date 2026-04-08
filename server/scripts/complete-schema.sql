-- NeoBank — PostgreSQL Schema complet avec système de retrait par étapes
-- Version complète incluant toutes les tables pour le système de pourcentages variables

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- TABLE PRINCIPALE : UTILISATEURS
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','blocked')),
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','approved','rejected')),
  iban TEXT,
  bic TEXT,
  iban_proof TEXT,
  iban_status TEXT NOT NULL DEFAULT 'none' CHECK (iban_status IN ('none','requested','assigned','active')),
  card_status TEXT NOT NULL DEFAULT 'none' CHECK (card_status IN ('none','requested','active','blocked')),
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),
  account_verified BOOLEAN NOT NULL DEFAULT false,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- TABLE : TRANSACTIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  label TEXT,
  bank_name TEXT,
  counterparty_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Champs pour les virements externes
  external_iban TEXT,
  external_bic TEXT,
  external_account_holder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- ===========================================
-- TABLE : CARTES BANCAIRES
-- ===========================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_number TEXT NOT NULL,
  last_four TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  expiry_month TEXT NOT NULL,
  expiry_year TEXT NOT NULL,
  cvv_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- TABLE : SOUMISSIONS KYC
-- ===========================================
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selfie_url TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_submissions(user_id);

-- ===========================================
-- TABLE : DEMANDES IBAN
-- ===========================================
CREATE TABLE IF NOT EXISTS iban_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iban_req_user ON iban_requests(user_id);

-- ===========================================
-- TABLE : DEMANDES DE CARTES
-- ===========================================
CREATE TABLE IF NOT EXISTS card_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- TABLE : NOTIFICATIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ===========================================
-- TABLE : DEMANDES D'ACTIVATION DE COMPTE
-- ===========================================
CREATE TABLE IF NOT EXISTS account_activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  proof_url TEXT,
  step TEXT NOT NULL DEFAULT 'iban_request' CHECK (step IN ('iban_request', 'transfer_proof')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activation_req_user ON account_activation_requests(user_id);

-- ===========================================
-- TABLE : DEMANDES DE RETRAIT (SYSTÈME PAR ÉTAPES)
-- ===========================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  external_account_holder TEXT NOT NULL,
  external_iban TEXT NOT NULL,
  external_bic TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','code_generated','step_completed','completed','rejected')),
  reject_reason TEXT,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  withdrawal_code TEXT,
  code_expires_at TIMESTAMPTZ,
  -- Champs pour le système par étapes
  current_percentage NUMERIC(5,2) DEFAULT 0,
  target_percentage NUMERIC(5,2),
  next_condition TEXT,
  final_condition TEXT,
  total_withdrawn NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status, created_at DESC);

-- ===========================================
-- TABLE : ÉTAPES DE RETRAIT
-- ===========================================
CREATE TABLE IF NOT EXISTS withdrawal_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  condition TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  amount NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_steps_request ON withdrawal_steps(withdrawal_request_id, step_order);

-- ===========================================
-- TABLE : CODES DE RETRAIT TEMPORAIRES
-- ===========================================
CREATE TABLE IF NOT EXISTS withdrawal_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_codes_code ON withdrawal_codes(code);
CREATE INDEX IF NOT EXISTS idx_withdrawal_codes_expires ON withdrawal_codes(expires_at);

-- ===========================================
-- TABLE : MESSAGES MODAUX
-- ===========================================
CREATE TABLE IF NOT EXISTS modal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','pending','active','suspended','specific')),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modal_user ON modal_messages(target_user_id);

-- ===========================================
-- UTILISATEUR ADMIN PAR DÉFAUT
-- ===========================================
DO $$
BEGIN
  INSERT INTO users (id, name, email, password_hash, role, status, account_verified, balance)
  VALUES (
    gen_random_uuid(),
    'Admin NeoBank',
    'admin@neobank.com',
    '$2b$10$rOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQ', -- Hash de 'admin123'
    'admin',
    'active',
    true,
    0
  )
  ON CONFLICT (email) DO NOTHING;
END $$;

-- ===========================================
-- COMMENTAIRES SUR LES TABLES
-- ===========================================

COMMENT ON TABLE users IS 'Table des utilisateurs du système bancaire';
COMMENT ON TABLE transactions IS 'Historique de toutes les transactions financières';
COMMENT ON TABLE cards IS 'Cartes bancaires émises';
COMMENT ON TABLE kyc_submissions IS 'Soumissions KYC pour vérification d\'identité';
COMMENT ON TABLE iban_requests IS 'Demandes d\'attribution IBAN';
COMMENT ON TABLE card_requests IS 'Demandes de cartes bancaires';
COMMENT ON TABLE notifications IS 'Notifications système pour les utilisateurs';
COMMENT ON TABLE account_activation_requests IS 'Demandes d\'activation de compte avec preuves';
COMMENT ON TABLE withdrawal_requests IS 'Demandes de retrait externe avec système par étapes';
COMMENT ON TABLE withdrawal_steps IS 'Étapes individuelles des demandes de retrait';
COMMENT ON TABLE withdrawal_codes IS 'Codes temporaires pour validation des retraits';
COMMENT ON TABLE modal_messages IS 'Messages modaux ciblés pour les utilisateurs';

-- ===========================================
-- VUES UTILITAIRES
-- ===========================================

-- Vue pour les statistiques des retraits
CREATE OR REPLACE VIEW withdrawal_stats AS
SELECT 
  DATE_TRUNC('month', wr.created_at) as month,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN wr.status = 'completed' THEN 1 END) as completed_requests,
  COUNT(CASE WHEN wr.status = 'rejected' THEN 1 END) as rejected_requests,
  SUM(CASE WHEN wr.status = 'completed' THEN wr.amount ELSE 0 END) as total_amount_withdrawn,
  AVG(CASE WHEN wr.status = 'completed' THEN wr.amount END) as avg_withdrawal_amount
FROM withdrawal_requests wr
GROUP BY DATE_TRUNC('month', wr.created_at)
ORDER BY month DESC;

-- Vue pour les demandes en cours
CREATE OR REPLACE VIEW pending_withdrawals AS
SELECT 
  wr.*,
  u.name as user_name,
  u.email as user_email,
  CASE 
    WHEN wr.code_expires_at < NOW() THEN 'expired'
    WHEN wr.status = 'pending' THEN 'waiting_code'
    WHEN wr.status = 'code_generated' THEN 'code_active'
    WHEN wr.status = 'step_completed' THEN 'in_progress'
    ELSE wr.status
  END as current_state
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
WHERE wr.status IN ('pending', 'code_generated', 'step_completed');

-- ===========================================
-- TRIGGERS ET FONCTIONS
-- ===========================================

-- Fonction pour mettre à jour le solde après transaction
CREATE OR REPLACE FUNCTION update_balance_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Pour les retraits, vérifier le solde
    IF NEW.type = 'withdrawal' THEN
      IF (SELECT balance FROM users WHERE id = NEW.user_id) < NEW.amount THEN
        RAISE EXCEPTION 'Solde insuffisant';
      END IF;
      UPDATE users SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.type = 'deposit' THEN
      UPDATE users SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la mise à jour automatique des soldes
DROP TRIGGER IF EXISTS trigger_update_balance ON transactions;
CREATE TRIGGER trigger_update_balance
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_after_transaction();

-- ===========================================
-- SÉCURITÉ ET PERMISSIONS
-- ===========================================

-- Création des rôles (optionnel, selon configuration)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neobank_admin') THEN
--     CREATE ROLE neobank_admin;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neobank_client') THEN
--     CREATE ROLE neobank_client;
--   END IF;
-- END $$;

-- ===========================================
-- NETTOYAGE AUTOMATIQUE
-- ===========================================

-- Fonction pour nettoyer les codes expirés
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
  UPDATE withdrawal_codes 
  SET used = true 
  WHERE expires_at < NOW() AND used = false;
END;
$$ LANGUAGE plpgsql;

-- Index pour optimiser les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status ON withdrawal_requests(user_id, status);

-- ===========================================
-- FIN DU SCHÉMA COMPLET
-- ===========================================

-- Affichage du résumé
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'NeoBank - Schéma SQL complet installé';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Tables créées : %', (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE 'Index créés : %', (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname NOT LIKE '%_pkey'
  );
  RAISE NOTICE 'Vues créées : %', (
    SELECT COUNT(*) 
    FROM information_schema.views 
    WHERE table_schema = 'public'
  );
  RAISE NOTICE '=========================================';
END $$;
