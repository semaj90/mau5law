import type { RequestHandler } from './$types.js';

// src/routes/api/compute/+server.ts
// SvelteKit API endpoint for multi-threaded job pipeline
// Implements PostgreSQL → Redis Streams → Go microservice → CUDA worker → Qdrant

import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import postgres from 'postgres';
import { createClient } from 'redis';
import { nanoid } from 'nanoid';
import { vectorOutbox, vectorJobs, vectors } from '$lib/server/db/schema-postgres.js';
import { eq } from 'drizzle-orm';
import { URL } from "url";

// Initialize connections
const sql = postgres(import.meta.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db');
const db = drizzle(sql);

const redis = createClient({ 
  url: import.meta.env.REDIS_URL || 'redis://localhost:6379' 
});

let redisConnected = false;

async function connectRedis(): Promise<any> {
  if (!redisConnected) {
    await redis.connect();
    redisConnected = true;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { jobId, type, data, ownerType, ownerId } = body;

    // Validate required fields
    if (!type || !ownerType || !ownerId) {
      return json({ 
        error: 'Missing required fields: type, ownerType, ownerId' 
      }, { status: 400 });
    }

    // Generate unique job ID if not provided
    const finalJobId = jobId || `job_${nanoid()}`;

    console.log(`🚀 Processing compute job: ${finalJobId} (${type})`);

    // Step 1: Write to PostgreSQL using outbox pattern
    const [outboxRow] = await db.insert(vectorOutbox).values({
      ownerType: ownerType as 'evidence' | 'report' | 'case' | 'document',
      ownerId,
      event: type as 'upsert' | 'delete' | 'reembed',
      vector: null, // Will be filled by CUDA worker
      payload: data,
      attempts: 0,
    }).returning();

    // Step 2: Create job tracking entry
    const [jobRow] = await db.insert(vectorJobs).values({
      jobId: finalJobId,
      ownerType: ownerType as 'evidence' | 'report' | 'case' | 'document',
      ownerId,
      event: type as 'upsert' | 'delete' | 'reembed',
      status: 'enqueued',
      progress: 0,
    }).returning();

    // Step 3: Enqueue to Redis Streams for Go microservice consumption
    await connectRedis();
    
    const streamMessage = {
      jobId: finalJobId,
      outboxId: outboxRow.id,
      ownerType,
      ownerId,
      event: type,
      payload: JSON.stringify(data || {}),
      timestamp: new Date().toISOString(),
    };

    const streamId = await redis.xAdd(
      'vec:requests', // Stream name for vector processing
      '*', // Auto-generate ID
      streamMessage
    );

    console.log(`📨 Enqueued to Redis stream vec:requests: ${streamId}`);

    // Step 4: Optional RabbitMQ fan-out (for scaling)
    // TODO: Add RabbitMQ publisher here for high-volume scenarios

    // Step 5: Return job tracking information
    return json({
      success: true,
      jobId: finalJobId,
      outboxId: outboxRow.id,
      jobTrackingId: jobRow.id,
      streamId,
      status: 'enqueued',
      message: 'Job enqueued for CUDA processing',
      progress: 0,
      estimatedTime: getEstimatedTime(type, data),
    });

  } catch (error: any) {
    console.error('❌ Compute API error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to enqueue compute job',
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const jobId = url.searchParams.get('jobId');
    
    if (!jobId) {
      return json({ 
        error: 'Missing jobId parameter' 
      }, { status: 400 });
    }

    // Get job status from PostgreSQL
    const [job] = await db
      .select()
      .from(vectorJobs)
      .where(eq(vectorJobs.jobId, jobId))
      .limit(1);

    if (!job) {
      return json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Get outbox entry for additional details
    const [outbox] = await db
      .select()
      .from(vectorOutbox)
      .where(eq(vectorOutbox.ownerId, job.ownerId))
      .orderBy(vectorOutbox.createdAt)
      .limit(1);

    // Get vector entry if processing is complete
    let vectorResult = null;
    if (job.status === 'succeeded') {
      const [vector] = await db
        .select()
        .from(vectors)
        .where(eq(vectors.ownerId, job.ownerId))
        .limit(1);
      
      vectorResult = vector ? {
        id: vector.id,
        embeddingDimensions: vector.embedding ? 768 : 0,
        hasEmbedding: !!vector.embedding,
        lastUpdated: vector.lastUpdated,
      } : null;
    }

    return json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        error: job.error,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      },
      outbox: outbox ? {
        id: outbox.id,
        attempts: outbox.attempts,
        processedAt: outbox.processedAt,
        hasVector: !!outbox.vector,
      } : null,
      vector: vectorResult,
    });

  } catch (error: any) {
    console.error('❌ Job status error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
};

// Helper function to estimate processing time based on job type
function getEstimatedTime(type: string, data: any): number {
  switch (type) {
    case 'upsert':
      // Estimate based on content length
      const contentLength = JSON.stringify(data).length;
      return Math.max(500, Math.min(5000, contentLength / 10));
    
    case 'reembed':
      return 2000; // Re-embedding typically takes 2 seconds
    
    case 'delete':
      return 100; // Deletion is fast
    
    default:
      return 1000; // Default 1 second
  }
}