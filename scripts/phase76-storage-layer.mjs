// scripts/phase76-storage-layer.mjs
// Phase 76 Level 2: Unified Storage Layer
// Connects Node.js agent to MinIO, Redis, and Postgres

import { Client as MinioClient } from 'minio';
import Redis from 'ioredis';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// --- 1. MinIO (Deep Storage) ---
// Uses existing container configs
export const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

export const BUCKET_NAME = 'phase76-summaries';

// --- 2. Postgres (Structured Vectors) ---
const pgPool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/phase76'
});

// --- 3. Redis (Semantic Cache) ---
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  enableOfflineQueue: false
});

// Handle Redis connection errors gracefully
redis.on('error', (err) => {
  console.warn('⚠️  [Redis] Connection error:', err.message);
});

// --- Unified Functions ---

/**
 * Store deep knowledge: heavy text in MinIO, reference + vector in Postgres
 * @param {string} key - MinIO object key
 * @param {object} summaryObj - Object with url, summary, full_text
 * @param {number[]} embedding - 768-dim vector
 */
export async function storeDeepKnowledge(key, summaryObj, embedding) {
  console.log(`💾 [Storage] Persisting ${key}...`);

  try {
    // A. Save heavy text to MinIO
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`   📦 Created MinIO bucket: ${BUCKET_NAME}`);
    }

    await minioClient.putObject(BUCKET_NAME, key, JSON.stringify(summaryObj));

    // B. Save reference & vector to Postgres
    const vectorStr = `[${embedding.join(',')}]`;
    await pgPool.query(
      `INSERT INTO doc_references (url, minio_key, embedding)
       VALUES ($1, $2, $3)
       ON CONFLICT (url) DO UPDATE
       SET embedding = $3, minio_key = $2`,
      [summaryObj.url, key, vectorStr]
    );

    console.log(`   ✅ Saved to MinIO & Postgres: ${key}`);
  } catch (err) {
    console.error(`   ❌ Failed to store deep knowledge:`, err.message);
    throw err;
  }
}

/**
 * Fetch deep context from MinIO
 * @param {string} minioKey - MinIO object key
 * @returns {object|null} Parsed JSON object or null
 */
export async function fetchDeepContext(minioKey) {
  try {
    const dataStream = await minioClient.getObject(BUCKET_NAME, minioKey);
    let data = '';
    for await (const chunk of dataStream) {
      data += chunk;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error(`   ⚠️  Failed to fetch from MinIO (${minioKey}):`, err.message);
    return null;
  }
}

/**
 * Store error pattern in Postgres for learning
 * @param {string} signature - Error signature
 * @param {string} filePath - File path where error occurred
 * @param {string} fixSummary - Description of the fix
 * @param {number[]} embedding - 768-dim vector
 */
export async function storeErrorPattern(signature, filePath, fixSummary, embedding) {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    await pgPool.query(
      `INSERT INTO error_patterns (signature, file_path, fix_summary, embedding)
       VALUES ($1, $2, $3, $4)`,
      [signature, filePath, fixSummary, vectorStr]
    );
    console.log(`   ✅ Stored error pattern: ${signature}`);
  } catch (err) {
    console.error(`   ❌ Failed to store error pattern:`, err.message);
    throw err;
  }
}

/**
 * Find similar error patterns using vector similarity
 * @param {number[]} embedding - 768-dim vector of current error
 * @param {number} limit - Max results to return
 * @returns {Array} Similar error patterns
 */
export async function findSimilarErrors(embedding, limit = 5) {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    const result = await pgPool.query(
      `SELECT signature, file_path, fix_summary,
              1 - (embedding <=> $1::vector) as similarity
       FROM error_patterns
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit]
    );
    return result.rows;
  } catch (err) {
    console.error(`   ⚠️  Failed to find similar errors:`, err.message);
    return [];
  }
}

/**
 * Cache result in Redis with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 */
export async function cacheResult(key, value, ttl = 3600) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn(`   ⚠️  Failed to cache result:`, err.message);
  }
}

/**
 * Get cached result from Redis
 * @param {string} key - Cache key
 * @returns {any|null} Parsed value or null
 */
export async function getCachedResult(key) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn(`   ⚠️  Failed to get cached result:`, err.message);
    return null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 [Storage] Shutting down gracefully...');
  await pgPool.end();
  redis.disconnect();
  process.exit(0);
});

export default {
  minioClient,
  redis,
  storeDeepKnowledge,
  fetchDeepContext,
  storeErrorPattern,
  findSimilarErrors,
  cacheResult,
  getCachedResult
};
