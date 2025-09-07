import 'dotenv/config';
import { db, embeddings as embeddingsTable } from '$lib/server/db/client'; // Uses legal_admin connection and re-exports schema
import { embedText } from '$lib/server/embedding-gateway';
import { cache as redis } from '$lib/server/cache/redis';

// Text chunking utility
function chunkText(text: string, size: number = 512): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks.filter(chunk => chunk.trim().length > 0);
}

// Process a single ingestion job
async function processJob(job: any): Promise<{ id: string; chunks: string[]; embeddings: number[][]; backend: string; model: string }> {
  const { id, content, metadata } = job;

  console.log(`📄 Processing document: ${id}`);

  // 1. Chunking
  const chunks = chunkText(content, 512);
  console.log(`📝 Created ${chunks.length} chunks for ${id}`);

  // 2. Generate embeddings
  const { embeddings, backend, model } = await embedText(
    fetch,
    chunks,
    process.env.EMBEDDING_MODEL || "nomic-embed-text:latest"
  );
  console.log(`🧠 Generated ${embeddings.length} embeddings for ${id}`);

  // 3. Store in dedicated embeddings table (pgvector) with legal_admin privileges
  const rows = embeddings.map((vec, i) => ({
    sourceId: id,
    jobId: id,
    chunkIndex: i,
    content: chunks[i],
    model,
    backend,
    metadata: {
      ...metadata,
      total_chunks: chunks.length,
      source_document: id
    } as any,
    embedding: vec as unknown as any,
  }));

  await db.insert(embeddingsTable).values(rows);
  console.log(`💾 Stored ${rows.length} embeddings (pgvector) in PostgreSQL`);

  // 4. Cache results in Redis via cache wrapper (auto gzip + base64)
  const cacheKey = `embedding:${id}`;
  const cacheData = { chunks, embeddings, metadata, processed_at: new Date().toISOString() };
  await redis.set(cacheKey, cacheData, 86400); // 24h TTL (wrapper converts seconds → ms)
  console.log(`🚀 Cached results for ${id}`);

  return { id, chunks, embeddings, backend, model };
}

// Main worker loop
async function runWorker() {
  console.log('🚀 Legal AI Ingestion Worker Started');
  console.log('📍 Queue: ingest_queue');
  console.log('🔐 Database: legal_admin connection');
  console.log('💾 Cache: Redis with gzip compression');

  while (true) {
    try {
      // Block waiting for jobs on the ingestion queue
      const job = await redis.blpop('ingest_queue', 0);
      if (!job || !job[1]) continue;

      let payload;
      try {
        payload = JSON.parse(job[1]);
      } catch (parseError) {
        console.error('❌ Failed to parse job payload:', parseError);
        continue;
      }

      console.log(`🎯 Received job: ${payload.id}`);
      // Update status → processing
      try {
        const statusKey = `job:ingest:${payload.id}`;
        const now = new Date().toISOString();
  await redis.set(statusKey, { id: payload.id, status: 'processing', progress: 10, timing: { createdAt: now, startedAt: now } }, 86400);
      } catch {}

      try {
        const result = await processJob(payload);
        // Status → completed
        try {
          const statusKey = `job:ingest:${result.id}`;
          const now = new Date().toISOString();
          await redis.set(
            statusKey,
            {
              id: result.id,
              status: 'completed',
              progress: 100,
              counts: { chunks: result.chunks.length, embeddings: result.embeddings.length },
              timing: { completedAt: now }
            },
            86400
          );
        } catch {}
        console.log(`✅ Successfully processed: ${result.id} (${result.chunks.length} chunks, ${result.embeddings.length} embeddings)`);
      } catch (err: any) {
        console.error('❌ Job failed:', err?.message || err);
        try {
          const statusKey = `job:ingest:${payload.id}`;
          await redis.set(
            statusKey,
            { id: payload.id, status: 'failed', progress: 100, error: String(err?.message || err) },
            86400
          );
          await redis.set(`error:${payload.id}`, String(err?.stack || err), 86400);
        } catch {}
      }

    } catch (error: any) {
      console.error('❌ Worker error:', error?.message || error);
      // Brief delay before retrying to prevent tight error loops
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await redis.close();
  process.exit(0);
});

// Start the worker
void runWorker();
