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
async function generateGemmaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fastStringify({,
        model: 'nomic-embed-text',
        input: text
      })
    })
    if (!response.ok) throw new Error(`Ollama embedding failed: ${response.statusText}`)
    const result = await response.json()
    return result.embeddings[0]
  } catch (error) {
    console.error('GemmaEmbeddingService error:', error)
    return new Array(768).fill(0)
  }
}
// GPU-accelerated similarity computation via CUDA service
async function computeGPUSimilarity(queryEmbedding: number[], candidates: any[]): Promise<any[]> {
  try {
    const response = await fetch('http://localhost:8097/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fastStringify({,
        query: queryEmbedding,
        vectors: candidates.map(c => c.embedding),
        k: candidates.length,
        precision: 'fp64'  // Use higher precision for subtle differences
      })
    })
    if (!response.ok) throw new Error(`GPU similarity failed: ${response.statusText}`)
    const result = await response.json()
    return candidates.map((candidate, idx) => ({
      ...candidate,
      gpu_similarity: result.similarities[idx],
      precision_used: 'fp64'
    })
  } catch (error) {
    console.error('GPU similarity computation failed:', error)
    return candidates
  }
}
// Precision detection and escalation logic
function detectSubtleDifferences(candidates: any[]): { needsGPU: boolean; needsFP64: boolean } {
  if (candidates.length < PRECISION_CONFIG.MIN_CANDIDATES_FOR_GPU) {
    return { needsGPU: false, needsFP64: false }
  }
  // Sort by similarity to analyze top candidates
  const sorted = [...candidates].sort((a, b) => b.similarity - a.similarity)
  if (sorted.length < 3) return { needsGPU: false, needsFP64: false }
  // Check for subtle differences between top candidates
  const scoreDiff1 = sorted[0].similarity - sorted[1].similarity
  const scoreDiff2 = sorted[1].similarity - sorted[2].similarity
  const hasSubtleDiffs = scoreDiff1 < PRECISION_CONFIG.SUBTLE_DIFF_THRESHOLD ||
                        scoreDiff2 < PRECISION_CONFIG.SUBTLE_DIFF_THRESHOLD
  return {
    needsGPU: candidates.length >= PRECISION_CONFIG.GPU_BATCH_THRESHOLD,
    needsFP64: hasSubtleDiffs
  }
}
function rerankLegalResults(results: any[], query: string): any[] {
  return results
    .map((result) => {
      let boost = 0
      const content = ((result as { embedding?: any; content?: any; title?: any; table?: any; similarity?: any }).content || (result as { embedding?: any; content?: any; title?: any; table?: any; similarity?: any }).title || '').toLowerCase()
      const queryLower = query.toLowerCase()
      ['evidence', 'case', 'court', 'legal', 'law', 'precedent'].forEach((keyword) => {
        if (content.includes(keyword) && queryLower.includes(keyword)) boost += 0.1
      })
      if ((result as { embedding?: any; content?: any; title?: any; table?: any; similarity?: any }).table === 'evidence') boost += 0.15
      if ((result as { embedding?: any; content?: any; title?: any; table?: any; similarity?: any }).table === 'cases') boost += 0.1
      return {
        ...result,
        legal_relevance_score: Math.min((result as { embedding?: any; content?: any; title?: any; table?: any; similarity?: any }).similarity + boost, 1.0)
      }
    })
    .sort((a, b) => b.legal_relevance_score - a.legal_relevance_score)
}
async function performVectorSearch(
  embedding: number[],
  limit: number = 20,
  threshold: number = 0.7
): Promise<any[]> {
  const embeddingStr = `[${embedding.join(',')}]`
  try {
    // Get initial results with embeddings for potential GPU re-ranking
    const evidenceResults = await db.execute(sql`
      SELECT ev.id, ev.content, ev.embedding, e.title, e.evidence_type, e.created_at, 'evidence' as table_type,
             1 - (ev.embedding <=> ${embeddingStr}::vector) as similarity
      FROM evidence_vectors ev JOIN evidence e ON ev.evidence_id = e.id
      WHERE 1 - (ev.embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ev.embedding <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `)
    const caseResults = await db.execute(sql`
      SELECT ce.id, ce.content, ce.embedding, c.title, c.case_number, c.created_at, 'cases' as table_type,
             1 - (ce.embedding::text::vector <=> ${embeddingStr}::vector) as similarity
      FROM case_embeddings ce JOIN cases c ON ce.case_id = c.id
      WHERE 1 - (ce.embedding::text::vector <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ce.embedding::text::vector <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `)
    return [...evidenceResults.rows, ...caseResults.rows]
      .map((row) => ({
        id: row.id,
        content: row.content,
        title: row.title,
        table: row.table_type,
        similarity: Number(row.similarity),
        created_at: row.created_at,
        embedding: row.embedding ? (typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding) : null
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  } catch (error) {
    console.error('VectorSimilaritySearch error:', error)
    return []
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
    const queryEmbedding = await generateGemmaEmbedding(query.trim()
    const rawResults = await performVectorSearch(queryEmbedding, limit, threshold)
    // Precision detection and GPU escalation
    const precisionAnalysis = detectSubtleDifferences(rawResults)
    let finalResults = rawResults
    let computationMetadata = {
      precision_used: 'fp32',
      gpu_accelerated: false,
      escalation_reason: null,
    }
    // GPU-accelerated re-ranking for subtle differences or large batches
    if (precisionAnalysis.needsGPU || precisionAnalysis.needsFP64) {
      const candidatesWithEmbeddings = rawResults.filter(r => r.embedding)
      if (candidatesWithEmbeddings.length >= PRECISION_CONFIG.MIN_CANDIDATES_FOR_GPU) {
        try {
          const gpuResults = await computeGPUSimilarity(queryEmbedding, candidatesWithEmbeddings)
          // Merge GPU results with original results
          finalResults = rawResults.map(result => {
            const gpuResult = gpuResults.find(gr => gr.id === result.id)
            return gpuResult || result
          })
          computationMetadata = {
            precision_used: precisionAnalysis.needsFP64 ? 'fp64' : 'fp32',
            gpu_accelerated: true,
            escalation_reason: precisionAnalysis.needsFP64 ? 'subtle_differences' : 'batch_optimization',
          }
        } catch (error) {
          console.warn('GPU computation failed, falling back to CPU:', error)
        }
      }
    }
    const rerankedResults = rerankLegalResults(finalResults, query.trim()
    EmbeddingSearchCache.set(cacheKey, { results: rerankedResults, timestamp: Date.now() })
    return json({
      success: true,
      results: rerankedResults,
      query: query.trim(),
      total_results: rerankedResults.length,
      total_time_ms: Date.now() - startTime,
      search_metadata: {
        embedding_model: 'nomic-embed-text',
        reranker: 'legal_relevance_v1',
        threshold_used: threshold,
        computation: computationMetadata,
        precision_analysis: {
          subtle_differences_detected: precisionAnalysis.needsFP64,
          gpu_batch_eligible: precisionAnalysis.needsGPU,
          candidate_count: rawResults.length
        }
      }
    })
  } catch (error) {
    console.error('SemanticSearchHandler error:', error)
    return json({ success: false, error: 'Semantic search failed' }, { status: 500 })
  }
}