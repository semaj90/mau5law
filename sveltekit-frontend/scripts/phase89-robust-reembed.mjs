#!/usr/bin/env node
/**
 * Phase 89: Robust Svelte Re-embedder with Redis Cache + Resume
 *
 * Features:
 * 1. Redis-cached embeddings (avoid re-computing same text)
 * 2. Resume from last position (handles crashes)
 * 3. Batch processing with progress tracking
 * 4. Compares with existing data before deletion
 * 5. Checkpointing every 1000 errors
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import ollama from 'ollama';
import pg from 'pg';
import { createClient } from 'redis';

const { Pool } = pg;

const CONFIG = {
  postgres: {
    host: '127.0.0.1',
    port: 5434,
    database: 'legal_ai_db',
    user: 'legal_admin',
    password: '123456'
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  ollama: {
    host: 'http://localhost:11434',
    embeddingModel: 'embeddinggemma'
  },
  batchSize: 50,
  checkpointInterval: 1000,
  checkpointFile: 'reports/svelte-reembed-checkpoint.json'
};

let db, redis;

async function main() {
  console.log('🚀 Phase 89: Robust Svelte Re-embedder\n');

  // Connect
  db = new Pool(CONFIG.postgres);
  redis = createClient({
    socket: {
      host: CONFIG.redis.host,
      port: CONFIG.redis.port
    }
  });
  await redis.connect();
  console.log('✅ Connected to Postgres & Redis\n');

  // Parse all errors from JSON
  console.log('📂 Parsing svelte-check-errors.json...');
  const errors = parseErrorFile();
  console.log(`   ✅ Parsed ${errors.length.toLocaleString()} errors\n`);

  // Check existing state
  const existing = await db.query(`
    SELECT COUNT(*) as count,
           array_agg(DISTINCT substring(raw_text, 1, 50)) as samples
    FROM raw_error_embeddings
    WHERE source = 'svelte-check'
  `);

  console.log(`📊 Existing state:`);
  console.log(`   Database: ${existing.rows[0].count} svelte-check errors`);
  console.log(`   Target: ${errors.length} errors to embed\n`);

  // Compare samples
  if (existing.rows[0].count > 0) {
    console.log(`🔍 Sample of existing errors:`);
    const samples = existing.rows[0].samples.slice(0, 5);
    samples.forEach((s, i) => console.log(`   ${i + 1}. ${s}...`));
    console.log('');
  }

  // Ask for confirmation to delete
  if (existing.rows[0].count > 0) {
    console.log(`⚠️  This will DELETE ${existing.rows[0].count} existing errors and re-embed ${errors.length}\n`);

    // Auto-proceed if new count is significantly larger
    if (errors.length > existing.rows[0].count * 5) {
      console.log(`✅ Auto-proceeding: ${errors.length} >> ${existing.rows[0].count}\n`);
    } else {
      console.log('⏸️  Manual confirmation required.');
      console.log('   Run with --force flag to proceed\n');

      if (!process.argv.includes('--force')) {
        console.log('❌ Aborted. Use: node scripts/phase89-robust-reembed.mjs --force');
        await cleanup();
        return;
      }
    }
  }

  // Load checkpoint if exists
  let startIndex = 0;
  if (existsSync(CONFIG.checkpointFile)) {
    const checkpoint = JSON.parse(readFileSync(CONFIG.checkpointFile, 'utf-8'));
    startIndex = checkpoint.lastProcessed || 0;
    console.log(`📍 Resuming from checkpoint: ${startIndex.toLocaleString()}\n`);
  }

  // Delete existing if starting fresh
  if (startIndex === 0 && existing.rows[0].count > 0) {
    console.log('🗑️  Deleting existing svelte-check errors...');
    await db.query(`DELETE FROM raw_error_embeddings WHERE source = 'svelte-check'`);
    console.log('   ✅ Cleared\n');
  }

  // Embed with caching
  await embedWithCache(errors, startIndex);

  // Final stats
  await printStats();

  // Cleanup checkpoint
  if (existsSync(CONFIG.checkpointFile)) {
    writeFileSync(CONFIG.checkpointFile, JSON.stringify({ completed: true, timestamp: new Date().toISOString() }));
  }

  await cleanup();
  console.log('\n✅ Re-embedding complete!');
}

function parseErrorFile() {
  const content = readFileSync('reports/svelte-check-errors.json', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  const errors = [];
  for (const line of lines) {
    if (line.includes('START ')) continue;

    // Parse: timestamp ERROR "file" line:col "message"
    const match = line.match(/^(\d+)\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"([^"]+)"$/);

    if (match) {
      const [, timestamp, severity, file, lineNum, col, message] = match;
      errors.push({
        file: file.replace(/\\\\/g, '/'),
        line: parseInt(lineNum),
        column: parseInt(col),
        message: message,
        severity: severity.toLowerCase(),
        fullText: `${file}:${lineNum}:${col} ${severity.toLowerCase()}: ${message}`,
        hash: createHash('sha256').update(`${file}:${lineNum}:${col} ${message}`).digest('hex').substring(0, 16)
      });
    }
  }

  return errors;
}

async function embedWithCache(errors, startIndex) {
  console.log(`🔄 Embedding ${errors.length.toLocaleString()} errors (starting at ${startIndex})...\n`);

  const batches = [];
  for (let i = startIndex; i < errors.length; i += CONFIG.batchSize) {
    batches.push({ start: i, errors: errors.slice(i, i + CONFIG.batchSize) });
  }

  let totalEmbedded = startIndex;
  let cacheHits = 0;
  let cacheMisses = 0;
  const startTime = Date.now();

  for (const batch of batches) {
    for (const error of batch.errors) {
      // Check Redis cache first
      const cacheKey = `emb:gemma:${error.hash}`;
      let embedding = await redis.get(cacheKey);

      if (embedding) {
        embedding = JSON.parse(embedding);
        cacheHits++;
      } else {
        // Generate new embedding
        try {
          const result = await ollama.embeddings({
            model: CONFIG.ollama.embeddingModel,
            prompt: error.fullText
          });
          embedding = result.embedding;

          // Cache for 7 days
          await redis.setEx(cacheKey, 604800, JSON.stringify(embedding));
          cacheMisses++;
        } catch (err) {
          console.warn(`\n⚠️  Failed to embed: ${err.message}`);
          continue;
        }
      }

      // Insert into database
      try {
        await db.query(`
          INSERT INTO raw_error_embeddings (source, line_number, raw_text, embedding)
          VALUES ($1, $2, $3, $4)
        `, ['svelte-check', error.line, error.fullText, JSON.stringify(embedding)]);

        totalEmbedded++;
      } catch (err) {
        console.warn(`\n⚠️  DB insert failed: ${err.message}`);
      }
    }

    // Update progress
    const progress = ((totalEmbedded / errors.length) * 100).toFixed(2);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (totalEmbedded - startIndex) / elapsed;
    const remaining = errors.length - totalEmbedded;
    const eta = Math.ceil(remaining / rate);
    const cacheRate = cacheHits > 0 ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1) : 0;

    process.stdout.write(`\r   ${progress}% | ${totalEmbedded.toLocaleString()} / ${errors.length.toLocaleString()} | ${rate.toFixed(1)}/s | ETA: ${eta}s | Cache: ${cacheRate}%`);

    // Checkpoint every 1000 errors
    if (totalEmbedded % CONFIG.checkpointInterval === 0) {
      saveCheckpoint(totalEmbedded, { cacheHits, cacheMisses, elapsed, rate });
    }
  }

  console.log('\n');
  console.log(`   Cache hits: ${cacheHits.toLocaleString()} | Cache misses: ${cacheMisses.toLocaleString()}`);
  console.log(`   Cache hit rate: ${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`);
}

function saveCheckpoint(lastProcessed, stats) {
  writeFileSync(CONFIG.checkpointFile, JSON.stringify({
    lastProcessed,
    stats,
    timestamp: new Date().toISOString()
  }, null, 2));
}

async function printStats() {
  const stats = await db.query(`
    SELECT
      source,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded
    FROM raw_error_embeddings
    GROUP BY source
    ORDER BY source
  `);

  console.log('\n📊 Final Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Source         | Total   | Embedded');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const row of stats.rows) {
    const src = (row.source || '').padEnd(14);
    const total = row.total.toString().padStart(7);
    const embedded = row.embedded.toString().padStart(8);
    console.log(`${src} | ${total} | ${embedded}`);
  }

  const totalStats = await db.query(`SELECT COUNT(*) as total FROM raw_error_embeddings`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`TOTAL: ${totalStats.rows[0].total.toLocaleString()} errors`);
}

async function cleanup() {
  await redis.quit();
  await db.end();
}

main().catch(async err => {
  console.error('\n❌ Error:', err);
  await cleanup();
  process.exit(1);
});
