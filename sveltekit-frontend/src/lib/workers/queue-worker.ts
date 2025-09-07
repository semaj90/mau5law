import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { document_chunks } from '$lib/db/schema';
import { cache } from '$lib/server/cache/redis';
import { globalLoki } from '$lib/stores/global-loki';
import { getEmbeddingViaGate } from '$lib/server/embedding-gateway';
import { jobMachine } from '$lib/workers/job-state';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { closeRabbitMQ } from '$lib/server/rabbitmq';
import { emitCacheEvent } from '$lib/server/cache/cache-events';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

let shuttingDown = false;

// Wire globalLoki to Redis client if available
(async () => {
  try {
    const raw = cache.getClient?.();
    if (raw) {
      globalLoki.initRedis(raw);
      console.log('🧠 globalLoki wired to Redis');
    } else {
      console.log('🧠 globalLoki running without Redis');
    }
  } catch {}
})();

// Ensure DB-level idempotency support: unique index on metadata->>'jobId'
async function ensureDbIndexes() {
  try {
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS document_chunks_jobid_uidx ON document_chunks ((metadata->>'jobId'));`
    );
    console.log('🧱 Ensured unique index document_chunks_jobid_uidx');
  } catch (e: any) {
    console.warn('⚠️ Failed to ensure unique index for jobId (non-fatal):', e?.message || e);
  }
}

async function processJob(job: { id: string; text: string; model?: string }) {
  console.log('📥 Processing job:', job.id);
  // Dedupe: skip if already processed
  try {
    const done = await redis.get(`jobs:done:${job.id}`);
    if (done) {
      console.log('⏭️  Skipping already-processed job', job.id);
      try {
        await globalLoki.updateJob(job.id, { state: 'skipped', reason: 'dedupe' });
      } catch {}
      return;
    }
  } catch {}

  // Acquire in-flight dedupe lock (24h) using NX
  try {
    let locked: any = null;
    try {
      locked = await (redis as any).set(`job:processed:${job.id}`, '1', {
        NX: true,
        EX: 24 * 60 * 60,
      });
    } catch {
      // older ioredis style
      try {
        locked = await (redis as any).set(`job:processed:${job.id}`, '1', 'NX', 'EX', 24 * 60 * 60);
      } catch {}
    }
    if (!locked) {
      console.log('⏭️  Skipping job due to NX lock (already being processed):', job.id);
      try {
        await globalLoki.updateJob(job.id, { state: 'skipped', reason: 'dedupe-nx' });
      } catch {}
      return;
    }
  } catch (e) {
    console.warn('⚠️ NX dedupe lock failed (continuing):', (e as Error).message || e);
  }
  await jobMachine.createJob(job.id, { model: job.model });
  try {
    await globalLoki.startJob({ id: job.id, model: job.model, text: job.text });
  } catch {}
  const started = await jobMachine.startJob(job.id);
  if (!started) {
    console.warn('⚠️ Concurrency cap reached, deferring job start:', job.id);
  }

  try {
    const result = await getEmbeddingViaGate(fetch as any, job.text, { model: job.model });
    const emb = result.embedding;
    console.log(`📍 Embedding created via ${result.backend} using model ${result.model}`);

    // Prefer DB-level idempotency via unique index on (metadata->>'jobId').
    // Use onConflictDoNothing to treat duplicates as success.
    let inserted = false;
    await db
      .insert(document_chunks)
      .values({
        chunk_text: job.text,
        chunk_index: 0,
        embedding: emb as unknown as any,
        metadata: {
          source: 'pipeline',
          jobId: job.id,
          model: result.model,
          backend: result.backend,
        } as any,
      } as any)
      .onConflictDoNothing({ target: sql`(metadata->>'jobId')` as any });
    // We can't directly know if inserted; do a cheap existence check
    const already = await db
      .select({ count: sql<number>`count(*)` })
      .from(document_chunks as any)
      .where(sql`(metadata->>'jobId') = ${job.id}` as any);
    inserted = (already?.[0]?.count ?? 0) > 0;

    await jobMachine.completeJob(job.id);
    try {
      await globalLoki.completeJob(job.id, { embeddingSize: Array.isArray(emb) ? emb.length : 0 });
    } catch {}
    // Notify clients to invalidate embedding caches
    try {
      emitCacheEvent({
        type: 'embedding_created',
        jobId: job.id,
        model: result.model,
        backend: result.backend,
        ts: Date.now(),
        inserted,
      });
    } catch {}
    try {
      await redis.setex(`jobs:done:${job.id}`, 7 * 24 * 3600, '1');
    } catch {}
    console.log('✅ Stored embedding for', job.id);
  } catch (err: any) {
    console.error('❌ Job failed:', err?.message || err);
    await jobMachine.failJob(job.id, err, false);
    try {
      await globalLoki.failJob(job.id, err?.message || String(err));
    } catch {}
    // Allow retry by clearing in-flight lock
    try {
      await (redis as any).del(`job:processed:${job.id}`);
    } catch {}
    throw err;
  }
}

async function runRabbitConsumer() {
  try {
    const { consumeFromQueue } = await import('$lib/server/rabbitmq');
    await consumeFromQueue('evidence.embedding.queue', async (payload, ack, nack) => {
      try {
        await processJob(payload as any);
        ack();
      } catch (err: any) {
        console.error('❌ Error processing rabbitmq job:', err?.message || err);
        // Nack without requeue to avoid hot loops; you can change this if you want retries
        nack();
      }
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
  console.log('🚀 Redis BLPOP loop started on embedding:jobs');
  while (!shuttingDown) {
    try {
      const popped = await cache.blpop('embedding:jobs', 0);
      if (!popped) continue;
      const [, raw] = popped;
      const job = JSON.parse(raw) as { id: string; text: string; model?: string };
      try {
        await processJob(job);
      } catch (err: any) {
        console.error('❌ Error processing redis job:', err?.message || err);
      }
    } catch (e: any) {
      console.error('❌ Worker error (redis loop):', e?.message || e);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function runWorker() {
  console.log('🚀 Embedding queue worker starting');
  await ensureDbIndexes();
  const rabbitOk = await runRabbitConsumer();
  if (!rabbitOk) {
    // Start redis fallback loop
    await runRedisLoop();
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Worker shutting down (SIGINT)');
  shuttingDown = true;
  try {
    await pool.end();
  } catch {}
  try {
    await closeRabbitMQ();
  } catch {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Worker shutting down (SIGTERM)');
  shuttingDown = true;
  try {
    await pool.end();
  } catch {}
  try {
    await closeRabbitMQ();
  } catch {}
  process.exit(0);
});

void runWorker();
