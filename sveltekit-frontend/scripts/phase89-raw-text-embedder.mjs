#!/usr/bin/env node
/**
 * Phase 89: Raw Text Error Embedder
 *
 * Simple pipeline:
 * 1. Read error files as raw text
 * 2. Chunk by lines (1 error = 1 chunk)
 * 3. Embed each chunk (Ollama embeddinggemma)
 * 4. Store in Postgres with vector + text
 * 5. Index for cosine similarity search
 *
 * No regex, no parsing - just raw text embeddings
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import ollama from 'ollama';
import pg from 'pg';
import { createClient } from 'redis';

const { Pool } = pg;

const CONFIG = {
  postgres: {
    host: '127.0.0.1',
    port: 5434,
    database: 'legal',
    user: 'user',
    password: 'pass'
  },
  redis: {
    url: 'redis://127.0.0.1:6379'
  },
  ollama: {
    host: 'http://localhost:11434',
    embeddingModel: 'embeddinggemma:latest'
  },
  chunking: {
    minLineLength: 10, // Skip empty/short lines
    batchSize: 100 // Embed 100 errors at a time
  }
};

let db;
let redis;

async function main() {
  console.log('🧮 Phase 89: Raw Text Error Embedder\n');

  // Connect
  db = new Pool(CONFIG.postgres);
  console.log('✅ Connected to Postgres (legal_ai_db @ 5434)');

  redis = createClient({ url: CONFIG.redis.url });
  await redis.connect();
  console.log('✅ Connected to Redis (cache @ 6379)\n');

  // Create raw error embeddings table
  await db.query(`
    CREATE TABLE IF NOT EXISTS raw_error_embeddings (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      line_number INTEGER,
      raw_text TEXT NOT NULL,
      embedding vector(768),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_raw_error_source
    ON raw_error_embeddings(source)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_raw_error_embedding_cosine
    ON raw_error_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);

  console.log('✅ raw_error_embeddings table ready\n');

  // ============================================================
  // 1. Ingest TypeScript Errors
  // ============================================================
  console.log('📂 Reading TSC errors from reports/tsc-errors.txt...');
  const tscContent = readFileSync('reports/tsc-errors.txt', 'utf-8');
  const tscLines = tscContent.split(/\r?\n/).filter(line => line.trim().length > CONFIG.chunking.minLineLength);

  console.log(`   Found ${tscLines.length} non-empty lines`);
  await ingestAndEmbed('tsc', tscLines);

  // ============================================================
  // 2. Ingest Svelte-Check Errors
  // ============================================================
  console.log('\n📂 Reading svelte-check errors from reports/svelte-check-errors.txt...');
  const svelteContent = readFileSync('reports/svelte-check-errors.txt', 'utf-8');
  const svelteLines = svelteContent.split(/\r?\n/).filter(line => line.trim().length > CONFIG.chunking.minLineLength);

  console.log(`   Found ${svelteLines.length} non-empty lines`);
  await ingestAndEmbed('svelte-check', svelteLines);

  // ============================================================
  // Statistics
  // ============================================================
  const stats = await db.query(`
    SELECT
      source,
      COUNT(*) as total_chunks,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded_chunks
    FROM raw_error_embeddings
    GROUP BY source
    ORDER BY total_chunks DESC
  `);

  console.log('\n📊 Embedding Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const row of stats.rows) {
    console.log(`  ${row.source.padEnd(15)} ${row.total_chunks.toLocaleString().padStart(8)} chunks | ${row.embedded_chunks.toLocaleString().padStart(8)} embedded`);
  }

  const total = await db.query('SELECT COUNT(*) as total FROM raw_error_embeddings');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  TOTAL          ${total.rows[0].total.toLocaleString().padStart(8)} error chunks`);

  await db.end();
  await redis.quit();
  console.log('\n✅ Embedding complete!');
  console.log('\nNext: node scripts/phase89-similarity-ranker.mjs "TS1005"');
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Ingest lines and generate embeddings in batches
 */
async function ingestAndEmbed(source, lines) {
  const batches = [];
  for (let i = 0; i < lines.length; i += CONFIG.chunking.batchSize) {
    batches.push(lines.slice(i, i + CONFIG.chunking.batchSize));
  }

  console.log(`   Processing ${batches.length} batches (${CONFIG.chunking.batchSize} errors/batch)...`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    // First insert text without embeddings (fast)
    const insertedIds = [];
    for (let lineIdx = 0; lineIdx < batch.length; lineIdx++) {
      const result = await db.query(`
        INSERT INTO raw_error_embeddings (source, line_number, raw_text)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [source, (batchIdx * CONFIG.chunking.batchSize) + lineIdx, batch[lineIdx]]);

      insertedIds.push(result.rows[0].id);
    }

    // Then generate embeddings for the batch
    for (let i = 0; i < batch.length; i++) {
      try {
        const text = batch[i];
        const cacheKey = `emb:${hashContent(text)}`;
        let embeddingVector;

        // Check Redis cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          embeddingVector = JSON.parse(cached);
        } else {
          // Generate new embedding
          const response = await ollama.embeddings({
            model: CONFIG.ollama.embeddingModel,
            prompt: text
          });
          embeddingVector = response.embedding;

          // Cache in Redis (24h TTL)
          await redis.set(cacheKey, JSON.stringify(embeddingVector), { EX: 86400 });
        }

        await db.query(`
          UPDATE raw_error_embeddings
          SET embedding = $1
          WHERE id = $2
        `, [JSON.stringify(embeddingVector), insertedIds[i]]);

      } catch (err) {
        console.warn(`      ⚠️  Failed to embed line ${insertedIds[i]}: ${err.message}`);
      }
    }

    // Progress indicator
    const progress = ((batchIdx + 1) / batches.length * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${progress}% (${batchIdx + 1}/${batches.length} batches)`);
  }

  console.log('\n   ✅ Batch embedding complete');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
