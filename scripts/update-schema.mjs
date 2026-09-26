import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fuYT61GtsckZ@ep-round-block-b169al35-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(dbUrl);

async function main() {
  try {
    console.log('Altering users table...');
    await sql.query('ALTER TABLE users ALTER COLUMN group_id DROP NOT NULL;');
    await sql.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_user_in_group;');
    await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_or_phone ON users(email_or_phone);');
    console.log('Successfully updated users table in Neon!');
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

main();
