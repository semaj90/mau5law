import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Enhanced Document Search API with PostgreSQL + pgvector + Cognitive Cache
import { db, getDatabaseHealth } from '$lib/server/db';
import { legal_documents, evidence, cases } from '$lib/server/db/schema-postgres';
import { cognitiveCacheManager } from '$lib/services/cognitive-cache-integration';
import { sql, eq, and, or, gte, lte } from "drizzle-orm";

// Ensure database is initialized
let dbInitialized = false;

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Search] Processing document search request...');

    // Check database health before proceeding
    const dbHealth = await getDatabaseHealth();
    if (dbHealth.overall !== 'healthy') {
      return json({
        success: false,
        error: 'Database temporarily unavailable',
        healthStatus: dbHealth
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      query,
      embedding,
      limit = 10,
      threshold = 0.7,
      searchType = 'hybrid',
      filters = {},
    } = body;

    if (!query && !embedding) {
      throw error(400, 'Query or embedding is required');
    }

    console.log(`[Search] Performing ${searchType} search for: "${query}"`);

    // Check cognitive cache for search results
    const cacheKey = `document_search_${searchType}_${Buffer.from(JSON.stringify({ query, filters, limit, threshold })).toString('base64').substring(0, 32)}`;
    const cacheRequest = {
      key: cacheKey,
      type: 'legal-data' as const,
      context: {
        action: 'document-search',
        searchType,
        query: query?.substring(0, 50) || 'embedding-search',
        workflowStep: 'search-execution',
        priority: 'medium' as const,
        semanticTags: ['document-search', 'legal-ai', searchType]
      }
    };

    const cachedResult = await cognitiveCacheManager.get(cacheRequest);
    if (cachedResult && cachedResult.confidence > 0.75) {
      console.log('[Search] Cognitive cache hit');
      return json({ ...cachedResult.data, cached: true, cacheConfidence: cachedResult.confidence });
    }

    let results: any[] = [];
    let searchMethod = '';

    // Generate embedding for the query if not provided
    let queryEmbedding = embedding;
    if (query && !queryEmbedding) {
      try {
        console.log('[Search] Generating query embedding...');
        const embResponse = await fetch('/api/embeddings/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: query,
            model: 'nomic-embed-text',
          }),
        });

        if (embResponse.ok) {
          const embResult = await embResponse.json();
          queryEmbedding = embResult.embedding;
        }
      } catch (embError) {
        console.warn('[Search] Failed to generate query embedding:', embError);
      }
    }

    // Perform search based on type
    switch (searchType) {
      case 'vector':
        if (queryEmbedding) {
          results = await vectorSearch(queryEmbedding, limit, threshold, filters);
          searchMethod = 'Vector Similarity';
        } else {
          throw error(400, 'Embedding required for vector search');
        }
        break;

      case 'keyword':
        results = await keywordSearch(query, limit, filters);
        searchMethod = 'Full-text Search';
        break;

      case 'hybrid':
        results = await hybridSearch(query, queryEmbedding, limit, threshold, filters);
        searchMethod = 'Hybrid (Vector + Keyword)';
        break;

      case 'semantic':
        if (queryEmbedding) {
          results = await semanticSearch(query, queryEmbedding, limit, threshold, filters);
          searchMethod = 'Semantic + Context';
        } else {
          results = await keywordSearch(query, limit, filters);
          searchMethod = 'Keyword (fallback)';
        }
        break;

      default:
        throw error(400, 'Invalid search type');
    }

    // Log search session (simplified - could be extended to user activity table)
    console.log(`[Search] Query: "${query || 'embedding-only'}", Type: ${searchType}, Results: ${results.length}`);

    const finalResult = {
      success: true,
      results,
      count: results.length,
      searchType,
      searchMethod,
      query,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache search results with cognitive cache
    await cognitiveCacheManager.set(cacheRequest, finalResult, {
      distributeAcrossCaches: true,
      cognitiveValue: results.length > 0 ? 0.8 : 0.6,
      ttl: 300 // 5 minutes
    });
    console.log('[Search] Results cached with cognitive cache');

    console.log(`[Search] Found ${results.length} results using ${searchMethod}`);
    return json(finalResult);
  } catch (err: any) {
    console.error('[Search] Error:', err);

    return json(
      {
        success: false,
        error: err.message || 'Search failed',
        details: err.stack,
      },
      { status: err.status || 500 }
    );
  }
};

