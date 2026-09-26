import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_NEON_DATABASE_URL;
if (!dbUrl) throw new Error('Chybí proměnná DATABASE_URL v souboru .env');
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
