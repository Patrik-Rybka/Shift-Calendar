import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fuYT61GtsckZ@ep-round-block-b169al35-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(dbUrl);

async function main() {
  try {
    console.log('Adding role column to users table in Neon...');
    await sql.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';");
    console.log('Role column successfully added!');
  } catch (err) {
    console.error('Error adding role column:', err);
    process.exit(1);
  }
}

main();
