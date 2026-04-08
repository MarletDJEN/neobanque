-- Mettre à jour la table withdrawal_requests pour les étapes multiples
ALTER TABLE withdrawal_requests 
DROP COLUMN IF EXISTS partial_amount,
ADD COLUMN IF NOT EXISTS current_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS next_condition TEXT,
ADD COLUMN IF NOT EXISTS final_condition TEXT,
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(14,2) DEFAULT 0;

-- Mettre à jour les contraintes CHECK
ALTER TABLE withdrawal_requests 
DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check,
ADD CONSTRAINT withdrawal_requests_status_check CHECK (status IN ('pending','code_generated','step_completed','completed','rejected'));

-- Créer la table withdrawal_steps
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
