-- Créer la table withdrawal_codes pour les codes temporaires
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
