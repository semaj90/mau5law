
// PgVector-backed implementation of EmbeddingRepository with Gemma embeddings priority.
import { db } from '../db/index';
import { legal_documents, documentChunks } from '../db/schema-postgres';
import { sql } from 'drizzle-orm';
import { splitText } from './text-splitter';
// Use the higher-level embedder which includes Redis/L1 caching and provider fallbacks
import { embedText } from '../ai/embedder';
import type { EmbeddingRepository, IngestionJobRequest, SimilarityQueryOptions, SimilarityResult, IngestionJobStatus } from './embedding-repository';
import { enqueue, processNext as queueProcessNext, getStatus } from './ingestion-queue';

const DEFAULT_MODEL = 'embeddinggemma:latest';

async function embedContent(text: string, model: string): Promise<number[]> {
  // Try Gemma embeddings first, with fallback chain
  const models = model === DEFAULT_MODEL ? 
    ['embeddinggemma:latest', 'embeddinggemma', 'nomic-embed-text'] : 
    [model, 'embeddinggemma:latest', 'embeddinggemma', 'nomic-embed-text'];
  
  for (const tryModel of models) {
    try {
      // embedText handles cache lookups (memory/Redis) and caches results
      const emb = await embedText(text, tryModel);
      const embedding = Array.isArray(emb) ? emb : (emb && typeof emb === 'object' && 'embedding' in emb ? (emb as any).embedding as number[] : []);
      
      if (embedding.length > 0) {
        return embedding;
      }
    } catch (error) {
      console.warn(`Embedding with ${tryModel} failed, trying next model:`, error);
      continue;
    }
  }
  
  throw new Error(`All embedding models failed for text: ${text.substring(0, 100)}...`);
}

async function enqueueIngestion(job: IngestionJobRequest): Promise<IngestionJobStatus> {
  // Normalize optional overrides into payload (queue just stores object)
  return enqueue(job);
}

async function processNextJob(): Promise<IngestionJobStatus | null> {
  return queueProcessNext(async (payload, update) => {
    const { evidenceId, textContent, model = DEFAULT_MODEL, chunkSize, chunkOverlap } = payload;
    if (!textContent) throw new Error('Missing textContent');
    const chunks = splitText(textContent, { chunkSize: chunkSize || 220, overlap: chunkOverlap ?? 30 });
    update({ totalChunks: chunks.length });
    let processed = 0;
    for (const { text, index } of chunks) {
      const embedding = await embedContent(text, model);
      await db.insert(documentChunks).values({
        documentId: evidenceId, // reuse evidenceId as document linkage for now
        documentType: 'evidence',
        chunkIndex: index,
        content: text,
        embedding
      });
      processed++;
      update({ processedChunks: processed });
    }
  });
}

function getJobStatus(jobId: string) {
  return getStatus(jobId);
}

async function querySimilar(query: string, options: SimilarityQueryOptions = {}): Promise<SimilarityResult[]> {
  const model = options.model || DEFAULT_MODEL;
  const queryEmbedding = await embedContent(query, model);
  const limit = options.limit || 8;
  const rows = await db.execute(sql`SELECT id, document_id, document_type, chunk_index, content, embedding <=> ${queryEmbedding} AS distance
                                     FROM document_chunks
                                     ORDER BY embedding <=> ${queryEmbedding}
                                     LIMIT ${limit}`);
  return rows.map((r: any) => ({
    id: String(r.id),
    documentId: String(r.document_id),
    documentType: String(r.document_type),
    chunkIndex: Number(r.chunk_index),
    content: String(r.content),
    score: 1 - Number(r.distance)
  }));
}

export const pgvectorEmbeddingRepository: EmbeddingRepository = {
  enqueueIngestion,
  processNextJob,
  getJobStatus: async (jobId: string) => getJobStatus(jobId) || null,
  querySimilar
};

// Named exports (optional direct usage)
export { enqueueIngestion, processNextJob, getJobStatus, querySimilar };
