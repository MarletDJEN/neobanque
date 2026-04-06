import { pool } from '../config/database.js';
import { toAccount, toTransactionRow, toUserProfile } from '../utils/serialize.js';
import { insertNotification } from '../utils/notify.js';

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
      row.iban_status === 'assigned'
        ? 'approved'
        : row.iban_status === 'requested'
          ? 'pending'
          : 'none',
    status: row.status,
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
      requests: requests.rows,
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
  
  // Validation basique du format IBAN français
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  if (!/^FR\d{25}$/.test(cleanIban)) {
    return res.status(400).json({ error: 'Format IBAN invalide. Format attendu: FRXX XXXX XXXX XXXX XXXX XXXX XXX' });
  }
  
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
