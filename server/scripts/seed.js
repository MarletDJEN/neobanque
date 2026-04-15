/**
 * Crée un administrateur : node server/scripts/seed.js
 * Dépendances : DATABASE_URL, schéma appliqué, bcryptjs
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const email = process.env.SEED_ADMIN_EMAIL || 'admin@neobank.local';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
const name = 'Administrateur NeoBank';

async function run() {
  const hash = await bcrypt.hash(password, 12);
  const r = await pool.query(
    `INSERT INTO users (name, email, password_hash, status, account_verified, kyc_status, role, balance)
     VALUES ($1, $2, $3, 'active', true, 'approved', 'admin', 0)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       account_verified = true,
       status = 'active',
       kyc_status = 'approved'
     RETURNING id, email`,
    [name, email.toLowerCase(), hash]
  );
  console.log('Admin OK:', r.rows[0]);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
