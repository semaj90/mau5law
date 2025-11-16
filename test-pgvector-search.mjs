// test-pgvector-search.mjs
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const EMBED_MODEL =
  process.env.EMBED_MODEL ?? 'embeddinggemma:latest';

async function embedQuery(text) {
  console.log(`Generating embedding for "${text}"...`);

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Embed error ${res.status} ${res.statusText}: ${t}`,
    );
  }

  const data = await res.json();

  // Handle { embedding: [...] } OR { embeddings: [[...]] }
  const embedding =
    data.embedding ??
    (Array.isArray(data.embeddings) ? data.embeddings[0] : null);

  if (!Array.isArray(embedding)) {
    throw new Error('Unexpected embedding format from Ollama');
  }

  console.log('Embedding generated, length:', embedding.length);
  return embedding;
}

async function testPgvector() {
  try {
    const embedding = await embedQuery('TS1005');

    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Use ALL 768 dims
    const vectorStr = `[${embedding.join(',')}]`;
    console.log('First 10 dims preview:', embedding.slice(0, 10));

    console.log('Executing pgvector search...');
    const query = `
      SELECT
        id,
        error_code,
        message,
        occurrence_count,
        1 - (embedding <=> $1::vector) AS similarity_score
      FROM codemod_memories
      ORDER BY embedding <-> $1::vector
      LIMIT 3;
    `;

    const result = await client.query(query, [vectorStr]);

    console.log('✅ pgvector search successful!');
    console.log('Results:', result.rows.length);
    result.rows.forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.error_code}: ${
          r.similarity_score?.toFixed(3) ?? 'n/a'
        } (occurrences: ${r.occurrence_count})`,
      );
    });

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

testPgvector();