// Vector similarity search with pgvector
async function vectorSearch(
  embedding: number[],
  limit: number,
  threshold: number,
  filters: any
): Promise<any[]> {
  try {
    console.log('[Search] Performing pgvector similarity search');

    // Build conditions array for better type safety
    const conditions = [
      sql`1 - (${legal_documents.content_embedding} <=> ${JSON.stringify(embedding)}::vector) > ${threshold}`
    ];

    if (filters.documentType) {
      conditions.push(eq(legal_documents.document_type, filters.documentType));
    }
    if (filters.jurisdiction) {
      conditions.push(eq(legal_documents.jurisdiction, filters.jurisdiction));
    }
    if (filters.practiceArea) {
      conditions.push(eq(legal_documents.practice_area, filters.practiceArea));
    }
    if (filters.dateFrom) {
      conditions.push(gte(legal_documents.created_at, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(legal_documents.created_at, new Date(filters.dateTo)));
    }
    if (filters.isConfidential !== undefined) {
      conditions.push(eq(legal_documents.is_confidential, filters.isConfidential));
    }

    const results = await db
      .select({
        id: legal_documents.id,
        title: legal_documents.title,
        filename: legal_documents.file_name,
        content: legal_documents.content,
        documentType: legal_documents.document_type,
        jurisdiction: legal_documents.jurisdiction,
        practiceArea: legal_documents.practice_area,
        createdAt: legal_documents.created_at,
        analysisResults: legal_documents.analysis_results,
        isConfidential: legal_documents.is_confidential,
        similarity: sql<number>`1 - (${legal_documents.content_embedding} <=> ${JSON.stringify(embedding)}::vector)`
      })
      .from(legal_documents)
      .where(
        legal_documents.content_embedding.isNotNull()
          ? and(...conditions)
          : sql`false` // Skip if no embeddings
      )
      .orderBy(sql`similarity DESC`)
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      filename: row.filename,
      title: row.title || row.filename,
      content: row.content,
      excerpt: row.content ? row.content.substring(0, 200) + '...' : '',
      documentType: row.documentType,
      jurisdiction: row.jurisdiction,
      practiceArea: row.practiceArea,
      similarity: parseFloat(row.similarity?.toString() || '0'),
      createdAt: row.createdAt,
      legalAnalysis: row.analysisResults,
      isConfidential: row.isConfidential,
      searchType: 'vector',
    }));
  } catch (err: any) {
    console.error('[Search] Vector search error:', err);
    return [];
  }
}

// Full-text keyword search
async function keywordSearch(query: string, limit: number, filters: any): Promise<any[]> {
  try {
    console.log('[Search] Performing PostgreSQL full-text search');

    // Build conditions for full-text search
    const conditions = [
      sql`to_tsvector('english', ${legal_documents.content}) @@ plainto_tsquery('english', ${query})`
    ];

    if (filters.documentType) {
      conditions.push(eq(legal_documents.document_type, filters.documentType));
    }
    if (filters.jurisdiction) {
      conditions.push(eq(legal_documents.jurisdiction, filters.jurisdiction));
    }
    if (filters.practiceArea) {
      conditions.push(eq(legal_documents.practice_area, filters.practiceArea));
    }
    if (filters.isConfidential !== undefined) {
      conditions.push(eq(legal_documents.is_confidential, filters.isConfidential));
    }

    const results = await db
      .select({
        id: legal_documents.id,
        title: legal_documents.title,
        filename: legal_documents.file_name,
        content: legal_documents.content,
        documentType: legal_documents.document_type,
        jurisdiction: legal_documents.jurisdiction,
        practiceArea: legal_documents.practice_area,
        createdAt: legal_documents.created_at,
        analysisResults: legal_documents.analysis_results,
        isConfidential: legal_documents.is_confidential,
        rank: sql<number>`ts_rank(to_tsvector('english', ${legal_documents.content}), plainto_tsquery('english', ${query}))`
      })
      .from(legal_documents)
      .where(and(...conditions))
      .orderBy(sql`rank DESC`)
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      filename: row.filename,
      title: row.title || row.filename,
      content: row.content,
      excerpt: extractExcerpt(row.content || '', query),
      documentType: row.documentType,
      jurisdiction: row.jurisdiction,
      practiceArea: row.practiceArea,
      similarity: parseFloat(row.rank?.toString() || '0'),
      createdAt: row.createdAt,
      legalAnalysis: row.analysisResults,
      isConfidential: row.isConfidential,
      searchType: 'keyword',
    }));
  } catch (err: any) {
    console.error('[Search] Keyword search error:', err);
    return [];
  }
}

// Hybrid search combining vector and keyword
async function hybridSearch(
  query: string,
  embedding: number[] | null,
  limit: number,
  threshold: number,
  filters: any
): Promise<any[]> {
  console.log('[Search] Performing hybrid search');

  // Perform both searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    embedding ? vectorSearch(embedding, limit * 2, threshold, filters) : Promise.resolve([]),
    keywordSearch(query, limit * 2, filters),
  ]);

  // Combine and deduplicate results
  const combinedResults = new Map();

  // Add vector results with higher weight
  vectorResults.forEach((result) => {
    combinedResults.set(result.id, {
      ...result,
      score: result.similarity * 0.7, // Vector weight
      sources: ['vector'],
    });
  });

  // Add/update with keyword results
  keywordResults.forEach((result) => {
    if (combinedResults.has(result.id)) {
      const existing = combinedResults.get(result.id);
      existing.score += result.similarity * 0.3; // Keyword weight
      existing.sources.push('keyword');
    } else {
      combinedResults.set(result.id, {
        ...result,
        score: result.similarity * 0.3,
        sources: ['keyword'],
      });
    }
  });

  // Sort by combined score and limit
  return Array.from(combinedResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => ({
      ...result,
      similarity: result.score,
      searchType: 'hybrid',
      matchedBy: result.sources,
    }));
}

