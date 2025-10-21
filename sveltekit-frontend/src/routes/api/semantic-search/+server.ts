/**
 * Semantic Search API - pgvector + Gemma Embeddings Integration
 *
 * @module SemanticSearchAPI - pgvector cosine similarity search on PostgreSQL with Gemma embeddings for legal context
 * @module GemmaEmbeddingService - Generate 768-dimensional vectors using embeddinggemma:latest via Ollama
 * @module LegalRelevanceReranker - Legal-specific result reranking with keyword boosting and recency scoring
 * @module VectorSimilaritySearch - Multi-table vector search across evidence, cases, and legal documents
 * @module EmbeddingSearchCache - In-memory caching for embedding performance (Redis alternative)
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import {
  db,
  evidence,
  cases,
  documentMetadata,
  documentEmbeddings,
  caseEmbeddings
} from '$lib/server/db/unified-client'
import { sql, eq } from 'drizzle-orm'
import { fastStringify, fastParse } from '$lib/utils/fast-json'
const EmbeddingSearchCache = new Map()
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
// Precision detection configuration
const PRECISION_CONFIG = {
  SUBTLE_DIFF_THRESHOLD: 0.02,   // fp32 vs fp64 escalation threshold
  GPU_BATCH_THRESHOLD: 10,       // Use GPU for batch processing
  MIN_CANDIDATES_FOR_GPU: 3,     // Minimum candidates for GPU re-ranking
  TENSOR_CORE_THRESHOLD: 100     // Use tensor cores for large operations
}

// Preferred/fallback embedding models
const PREFERRED_EMBEDDING_MODEL = 'embeddinggemma:latest'
const FALLBACK_EMBEDDING_MODEL = 'nomic-embed-text'
// last used model (updated by generateEmbedding)
let lastEmbeddingModelUsed = PREFERRED_EMBEDDING_MODEL

// Replace the previous generateGemmaEmbedding implementation with model fallback logic
async function generateGemmaEmbedding(text: string): Promise<number[]> {
  const models = [PREFERRED_EMBEDDING_MODEL, FALLBACK_EMBEDDING_MODEL];
  for (const model of models) {
    try {
      const response = await fetch('http://localhost:11434/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fastStringify({
          model,
          input: text,
        }),
      });
      if (!response.ok) {
        console.warn(`Embedding call to ${model} failed: ${response.status} ${response.statusText}`);
        continue;
      }
      const result = await response.json();
      // Ollama / embedding services may return embeddings under different keys; be defensive
      const emb = result.embeddings?.[0] ?? result.embedding?.[0] ?? result.embedding ?? null;
      if (Array.isArray(emb)) {
        lastEmbeddingModelUsed = model;
        return emb as number[];
      }
      // If response shape is unexpected, try next model
      console.warn(`Embedding response from ${model} did not contain an array embedding`);
    } catch (err) {
      console.warn(`Embedding model ${model} request failed:`, err);
      // try next model in list
    }
  }
  // All models failed -> return safe zero-vector and record fallback
  lastEmbeddingModelUsed = FALLBACK_EMBEDDING_MODEL;
  console.error('All embedding models failed, returning zero vector');
  return new Array(768).fill(0);
}

// Add explicit types for result candidates
type Candidate = {
  id: string;
  content?: string | null;
  title?: string | null;
  table?: 'evidence' | 'cases' | string | null;
  similarity: number;
  created_at?: string | Date | null;
  embedding?: number[] | string | null;
  gpu_similarity?: number | null;
  precision_used?: 'fp32' | 'fp64' | string;
  legal_relevance_score?: number;
};

// GPU-accelerated similarity computation via CUDA service
async function computeGPUSimilarity(queryEmbedding: number[], candidates: Candidate[]): Promise<Candidate[]> {
  try {
    const bodyObj = {
      query: queryEmbedding,
      vectors: candidates.map(c =>
        Array.isArray(c.embedding) ? c.embedding : typeof c.embedding === 'string' ? JSON.parse(c.embedding) : null
      ),
      k: candidates.length,
      precision: 'fp64',
    };
    const response = await fetch('http://localhost:8097/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fastStringify(bodyObj),
    });
    if (!response.ok) throw new Error(`GPU similarity failed: ${response.statusText}`);
    const result: unknown = await response.json();
    const similarities: number[] = Array.isArray((result as any)?.similarities) ? (result as any).similarities : [];
    return candidates.map((candidate, idx) => ({
      ...candidate,
      gpu_similarity: typeof similarities[idx] === 'number' ? similarities[idx] : (candidate.similarity ?? null),
      precision_used: 'fp64',
    }));
  } catch (error) {
    console.error('GPU similarity computation failed:', error);
    return candidates;
  }
}

// Precision detection and escalation logic
function detectSubtleDifferences(candidates: any[]): { needsGPU: boolean; needsFP64: boolean } {
  if (candidates.length < PRECISION_CONFIG.MIN_CANDIDATES_FOR_GPU) {
    return { needsGPU: false, needsFP64: false };
  }
  // Sort by similarity to analyze top candidates
  const sorted = [...candidates].sort((a, b) => b.similarity - a.similarity);
  if (sorted.length < 3) return { needsGPU: false, needsFP64: false };
  // Check for subtle differences between top candidates
  const scoreDiff1 = sorted[0].similarity - sorted[1].similarity;
  const scoreDiff2 = sorted[1].similarity - sorted[2].similarity;
  const hasSubtleDiffs =
    scoreDiff1 < PRECISION_CONFIG.SUBTLE_DIFF_THRESHOLD || scoreDiff2 < PRECISION_CONFIG.SUBTLE_DIFF_THRESHOLD;
  return {
    needsGPU: candidates.length >= PRECISION_CONFIG.GPU_BATCH_THRESHOLD,
    needsFP64: hasSubtleDiffs,
  };
}
function rerankLegalResults(results: Candidate[], query: string): Candidate[] {
  // keywords to boost for legal relevance
  const keywords = ['evidence', 'case', 'court', 'legal', 'law', 'precedent'];
  const queryLower = query.toLowerCase();
  return results
    .map(result => {
      let boost = 0;
      const content = ((result.content ?? result.title) || '').toString().toLowerCase();
      // boost when both content and query contain legal keywords
      for (const keyword of keywords) {
        if (content.includes(keyword) && queryLower.includes(keyword)) boost += 0.1;
      }
      if (result.table === 'evidence') boost += 0.15;
      if (result.table === 'cases') boost += 0.1;
      return {
        ...result,
        legal_relevance_score: Math.min((result.similarity ?? 0) + boost, 1.0),
      };
    })
    .sort((a, b) => (b.legal_relevance_score ?? 0) - (a.legal_relevance_score ?? 0));
}
async function performVectorSearch(
  embedding: number[],
  limit: number = 20,
  threshold: number = 0.7
): Promise<Candidate[]> {
  const embeddingStr = `[${embedding.join(',')}]`;
  try {
    // Get initial results with embeddings for potential GPU re-ranking
    const evidenceResults = await db.execute(sql`
      SELECT ev.id, ev.content, ev.embedding, e.title, e.evidence_type, e.created_at, 'evidence' as table_type,
             1 - (ev.embedding <=> ${embeddingStr}::vector) as similarity
      FROM evidence_vectors ev JOIN evidence e ON ev.evidence_id = e.id
      WHERE 1 - (ev.embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ev.embedding <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `);
    const caseResults = await db.execute(sql`
      SELECT ce.id, ce.content, ce.embedding, c.title, c.case_number, c.created_at, 'cases' as table_type,
             1 - (ce.embedding::text::vector <=> ${embeddingStr}::vector) as similarity
      FROM case_embeddings ce JOIN cases c ON ce.case_id = c.id
      WHERE 1 - (ce.embedding::text::vector <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ce.embedding::text::vector <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `);

    // Safely extract rows from the driver response (avoid implicit any)
    type DBRows = Record<string, unknown>[];
    const evidenceRows: DBRows = (evidenceResults as unknown as { rows?: DBRows }).rows ?? [];
    const caseRows: DBRows = (caseResults as unknown as { rows?: DBRows }).rows ?? [];

    return [...evidenceRows, ...caseRows]
      .map(row => {
        const rawEmbedding = row['embedding'] as unknown;
        const parsedEmbedding = rawEmbedding
          ? typeof rawEmbedding === 'string'
            ? (() => {
                try {
                  return JSON.parse(rawEmbedding as string) as number[];
                } catch {
                  return null;
                }
              })()
            : (rawEmbedding as number[])
          : null;
        return {
          id: String(row['id'] ?? ''),
          content: row['content'] as string | null,
          title: row['title'] as string | null,
          table: String(row['table_type'] ?? row['table'] ?? null),
          similarity: Number(row['similarity'] ?? 0),
          created_at: (row['created_at'] as string) ?? null,
          embedding: parsedEmbedding,
        } as Candidate;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('VectorSimilaritySearch error:', error);
    return [];
  }
}
export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q')
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const threshold = parseFloat(url.searchParams.get('threshold') || '0.7')
    if (!query?.trim()) {
      return json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 })
    }
    const cacheKey = `${query.trim()}:${limit}:${threshold}`
    const cached = EmbeddingSearchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return json({ success: true, results: cached.results, cached: true })
    }
    const startTime = Date.now()
    const queryEmbedding = await generateGemmaEmbedding(query.trim());
    const rawResults = await performVectorSearch(queryEmbedding, limit, threshold);
    // Precision detection and GPU escalation
    const precisionAnalysis = detectSubtleDifferences(rawResults);
    let finalResults = rawResults;
    const computationMetadata: { precision_used: string; gpu_accelerated: boolean; escalation_reason: string | null } =
      {
        precision_used: 'fp32',
        gpu_accelerated: false,
        escalation_reason: null,
      };
    // GPU-accelerated re-ranking for subtle differences or large batches
    if (precisionAnalysis.needsGPU || precisionAnalysis.needsFP64) {
      const candidatesWithEmbeddings = rawResults.filter(r => r.embedding);
      if (candidatesWithEmbeddings.length >= PRECISION_CONFIG.MIN_CANDIDATES_FOR_GPU) {
        try {
          const gpuResults = await computeGPUSimilarity(queryEmbedding, candidatesWithEmbeddings);
          // Merge GPU results with original results
          finalResults = rawResults.map(result => {
            const gpuResult = gpuResults.find(gr => gr.id === result.id);
            return gpuResult || result;
          });
          computationMetadata.precision_used = precisionAnalysis.needsFP64 ? 'fp64' : 'fp32';
          computationMetadata.gpu_accelerated = true;
          computationMetadata.escalation_reason = precisionAnalysis.needsFP64
            ? 'subtle_differences'
            : 'batch_optimization';
        } catch (error) {
          console.warn('GPU computation failed, falling back to CPU:', error);
        }
      }
    }
    const rerankedResults = rerankLegalResults(finalResults, query.trim());
    EmbeddingSearchCache.set(cacheKey, { results: rerankedResults, timestamp: Date.now() })
    return json({
      success: true,
      results: rerankedResults,
      query: query.trim(),
      total_results: rerankedResults.length,
      total_time_ms: Date.now() - startTime,
      search_metadata: {
        embedding_model: lastEmbeddingModelUsed,
        reranker: 'legal_relevance_v1',
        threshold_used: threshold,
        computation: computationMetadata,
        precision_analysis: {
          subtle_differences_detected: precisionAnalysis.needsFP64,
          gpu_batch_eligible: precisionAnalysis.needsGPU,
          candidate_count: rawResults.length,
        },
      },
    });
  } catch (error) {
    console.error('SemanticSearchHandler error:', error)
    return json({ success: false, error: 'Semantic search failed' }, { status: 500 })
  }
}