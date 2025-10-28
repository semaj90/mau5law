/**
 * Unified Drizzle + Vector + Storage utilities
 * Generates a small integration layer over the existing db client, qdrant and minio helpers
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db as lazyDb } from './client.js';
import * as schema from './schema-unified.js';
import { sql } from 'drizzle-orm/sql';
// intentionally not importing pgvector helper type here
import { qdrantClient } from '$lib/services/qdrant-client';
import { Client as MinioClient } from 'minio';
// Redis cache - project keeps redis helpers in src/lib/server/cache/redis.ts
import { redis } from '$lib/server/cache/redis';
import { CONFIG } from '$lib/server/config';
const _CFG = CONFIG as any;
import { eq } from './utils.js';

export const schemaDb = schema;

// db is lazy-loaded proxy from client.ts
export const db = lazyDb;

// Cached query helper using Redis
export async function cachedQuery<T>(key: string, queryFn: () => Promise<T>, ttlMs = 1000 * 60 * 10): Promise<T> {
  try {
    if (redis && typeof redis.get === 'function') {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.warn('⚠️ Redis cache read failed:', err);
  }

  const result = await queryFn();

  try {
    if (redis && typeof redis.set === 'function') {
      await redis.set(key, JSON.stringify(result), 'PX', ttlMs);
    }
  } catch (err) {
    console.warn('⚠️ Redis cache write failed:', err);
  }
  return result;
}

// Hybrid vector search: prefer qdrant, fallback to pgvector via SQL
export async function hybridVectorSearch<T = unknown>(
  embedding: number[],
  table: T,
  column: unknown,
  limit = 10
): Promise<unknown[]> {
  try {
    if (qdrantClient) {
      const qResults = await qdrantClient.search({ query_vector: embedding, limit });
      if (Array.isArray(qResults) && qResults.length > 0) return qResults;
    }
  } catch (err) {
    console.warn('⚠️ Qdrant search failed, falling back to pgvector:', err);
  }

  // Fallback to pgvector: compute cosine distance via SQL fragment
  try {
    const rows = await (db as any)
      .select()
      .from(table as any)
      .orderBy(sql`${column as any} <#> ${sql.array(embedding)}`) // uses pgvector distance operator
      .limit(limit)
      .execute();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('❌ pgvector fallback failed:', err);
    return [];
  }
}

// Store embedding in Postgres + Qdrant + Redis cache
export async function storeEmbedding(
  table: unknown,
  recordId: string,
  vectorColumn: { name?: string } | unknown,
  embedding: number[],
  metadata: Record<string, unknown> = {}
) {
  try {
    await (db as any)
      .update(table as any)
      .set({ [(vectorColumn as any)?.name || 'embedding']: embedding })
      .where((eq as any)((table as any).id, recordId))
      .execute();
  } catch (err) {
    console.warn('⚠️ Failed to update embedding in Postgres:', err);
  }

  try {
    if (qdrantClient) {
      await qdrantClient.upsert({
        points: [{ id: recordId, vector: embedding, payload: metadata as Record<string, unknown> }],
        collection_name: _CFG.QDRANT_COLLECTION || 'legal_embeddings',
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed to upsert to Qdrant:', err);
  }

  try {
    if (redis && typeof redis.set === 'function') {
      await redis.set(`embedding:${recordId}`, JSON.stringify(metadata), 'PX', 24 * 60 * 60 * 1000);
    }
  } catch (err) {
    // ignore
  }
}

// MinIO helper using project's Minio usage patterns (create client if library not exported centrally)
function makeMinioClient(): MinioClient {
  const endpoint = CONFIG.MINIO_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost:9000';
  const accessKey = CONFIG.MINIO_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = CONFIG.MINIO_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'minioadmin';
  const useSSL = String(endpoint).startsWith('https');
  return new MinioClient({
    endPoint: endpoint.split(':')[0],
    port: parseInt(String(endpoint.split(':')[1] || '9000'), 10),
    useSSL,
    accessKey,
    secretKey,
  });
}

export async function fetchDocumentFromMinIO(bucket: string, key: string) {
  try {
    const client = makeMinioClient();
    const stream = await client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  } catch (err) {
    console.error(`❌ Failed to fetch from MinIO: ${bucket}/${key}`, err);
    return '';
  }
}

export default db;
