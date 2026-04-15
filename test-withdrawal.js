import { pool } from './server/config/database.js';

async function createTestWithdrawal() {
  try {
    // Récupérer un utilisateur client
    const userResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['client']);
    if (userResult.rowCount === 0) {
      console.log('Aucun utilisateur client trouvé');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('Utilisateur client trouvé:', userId);
    
    // Insérer une demande de retrait de test
    const result = await pool.query(
      `INSERT INTO withdrawal_requests (user_id, amount, external_account_holder, external_iban, external_bic, label, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, 1000, 'Test User', 'TEST12345678901234567890', 'TESTBIC', 'Test withdrawal', 'pending']
    );
    
    console.log('Demande de retrait de test créée avec ID:', result.rows[0].id);
    
    // Vérifier les demandes existantes
    const requests = await pool.query('SELECT COUNT(*) as count FROM withdrawal_requests');
    console.log('Total des demandes de retrait:', requests.rows[0].count);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await pool.end();
  }
}

createTestWithdrawal();
