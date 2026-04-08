-- Script de diagnostic pour vérifier si le schéma est à jour
-- Exécuter avec: psql $DATABASE_URL -f server/scripts/check-schema.sql

\echo '=== Vérification des tables principales ==='

-- Vérifier si les tables existent
SELECT 
  'withdrawal_requests' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_requests') as exists
UNION ALL
SELECT 
  'withdrawal_steps' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_steps') as exists
UNION ALL
SELECT 
  'withdrawal_codes' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_codes') as exists;

\echo ''
\echo '=== Vérification des colonnes withdrawal_requests ==='

-- Vérifier les colonnes de withdrawal_requests
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'withdrawal_requests' 
AND column_name IN ('current_percentage', 'target_percentage', 'next_condition', 'final_condition', 'total_withdrawn')
ORDER BY ordinal_position;

\echo ''
\echo '=== Vérification des contraintes ==='

-- Vérifier les contraintes CHECK
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'withdrawal_requests'::regclass 
AND contype = 'c';

\echo ''
\echo '=== Test d'insertion simple ==='

-- Test d'insertion pour vérifier que tout fonctionne
DO $$
BEGIN
  -- Créer un utilisateur de test si nécessaire
  INSERT INTO users (id, name, email, password_hash, role, status, account_verified, balance)
  VALUES (
    gen_random_uuid(),
    'Test User',
    'test@example.com',
    'test-hash',
    'client',
    'active',
    true,
    1000.00
  )
  ON CONFLICT (email) DO NOTHING;
  
  -- Récupérer l'utilisateur de test
  DECLARE test_user_id UUID;
  SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Tester l'insertion d'une demande de retrait
    INSERT INTO withdrawal_requests (
      user_id, amount, external_account_holder, external_iban, external_bic, label
    ) VALUES (
      test_user_id,
      100.00,
      'Test Account',
      'FR7630004000031234567890143',
      'BNPAFRPP',
      'Test withdrawal'
    );
    
    RAISE NOTICE '✅ Test d''insertion réussi';
  ELSE
    RAISE NOTICE '❌ Utilisateur de test non trouvé';
  END IF;
  
  ROLLBACK;
END $$;

\echo ''
\echo '=== Diagnostic terminé ==='