// Enhanced semantic search with context
async function semanticSearch(
  query: string,
  embedding: number[],
  limit: number,
  threshold: number,
  filters: any
): Promise<any[]> {
  console.log('[Search] Performing semantic search with context');

  // Get vector results first
  const vectorResults = await vectorSearch(embedding, limit * 3, threshold * 0.8, filters);

  // Enhance with semantic context analysis
  return vectorResults
    .map((result) => {
      const contextScore = calculateContextScore(query, result.content);
      const legalRelevance = calculateLegalRelevance(query, result.legalAnalysis);

      return {
        ...result,
        contextScore,
        legalRelevance,
        enhancedSimilarity: result.similarity * 0.6 + contextScore * 0.2 + legalRelevance * 0.2,
        searchType: 'semantic',
      };
    })
    .sort((a, b) => b.enhancedSimilarity - a.enhancedSimilarity)
    .slice(0, limit);
}

// Extract relevant excerpt from content based on query
function extractExcerpt(content: string, query: string): string {
  const words = query.toLowerCase().split(' ');
  const sentences = content.split(/[.!?]+/);

  // Find sentence containing query terms
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (words.some((word) => lowerSentence.includes(word))) {
      return sentence.trim().substring(0, 200) + '...';
    }
  }

  // Fallback to first 200 characters
  return content.substring(0, 200) + '...';
}

// Calculate context relevance score
function calculateContextScore(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(' ');
  const contentWords = content.toLowerCase().split(' ');

  let matches = 0;
  for (const queryWord of queryWords) {
    if (contentWords.includes(queryWord)) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

// Calculate legal relevance score
function calculateLegalRelevance(query: string, legalAnalysis: any): number {
  if (!legalAnalysis) return 0;

  const queryLower = query.toLowerCase();
  let relevanceScore = 0;

  // Check legal entities
  if (legalAnalysis.entities) {
    for (const entity of legalAnalysis.entities) {
      if (queryLower.includes(entity.text.toLowerCase())) {
        relevanceScore += entity.confidence || 0.5;
      }
    }
  }

  // Check legal concepts
  if (legalAnalysis.concepts) {
    for (const concept of legalAnalysis.concepts) {
      if (queryLower.includes(concept.toLowerCase())) {
        relevanceScore += 0.3;
      }
    }
  }

  return Math.min(relevanceScore, 1.0);
}

// Store document endpoint (renamed to avoid duplicate POST export)
// Note: Document storage is handled by the dedicated /api/documents/upload endpoint
// This search endpoint focuses on querying existing documents

// Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    // Get comprehensive database health status
    const dbHealth = await getDatabaseHealth();
    
    // Count documents with embeddings
    let documentCount = 0;
    let embeddingCount = 0;
    try {
      const [docResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(legal_documents);
      documentCount = docResult?.count || 0;

      const [embResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(legal_documents)
        .where(legal_documents.content_embedding.isNotNull());
      embeddingCount = embResult?.count || 0;
    } catch (err: any) {
      console.warn('[Search] Failed to count documents:', err);
    }

    // Test cognitive cache
    let cacheStatus = false;
    try {
      await cognitiveCacheManager.get({ key: 'health_check', type: 'legal-data', context: { action: 'health-test' } });
      cacheStatus = true;
    } catch (err: any) {
      console.warn('[Search] Cognitive cache health check failed:', err);
    }

    return json({
      status: dbHealth.overall === 'healthy' ? 'healthy' : 'unhealthy',
      service: 'Enhanced Legal Document Search',
      features: {
        vectorSearch: dbHealth.overall === 'healthy',
        keywordSearch: dbHealth.overall === 'healthy',
        hybridSearch: dbHealth.overall === 'healthy',
        semanticSearch: dbHealth.overall === 'healthy',
        cognitiveCaching: cacheStatus,
        documentStorage: dbHealth.overall === 'healthy',
        pgvectorIntegration: dbHealth.postgres.connected,
        qdrantIntegration: dbHealth.qdrant?.connected || false
      },
      database: {
        postgres: dbHealth.postgres,
        qdrant: dbHealth.qdrant,
        overall: dbHealth.overall,
        documents: documentCount,
        embeddings: embeddingCount,
        embeddingCoverage: documentCount > 0 ? (embeddingCount / documentCount * 100).toFixed(1) + '%' : '0%'
      },
      cache: {
        cognitive: cacheStatus,
        type: 'ML-driven cognitive cache'
      },
      timestamp: new Date().toISOString(),
      version: '3.0.0'
    });
  } catch (err: any) {
    return json(
      {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
};
