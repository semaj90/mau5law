import type { RequestHandler } from './$types.js';
// src/routes/api/vectors/sync/+server.ts
// Automatic vector synchronization to Qdrant after CUDA processing
// Triggered by Go microservice after successful vector generation
import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createRedisInstance } from '$lib/server/redis';
import { vectors, vectorJobs, evidence, reports } from '$lib/server/db/schema-postgres.js';
import { eq } from 'drizzle-orm';

// Initialize connections
const sql = postgres(import.meta.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db');
const db = drizzle(sql);
let redis: ReturnType<typeof createRedisInstance> | null = null;
try {
  redis = createRedisInstance();
} catch {
  // Unable to create redis instance; leave as null and warn. Avoid requiring optional dependency at build-time.
  console.warn('createRedisInstance failed; continuing without Redis. Set REDIS_URL to enable Redis.');
  redis = null;
}

// Qdrant client (simple HTTP implementation)
class QdrantClient {
  private _baseUrl: string;
  constructor(baseUrl = 'http://localhost:6333') {
    this._baseUrl = baseUrl;
  }
  get baseUrl() {
    return this._baseUrl;
  }
  async upsertPoint(
    collectionName: string,
    pointData: { id: string; vector: number[]; payload: Record<string, unknown> }
  ) {
    const response = await fetch(`${this._baseUrl}/collections/${collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [pointData] }),
    });
    if (!response.ok) {
      throw new Error(`Qdrant upsert failed: ${response.statusText}`);
    }
    return await response.json();
  }
  async deletePoint(collectionName: string, pointId: string) {
    const response = await fetch(`${this._baseUrl}/collections/${collectionName}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [pointId] }),
    });
    if (!response.ok) {
      throw new Error(`Qdrant delete failed: ${response.statusText}`);
    }
    return await response.json();
  }
  async ensureCollection(collectionName: string, vectorSize = 768) {
    try {
      // Check if collection exists
      const checkResponse = await fetch(`${this._baseUrl}/collections/${collectionName}`);
      if (checkResponse.ok) {
        return; // Collection already exists
      }
      // Create collection
      const createResponse = await fetch(`${this._baseUrl}/collections/${collectionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectors: { size: vectorSize, distance: 'Cosine' } }),
      });
      if (!createResponse.ok) {
        throw new Error(`Failed to create collection: ${createResponse.statusText}`);
      }
      console.log(`✅ Created Qdrant collection: ${collectionName}`);
    } catch (error: unknown) {
      console.error(`❌ Qdrant collection error for ${collectionName}:`, error);
      throw error;
    }
  }
}
const qdrant = new QdrantClient();

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  let jobId: string | undefined;
  try {
    body = await request.json();
    const payload = body as Record<string, unknown>;
    jobId = typeof payload.jobId === 'string' ? payload.jobId : undefined;
    const vectorId = typeof payload.vectorId === 'string' ? payload.vectorId : undefined;
    const ownerType = typeof payload.ownerType === 'string' ? payload.ownerType : undefined;
    const ownerId = typeof payload.ownerId === 'string' ? payload.ownerId : undefined;
    const event = typeof payload.event === 'string' ? payload.event : undefined;
    console.log(`🔄 Syncing vector to Qdrant: ${jobId} (${event})`);
    // Validate required fields
    if (!jobId || !ownerType || !ownerId || !event) {
      return json({ error: 'Missing required fields: jobId, ownerType, ownerId, event' }, { status: 400 });
    }
    // Update job status to processing
    await db
      .update(vectorJobs)
      .set({ status: 'processing', progress: 50, startedAt: new Date() })
      .where(eq(vectorJobs.jobId, jobId));
    let result: unknown;
    if (event === 'delete') {
      // Handle deletion
      result = await handleVectorDeletion(ownerType as string, ownerId as string);
    } else {
      // Handle upsert/reembed
      result = await handleVectorUpsert(ownerType as string, ownerId as string, vectorId);
    }
    // Update job status to succeeded
    await db
      .update(vectorJobs)
      .set({ status: 'succeeded', progress: 100, completedAt: new Date(), result })
      .where(eq(vectorJobs.jobId, jobId));
    console.log(`✅ Vector sync completed: ${jobId}`);
    return json({ success: true, jobId, result, message: `Vector ${event} completed successfully` });
  } catch (error: unknown) {
    console.error('❌ Vector sync error:', error);
    // Update job status to failed
    if (jobId) {
      await db
        .update(vectorJobs)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        })
        .where(eq(vectorJobs.jobId, jobId))
        .catch(console.error);
    }
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
};

type SourceDataType = {
  title?: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  metadata?: Record<string, unknown>;
  evidenceType?: string;
  caseId?: string;
  tags?: string[];
  reportType?: string;
  status?: string;
};

async function handleVectorUpsert(ownerType: string, ownerId: string, _vectorId?: string): Promise<unknown> {
  // Get vector from PostgreSQL
  const [vector] = await db.select().from(vectors).where(eq(vectors.ownerId, ownerId)).limit(1);
  if (!vector || !vector.embedding) {
    throw new Error('Vector not found or embedding missing');
  }
  // Get source data for payload
  let sourceData: unknown;
  let collectionName: string;
  switch (ownerType) {
    case 'evidence':
      [sourceData] = await db.select().from(evidence).where(eq(evidence.id, ownerId)).limit(1);
      collectionName = 'legal_evidence';
      break;
    case 'report':
      [sourceData] = await db.select().from(reports).where(eq(reports.id, ownerId)).limit(1);
      collectionName = 'legal_reports';
      break;
    default:
      throw new Error(`Unsupported owner type: ${ownerType}`);
  }
  if (!sourceData) {
    throw new Error(`Source data not found for ${ownerType}:${ownerId}`);
  }
  // Ensure Qdrant collection exists
  await qdrant.ensureCollection(collectionName);
  // Prepare point data for Qdrant
  const sd = sourceData as SourceDataType;
  const toIso = (v?: string | Date) => {
    if (!v) return undefined;
    if (typeof v === 'string') return new Date(v).toISOString();
    if (v instanceof Date) return v.toISOString();
    return undefined;
  };
  const pointData = {
    id: ownerId,
    vector: Array.isArray(vector.embedding) ? vector.embedding : [],
    payload: {
      ownerType,
      title: sd.title ?? '',
      description: sd.description ?? '',
      createdAt: toIso(sd.createdAt),
      updatedAt: toIso(sd.updatedAt),
      metadata: sd.metadata ?? {},
      // Add specific fields based on type
      ...(ownerType === 'evidence' && {
        evidenceType: sd.evidenceType,
        caseId: sd.caseId,
        tags: sd.tags,
      }),
      ...(ownerType === 'report' && {
        reportType: sd.reportType,
        caseId: sd.caseId,
        status: sd.status,
      }),
    },
  };
  // Upsert to Qdrant
  const qdrantResult = await qdrant.upsertPoint(collectionName, pointData);
  return {
    action: 'upserted',
    collection: collectionName,
    pointId: ownerId,
    vectorDimensions: pointData.vector.length,
    qdrantResult,
  };
}

async function handleVectorDeletion(ownerType: string, ownerId: string): Promise<unknown> {
  const collectionName = ownerType === 'evidence' ? 'legal_evidence' : 'legal_reports';
  // Delete from Qdrant
  const qdrantResult = await qdrant.deletePoint(collectionName, ownerId);
  return { action: 'deleted', collection: collectionName, pointId: ownerId, qdrantResult };
}

// Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    // Check Qdrant connection
    const response = await fetch(`${qdrant.baseUrl || 'http://localhost:6333'}/collections`);
    const collections = response.ok ? await response.json() : null;
    // Check PostgreSQL connection
    const [pgTest] = await db.select().from(vectors).limit(1);
    // Check Redis connection (ioredis)
    let redisOk = false;
    try {
      type RedisLike = { ping?: () => Promise<string> };
      const pong = await (redis as unknown as RedisLike | null)?.ping?.();
      redisOk = pong === 'PONG' || pong === 'pong';
    } catch (error) {
      // ignore
    }
    return json({
      success: true,
      services: {
        qdrant: { connected: response.ok, collections: collections?.result?.collections || [] },
        postgresql: { connected: !!pgTest },
        redis: { connected: redisOk },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Health check failed' },
      { status: 500 }
    );
  }
};
