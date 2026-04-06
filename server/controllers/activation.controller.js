import { pool } from '../config/database.js';
import { insertNotification } from '../utils/notify.js';

// ─── Modal Messages ───────────────────────────────────────────

/**
 * GET /api/modal-message  (client authentifié)
 * Retourne le message modal à afficher :
 *   1. Message spécifique à cet utilisateur (target_audience = 'specific')
 *   2. Sinon message ciblant son statut ou 'all'
 */
export async function getModalMessage(req, res) {
  try {
    const userId = req.userId;
    const userStatus = req.userStatus || 'pending';

    // Message par statut ou pour tous
    const general = await pool.query(
      `SELECT * FROM modal_messages
       WHERE is_active = true AND target_audience IN ('all', $1)
       ORDER BY updated_at DESC LIMIT 1`,
      [userStatus]
    );

    if (general.rowCount > 0) {
      const m = general.rows[0];
      return res.json({ showModal: true, title: m.title, content: m.message });
    }

    res.json({ showModal: false });
  } catch (e) {
    console.error('Erreur getModalMessage:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * POST /api/admin/modal-message  (admin)
 * Crée ou met à jour un message modal.
 * Body: { title, message, isActive, targetAudience, targetUserId? }
 */
export async function updateModalMessage(req, res) {
  const { title, message, isActive, targetAudience, targetUserId } = req.body;

  // Validation
  if (!title?.trim() && !message?.trim()) {
    return res.status(400).json({ error: 'Titre ou message requis' });
  }
  if (targetAudience === 'specific' && !targetUserId) {
    return res.status(400).json({ error: 'ID utilisateur requis pour le ciblage spécifique' });
  }

  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');

    if (targetAudience === 'specific' && targetUserId) {
      // Désactiver uniquement les anciens messages spécifiques à ce client
      await cli.query(
        `UPDATE modal_messages SET is_active = false
         WHERE target_audience = 'specific' AND target_user_id = $1`,
        [targetUserId]
      );
    } else {
      // Désactiver tous les messages généraux du même type d'audience
      await cli.query(
        `UPDATE modal_messages SET is_active = false
         WHERE target_audience = $1 AND target_audience != 'specific'`,
        [targetAudience || 'all']
      );
    }

    if (isActive && (title?.trim() || message?.trim())) {
      await cli.query(
        `INSERT INTO modal_messages (title, message, is_active, target_audience, target_user_id, updated_at)
         VALUES ($1, $2, true, $3, $4, now())`,
        [
          title?.trim() || '',
          message?.trim() || '',
          targetAudience || 'all',
          targetAudience === 'specific' ? targetUserId : null,
        ]
      );
    }

    await cli.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await cli.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    cli.release();
  }
}

/**
 * GET /api/admin/modal-message  (admin)
 * Retourne tous les messages actifs (généraux + spécifiques).
 */
export async function getCurrentModalMessage(req, res) {
  try {
    const r = await pool.query(
      `SELECT mm.*, u.name AS user_name, u.email AS user_email
       FROM modal_messages mm
       LEFT JOIN users u ON u.id = mm.target_user_id
       WHERE mm.is_active = true
       ORDER BY mm.updated_at DESC`
    );
    res.json({ messages: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * DELETE /api/admin/modal-message/:id  (admin)
 * Désactive un message spécifique.
 */
export async function deactivateModalMessage(req, res) {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE modal_messages SET is_active = false WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Activation Requests ──────────────────────────────────────

export async function listActivationRequests(req, res) {
  try {
    const r = await pool.query(
      `SELECT ar.*, u.email, u.name
       FROM account_activation_requests ar
       JOIN users u ON u.id = ar.user_id
       ORDER BY ar.created_at DESC`
    );
    res.json({ requests: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function approveActivationRequest(req, res) {
  const { id } = req.params;
  const { iban, bic } = req.body; // Recevoir l'IBAN et BIC de l'admin
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const reqData = await cli.query(`SELECT * FROM account_activation_requests WHERE id = $1`, [id]);
    if (reqData.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    const request = reqData.rows[0];

    if (request.step === 'iban_request') {
      // Validation de l'IBAN fourni par l'admin
      if (!iban || !iban.trim()) {
        await cli.query('ROLLBACK');
        return res.status(400).json({ error: 'IBAN requis' });
      }
      
      // Validation basique du format IBAN français
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();
      if (!/^FR\d{25}$/.test(cleanIban)) {
        await cli.query('ROLLBACK');
        return res.status(400).json({ error: 'Format IBAN invalide. Format attendu: FRXX XXXX XXXX XXXX XXXX XXXX XXX' });
      }
      
      const finalBic = bic || 'BNPAFRPPXXX';
      await cli.query(`UPDATE users SET iban = $1, bic = $2, iban_status = 'assigned' WHERE id = $3`, [cleanIban, finalBic, request.user_id]);
      await cli.query(`UPDATE account_activation_requests SET status = 'approved', reviewed_at = now() WHERE id = $1`, [id]);
      await insertNotification(cli, request.user_id, 'IBAN attribué !',
        `Votre IBAN a été attribué : ${cleanIban.slice(0, 8)}… Vous pouvez maintenant effectuer le virement de 500 €.`);
      await cli.query('COMMIT');
      res.json({ ok: true, iban: cleanIban, bic: finalBic });
    } else if (request.step === 'transfer_proof') {
      await cli.query(`UPDATE users SET status = 'active', account_verified = true WHERE id = $1`, [request.user_id]);
      await cli.query(`UPDATE account_activation_requests SET status = 'approved', reviewed_at = now() WHERE id = $1`, [id]);
      await cli.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [request.amount, request.user_id]);
      await cli.query(
        `INSERT INTO transactions (user_id, type, amount, label) VALUES ($1, 'deposit', $2, $3)`,
        [request.user_id, request.amount, "Virement d'activation de compte"]
      );
      await insertNotification(cli, request.user_id, 'Compte activé !',
        `Votre demande d'activation a été approuvée. Les ${request.amount} € ont été crédités sur votre compte.`);
      await cli.query('COMMIT');
      res.json({ ok: true });
    }
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

export async function rejectActivationRequest(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Motif de rejet requis' });
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const reqData = await cli.query(`SELECT * FROM account_activation_requests WHERE id = $1`, [id]);
    if (reqData.rowCount === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    const request = reqData.rows[0];
    await cli.query(
      `UPDATE account_activation_requests SET status = 'rejected', reject_reason = $2, reviewed_at = now() WHERE id = $1`,
      [id, reason.trim()]
    );
    await insertNotification(cli, request.user_id, "Demande d'activation rejetée", `Motif : ${reason.trim()}`);
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
