// tools/query-dual-codemods.ts
import pg from 'pg';

const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'embeddinggemma:latest';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? 'codemod_memories';

type PgRow = {
  id: string;
  error_code: string;
  message: string;
  occurrence_count: number;
  similarity_score: number;
};

type QdrantMatch = {
  id: string | number;
  score: number;
  payload?: any;
};

export async function embedQuery(text: string): Promise<number[]> {
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

  const data: any = await res.json();

  // Handle Ollama variants: { embedding: [...] } or { embeddings: [[...]] }
  if (Array.isArray(data.embedding)) return data.embedding;
  if (Array.isArray(data.embeddings)) return data.embeddings[0];

  throw new Error('Unexpected embedding response format from Ollama');
}

export async function searchPgvector(
  embedding: number[],
  limit: number,
): Promise<PgRow[]> {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
  });
  await client.connect();

  try {
    const vectorLiteral = '[' + embedding.join(',') + ']';

    const res = await client.query<PgRow>(
      `
      SELECT
        id,
        error_code,
        message,
        occurrence_count,
        1 - (embedding <=> $1::vector) AS similarity_score
      FROM codemod_memories
      ORDER BY embedding <-> $1::vector
      LIMIT $2::int;
    `,
      [vectorLiteral, limit],
    );

    return res.rows;
  } finally {
    await client.end();
  }
}

export async function searchQdrant(
  embedding: number[],
  limit: number,
): Promise<QdrantMatch[]> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;

  const body = {
    vector: embedding,
    limit: safeLimit,
    with_payload: true,
  };

  const res = await fetch(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(
      `Qdrant search error ${res.status} ${res.statusText}: ${JSON.stringify(
        data,
      )}`,
    );
  }

  return (data.result ?? []) as QdrantMatch[];
}

async function searchDual(query: string, limit: number) {
  console.log(`🔍 Searching for: "${query}"`);
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;

  const embedding = await embedQuery(query);
  console.log(`📊 Generated ${embedding.length}-dimensional embedding`);

  const [pgRows, qdrantMatches] = await Promise.all([
    searchPgvector(embedding, safeLimit),
    searchQdrant(embedding, safeLimit),
  ]);

  console.log('\n=== pgvector results ===');
  for (const row of pgRows) {
    console.log(
      `• [${row.error_code}] ${row.message} (score=${row.similarity_score.toFixed(
        4,
      )}, occurrences=${row.occurrence_count})`,
    );
  }

  console.log('\n=== Qdrant results ===');
  for (const m of qdrantMatches) {
    const code =
      m.payload?.code ??
      m.payload?.error_code ??
      m.payload?.errorKey ??
      'unknown';
    const message = m.payload?.message ?? '';
    console.log(
      `• [${code}] ${message} (score=${m.score.toFixed(4)})`,
    );
  }
}

async function main() {
  const [, , ...args] = process.argv;
  if (!args.length) {
    console.error(
      'Usage: npx tsx tools/query-dual-codemods.ts "query" --limit 5',
    );
    process.exit(1);
  }

  const queryParts: string[] = [];
  let limit = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && i + 1 < args.length) {
      const n = Number(args[i + 1]);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.floor(n);
      }
      i++;
    } else {
      queryParts.push(args[i]);
    }
  }

  const query = queryParts.join(' ');

  try {
    await searchDual(query, limit);
  } catch (err) {
    console.error('❌ Query failed:', err);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('query-dual-codemods.ts')) {
  // Only auto-run when invoked directly
  // (so you can still import { embedQuery, searchPgvector } in tsx -e)
  main();
}