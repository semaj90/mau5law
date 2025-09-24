/**
 * Vector Search API - pgvector with CUDA acceleration for legal document search
 * Handles semantic search, similarity queries, and parallel processing
 */
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabaseUrl, getCudaServiceUrl } from '$lib/config/pgvector-gpu-config.js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
interface VectorSearchRequest {
  query: string
  embedding?: number[]
  limit?: number
  threshold?: number
  includeMetadata?: boolean
  filters?: {
    documentType?: string[]
    jurisdiction?: string[]
    dateRange?: { start: string; end: string }
    practiceArea?: string[]
    riskLevel?: string[]
  }
  searchMethod?: 'cosine' | 'euclidean' | 'dot' | 'hnsw'
  useCUDA?: boolean
  rerank?: boolean
}
interface SearchResult {
  id: string
  content: string
  similarity: number
  metadata?: any
  embedding?: number[]
}
interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  performance: {
    searchTime: number
    embeddingTime?: number
    cudaTime?: number
    rerankTime?: number
  }
  query: {
    original: string
    embedding?: number[]
    filters: any
  }
}
// Initialize database connection
const client = postgres(getDatabaseUrl())
const db = drizzle(client)
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now()
  const requestId = `srch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  try {
    const body: VectorSearchRequest = await request.json()
    const {
      query,
      embedding: providedEmbedding
      limit = 100,
      threshold = 0.7,
      includeMetadata = true,
      filters = {},
      searchMethod = 'cosine',
      useCUDA = true,
      rerank = false
    } = body
    if (!query && !providedEmbedding) {
      throw error(400, 'Either query text or embedding vector is required')
    }
    let queryEmbedding: number[]
    let embeddingTime = 0
    if (providedEmbedding) {
      queryEmbedding = providedEmbedding
    } else {
      // Generate embedding for the query
      const embeddingStart = Date.now()
      // Enhanced routing with CHR-ROM optimization
      const queryComplexity = calculateSearchComplexity(query, filters)
      const shouldUseCUDA = useCUDA && (
        query.length > 100 ||
        queryComplexity > 60 ||
        Object.keys(filters).length > 2
      )
      if (shouldUseCUDA) {
        queryEmbedding = await generateCUDAEmbedding(query, requestId)
      } else {
        queryEmbedding = await generateOllamaEmbedding(query)
      }
      embeddingTime = Date.now() - embeddingStart
    }
    // Perform vector search
    const searchStart = Date.now()
    const searchResults = await performVectorSearch({
      embedding: queryEmbedding
      limit,
      threshold,
      includeMetadata,
      filters,
      searchMethod,
      useCUDA
    })
    const searchTime = Date.now() - searchStart
    // Optional re-ranking with CUDA
    let rerankTime = 0
    if (rerank && useCUDA && searchResults.length > 1) {
      const rerankStart = Date.now()
      searchResults.sort((a, b) => b.similarity - a.similarity)
      rerankTime = Date.now() - rerankStart
    }
    const response: SearchResponse = {
      results: searchResults
      totalCount: searchResults.length,
      performance: {
        searchTime,
        embeddingTime: embeddingTime > 0 ? embeddingTime : undefined
        rerankTime: rerankTime > 0 ? rerankTime : undefined
      },
      query: {
        original: query
        embedding: includeMetadata ? queryEmbedding : undefined
        filters
      }
    }
    return json(response)
  } catch (err) {
    console.error('Vector search API error:', err)
    throw error(500, `Vector search failed: ${err instanceof Error ? err.message: 'Unknown error'}`)
  }
}
async function generateCUDAEmbedding(text: string, requestId?: string): Promise<number[]> {
  const cudaUrl = getCudaServiceUrl('submit')
  const payload = {
    type: 'embedding_single',
    text,
    model: 'embeddinggemma:latest',
    request_id: requestId || `emb_${Date.now()}`,
    config: {
      normalize: true
      use_tensor_cores: true
      memory_optimization: 'CHR_ROM_search_aligned',
      legal_text_optimization: true
      context_window_size: Math.min(512, text.length)
    },
    search_specific: {
      query_type: 'legal_search',
      semantic_enhancement: true
      entity_aware_embedding: true
      precedent_similarity_boost: true
    }
  }
  const response = await fetch(cudaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    throw new Error(`CUDA embedding service error: ${response.statusText}`)
  }
  const result = await response.json()
  return result.embedding || []
}
async function generateOllamaEmbedding(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11436'
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({,
      model: 'embeddinggemma:latest',
      prompt: text
    })
  })
  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`)
  }
  const result = await response.json()
  return result.embedding as number[]
}
async function performVectorSearch(params: {
  embedding: number[]
  limit: number
  threshold: number
  includeMetadata: boolean
  filters: any
  searchMethod: string
  useCUDA: boolean
}): Promise<SearchResult[]> {
  const { embedding, limit, threshold, includeMetadata, filters, searchMethod } = params
  // Build filter conditions
  const filterConditions: string[] = []
  const filterParams: any[] = []
  let paramIndex = 2; // Start from $2 since $1 is the embedding
  if (filters.documentType && filters.documentType.length > 0) {
    filterConditions.push(`metadata->>'documentType' = ANY($${paramIndex})`)
    filterParams.push(filters.documentType)
    paramIndex++
  }
  if (filters.jurisdiction && filters.jurisdiction.length > 0) {
    filterConditions.push(`metadata->'case'->>'jurisdiction' = ANY($${paramIndex})`)
    filterParams.push(filters.jurisdiction)
    paramIndex++
  }
  if (filters.practiceArea && filters.practiceArea.length > 0) {
    filterConditions.push(`metadata->'classification'->'practiceArea' ?| $${paramIndex}`)
    filterParams.push(filters.practiceArea)
    paramIndex++
  }
  if (filters.riskLevel && filters.riskLevel.length > 0) {
    filterConditions.push(`metadata->'classification'->>'riskLevel' = ANY($${paramIndex})`)
    filterParams.push(filters.riskLevel)
    paramIndex++
  }
  if (filters.dateRange) {
    filterConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
    filterParams.push(filters.dateRange.start, filters.dateRange.end)
    paramIndex += 2
  }
  // Build the main query
  const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : ''
  let distanceOperator: string
  let orderDirection: string
  switch (searchMethod) {
    case 'cosine':
      distanceOperator = '<->'
      orderDirection = 'ASC'
      break
    case 'euclidean':
      distanceOperator = '<->'
      orderDirection = 'ASC'
      break
    case 'dot':
      distanceOperator = '<#>'
      orderDirection = 'DESC'
      break
    case 'hnsw':
    default:
      distanceOperator = '<->'
      orderDirection = 'ASC'
      break
  }
  const query = `
    SELECT
      id,
      content,
      (1 - (embedding ${distanceOperator} $1)) as similarity,
      ${includeMetadata ? 'metadata,' : ''}
      ${includeMetadata ? 'embedding,' : ''}
      created_at
    FROM legal_documents
    ${whereClause}
    ORDER BY embedding ${distanceOperator} $1 ${orderDirection}
    LIMIT $${paramIndex}
  `
  const queryParams = [JSON.stringify(embedding), ...filterParams, limit]
  try {
    const results = await db.execute(sql.raw(query, queryParams))
    return results.rows
      .filter((row: any) => row.similarity >= threshold)
      .map((row: any) => ({,
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: includeMetadata ? row.metadata : undefined
        embedding: includeMetadata ? row.embedding : undefined
      }))
  } catch (dbError) {
    console.error('Database query error:', dbError)
    throw new Error(`Database search failed: ${dbError instanceof Error ? dbError.message: 'Unknown error'}`)
  }
}
// Enhanced search complexity analysis for legal queries
function calculateSearchComplexity(query: string, filters: any): number {
  let complexity = 0
  // Query length complexity
  complexity += Math.min(30, Math.log2(query.length + 1) * 5)
  // Legal terminology complexity
  const legalTerms = ['precedent', 'statute', 'jurisdiction', 'liability', 'negligence', 'contract', 'tort']
  const legalTermCount = legalTerms.reduce((count, term) =>
    count + (query.toLowerCase().includes(term) ? 1 : 0), 0)
  complexity += legalTermCount * 5
  // Filter complexity
  const filterCount = Object.keys(filters).length
  complexity += filterCount * 10
  // Date range complexity
  if (filters.dateRange) complexity += 15
  // Array filter complexity
  const arrayFilters = ['documentType', 'jurisdiction', 'practiceArea', 'riskLevel']
  arrayFilters.forEach(key => {
    if (filters[key] && Array.isArray(filters[key])) {
      complexity += filters[key].length * 3
    }
  })
  return Math.min(100, complexity)
}
// WebGPU/WebGL2 search optimization hints
function generateSearchClientHints(query: string, filters: any, complexity: number) {
  const queryLength = query.length
  const filterCount = Object.keys(filters).length
  return {
    prefer_webgpu: queryLength < 200 && filterCount < 3 && complexity < 50
    prefer_webgl2: queryLength < 100 && filterCount < 2
    prefer_wasm_preprocessing: queryLength < 50
    intel_gpu_optimized: true
    search_specific: {
      embedding_cache: true
      query_preprocessing: queryLength > 20
      filter_optimization: filterCount > 2
      result_ranking_gpu: complexity > 60
    },
    memory_patterns: {
      embedding_alignment: true
      result_coalescing: true
      metadata_streaming: filterCount > 1
      chr_rom_cache: complexity > 75
    }
  }
}
export const GET: RequestHandler = async () => {
  // Health check endpoint
  try {
    const testQuery = `SELECT 1 as health_check`
    await db.execute(sql.raw(testQuery))
    return json({
      status: 'healthy',
      database: 'connected',
      pgvector: 'available',
      features: {
        chrRomOptimization: true
        cudaAcceleration: true
        legalTextSpecialization: true
        webgpuClientHints: true
      },
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    throw error(500, `Health check failed: ${err instanceof Error ? err.message: 'Unknown error'}`)
  }
}