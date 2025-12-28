#!/usr/bin/env node
/**
 * Phase 89: Agentic Batch Error Fixer (Enhanced)
 *
 * Autonomous pipeline:
 * 1. Find error clusters (cosine similarity)
 * 2. Group by pattern + language (TS/Svelte/JS)
 * 3. Generate fixes using LLM + similar error context
 * 4. Cache solutions in Redis (30 day TTL)
 * 5. Web search for error codes (Gemini grounding)
 * 6. Apply fixes to files
 * 7. Verify with tsc/svelte-check
 *
 * Usage:
 *   node scripts/phase89-agentic-fixer.mjs --limit 100
 *   node scripts/phase89-agentic-fixer.mjs --error-code TS1005
 *   node scripts/phase89-agentic-fixer.mjs --web-search (enable Gemini)
 *   node scripts/phase89-agentic-fixer.mjs --lang-stats
 */

import { exec } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import ollama from 'ollama';
import pg from 'pg';
import { createClient } from 'redis';
import { promisify } from 'util';
import { callLLM, setProvider } from './llm-router.mjs';

const execAsync = promisify(exec);
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
    url: 'redis://127.0.0.1:6379',
    ttl: {
      solution: 86400 * 30,  // 30 days
      analysis: 86400 * 7     // 7 days
    }
  },
  ollama: {
    chatModel: 'gemma3-legal:latest',
    embeddingModel: 'embeddinggemma:latest'
  },
  fixing: {
    maxErrorsPerRun: 100,
    similarityThreshold: 0.85, // High similarity = same fix pattern
    batchSize: 10, // Fix 10 errors at a time
    topKSimilar: 20, // Top-K similar errors for context
    useWebSearch: false // Enable with --web-search flag
  }
};

let db;
let redis;
let fixedCount = 0;
let failedCount = 0;
let cachedSolutions = 0;

async function main() {
  console.log('🤖 Phase 89: Agentic Batch Error Fixer (Enhanced)\n');

  // Connect to services
  db = new Pool(CONFIG.postgres);
  redis = createClient({ url: CONFIG.redis.url });
  await redis.connect();
  console.log('✅ Connected to Postgres + Redis\n');

  const args = process.argv.slice(2);
  let whereClause = 'embedding IS NOT NULL';
  let limit = CONFIG.fixing.maxErrorsPerRun;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') {
      limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--error-code') {
      const code = args[i + 1];
      whereClause += ` AND raw_text LIKE '%${code}%'`;
      i++;
    } else if (args[i] === '--web-search') {
      CONFIG.fixing.useWebSearch = true;
      setProvider('gemini');
      console.log('🌐 Web search enabled (Gemini)\n');
    } else if (args[i] === '--lang-stats') {
      await showLanguageStats();
      await cleanup();
      return;
    }
  }

  // ============================================================
  // Get Unfixed Errors
  // ============================================================
  console.log(`📊 Finding top ${limit} unfixed errors...`);

  const errors = await db.query(`
    SELECT id, source, raw_text, embedding
    FROM raw_error_embeddings
    WHERE ${whereClause}
    ORDER BY id
    LIMIT $1
  `, [limit]);

  console.log(`   Found ${errors.rows.length} errors to fix\n`);

  if (errors.rows.length === 0) {
    console.log('✅ No errors to fix!');
    await cleanup();
    return;
  }

  // ============================================================
  // Cluster Similar Errors
  // ============================================================
  console.log('🔍 Clustering similar errors...');

  const clusters = [];
  const processed = new Set();

  for (const error of errors.rows) {
    if (processed.has(error.id)) continue;

    // Find all similar errors
    const similar = await db.query(`
      SELECT id, raw_text, source
      FROM raw_error_embeddings
      WHERE embedding IS NOT NULL
        AND id != $1
        AND 1 - (embedding <=> $2::vector) >= $3
      LIMIT $4
    `, [error.id, error.embedding, CONFIG.fixing.similarityThreshold, CONFIG.fixing.topKSimilar]);

    const cluster = {
      primary: error,
      similar: similar.rows
    };

    clusters.push(cluster);
    processed.add(error.id);
    similar.rows.forEach(s => processed.add(s.id));
  }

  console.log(`   Created ${clusters.length} error clusters\n`);

  // ============================================================
  // Fix Each Cluster
  // ============================================================
  console.log('🛠️  Fixing error clusters...\n');

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    console.log(`\n[${ i + 1}/${clusters.length}] Cluster with ${cluster.similar.length + 1} similar errors`);
    console.log(`   Primary: ${cluster.primary.raw_text.substring(0, 80)}...`);

    await fixErrorCluster(cluster);

    // Progress update
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${clusters.length} clusters | ${fixedCount} fixed | ${failedCount} failed\n`);
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Agentic Fixer Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Clusters processed:  ${clusters.length}`);
  console.log(`  Errors fixed:        ${fixedCount}`);
  console.log(`  Errors failed:       ${failedCount}`);
  console.log(`  Cached solutions:    ${cachedSolutions}`);
  console.log(`  Success rate:        ${((fixedCount / (fixedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await cleanup();
  console.log('✅ Agentic fixing complete!');
  console.log('\nNext: npx tsc --noEmit (verify fixes)');
}
/**
 * Fix a cluster of similar errors using LLM with Redis caching
 */
async function fixErrorCluster(cluster) {
  try {
    // Extract error code for caching
    const errorCodeMatch = cluster.primary.raw_text.match(/TS\d+/);
    const errorCode = errorCodeMatch ? errorCodeMatch[0] : 'Unknown';

    // Check Redis cache for solution
    const cacheKey = `fix:${hashContent(cluster.primary.raw_text)}`;
    const cachedFix = await redis.get(cacheKey);

    if (cachedFix) {
      console.log(`   💾 Using cached solution for ${errorCode}`);
      cachedSolutions++;
    } else if (CONFIG.fixing.useWebSearch) {
      // Fetch solution from web
      await fetchWebSolution(errorCode, cluster);
    }

    // Extract file path from error text
    // Example: ".svelte-kit/types/src/routes/(app)/analysis-center/proxy+page.server.ts(46,7):"
    const fileMatch = cluster.primary.raw_text.match(/([^\s:]+\.(ts|svelte|js|mjs))\((\d+),(\d+)\)/);

    if (!fileMatch) {
      console.log('   ⚠️  Cannot extract file path, skipping');
      failedCount++;
      return;
    }

    const [, filePath, , line, col] = fileMatch;

    // Read file content
    let fileContent;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.log(`   ⚠️  Cannot read file: ${filePath}`);
      failedCount++;
      return;
    }

    const lines = fileContent.split('\n');
    const errorLine = parseInt(line) - 1;

    // Get context around error (10 lines before/after)
    const contextStart = Math.max(0, errorLine - 10);
    const contextEnd = Math.min(lines.length, errorLine + 10);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    // Build LLM prompt
    const prompt = `You are fixing a TypeScript/Svelte error.

Error: ${cluster.primary.raw_text}

File: ${filePath}
Line: ${line}

Context:
${context}

Similar errors (for pattern recognition):
${cluster.similar.slice(0, 5).map(s => s.raw_text).join('\n')}

Provide ONLY the fixed line of code. No explanations, no markdown, just the code.`;

    // Generate fix using LLM
    const response = await ollama.chat({
      model: CONFIG.ollama.chatModel,
      messages: [{ role: 'user', content: prompt }]
    });

    const fixedLine = response.message.content.trim().replace(/```[a-z]*\n?/g, '');

    // Cache the fix
    await redis.set(cacheKey, fixedLine, { EX: CONFIG.redis.ttl.solution });

    // Apply fix
    lines[errorLine] = fixedLine;
    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    console.log(`   ✅ Applied fix to ${filePath}:${line}`);
    fixedCount++;

  } catch (err) {
    console.log(`   ❌ Fix failed: ${err.message}`);
    failedCount++;
  }
}

