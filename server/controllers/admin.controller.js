import { pool } from '../config/database.js';
import { toAccount, toTransactionRow, toUserProfile } from '../utils/serialize.js';
import { insertNotification } from '../utils/notify.js';
import { sendEventToUser } from '../routes/events.routes.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function mapUserAdminRow(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.name,
    name: row.name,
    role: row.role,
    phone: row.phone,
    address: row.address,
    accountStatus: row.status,
    kycStatus: row.kyc_status,
    createdAt: row.created_at,
    balance: Number(row.balance),
    iban: row.iban,
    bic: row.bic,
    ibanStatus:
      row.iban_status === 'active'
        ? 'active'
        : row.iban_status === 'assigned'
          ? 'approved'
          : row.iban_status === 'requested'
            ? 'pending'
            : 'none',
    status: row.status,
    accountVerified: row.account_verified,
  };
}

export async function listUsers(req, res) {
  try {
    const { status, kyc_status } = req.query;
    let query = `SELECT * FROM users WHERE role = 'client'`;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (kyc_status) {
      params.push(kyc_status);
      query += ` AND kyc_status = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const r = await pool.query(query, params);
    res.json({ users: r.rows.map(mapUserAdminRow) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function listUsersForActivation(req, res) {
  try {
    const r = await pool.query(
      `SELECT * FROM users 
       WHERE role = 'client' AND (status = 'pending' OR status = 'suspended')
       ORDER BY created_at DESC`
    );
    res.json({ users: r.rows.map(mapUserAdminRow) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function listAllData(req, res) {
  try {
    const users = await pool.query(
      `SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC`
    );
    const accounts = users.rows.map(toAccount);
    const requests = await pool.query(
      `SELECT ar.*, u.email, u.name 
       FROM account_activation_requests ar
       JOIN users u ON u.id = ar.user_id
       ORDER BY ar.created_at DESC`
    );
    
    // Ajouter les demandes IBAN
    const ibanRequestsQuery = await pool.query(
      `SELECT ir.*, u.email, u.name, 'iban_request' as type
       FROM iban_requests ir
       JOIN users u ON u.id = ir.user_id
       ORDER BY ir.created_at DESC`
    );
    
    // Combiner toutes les demandes
    const allRequests = [...requests.rows, ...ibanRequestsQuery.rows];
    const cards = await pool.query(
      `SELECT c.*, u.email, u.name 
       FROM cards c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    // Ajouter les demandes de carte
    const cardRequests = await pool.query(
      `SELECT cr.*, u.email, u.name 
       FROM card_requests cr
       JOIN users u ON u.id = cr.user_id
       ORDER BY cr.created_at DESC`
    );
    const transactions = await pool.query(
      `SELECT t.*, u.email, u.name 
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC LIMIT 100`
    );
    const kycSubmissions = await pool.query(
      `SELECT ks.*, u.email, u.name 
       FROM kyc_submissions ks
       JOIN users u ON u.id = ks.user_id
       ORDER BY ks.created_at DESC`
    );
    
    res.json({
      users: users.rows.map(mapUserAdminRow),
      allUsers: users.rows.map(mapUserAdminRow),
      accounts,
      requests: allRequests,
      cards: cards.rows,
      cardRequests: cardRequests.rows, // Ajouter les demandes de carte
      transactions: transactions.rows.map(toTransactionRow),
      kycSubmissions: kycSubmissions.rows
    });
  } catch (e) {
    console.error('Erreur dans listAllData:', e);
    res.status(500).json({ error: 'Erreur lors du chargement des données' });
  }
}

export async function verifyUser(req, res) {
  const { id } = req.params;
  const { generateIban, initialBalance } = req.body;
  console.log('DEBUG verifyUser:', { id, generateIban, initialBalance });
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier si l'utilisateur existe
    const userCheck = await cli.query(`SELECT * FROM users WHERE id = $1 AND role = 'client'`, [id]);
    console.log('DEBUG user avant:', userCheck.rows[0]);
    if (userCheck.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    // Activer le compte
    await cli.query(
      `UPDATE users SET account_verified = true, status = 'active' WHERE id = $1`,
      [id]
    );
    
    // Vérifier après mise à jour
    const userAfter = await cli.query(`SELECT * FROM users WHERE id = $1`, [id]);
    console.log('DEBUG user après:', userAfter.rows[0]);
    
    // Générer un IBAN si demandé
    let iban = null;
    let bic = null;
    if (generateIban) {
      iban = generateIban();
      bic = 'BNPAFRPPXXX';
      await cli.query(
        `UPDATE users SET iban = $1, bic = $2, iban_status = 'assigned' WHERE id = $3`,
        [iban, bic, id]
      );
    }
    
    // Ajouter un solde initial si spécifié
    if (initialBalance && Number(initialBalance) > 0) {
      await cli.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [Number(initialBalance), id]);
      await cli.query(
        `INSERT INTO transactions (user_id, type, amount, label) VALUES ($1, 'deposit', $2, $3)`,
        [id, Number(initialBalance), 'Crédit initial (activation admin)']
      );
    }
    
    await insertNotification(
      cli,
      id,
      'Compte activé !',
      `Votre compte NeoBank a été validé par l'administrateur. Vous pouvez utiliser les services.${generateIban ? ` Votre IBAN : ${iban.slice(0, 8)}…` : ''}${initialBalance ? ` Crédit initial : ${initialBalance}€` : ''}`
    );
    console.log('DEBUG: notification compte activé envoyée à', id);
    
    // Envoyer événement SSE en temps réel
    sendEventToUser(id, 'account_verified', {
      status: 'active',
      iban: generateIban ? iban : null,
      initialBalance: initialBalance || null,
      message: 'Compte validé par l\'administrateur'
    });
    
    await cli.query('COMMIT');
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json({ 
      user: mapUserAdminRow(u.rows[0]),
      account: toAccount(u.rows[0]),
      iban,
      bic
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

function generateIban() {
  const countryCode = 'FR';
  const checkDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const bankCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(11, '0');
  const nationalCheck = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${countryCode}${checkDigits}${bankCode}${accountNumber}${nationalCheck}`;
}

export async function setUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'suspended', 'blocked', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    await cli.query(`UPDATE users SET status = $1 WHERE id = $2 AND role = 'client'`, [status, id]);
    const msg =
      status === 'suspended' || status === 'blocked'
        ? 'Votre compte a été suspendu par l’administrateur.'
        : 'Votre compte a été réactivé.';
    await insertNotification(cli, id, 'Statut du compte', msg);
    
    // Envoyer événement SSE en temps réel
    sendEventToUser(id, 'status_changed', {
      status: status,
      message: msg
    });
    
    await cli.query('COMMIT');
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json({ user: mapUserAdminRow(u.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function assignIban(req, res) {
  const { id } = req.params;
  const { iban, bic } = req.body;
  
  // Validation des données
  if (!iban?.trim()) {
    return res.status(400).json({ error: 'IBAN requis' });
  }
  
  // Garder l'IBAN exactement comme entré par l'admin
  const cleanIban = iban.trim();
  
  const finalBic = bic?.trim() || 'BNPAFRPPXXX';
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier si l'utilisateur existe
    const userCheck = await cli.query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (userCheck.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    // Attribuer l'IBAN et BIC
    await cli.query(
      `UPDATE users SET iban = $1, bic = $2, iban_status = 'assigned' WHERE id = $3`,
      [cleanIban, finalBic, id]
    );
    
    // Approuver la demande d'IBAN
    await cli.query(
      `UPDATE account_activation_requests SET status = 'approved', reviewed_at = now() WHERE user_id = $1 AND step = 'iban_request' AND status = 'pending'`,
      [id]
    );
    
    // Notifier l'utilisateur
    await insertNotification(
      cli,
      id,
      'IBAN attribué',
      `Votre IBAN ${cleanIban.slice(0, 8)}… est actif. Vous pouvez maintenant effectuer le virement de 500 €.`
    );
    
    // Envoyer événement SSE en temps réel
    sendEventToUser(id, 'iban_assigned', {
      iban: cleanIban,
      bic: finalBic,
      message: 'IBAN attribué avec succès'
    });
    
    await cli.query('COMMIT');
    
    // Récupérer les infos mises à jour
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json({ 
      ok: true, 
      iban: cleanIban, 
      bic: finalBic,
      user: mapUserAdminRow(u.rows[0]), 
      account: toAccount(u.rows[0]) 
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function approveKyc(req, res) {
  const { id } = req.params;
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const k = await cli.query(`SELECT * FROM kyc_submissions WHERE id = $1`, [id]);
    if (k.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande KYC introuvable' });
    }
    await cli.query(`UPDATE kyc_submissions SET status = 'approved', reviewed_at = now() WHERE id = $1`, [id]);
    await cli.query(`UPDATE users SET kyc_status = 'approved' WHERE id = $1`, [k.rows[0].user_id]);
    await insertNotification(
      cli,
      k.rows[0].user_id,
      'KYC validé',
      'Votre vérification d\'identité a été approuvée.'
    );
    await cli.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function rejectKyc(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Motif requis' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const k = await cli.query(`SELECT * FROM kyc_submissions WHERE id = $1`, [id]);
    if (k.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande KYC introuvable' });
    }
    await cli.query(
      `UPDATE kyc_submissions SET status = 'rejected', reject_reason = $2, reviewed_at = now() WHERE id = $1`,
      [id, reason.trim()]
    );
    await cli.query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [k.rows[0].user_id]);
    await insertNotification(
      cli,
      k.rows[0].user_id,
      'KYC rejeté',
      `Motif : ${reason.trim()}`
    );
    await cli.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function activateCard(req, res) {
  const { userId } = req.params;
  const { fullNumber, expiryMonth, expiryYear, cvv } = req.body;
  
  // Validation des données
  if (!fullNumber || !fullNumber.trim() || !/^\d{16}$/.test(fullNumber.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Le numéro complet de la carte est requis (16 chiffres)' });
  }
  if (!cvv || !cvv.trim() || cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
    return res.status(400).json({ error: 'Le CVV est requis (3 chiffres)' });
  }
  
  const cleanNumber = fullNumber.replace(/\s/g, ''); // Enlever les espaces
  const lastFour = cleanNumber.slice(-4); // Extraire les 4 derniers chiffres
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer les infos utilisateur
    const userResult = await cli.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (userResult.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const user = userResult.rows[0];
    
    // Vérifier si une carte existe déjà
    const existingCard = await cli.query(`SELECT id FROM cards WHERE user_id = $1`, [userId]);
    if (existingCard.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une carte existe déjà pour cet utilisateur' });
    }
    
    // Créer la carte avec le numéro complet fourni par l'admin
    const holder = (user.name || 'CLIENT').toUpperCase();
    await cli.query(
      `INSERT INTO cards (user_id, full_number, last_four, holder_name, expiry_month, expiry_year, cvv_encrypted, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [userId, cleanNumber, lastFour, holder, expiryMonth || '12', expiryYear || '2028', cvv]
    );
    
    // Mettre à jour le statut de la demande
    await cli.query(`UPDATE card_requests SET status = 'approved' WHERE user_id = $1 AND status = 'pending'`, [userId]);
    
    // Mettre à jour le statut de l'utilisateur
    await cli.query(`UPDATE users SET card_status = 'active' WHERE id = $1`, [userId]);
    
    // Notifier l'utilisateur
    await insertNotification(cli, userId, 'Carte activée', `Votre carte Visa se terminant par ${lastFour} est maintenant active. Numéro: ${cleanNumber.slice(0, 4)} •••• •••• ${lastFour}`);
    
    await cli.query('COMMIT');
    res.json({ ok: true, fullNumber: cleanNumber, lastFour, expiryMonth, expiryYear });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function blockCardAdmin(req, res) {
  const { userId } = req.params;
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    await cli.query(`UPDATE cards SET status = 'blocked' WHERE user_id = $1`, [userId]);
    await cli.query(`UPDATE users SET card_status = 'blocked' WHERE id = $1`, [userId]);
    await insertNotification(cli, userId, 'Carte bloquée', 'Votre carte a été bloquée par l\'administrateur.');
    await cli.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function adminDeposit(req, res) {
  const { id } = req.params;
  const { amount, bankName } = req.body;
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }
  if (!bankName?.trim()) {
    return res.status(400).json({ error: 'Nom de la banque requis' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const u = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (u.rowCount === 0 || u.rows[0].role !== 'client') {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Client introuvable' });
    }
    await cli.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [amount, id]);
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, bank_name) VALUES ($1, 'deposit', $2, $3, $4)`,
      [id, amount, req.body.label || `Dépôt ${bankName}`, bankName.trim()]
    );
    await insertNotification(cli, id, 'Crédit sur compte', `+${amount} € (${bankName.trim()}).`);
    await cli.query('COMMIT');
    const after = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json({ account: toAccount(after.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function adminWithdraw(req, res) {
  const { id } = req.params;
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const u = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (u.rowCount === 0 || u.rows[0].role !== 'client') {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Client introuvable' });
    }
    if (Number(u.rows[0].balance) < amount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [amount, id]);
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label) VALUES ($1, 'withdrawal', $2, $3)`,
      [id, amount, req.body.label || 'Retrait administrateur']
    );
    await insertNotification(cli, id, 'Débit sur compte', `-${amount} € (opération administrative).`);
    await cli.query('COMMIT');
    const after = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json({ account: toAccount(after.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier si l'utilisateur existe et est un client
    const userCheck = await cli.query(`SELECT * FROM users WHERE id = $1 AND role = 'client'`, [id]);
    if (userCheck.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Client introuvable' });
    }
    
    const user = userCheck.rows[0];
    
    // Supprimer toutes les données associées à l'utilisateur
    await cli.query(`DELETE FROM withdrawal_steps WHERE withdrawal_request_id IN (SELECT id FROM withdrawal_requests WHERE user_id = $1)`, [id]);
    await cli.query(`DELETE FROM withdrawal_requests WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM withdrawal_codes WHERE withdrawal_request_id IN (SELECT id FROM withdrawal_requests WHERE user_id = $1)`, [id]);
    await cli.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM transactions WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM cards WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM card_requests WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM iban_requests WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM account_activation_requests WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM kyc_submissions WHERE user_id = $1`, [id]);
    await cli.query(`DELETE FROM modal_messages WHERE target_user_id = $1`, [id]);
    await cli.query(`DELETE FROM users WHERE id = $1`, [id]);
    
    await cli.query('COMMIT');
    
    console.log(`ADMIN DELETE: User ${id} (${user.email}) deleted by admin`);
    
    res.json({ 
      success: true, 
      message: 'Compte client supprimé définitivement',
      deletedUser: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors de la suppression du client:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  } finally {
    cli.release();
  }
}

export async function approveWithdrawalRequest(req, res) {
  const { id } = req.params;
  const { targetPercentage = 100, steps } = req.body;
  
  console.log('DEBUG: approveWithdrawalRequest appelé avec:', { id, targetPercentage, steps, userId: req.userId });
  
  if (!id) {
    return res.status(400).json({ error: 'ID de demande requis' });
  }
  
  // Si pas d'étapes fournies, utiliser les étapes par défaut
  const finalSteps = steps && steps.length > 0 ? steps : [
    { percentage: 50, condition: 'Première moitié du virement' },
    { percentage: 50, condition: 'Seconde moitié du virement' }
  ];
  
  const finalTargetPercentage = targetPercentage || 100;
  
  console.log('DEBUG: Étapes finales:', { finalSteps, finalTargetPercentage });
  
  // Validation simple
  if (finalTargetPercentage <= 0 || finalTargetPercentage > 100) {
    return res.status(400).json({ error: 'Pourcentage cible invalide (1-100)' });
  }
  
  // Validation des étapes
  let totalPercentage = 0;
  for (const step of finalSteps) {
    if (!step.percentage || step.percentage <= 0 || step.percentage > 100) {
      return res.status(400).json({ error: 'Pourcentage d\'étape invalide' });
    }
    totalPercentage += step.percentage;
  }
  
  // Validation plus flexible pour éviter les erreurs d'arrondi
  if (Math.abs(totalPercentage - finalTargetPercentage) > 1) {
    return res.status(400).json({ error: `Le total des pourcentages (${totalPercentage}%) doit être proche du pourcentage cible (${finalTargetPercentage}%)` });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier que la demande existe et est en statut pending
    const request = await cli.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (request.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
    }
    
    const requestData = request.rows[0];
    
    // Insérer les étapes de retrait
    for (let i = 0; i < finalSteps.length; i++) {
      const step = finalSteps[i];
      const stepAmount = (Number(requestData.amount) * step.percentage) / 100;
      
      await cli.query(
        `INSERT INTO withdrawal_steps (
          withdrawal_request_id, step_order, percentage, amount, condition, is_completed
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, i + 1, step.percentage, stepAmount, step.condition || '', false]
      );
    }
    
    // Mettre à jour la demande
    await cli.query(
      `UPDATE withdrawal_requests 
       SET status = 'approved', 
           target_percentage = $1,
           current_percentage = 0,
           total_withdrawn = 0,
           next_condition = $2
       WHERE id = $3`,
      [finalTargetPercentage, finalSteps[0]?.condition || 'Première étape', id]
    );
    
    // Notifier l'utilisateur
    await insertNotification(
      cli,
      requestData.user_id,
      'Demande de retrait approuvée',
      `Votre demande de retrait de ${fmt(requestData.amount)} a été approuvée. Vous recevrez des codes pour chaque étape.`
    );
    
    await cli.query('COMMIT');
    
    console.log(`ADMIN WITHDRAWAL APPROVAL: Request ${id} approved with ${finalSteps.length} steps by admin ${req.userId}`);
    
    res.json({ 
      success: true, 
      message: 'Demande approuvée avec succès',
      steps: finalSteps,
      targetPercentage: finalTargetPercentage
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors de l\'approbation de la demande de retrait:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

// Fonction originale generateWithdrawalCode pour la compatibilité
export async function generateWithdrawalCode(req, res) {
  const { id } = req.params;
  const { stepOrder } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'ID de demande requis' });
  }
  
  if (!stepOrder || stepOrder <= 0) {
    return res.status(400).json({ error: 'Numéro d\'étape requis' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la demande et l'étape spécifique
    const request = await cli.query(
      `SELECT wr.*, ws.percentage as step_percentage, ws.condition as step_condition, wr.code_expires_at
       FROM withdrawal_requests wr 
       LEFT JOIN withdrawal_steps ws ON wr.id = ws.withdrawal_request_id AND ws.step_order = $1
       WHERE wr.id = $2 AND wr.status IN ('code_generated', 'step_completed')
       FOR UPDATE OF wr`,
      [stepOrder, id]
    );
    if (request.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable, étape non disponible ou demande pas encore approuvée' });
    }
    
    // Plus de délai d'attente - génération immédiate des codes autorisée
    
    // Vérifier si cette étape n'est pas déjà complétée
    const stepCompleted = await cli.query(
      `SELECT id FROM withdrawal_steps WHERE withdrawal_request_id = $1 AND step_order = $2 AND is_completed = true`,
      [id, stepOrder]
    );
    if (stepCompleted.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Cette étape est déjà complétée' });
    }
    
    // Générer un code unique
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let codeExists;
    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codeExists = await cli.query(`SELECT id FROM withdrawal_codes WHERE code = $1`, [code]);
    } while (codeExists.rowCount > 0);
    
    // Calculer la date d'expiration (4 heures)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    
    // Insérer le code
    await cli.query(
      `INSERT INTO withdrawal_codes (code, withdrawal_request_id, expires_at) VALUES ($1, $2, $3)`,
      [code, id, expiresAt]
    );
    
    // Mettre à jour la demande pour indiquer qu'un code est disponible
    await cli.query(
      `UPDATE withdrawal_requests SET status = 'code_generated', next_condition = $1 WHERE id = $2`,
      [request.rows[0].step_condition || `Code pour étape ${stepOrder}`, id]
    );
    
    await cli.query('COMMIT');
    
    console.log(`ADMIN WITHDRAWAL CODE: Generated code ${code} for step ${stepOrder} of request ${id} by admin ${req.userId}`);
    
    res.json({ 
      success: true, 
      code, 
      expiresAt, 
      stepOrder,
      stepPercentage: request.rows[0].step_percentage,
      stepCondition: request.rows[0].step_condition,
      message: `Code généré pour l'étape ${stepOrder}`
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors de la génération du code de retrait:', e);
    res.status(500).json({ error: 'Erreur lors de la génération du code de retrait' });
  } finally {
    cli.release();
  }
}

/**
 * L'admin décide de continuer vers une nouvelle étape ou d'accepter totalement le virement.
 * decision: 'continue' | 'complete'
 */
export async function getWithdrawalProofs(req, res) {
  try {
    const proofs = await pool.query(
      `SELECT wp.*, wr.amount as total_amount, wr.external_iban, wr.external_bic, wr.external_account_holder,
              u.name as client_name, u.email as client_email, ws.amount as step_amount
       FROM withdrawal_proofs wp
       JOIN withdrawal_requests wr ON wp.withdrawal_request_id = wr.id
       JOIN users u ON wr.user_id = u.id
       LEFT JOIN withdrawal_steps ws ON wp.withdrawal_request_id = ws.withdrawal_request_id AND wp.step_order = ws.step_order
       ORDER BY wp.created_at DESC`
    );
    res.json({ proofs: proofs.rows });
  } catch (e) {
    console.error('Erreur lors du chargement des preuves:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function approveWithdrawalProof(req, res) {
  const { id } = req.params;
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la preuve
    const proof = await cli.query(
      `SELECT wp.*, wr.user_id, wr.amount as step_amount, wr.total_withdrawn
       FROM withdrawal_proofs wp
       JOIN withdrawal_requests wr ON wp.withdrawal_request_id = wr.id
       WHERE wp.id = $1 AND wp.status = 'pending' FOR UPDATE`,
      [id]
    );
    
    if (proof.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Preuve introuvable ou déjà traitée' });
    }
    
    const proofData = proof.rows[0];
    
    // Marquer la preuve comme approuvée
    await cli.query(
      `UPDATE withdrawal_proofs SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
      [id]
    );
    
    // Marquer l'étape comme complétée
    await cli.query(
      `UPDATE withdrawal_steps SET is_completed = true, completed_at = NOW() 
       WHERE withdrawal_request_id = $1 AND step_order = $2`,
      [proofData.withdrawal_request_id, proofData.step_order]
    );
    
    // Mettre à jour la demande
    const newTotalWithdrawn = Number(proofData.total_withdrawn || 0) + Number(proofData.step_amount);
    const newPercentage = (newTotalWithdrawn / Number(proofData.total_amount)) * 100;
    
    await cli.query(
      `UPDATE withdrawal_requests 
       SET current_percentage = $1, total_withdrawn = $2, status = 'step_completed'
       WHERE id = $3`,
      [newPercentage, newTotalWithdrawn, proofData.withdrawal_request_id]
    );
    
    // Notifier le client
    await insertNotification(
      cli,
      proofData.user_id,
      'Étape validée',
      `Votre preuve de virement a été approuvée. Étape ${proofData.step_order} validée (${newPercentage.toFixed(1)}% complété).`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Preuve approuvée avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors de l\'approbation de la preuve:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function rejectWithdrawalProof(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  
  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Motif de rejet requis' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la preuve
    const proof = await cli.query(
      `SELECT wp.*, wr.user_id
       FROM withdrawal_proofs wp
       JOIN withdrawal_requests wr ON wp.withdrawal_request_id = wr.id
       WHERE wp.id = $1 AND wp.status = 'pending' FOR UPDATE`,
      [id]
    );
    
    if (proof.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Preuve introuvable ou déjà traitée' });
    }
    
    const proofData = proof.rows[0];
    
    // Marquer la preuve comme rejetée
    await cli.query(
      `UPDATE withdrawal_proofs SET status = 'rejected', admin_notes = $2, reviewed_at = NOW() WHERE id = $1`,
      [id, reason.trim()]
    );
    
    // Notifier le client
    await insertNotification(
      cli,
      proofData.user_id,
      'Preuve de virement rejetée',
      `Votre preuve a été rejetée. Motif: ${reason.trim()}`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Preuve rejetée avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors du rejet de la preuve:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function adminDecideWithdrawal(req, res) {
  const { id } = req.params;
  const { decision, nextStepPercentage, nextStepCondition, clientType } = req.body;

  if (!['continue', 'complete'].includes(decision)) {
    return res.status(400).json({ error: 'Décision invalide. Utilisez "continue" ou "complete".' });
  }

  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');

    const requestResult = await cli.query(
      `SELECT wr.*, u.name, u.email FROM withdrawal_requests wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.id = $1 AND wr.status = 'step_completed' FOR UPDATE OF wr`,
      [id]
    );

    if (requestResult.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou non en statut step_completed' });
    }

    const wr = requestResult.rows[0];

    if (decision === 'complete') {
      const remainingAmount = Number(wr.amount) - Number(wr.total_withdrawn || 0);

      if (remainingAmount > 0) {
        const userResult = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [wr.user_id]);
        const balance = Number(userResult.rows[0].balance);
        if (balance < remainingAmount) {
          await cli.query('ROLLBACK');
          return res.status(400).json({ error: 'Solde insuffisant pour compléter le virement' });
        }
        await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [remainingAmount, wr.user_id]);
        await cli.query(
          `INSERT INTO transactions (user_id, type, amount, label, external_iban, external_bic, external_account_holder)
           VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6)`,
          [wr.user_id, remainingAmount, `Virement final vers ${wr.external_account_holder}`, wr.external_iban, wr.external_bic, wr.external_account_holder]
        );
      }

      await cli.query(
        `UPDATE withdrawal_requests SET status = 'completed', current_percentage = 100, total_withdrawn = $1, processed_at = NOW() WHERE id = $2`,
        [Number(wr.amount), id]
      );

      await insertNotification(cli, wr.user_id,
        '✅ Virement complété !',
        `Votre virement de ${Number(wr.amount).toFixed(2)}€ vers ${wr.external_account_holder} a été validé et complété à 100%.`
      );

      await cli.query('COMMIT');
      return res.json({ success: true, message: 'Virement complété à 100%', decision: 'complete' });

    } else {
      // continue — créer une nouvelle étape et envoyer un code
      if (!nextStepPercentage || nextStepPercentage <= 0 || nextStepPercentage > 100) {
        await cli.query('ROLLBACK');
        return res.status(400).json({ error: 'Pourcentage de la prochaine étape requis (1-100)' });
      }

      const lastStepResult = await cli.query(
        `SELECT MAX(step_order) as max_order FROM withdrawal_steps WHERE withdrawal_request_id = $1`,
        [id]
      );
      const nextStepOrder = (lastStepResult.rows[0].max_order || 0) + 1;
      const stepAmount = (Number(wr.amount) * nextStepPercentage) / 100;

      await cli.query(
        `INSERT INTO withdrawal_steps (withdrawal_request_id, step_order, percentage, condition, amount) VALUES ($1, $2, $3, $4, $5)`,
        [id, nextStepOrder, nextStepPercentage, nextStepCondition || null, stepAmount]
      );

      const finalClientType = (clientType || 'standard').toUpperCase();
      const validPrefixes = ['STANDARD', 'PREMIUM', 'VIP', 'BUSINESS'];
      const codePrefix = validPrefixes.includes(finalClientType) ? finalClientType : 'CLIENT';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code;
      let codeExists;
      do {
        let suffix = '';
        for (let i = 0; i < 4; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        code = codePrefix + suffix;
        codeExists = await cli.query(`SELECT id FROM withdrawal_codes WHERE code = $1`, [code]);
      } while (codeExists.rowCount > 0);

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

      await cli.query(
        `INSERT INTO withdrawal_codes (code, withdrawal_request_id, expires_at) VALUES ($1, $2, $3)`,
        [code, id, expiresAt]
      );

      await cli.query(
        `UPDATE withdrawal_requests SET status = 'code_generated', next_condition = $1 WHERE id = $2`,
        [nextStepCondition || `Étape ${nextStepOrder}`, id]
      );

      await insertNotification(cli, wr.user_id,
        `🔑 Nouveau code de virement — Étape ${nextStepOrder}`,
        `Bonjour ${wr.name},\n\nL'administrateur continue votre virement avec une nouvelle étape.\n\n📱 CODE : ${code}\n\n💰 Montant cette étape : ${nextStepPercentage}% (${stepAmount.toFixed(2)}€)\n\n⏰ Valide jusqu'au : ${expiresAt.toLocaleString('fr-FR')}\n\nSaisissez ce code dans votre espace client.\n\nCordialement,\nL'équipe NeoBank`
      );

      await cli.query('COMMIT');
      return res.json({
        success: true,
        message: `Nouvelle étape ${nextStepOrder} créée — code envoyé au client`,
        decision: 'continue',
        code,
        stepOrder: nextStepOrder,
        stepPercentage: nextStepPercentage,
        expiresAt
      });
    }
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur adminDecideWithdrawal:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}
