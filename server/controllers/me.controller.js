import { pool } from '../config/database.js';
import { toUserProfile, toAccount, toTransactionRow } from '../utils/serialize.js';

async function getCardForUser(userId) {
  const c = await pool.query('SELECT * FROM cards WHERE user_id = $1', [userId]);
  return c.rows[0] || null;
}

export async function getMe(req, res) {
  try {
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const row = r.rows[0];
    const cardRow = await getCardForUser(row.id);
    const card = cardRow
      ? {
          id: cardRow.id,
          userId: cardRow.user_id,
          status: cardRow.status,
          fullNumber: cardRow.full_number,
          maskedNumber: `•••• •••• •••• ${cardRow.last_four}`,
          last4: cardRow.last_four,
          expiryMonth: cardRow.expiry_month,
          expiryYear: cardRow.expiry_year,
          holderName: cardRow.holder_name,
          cvvEncrypted: cardRow.cvv_encrypted,
          createdAt: cardRow.created_at,
        }
      : null;

    const tx = await pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [row.id]
    );

    const notif = await pool.query(
      `SELECT id, title, message, read, created_at AS "createdAt" FROM notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 40`,
      [row.id]
    );

    res.json({
      user: toUserProfile(row),
      account: toAccount(row),
      card,
      transactions: tx.rows.map(toTransactionRow),
      notifications: notif.rows.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt?.toISOString?.() || n.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
