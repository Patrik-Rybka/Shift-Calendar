import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fuYT61GtsckZ@ep-round-block-b169al35-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(dbUrl);

async function main() {
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Clean comments
    const cleanSql = schemaSql
      .replace(/--.*$/gm, '') // remove line comments
      .trim();

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      console.log('Running:', stmt.slice(0, 40) + '...');
      await sql.query(stmt);
    }

    console.log('Schema executed successfully!');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('\nTables created in Neon database:');
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }

  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

main();
