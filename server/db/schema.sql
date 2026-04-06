-- NeoBank — PostgreSQL schema (UUID, contraintes)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
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

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  label TEXT,
  bank_name TEXT,
  counterparty_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);

CREATE TABLE cards (
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

CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selfie_url TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_kyc_user ON kyc_submissions(user_id);

CREATE TABLE iban_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_iban_req_user ON iban_requests(user_id);

CREATE TABLE card_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE account_activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  proof_url TEXT, -- Augmenté pour supporter les images base64
  step TEXT NOT NULL DEFAULT 'iban_request' CHECK (step IN ('iban_request', 'transfer_proof')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_activation_req_user ON account_activation_requests(user_id);

-- Modal messages : ciblage par audience OU par client spécifique
CREATE TABLE modal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','pending','active','suspended','specific')),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modal_user ON modal_messages(target_user_id);
