import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import pgClient from '$lib/server/db-shim';
import { document_chunks } from '$lib/db/schema';
import { cache } from '$lib/server/cache/redis';
import { getEmbeddingViaGate } from '$lib/server/embedding-gateway';
import { consumeFromQueue } from '$lib/server/rabbitmq';
import { ingestionService } from '$lib/server/workflows/ingestion-service';
// Use postgres-js client from db-shim (drizzle adapter expects postgres-js client)
const db = drizzle(pgClient as any);
let shuttingDown = $state(false);
const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
interface ChunkJob {
  jobId: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  text?: string; // Redis compatibility
  metadata: {
    totalChunks: number;
    priority: string;
    userId?: string;
    timestamp: string;
  };
}
// Helper: safely format unknown errors to strings
function formatError(err: any): string {
  // Prefer Error.message for Error instances
  if (err instanceof Error) return err.message;
  // Strings are fine
  if (typeof err === 'string') return err;
  // Try JSON stringify for objects
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
async function processChunkJob(job: ChunkJob) {
  console.log(`📥 Processing chunk job: ${job.jobId}:${job.chunkIndex}`);
  const startTime = Date.now();
  const text = job.chunkText || job.text;
  if (!text) {
    throw new Error('No text content found in job');
  }
  try {
    // Generate embedding
    const result = (await getEmbeddingViaGate(fetch, text, {
      model: job.metadata.priority === 'high' ? 'embeddinggemma:latest' : undefined,
    })) as { embedding?: number[] | Float32Array; backend?: string; model?: string };

    // Ensure we have an embedding and normalize to number[]
    let embedding = result.embedding;
    if (!embedding) {
      throw new Error('Embedding not returned from gateway');
    }
    if (embedding instanceof Float32Array) {
      embedding = Array.from(embedding);
    } else if (!Array.isArray(embedding)) {
      throw new Error('Unexpected embedding type returned from gateway');
    }

    // Log embedding backend and model
    console.log(`📍 Embedding created via ${result.backend} using model ${result.model || 'unknown'}`);

    // Prepare typed metadata (avoid `any`)
    const metadata: Record<string, unknown> = {
      source: 'comprehensive_pipeline',
      jobId: job.jobId,
      documentId: job.documentId,
      priority: job.metadata.priority,
      workerId,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Insert into DB with proper types (embedding: number[], metadata: Record<string, unknown>)
    await db.insert(document_chunks).values({
      chunk_text: text,
      chunk_index: job.chunkIndex,
      embedding,
      metadata,
    });
    console.log(`✅ Stored embedding for ${job.jobId}:${job.chunkIndex}`);
    // Report progress to ingestion service
    await reportProgress(job.jobId, job.chunkIndex, job.metadata.totalChunks);
    return {
      success: true,
      processingTime: Date.now() - startTime,
      chunkIndex: job.chunkIndex,
    };
  } catch (error) {
    console.error(`❌ Error processing chunk ${job.jobId}:${job.chunkIndex}:`, error);
    // Report error to ingestion service
    await reportError(job.jobId, job.chunkIndex, error);
    throw error;
  }
}
async function reportProgress(jobId: string, chunkIndex: number, totalChunks: number) {
  try {
    // Calculate progress
    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    // Cache progress update
    await cache.set(
      `job:${jobId}:progress`,
      {
        chunkIndex,
        totalChunks,
        progress,
        lastUpdate: new Date().toISOString(),
        workerId,
      },
      300
    ); // 5 minute TTL
    // Send progress to workflow if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      console.log(`🎉 Completed all chunks for job ${jobId}`);
    }
  } catch (error) {
    console.error(`❌ Error reporting progress for ${jobId}:`, error);
  }
}
async function reportError(jobId: string, chunkIndex: number, error: any) {
  try {
    await cache.set(
      `job:${jobId}:error`,
      {
        chunkIndex,
        error: error instanceof Error ? error.message : formatError(error),
        timestamp: new Date().toISOString(),
        workerId,
      },
      3600
    ); // 1 hour TTL for error debugging
  } catch (cacheError) {
    console.error(`❌ Error reporting error for ${jobId}:`, formatError(cacheError));
  }
}
async function runRabbitConsumer() {
  try {
    // Initialize ingestion service
    await ingestionService.initialize();
    console.log('✅ Ingestion service initialized');
    // Register this worker
    await cache.set(
      `worker:${workerId}`,
      {
        id: workerId,
        startedAt: new Date().toISOString(),
        status: 'active',
        queues: ['evidence.embedding.queue', 'evidence.embedding.priority'],
        pid: process.pid,
      },
      300
    ); // 5 minute TTL, renewed by heartbeat
    // Start heartbeat
    const heartbeatInterval = setInterval(async () => {
      if (!shuttingDown) {
        try {
          await cache.set(`worker:${workerId}:heartbeat`, new Date().toISOString(), 30);
        } catch (e) {
          console.warn('❌ Heartbeat failed:', e);
        }
      }
    }, 15000); // Every 15 seconds
    // Consume from priority queue
    const priorityConsumer = consumeFromQueue('evidence.embedding.priority', async (payload, ack, nack) => {
      try {
        await processChunkJob(payload as ChunkJob);
        ack();
      } catch (err: any) {
        console.error('❌ Error processing priority job:', formatError(err));
        nack(); // Don't requeue to avoid hot loops
      }
    });
    // Consume from regular queue
    const regularConsumer = consumeFromQueue('evidence.embedding.queue', async (payload, ack, nack) => {
      try {
        await processChunkJob(payload as ChunkJob);
        ack();
      } catch (err: any) {
        console.error('❌ Error processing regular job:', formatError(err));
        nack(); // Don't requeue to avoid hot loops
      }
    });
    // Wait for both consumers to start
    await Promise.all([priorityConsumer, regularConsumer]);
    // Cleanup on shutdown
    process.on('SIGINT', () => {
      clearInterval(heartbeatInterval);
    });
    process.on('SIGTERM', () => {
      clearInterval(heartbeatInterval);
    });
    return true;
  } catch (e) {
    console.warn(
      'RabbitMQ not available or failed to start consumer, falling back to Redis:',
      (e as Error).message || e
    );
    return false;
  }
}
async function runRedisLoop() {
  try {
    // Initialize ingestion service
    await ingestionService.initialize();
    console.log('✅ Ingestion service initialized');
    // Register this worker
    await cache.set(
      `worker:${workerId}`,
      {
        id: workerId,
        startedAt: new Date().toISOString(),
        status: 'active',
        queues: ['embedding:jobs'],
        pid: process.pid,
      },
      300
    );
    console.log('🚀 Redis BLPOP loop started on embedding:jobs');
    const heartbeatInterval = setInterval(async () => {
      if (!shuttingDown) {
        try {
          await cache.set(`worker:${workerId}:heartbeat`, new Date().toISOString(), 30);
        } catch (e) {
          console.warn('❌ Heartbeat failed:', e);
        }
      }
    }, 15000);
    while (!shuttingDown) {
      try {
        const popped = await cache.blpop('embedding:jobs', 0);
        if (!popped) continue;
        const [, raw] = popped;
        const job = JSON.parse(raw) as ChunkJob;
        try {
          await processChunkJob(job);
        } catch (err: any) {
          console.error('❌ Error processing redis job:', formatError(err));
        }
      } catch (e: any) {
        console.error('❌ Worker error (redis loop):', formatError(e));
        await new Promise(r => setTimeout(r, 500));
      }
    }
    clearInterval(heartbeatInterval);
  } catch (error) {
    console.error('❌ Error in Redis loop:', error);
  }
}
async function runComprehensiveWorker() {
  console.log(`🚀 Comprehensive embedding worker starting (ID: ${workerId})`);
  try {
    const rabbitOk = await runRabbitConsumer();
    if (!rabbitOk) {
      // Start redis fallback loop
      await runRedisLoop();
    }
  } catch (error) {
    console.error('❌ Comprehensive worker failed:', error);
    process.exit(1);
  }
}
// Graceful shutdown
async function shutdown() {
  console.log('🛑 Comprehensive worker shutting down...');
  shuttingDown = true;
  try {
    // Unregister worker
    await cache.del(`worker:${workerId}`);
    await cache.del(`worker:${workerId}:heartbeat`);
    // Close database connection (postgres-js exposes an optional .end())
    try {
      if (typeof (pgClient as any).end === 'function') {
        await (pgClient as any).end();
      }
      console.log('✅ Database connections closed');
    } catch (e) {
      console.warn('⚠️ Error closing database connection gracefully:', e);
    }
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});
void runComprehensiveWorker();
