import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant');
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log('Schéma PostgreSQL appliqué.');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await pool.end();
}
