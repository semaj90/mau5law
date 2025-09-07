import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { document_chunks } from '$lib/db/schema';
import { cache } from '$lib/server/cache/redis';
import { getEmbeddingViaGate } from '$lib/server/embedding-gateway';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

let shuttingDown = false;

async function processJob(job: { id: string; text: string; model?: string }) {
  console.log('📥 Processing job:', job.id);
  const result = await getEmbeddingViaGate(fetch, job.text, { model: job.model });
  const emb = result.embedding;
  console.log(`📍 Embedding created via ${result.backend} using model ${result.model}`);

  // Store embedding as JSON initially for portability; swap to pgvector bind later
  await db.insert(document_chunks).values({
    chunk_text: job.text,
    chunk_index: 0,
    embedding: emb as unknown as any,
    metadata: { source: 'pipeline', jobId: job.id } as any,
  } as any);

  console.log('✅ Stored embedding for', job.id);
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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Worker shutting down (SIGTERM)');
  shuttingDown = true;
  try {
    await pool.end();
  } catch {}
  process.exit(0);
});

void runWorker();
