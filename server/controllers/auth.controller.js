import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { signToken } from '../utils/token.js';
import { toUserProfile, toAccount } from '../utils/serialize.js';

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: 'Données invalides (mot de passe ≥ 8 caractères)' });
  }
  const mail = email.trim().toLowerCase();
  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      `INSERT INTO users (name, email, password_hash, status, account_verified)
       VALUES ($1, $2, $3, 'pending', false)
       RETURNING *`,
      [name.trim(), mail, hash]
    );
    const row = r.rows[0];
    const token = signToken({ sub: row.id, role: row.role });
    res.status(201).json({
      token,
      user: toUserProfile(row),
      account: toAccount(row),
    });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const mail = email.trim().toLowerCase();
  try {
    const r = await pool.query('SELECT * FROM users WHERE email = $1', [mail]);
    if (r.rowCount === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const row = r.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const token = signToken({ sub: row.id, role: row.role });
    res.json({
      token,
      user: toUserProfile(row),
      account: toAccount(row),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
