import pg from 'pg';
import { embedQuery } from './tools/query-dual-codemods.ts';

async function testPgvector() {
  const DATABASE_URL = 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

  try {
    const embedding = await embedQuery('TS1005');
    console.log('Generated embedding length:', embedding.length);

    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();

    const vectorStr = `[${embedding.slice(0, 10).join(',')}]`; // Use first 10 dims for test
    const query = `
      SELECT id, error_code, message, 1 - (embedding <=> '${vectorStr}'::vector) as similarity_score
      FROM codemod_memories
      ORDER BY embedding <=> '${vectorStr}'::vector
      LIMIT 3;
    `;

    const result = await client.query(query);
    console.log('Results:', result.rows.length);
    result.rows.forEach(r => console.log(`${r.error_code}: ${r.similarity_score}`));

    await client.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testPgvector();