import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userRes = await pool.query(`SELECT id, role, status FROM users WHERE id = $1`, [payload.sub]);
    if (userRes.rowCount === 0) return res.status(401).json({ error: 'Utilisateur introuvable' });
    const user = userRes.rows[0];
    req.userId = user.id;
    req.userRole = user.role;
    req.userStatus = user.status;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};
