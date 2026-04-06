import { pool } from '../config/database.js';
import { toAccount, toTransactionRow, toUserProfile } from '../utils/serialize.js';
import { insertNotification } from '../utils/notify.js';

function assertCanOperate(row) {
  return (
    row.account_verified &&
    row.status !== 'suspended' &&
    row.status !== 'blocked' &&
    row.status !== 'pending'
  );
}

export async function withdraw(req, res) {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const u = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (u.rowCount === 0) throw new Error('not_found');
    if (!assertCanOperate(u.rows[0])) {
      await cli.query('ROLLBACK');
      return res.status(403).json({ error: 'Retrait non autorisé' });
    }
    const bal = Number(u.rows[0].balance);
    if (bal < amount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [amount, req.userId]);
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label) VALUES ($1, 'withdrawal', $2, $3)`,
      [req.userId, amount, req.body.label || 'Retrait']
    );
    await cli.query('COMMIT');
    const after = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    res.json({ account: toAccount(after.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function requestAccountActivation(req, res) {
  const { step, amount, proofUrl } = req.body;
  
  if (step === 'iban_request') {
    // Première étape : demande d'IBAN/BIC
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      
      // Vérifier si une demande existe déjà pour cette étape
      const existing = await cli.query(
        `SELECT id FROM account_activation_requests WHERE user_id = $1 AND step = 'iban_request' AND status = 'pending'`,
        [req.userId]
      );
      if (existing.rowCount > 0) {
        await cli.query('ROLLBACK');
        return res.status(400).json({ error: 'Une demande d\'IBAN est déjà en cours' });
      }
      
      await cli.query(
        `INSERT INTO account_activation_requests (user_id, amount, step) VALUES ($1, 500, 'iban_request')`,
        [req.userId]
      );
      
      await insertNotification(
        cli,
        req.userId,
        'Demande d\'IBAN reçue',
        'Votre demande d\'IBAN a été soumise et est en cours de validation.'
      );
      
      await cli.query('COMMIT');
      res.json({ success: true, message: 'Demande d\'IBAN soumise avec succès' });
    } catch (e) {
      await cli.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      cli.release();
    }
  } else if (step === 'transfer_proof') {
    // Deuxième étape : preuve de virement de 500€
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    if (amt !== 500) {
      return res.status(400).json({ error: 'Le montant doit être exactement de 500€' });
    }
    if (!proofUrl?.trim()) {
      return res.status(400).json({ error: 'Preuve de virement requise' });
    }
    
    // Valider et traiter l'URL base64
    let processedProofUrl = proofUrl.trim();
    if (processedProofUrl.startsWith('data:image/')) {
      // C'est une URL base64, on la garde telle quelle
      // En production, vous pourriez vouloir la sauvegarder dans un fichier
      console.log('Preuve de virement reçue en base64, taille:', processedProofUrl.length);
    } else {
      return res.status(400).json({ error: 'Format de preuve invalide' });
    }
    
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      const u = await cli.query(`SELECT * FROM users WHERE id = $1`, [req.userId]);
      if (u.rowCount === 0) {
        await cli.query('ROLLBACK');
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      
      // Vérifier si une demande existe déjà pour cette étape
      const existing = await cli.query(
        `SELECT id FROM account_activation_requests WHERE user_id = $1 AND step = 'transfer_proof' AND status = 'pending'`,
        [req.userId]
      );
      if (existing.rowCount > 0) {
        await cli.query('ROLLBACK');
        return res.status(400).json({ error: 'Une demande de virement est déjà en cours' });
      }
      
      await cli.query(
        `INSERT INTO account_activation_requests (user_id, amount, proof_url, step) VALUES ($1, $2, $3, 'transfer_proof')`,
        [req.userId, amt, processedProofUrl]
      );
      
      await insertNotification(
        cli,
        req.userId,
        'Preuve de virement reçue',
        'Votre preuve de virement de 500€ a été soumise et est en cours de validation.'
      );
      
      await cli.query('COMMIT');
      res.json({ success: true, message: 'Preuve de virement soumise avec succès' });
    } catch (e) {
      await cli.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      cli.release();
    }
  } else {
    return res.status(400).json({ error: 'Étape invalide' });
  }
}

export async function transfer(req, res) {
  const { toEmail, amount: amt, label } = req.body;
  const amount = Number(amt);
  if (!toEmail?.trim() || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Destinataire et montant requis' });
  }
  const mail = toEmail.trim().toLowerCase();
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const me = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (me.rowCount === 0) throw new Error('not_found');
    if (!assertCanOperate(me.rows[0])) {
      await cli.query('ROLLBACK');
      return res.status(403).json({ error: 'Virement non autorisé' });
    }
    if (me.rows[0].email === mail) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Impossible de virer vers vous-même' });
    }
    const rec = await cli.query(`SELECT * FROM users WHERE email = $1 FOR UPDATE`, [mail]);
    if (rec.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Aucun compte avec cet email' });
    }
    const recipient = rec.rows[0];
    if (!assertCanOperate(recipient)) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Compte destinataire inactif' });
    }
    const bal = Number(me.rows[0].balance);
    if (bal < amount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [amount, req.userId]);
    await cli.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [amount, recipient.id]);
    const lblOut = label || `Virement vers ${mail}`;
    const lblIn = label || `Virement de ${me.rows[0].email}`;
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, counterparty_user_id) VALUES ($1, 'withdrawal', $2, $3, $4)`,
      [req.userId, amount, lblOut, recipient.id]
    );
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, counterparty_user_id) VALUES ($1, 'deposit', $2, $3, $4)`,
      [recipient.id, amount, lblIn, req.userId]
    );
    await insertNotification(cli, recipient.id, 'Virement reçu', `Vous avez reçu ${amount} € de ${me.rows[0].email}.`);
    await cli.query('COMMIT');
    const after = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    res.json({ account: toAccount(after.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function getTransactions(req, res) {
  try {
    const r = await pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.userId]
    );
    res.json({ transactions: r.rows.map(toTransactionRow) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function requestIban(req, res) {
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const u = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (u.rowCount === 0) throw new Error('not_found');
    const row = u.rows[0];
    if (row.iban_status !== 'none' && row.iban_status !== 'requested') {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Demande déjà traitée ou IBAN déjà attribué' });
    }
    await cli.query(`UPDATE users SET iban_status = 'requested' WHERE id = $1`, [req.userId]);
    const exReq = await cli.query(
      `SELECT id FROM iban_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
      [req.userId]
    );
    if (exReq.rowCount === 0) {
      await cli.query(`INSERT INTO iban_requests (user_id, status) VALUES ($1, 'pending')`, [req.userId]);
    }
    await cli.query('COMMIT');
    const after = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    res.json({ account: toAccount(after.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function requestCard(req, res) {
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const u = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (u.rowCount === 0) throw new Error('not_found');
    const ex = await cli.query(`SELECT id FROM cards WHERE user_id = $1`, [req.userId]);
    if (ex.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une demande ou carte existe déjà' });
    }
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const cvv = String(Math.floor(100 + Math.random() * 900));
    const holder = (u.rows[0].name || 'CLIENT').toUpperCase();
    await cli.query(
      `INSERT INTO cards (user_id, last_four, holder_name, expiry_month, expiry_year, cvv_encrypted, status)
       VALUES ($1, $2, $3, '12', '2028', $4, 'pending')`,
      [req.userId, last4, holder, cvv]
    );
    await cli.query(
      `INSERT INTO card_requests (user_id, status) VALUES ($1, 'pending')`,
      [req.userId]
    );
    await cli.query(`UPDATE users SET card_status = 'requested' WHERE id = $1`, [req.userId]);
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

export async function blockOwnCard(req, res) {
  try {
    await pool.query(
      `UPDATE cards SET status = 'blocked' WHERE user_id = $1`,
      [req.userId]
    );
    await pool.query(`UPDATE users SET card_status = 'blocked' WHERE id = $1`, [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateProfile(req, res) {
  const { firstName, lastName, phone, address } = req.body;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  try {
    const r = await pool.query(
      `UPDATE users SET
        name = COALESCE(NULLIF($1, ''), name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address)
       WHERE id = $4
       RETURNING *`,
      [name || null, phone ?? null, address ?? null, req.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Introuvable' });
    res.json({ user: toUserProfile(r.rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function submitKyc(req, res) {
  const { selfieUrl, documentUrl } = req.body;
  if (!selfieUrl || !documentUrl) {
    return res.status(400).json({ error: 'Documents requis' });
  }
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    await cli.query(
      `UPDATE users SET kyc_status = 'submitted' WHERE id = $1`,
      [req.userId]
    );
    await cli.query(
      `INSERT INTO kyc_submissions (user_id, selfie_url, document_url, status) VALUES ($1, $2, $3, 'pending')`,
      [req.userId, String(selfieUrl).slice(0, 2048), String(documentUrl).slice(0, 2048)]
    );
    await cli.query('COMMIT');
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    res.json({ user: toUserProfile(u.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteNotification(req, res) {
  try {
    await pool.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
