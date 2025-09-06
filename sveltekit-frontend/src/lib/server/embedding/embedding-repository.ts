
// Generic EmbeddingRepository abstraction for ingestion & semantic search
// Minimal initial contract – can be extended with pagination, updates, deletions.

export interface IngestionJobRequest {
  evidenceId: string;              // Existing evidence row id (metadata & file linkage)
  caseId?: string;                 // Optional case linkage
  filename?: string;               // Original filename
  mimeType?: string;               // MIME type
  textContent: string;             // Already extracted text (PDF parsing handled earlier)
  model?: string;                  // Embedding model (default: nomic-embed-text)
  chunkSize?: number;              // Override default chunk size
  chunkOverlap?: number;           // Override default overlap
  metadata?: Record<string, any>;  // Arbitrary metadata for downstream query filters
}

export interface IngestionJobStatus {
  jobId: string;
  evidenceId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalChunks?: number;
  processedChunks?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  model?: string;
}

export interface SimilarityQueryOptions {
  limit?: number;          // Max results
  threshold?: number;      // Minimum similarity (0-1)
  filter?: Record<string, any>; // Future: metadata filter
  model?: string;          // Embedding model to use for the query
}

export interface SimilarityResult {
  id: string;
  evidenceId?: string;
  documentId?: string;
  content: string;
  score: number;          // 0-1 similarity (higher is better)
  metadata?: Record<string, any>;
  chunkIndex?: number;
}

export interface EmbeddingRepository {
  enqueueIngestion(job: IngestionJobRequest): Promise<IngestionJobStatus>;
  getJobStatus(jobId: string): Promise<IngestionJobStatus | null>;
  processNextJob(): Promise<IngestionJobStatus | null>; // Worker-driven
  querySimilar(query: string, options?: SimilarityQueryOptions): Promise<SimilarityResult[]>;
}

// Factory loader (lazy to avoid circular imports in SvelteKit runtime)
let _repo: EmbeddingRepository | null = null;
export async function getEmbeddingRepository(): Promise<EmbeddingRepository> {
  if (_repo) return _repo;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  
  const impl = await import('./pgvector-embedding-repository');
  _repo = impl.pgvectorEmbeddingRepository as EmbeddingRepository;
  return _repo!;
}
