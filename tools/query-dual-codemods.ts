// tools/query-dual-codemods.ts
import * as pg from 'pg';
import { QdrantClient } from '@qdrant/js-client-rest';
import fetch from 'node-fetch';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5432/legal_ai_db';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const COLLECTION_NAME = 'codemod_memories';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

interface QueryResult {
  id: string;
  error_code: string;
  error_key: string;
  message: string;
  occurrence_count: number;
  priority?: string;
  framework?: string;
  source?: string;
  tags: string[];
  content: string;
  langextract?: any;
  similarity_score: number;
  source_db: 'pgvector' | 'qdrant';
}

async function embedQuery(query: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'embeddinggemma:latest',
      prompt: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function searchPgvector(embedding: number[], limit: number = 5): Promise<QueryResult[]> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const query = `
      SELECT
        id,
        error_code,
        error_key,
        message,
        occurrence_count,
        priority,
        framework,
        source,
        tags,
        content,
        langextract,
        1 - (embedding <=> $1::vector) as similarity_score
      FROM codemod_memories
      ORDER BY embedding <=> $1::vector
      LIMIT $2;
    `;

    const result = await client.query(query, [`[${embedding.join(',')}]`, limit]);

    return result.rows.map(row => ({
      ...row,
      source_db: 'pgvector' as const,
    }));
  } finally {
    await client.end();
  }
}

async function searchQdrant(embedding: number[], limit: number = 5): Promise<QueryResult[]> {
  const client = new QdrantClient({ url: QDRANT_URL });

  const response = await client.search(COLLECTION_NAME, {
    vector: embedding,
    limit,
    with_payload: true,
    with_vector: false,
  });

  return response.map(hit => ({
    id: hit.id as string,
    error_code: hit.payload?.error_code as string,
    error_key: hit.payload?.error_key as string,
    message: hit.payload?.message as string,
    occurrence_count: hit.payload?.occurrence_count as number,
    priority: hit.payload?.priority as string,
    framework: hit.payload?.framework as string,
    source: hit.payload?.source as string,
    tags: hit.payload?.tags as string[] || [],
    content: hit.payload?.content as string,
    langextract: hit.payload?.langextract,
    similarity_score: hit.score || 0,
    source_db: 'qdrant' as const,
  }));
}

async function searchDual(query: string, limit: number = 5): Promise<QueryResult[]> {
  console.log(`🔍 Searching for: "${query}"`);

  const embedding = await embedQuery(query);
  console.log(`📊 Generated ${embedding.length}-dimensional embedding`);

  // Search both databases in parallel
  const [pgResults, qdrantResults] = await Promise.all([
    searchPgvector(embedding, limit),
    searchQdrant(embedding, limit),
  ]);

  // Combine and deduplicate by id, keeping highest similarity score
  const combined = new Map<string, QueryResult>();

  [...pgResults, ...qdrantResults].forEach(result => {
    const existing = combined.get(result.id);
    if (!existing || result.similarity_score > existing.similarity_score) {
      combined.set(result.id, result);
    }
  });

  // Sort by similarity score and return top results
  const sorted = Array.from(combined.values())
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);

  return sorted;
}

async function main() {
  const query = process.argv[2];
  const limit = parseInt(process.argv[3] ?? '5');

  if (!query) {
    console.error('Usage: node tools/query-dual-codemods.ts "your query here" [limit]');
    process.exit(1);
  }

  try {
    const results = await searchDual(query, limit);

    console.log(`\n🎯 Found ${results.length} relevant codemod memories:\n`);

    results.forEach((result, idx) => {
      console.log(`${idx + 1}. [${result.source_db.toUpperCase()}] ${result.error_code}`);
      console.log(`   Error: ${result.message}`);
      console.log(`   Occurrences: ${result.occurrence_count}`);
      console.log(`   Similarity: ${(result.similarity_score * 100).toFixed(1)}%`);
      if (result.tags.length > 0) {
        console.log(`   Tags: ${result.tags.join(', ')}`);
      }
      console.log(`   Content: ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

main();