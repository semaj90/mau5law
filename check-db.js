import { sql } from './sveltekit-frontend/src/lib/server/db.ts';

async function checkTables() {
  try {
    const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%citation%'`;
    console.log('Citation tables:', result.map(r => r.table_name));

    // Also check columns in citation_tags if it exists
    const columns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'citation_tags' AND table_schema = 'public'`;
    console.log('citation_tags columns:', columns);
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTables();