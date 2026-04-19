-- Migration pour ajouter la table withdrawal_proofs
-- Exécuter cette commande dans la base de données PostgreSQL

CREATE TABLE IF NOT EXISTS withdrawal_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  proof_data TEXT, -- Base64 image data
  proof_url TEXT, -- External URL
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_proofs_request ON withdrawal_proofs(withdrawal_request_id, step_order);
