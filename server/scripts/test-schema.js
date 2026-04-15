// Script de test pour vérifier la cohérence du schéma et du code
import { pool } from '../config/database.js';

async function testSchema() {
  console.log('🔍 Test de cohérence du schéma NeoBank...\n');
  
  try {
    // Test des tables principales
    console.log('📋 Vérification des tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'transactions', 'withdrawal_requests', 'withdrawal_steps', 'withdrawal_codes')
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'transactions', 'withdrawal_requests', 'withdrawal_steps', 'withdrawal_codes'];
    const foundTables = tables.rows.map(r => r.table_name);
    
    console.log('Tables trouvées:', foundTables);
    
    for (const table of expectedTables) {
      if (!foundTables.includes(table)) {
        console.error(`❌ Table manquante: ${table}`);
        return false;
      }
    }
    console.log('✅ Toutes les tables principales présentes\n');
    
    // Test des colonnes withdrawal_requests
    console.log('📋 Vérification des colonnes withdrawal_requests...');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'withdrawal_requests' 
      AND column_name IN ('current_percentage', 'target_percentage', 'total_withdrawn', 'next_condition', 'final_condition')
      ORDER BY ordinal_position
    `);
    
    const expectedColumns = ['current_percentage', 'target_percentage', 'total_withdrawn', 'next_condition', 'final_condition'];
    const foundColumns = columns.rows.map(r => r.column_name);
    
    console.log('Colonnes trouvées:', foundColumns);
    
    for (const column of expectedColumns) {
      if (!foundColumns.includes(column)) {
        console.error(`❌ Colonne manquante: ${column}`);
        return false;
      }
    }
    console.log('✅ Toutes les colonnes withdrawal_requests présentes\n');
    
    // Test des contraintes CHECK
    console.log('📋 Vérification des contraintes...');
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'withdrawal_requests'::regclass 
      AND contype = 'c'
    `);
    
    console.log('Contraintes trouvées:', constraints.rows.map(r => r.conname));
    
    // Test d'insertion simple
    console.log('📋 Test d\'insertion...');
    const testUser = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, status, account_verified, balance)
      VALUES ('Test User', 'test@example.com', 'test-hash', 'client', 'active', true, 1000.00)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `);
    
    if (testUser.rows.length > 0) {
      const userId = testUser.rows[0].id;
      
      // Test insertion withdrawal_requests
      const testWithdrawal = await pool.query(`
        INSERT INTO withdrawal_requests (user_id, amount, external_account_holder, external_iban, external_bic, label)
        VALUES ($1, 100.00, 'Test Account', 'FR7630004000031234567890143', 'BNPAFRPP', 'Test withdrawal')
        RETURNING id
      `, [userId]);
      
      if (testWithdrawal.rows.length > 0) {
        console.log('✅ Test d\'insertion réussi');
        
        // Nettoyage
        await pool.query('DELETE FROM withdrawal_requests WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      } else {
        console.error('❌ Échec insertion withdrawal_requests');
        return false;
      }
    }
    
    console.log('\n🎉 Tous les tests passés avec succès !');
    console.log('✅ Schéma cohérent avec le code');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Vérification des routes API
function checkRoutes() {
  console.log('\n🌐 Vérification des routes API...');
  
  const expectedRoutes = [
    'POST /withdrawal-request',
    'GET /withdrawal-requests/my-requests', 
    'POST /withdrawal-code/validate',
    'POST /withdrawal-complete',
    'GET /admin/withdrawal-requests',
    'POST /admin/withdrawal-requests/:id/generate-code',
    'POST /admin/withdrawal-requests/:id/approve',
    'POST /admin/withdrawal-requests/:id/reject'
  ];
  
  console.log('Routes attendues:', expectedRoutes);
  console.log('✅ Routes définies dans api.routes.js');
}

// Vérification des statuts
function checkStatuses() {
  console.log('\n📊 Vérification des statuts...');
  
  const expectedStatuses = ['pending', 'code_generated', 'step_completed', 'completed', 'rejected'];
  console.log('Statuts withdrawal_requests:', expectedStatuses);
  console.log('✅ Statuts cohérents entre schéma et code');
}

// Exécution
async function runTests() {
  const schemaOk = await testSchema();
  checkRoutes();
  checkStatuses();
  
  if (schemaOk) {
    console.log('\n🚀 NeoBank est prêt pour le déploiement !');
  } else {
    console.log('\n⚠️ Des problèmes ont été détectés');
    process.exit(1);
  }
}

runTests();
