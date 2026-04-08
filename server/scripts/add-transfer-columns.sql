-- Ajouter les colonnes pour les virements externes à la table transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS external_iban TEXT,
ADD COLUMN IF NOT EXISTS external_bic TEXT,
ADD COLUMN IF NOT EXISTS external_account_holder TEXT;