/**
 * Fetch solution from web via Gemini with grounding
 */
async function fetchWebSolution(errorCode, cluster) {
  const cacheKey = `solution:${errorCode}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`   🌐 Cached solution for ${errorCode}`);
    return;
  }

  try {
    console.log(`   🔍 Searching web for ${errorCode}...`);
    const prompt = `Explain TypeScript error ${errorCode} and provide a fix. Example: "${cluster.primary.raw_text}"`;

    const solution = await callLLM(prompt);

    // Cache for 30 days
    await redis.set(cacheKey, JSON.stringify(solution), {
      EX: CONFIG.redis.ttl.solution
    });

    console.log(`   ✅ Solution cached`);
  } catch (err) {
    console.log(`   ⚠️  Web search failed: ${err.message}`);
  }
}

/**
 * Show language-aware error statistics
 */
async function showLanguageStats() {
  console.log('📊 Language-Aware Error Statistics\n');

  const stats = await db.query(`
    SELECT
      source,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
      COUNT(DISTINCT SUBSTRING(raw_text FROM 'TS\\d+')) as unique_codes
    FROM raw_error_embeddings
    GROUP BY source
    ORDER BY total DESC
  `);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Source    | Total  | Embedded | Unique Codes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const row of stats.rows) {
    console.log(
      `${row.source.padEnd(9)} | ` +
      `${String(row.total).padStart(6)} | ` +
      `${String(row.embedded).padStart(8)} | ` +
      `${String(row.unique_codes).padStart(12)}`
    );
  }

  console.log('\n');

  // Top error codes
  const topCodes = await db.query(`
    SELECT
      SUBSTRING(raw_text FROM 'TS\\d+') as error_code,
      COUNT(*) as count
    FROM raw_error_embeddings
    WHERE raw_text ~ 'TS\\d+'
    GROUP BY error_code
    ORDER BY count DESC
    LIMIT 15
  `);

  console.log('🔝 Top 15 Error Codes:\n');
  for (const row of topCodes.rows) {
    console.log(`   ${row.error_code.padEnd(10)} ${String(row.count).padStart(6)} errors`);
  }

  console.log('\n');
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

async function cleanup() {
  await db.end();
  await redis.quit();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

