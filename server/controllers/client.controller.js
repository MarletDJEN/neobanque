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
    
    // Validation stricte du montant
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    if (amt !== 500) {
      return res.status(400).json({ error: 'Le montant doit être exactement de 500€' });
    }
    
    if (!proofUrl?.trim()) {
      return res.status(400).json({ error: 'Preuve de virement requise' });
    }
    
    // Validation améliorée de l'URL de preuve
    let processedProofUrl = proofUrl.trim();
    
    // Vérifier si c'est une URL base64 valide
    if (processedProofUrl.startsWith('data:image/')) {
      // Valider le format base64
      const base64Match = processedProofUrl.match(/^data:image\/(png|jpg|jpeg);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: 'Format d\'image invalide. Formats acceptés: PNG, JPG, JPEG' });
      }
      
      // Vérifier la taille approximative de l'image base64
      const base64Data = base64Match[1];
      const imageSizeKB = Math.round(base64Data.length * 0.75 / 1024); // Approximation
      
      if (imageSizeKB > 5 * 1024) { // 5MB max
        return res.status(400).json({ error: 'Image trop volumineuse. Taille maximale: 5MB' });
      }
      
      console.log('Preuve de virement reçue en base64, taille estimée:', imageSizeKB, 'KB');
      processedProofUrl = processedProofUrl; // Garder l'URL base64
    } else if (processedProofUrl.startsWith('http://') || processedProofUrl.startsWith('https://')) {
      // URL externe (rare mais possible)
      console.log('Preuve de virement reçue comme URL externe:', processedProofUrl);
    } else {
      return res.status(400).json({ error: 'Format de preuve invalide. Accepté: image base64 ou URL HTTP/HTTPS' });
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

// Générer un code aléatoire de 8 caractères
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateWithdrawalCode(req, res) {
  // Les clients ne peuvent plus générer de codes directement
  // Seul l'administrateur peut générer des codes de retrait
  return res.status(403).json({ 
    error: 'Génération de code non autorisée',
    message: 'Veuillez contacter l\'administrateur pour obtenir un code de retrait. L\'administrateur vous fournira un code avec les conditions de retrait.'
  });
}

export async function validateWithdrawalCode(req, res) {
  const { code } = req.body;
  
  if (!code?.trim()) {
    return res.status(400).json({ error: 'Code requis' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la demande et les étapes
    const requestData = await cli.query(
      `SELECT wr.*, wc.id as code_id FROM withdrawal_requests wr 
       JOIN withdrawal_codes wc ON wr.id = wc.withdrawal_request_id 
       WHERE wc.code = $1 AND wc.used = false AND wc.expires_at > NOW() AND wr.user_id = $2 AND wr.status = 'code_generated'
       FOR UPDATE wc`,
      [code.trim().toUpperCase(), req.userId]
    );
    
    if (requestData.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Code invalide, expiré ou déjà utilisé' });
    }
    
    const wr = requestData.rows[0];
    
    // Récupérer la première étape non complétée
    const stepData = await cli.query(
      `SELECT * FROM withdrawal_steps WHERE withdrawal_request_id = $1 AND is_completed = false ORDER BY step_order ASC LIMIT 1`,
      [wr.id]
    );
    
    if (stepData.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Aucune étape disponible' });
    }
    
    const step = stepData.rows[0];
    const stepAmount = Number(step.amount);
    
    // Vérifier le solde
    const user = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    const balance = Number(user.rows[0].balance);
    
    if (balance < stepAmount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant pour cette étape' });
    }
    
    // Marquer le code comme utilisé
    await cli.query(`UPDATE withdrawal_codes SET used = true WHERE id = $1`, [wr.code_id]);
    
    // Débiter le compte
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [stepAmount, req.userId]);
    
    // Marquer l'étape comme complétée
    await cli.query(
      `UPDATE withdrawal_steps SET is_completed = true, completed_at = NOW() WHERE id = $1`,
      [step.id]
    );
    
    // Mettre à jour la demande
    const newTotalWithdrawn = Number(wr.total_withdrawn || 0) + stepAmount;
    const newCurrentPercentage = (newTotalWithdrawn / Number(wr.amount)) * 100;
    
    // Vérifier s'il y a d'autres étapes
    const remainingSteps = await cli.query(
      `SELECT COUNT(*) as count FROM withdrawal_steps WHERE withdrawal_request_id = $1 AND is_completed = false`,
      [wr.id]
    );
    
    const hasMoreSteps = remainingSteps.rows[0].count > 0;
    const isComplete = newCurrentPercentage >= (wr.target_percentage || 100);
    
    let nextCondition = null;
    if (hasMoreSteps && !isComplete) {
      // Récupérer la condition de l'étape suivante
      const nextStepData = await cli.query(
        `SELECT condition FROM withdrawal_steps WHERE withdrawal_request_id = $1 AND is_completed = false ORDER BY step_order ASC LIMIT 1`,
        [wr.id]
      );
      nextCondition = nextStepData.rows[0]?.condition;
    }
    
    await cli.query(
      `UPDATE withdrawal_requests SET current_percentage = $1, total_withdrawn = $2, next_condition = $3, status = $4, processed_at = $5 WHERE id = $6`,
      [
        newCurrentPercentage,
        newTotalWithdrawn,
        nextCondition,
        isComplete ? 'completed' : (hasMoreSteps ? 'step_completed' : 'completed'),
        isComplete ? new Date() : null,
        wr.id
      ]
    );
    
    // Créer la transaction
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, external_iban, external_bic, external_account_holder) VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6)`,
      [req.userId, stepAmount, `Étape ${step.step_order} (${step.percentage}%) vers ${wr.external_account_holder}`, wr.external_iban, wr.external_bic, wr.external_account_holder]
    );
    
    // Notifier l'utilisateur
    let message = `Étape ${step.step_order} complétée: ${fmt(stepAmount)} (${step.percentage}%) débité.`;
    if (isComplete) {
      message += ` Retrait complété à 100% !`;
    } else if (hasMoreSteps) {
      message += ` Prochaine étape disponible.`;
    }
    
    await insertNotification(cli, req.userId, 'Étape de retrait complétée', message);
    
    await cli.query('COMMIT');
    
    res.json({ 
      success: true, 
      stepAmount, 
      stepPercentage: step.percentage,
      currentPercentage: newCurrentPercentage,
      nextCondition,
      isComplete,
      hasMoreSteps,
      message: `Étape ${step.step_order} (${step.percentage}%) effectuée avec succès`
    });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function completeWithdrawal(req, res) {
  const { requestId, finalCondition } = req.body;
  
  if (!requestId || !finalCondition?.trim()) {
    return res.status(400).json({ error: 'ID de demande et condition finale requis' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier la demande
    const request = await cli.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'step_completed' AND user_id = $2 FOR UPDATE`,
      [requestId, req.userId]
    );
    
    if (request.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou non éligible' });
    }
    
    const wr = request.rows[0];
    const remainingAmount = Number(wr.amount) - Number(wr.total_withdrawn);
    
    // Vérifier le solde
    const user = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    const balance = Number(user.rows[0].balance);
    
    if (balance < remainingAmount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant pour compléter le retrait' });
    }
    
    // Débiter le reste
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [remainingAmount, req.userId]);
    
    // Mettre à jour la demande
    await cli.query(
      `UPDATE withdrawal_requests SET status = 'completed', final_condition = $1, processed_at = NOW() WHERE id = $2`,
      [finalCondition.trim(), requestId]
    );
    
    // Créer la transaction finale
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, external_iban, external_bic, external_account_holder) VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6)`,
      [req.userId, remainingAmount, `Retrait final vers ${wr.external_account_holder}`, wr.external_iban, wr.external_bic, wr.external_account_holder]
    );
    
    // Notifier l'utilisateur
    await insertNotification(
      cli,
      req.userId,
      'Retrait complété',
      `Votre retrait de ${fmt(remainingAmount)} a été complété avec succès.`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Retrait complété avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function createWithdrawalRequest(req, res) {
  const { accountHolder, iban, bic, amount: amt, label } = req.body;
  const amount = Number(amt);
  console.log('DEBUG: createWithdrawalRequest appelé:', { accountHolder, iban, bic, amount, label, userId: req.userId });
  
  if (!accountHolder?.trim() || !iban?.trim() || !bic?.trim() || !Number.isFinite(amount) || amount <= 0) {
    console.log('DEBUG: Validation échouée');
    return res.status(400).json({ error: 'Informations du bénéficiaire et montant requis' });
  }
  
  // Pas de validation stricte - le client peut saisir les caractères qu'il veut pour l'IBAN et BIC
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const me = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (me.rowCount === 0) throw new Error('not_found');
    if (!assertCanOperate(me.rows[0])) {
      await cli.query('ROLLBACK');
      return res.status(403).json({ error: 'Demande de retrait non autorisée' });
    }
    const bal = Number(me.rows[0].balance);
    if (bal < amount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // Vérifier si une demande existe déjà
    const existing = await cli.query(
      `SELECT id FROM withdrawal_requests WHERE user_id = $1 AND status = 'pending'`,
      [req.userId]
    );
    if (existing.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une demande de retrait est déjà en cours' });
    }
    
    // Créer la demande de retrait
    const result = await cli.query(
      `INSERT INTO withdrawal_requests (user_id, amount, external_account_holder, external_iban, external_bic, label) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.userId, amount, accountHolder.trim(), iban.trim(), bic.trim(), label || null]
    );
    
    console.log('DEBUG: Demande de retrait créée avec ID:', result.rows[0].id);
    
    await insertNotification(
      cli,
      req.userId,
      'Demande de retrait soumise',
      `Votre demande de retrait de ${amount} ° a été soumise et est en attente de validation.`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Demande de retrait soumise avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('DEBUG: Erreur dans createWithdrawalRequest:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function transfer(req, res) {
  const { accountHolder, iban, bic, amount: amt, label } = req.body;
  const amount = Number(amt);
  if (!accountHolder?.trim() || !iban?.trim() || !bic?.trim() || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Informations du bénéficiaire et montant requis' });
  }
  
  // Pas de validation stricte - le client peut saisir les caractères qu'il veut pour l'IBAN et BIC
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const me = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    if (me.rowCount === 0) throw new Error('not_found');
    if (!assertCanOperate(me.rows[0])) {
      await cli.query('ROLLBACK');
      return res.status(403).json({ error: 'Virement non autorisé' });
    }
    const bal = Number(me.rows[0].balance);
    if (bal < amount) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [amount, req.userId]);
    
    const lbl = label || `Virement externe vers ${accountHolder.trim()}`;
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, external_iban, external_bic, external_account_holder) VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6)`,
      [req.userId, amount, lbl, iban.trim(), bic.trim(), accountHolder.trim()]
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
    
    // Utiliser la table iban_requests comme prévu
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
    
    // Vérifier si une demande existe déjà
    const existingRequest = await cli.query(`SELECT id FROM card_requests WHERE user_id = $1 AND status = 'pending'`, [req.userId]);
    if (existingRequest.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une demande est déjà en cours' });
    }
    
    // Vérifier si une carte existe déjà
    const ex = await cli.query(`SELECT id FROM cards WHERE user_id = $1`, [req.userId]);
    if (ex.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une carte existe déjà' });
    }
    
    // Créer seulement la demande, pas la carte (l'admin attribuera les numéros)
    await cli.query(
      `INSERT INTO card_requests (user_id, status) VALUES ($1, 'pending')`,
      [req.userId]
    );
    await cli.query(`UPDATE users SET card_status = 'requested' WHERE id = $1`, [req.userId]);
    
    // Notifier l'admin
    await insertNotification(cli, u.rows[0].id, 'Demande de carte', 'Votre demande de carte a été soumise et est en attente de validation par l\'administrateur.');
    
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
  
  // Valider les URLs base64
  if (!selfieUrl.startsWith('data:image/') || !documentUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Format de document invalide' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Vérifier si l'utilisateur a déjà une soumission KYC en cours
    const existing = await cli.query(
      `SELECT id FROM kyc_submissions WHERE user_id = $1 AND status IN ('pending', 'submitted')`,
      [req.userId]
    );
    if (existing.rowCount > 0) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Une demande KYC est déjà en cours de traitement' });
    }
    
    // Mettre à jour le statut KYC de l'utilisateur
    await cli.query(
      `UPDATE users SET kyc_status = 'submitted' WHERE id = $1`,
      [req.userId]
    );
    
    // Insérer la nouvelle soumission KYC
    await cli.query(
      `INSERT INTO kyc_submissions (user_id, selfie_url, document_url, status) VALUES ($1, $2, $3, 'pending')`,
      [req.userId, String(selfieUrl).slice(0, 2048), String(documentUrl).slice(0, 2048)]
    );
    
    await cli.query('COMMIT');
    
    // Récupérer le profil utilisateur mis à jour
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    res.json({ user: toUserProfile(u.rows[0]) });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error('Erreur lors de la soumission KYC:', e);
    res.status(500).json({ error: 'Erreur serveur lors de la soumission KYC' });
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
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getWithdrawalRequests(req, res) {
  try {
    console.log('DEBUG: getWithdrawalRequests appelé par admin:', req.userId);
    const r = await pool.query(
      `SELECT wr.*, u.name, u.email, 
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'step_order', ws.step_order,
                      'percentage', ws.percentage,
                      'condition', ws.condition,
                      'amount', ws.amount,
                      'is_completed', ws.is_completed,
                      'completed_at', ws.completed_at
                    )
                  )
                  FROM withdrawal_steps ws 
                  WHERE ws.withdrawal_request_id = wr.id 
                  ORDER BY ws.step_order
                ),
                '[]'
              ) as steps
       FROM withdrawal_requests wr 
       JOIN users u ON wr.user_id = u.id 
       ORDER BY wr.created_at DESC`
    );
    console.log('DEBUG: Nombre de demandes trouvées:', r.rowCount);
    console.log('DEBUG: Demandes:', r.rows);
    res.json({ requests: r.rows });
  } catch (e) {
    console.error('Erreur dans getWithdrawalRequests:', e);
    res.status(500).json({ error: 'Erreur lors du chargement des demandes de retrait' });
  }
}

export async function getMyWithdrawalRequests(req, res) {
  try {
    const r = await pool.query(
      `SELECT wr.id, wr.amount, wr.label, wr.status, wr.created_at, wr.current_percentage, 
              wr.total_withdrawn, wr.next_condition, wr.withdrawal_code, wr.code_expires_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'step_order', ws.step_order,
                    'percentage', ws.percentage,
                    'amount', ws.amount,
                    'is_completed', ws.is_completed,
                    'completed_at', ws.completed_at
                  )
                ) ORDER BY ws.step_order
              ) FILTER (WHERE ws.id IS NOT NULL),
                '[]'
              ) as steps
       FROM withdrawal_requests wr 
       LEFT JOIN withdrawal_steps ws ON wr.id = ws.withdrawal_request_id
       WHERE wr.user_id = $1
       GROUP BY wr.id, wr.withdrawal_code, wr.code_expires_at
       ORDER BY wr.created_at DESC`,
      [req.userId]
    );
    
    // Filtrer les données pour ne montrer que ce que le client doit voir
    const filteredRequests = r.rows.map(request => {
      const filtered = {
        id: request.id,
        amount: request.amount,
        label: request.label,
        status: request.status,
        created_at: request.created_at,
        current_percentage: request.current_percentage,
        total_withdrawn: request.total_withdrawn,
        next_condition: request.next_condition,
        steps: request.steps
      };
      
      // Ne montrer le code que s'il est généré et non expiré
      if (request.status === 'code_generated' && request.withdrawal_code && 
          new Date(request.code_expires_at) > new Date()) {
        filtered.withdrawal_code = request.withdrawal_code;
        filtered.code_expires_at = request.code_expires_at;
      }
      
      return filtered;
    });
    
    res.json({ requests: filteredRequests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function approveWithdrawalRequest(req, res) {
  const { id } = req.params;
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la demande
    const request = await cli.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (request.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
    }
    
    const wr = request.rows[0];
    
    // Vérifier le solde de l'utilisateur
    const user = await cli.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [wr.user_id]);
    if (user.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    const balance = Number(user.rows[0].balance);
    if (balance < Number(wr.amount)) {
      await cli.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // Débiter le compte
    await cli.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [wr.amount, wr.user_id]);
    
    // Mettre à jour la demande
    await cli.query(
      `UPDATE withdrawal_requests SET status = 'approved', admin_id = $1, processed_at = NOW() WHERE id = $2`,
      [req.userId, id]
    );
    
    // Créer la transaction
    await cli.query(
      `INSERT INTO transactions (user_id, type, amount, label, external_iban, external_bic, external_account_holder) VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6)`,
      [wr.user_id, wr.amount, wr.label || `Retrait vers ${wr.external_account_holder}`, wr.external_iban, wr.external_bic, wr.external_account_holder]
    );
    
    // Notifier l'utilisateur
    await insertNotification(
      cli,
      wr.user_id,
      'Retrait approuvé',
      `Votre retrait de ${wr.amount} € a été approuvé et traité.`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Retrait approuvé avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

export async function rejectWithdrawalRequest(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  
  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Motif de rejet requis' });
  }
  
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    
    // Récupérer la demande
    const request = await cli.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (request.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
    }
    
    const wr = request.rows[0];
    
    // Mettre à jour la demande
    await cli.query(
      `UPDATE withdrawal_requests SET status = 'rejected', admin_id = $1, processed_at = NOW(), reject_reason = $2 WHERE id = $3`,
      [req.userId, reason.trim(), id]
    );
    
    // Notifier l'utilisateur
    await insertNotification(
      cli,
      wr.user_id,
      'Retrait rejeté',
      `Votre demande de retrait de ${wr.amount} € a été rejetée. Motif: ${reason.trim()}`
    );
    
    await cli.query('COMMIT');
    res.json({ success: true, message: 'Retrait rejeté avec succès' });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}
