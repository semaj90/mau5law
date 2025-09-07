/*
 * Vector Search API with pgvector integration
 * Semantic similarity search across documents, cases, and chunks
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { documents, document_chunks, cases, vectors } from '$lib/server/schema/documents';
import { eq, desc, and, gt, sql } from 'drizzle-orm';
import { createEmbedding } from '$lib/services/embedding-service';
import { cache, getCachedSearchResults, cacheSearchResults } from '$lib/server/cache/redis';

const CACHE_TTL = 180; // 3 minutes for vector search results
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_LIMIT = 10;

interface VectorSearchRequest {
  query: string;
  threshold?: number;
  limit?: number;
  entity_types?: ('document' | 'chunk' | 'case')[];
  vector_types?: ('content' | 'title' | 'summary')[];
  filters?: {
    case_id?: string;
    document_type?: string;
    risk_level?: string;
    jurisdiction?: string;
    practice_area?: string;
    created_after?: string;
    created_before?: string;
  };
  include_content?: boolean;
  boost_factors?: {
    title?: number;
    content?: number;
    summary?: number;
  };
}

interface VectorSearchResult {
  id: string;
  entity_type: 'document' | 'chunk' | 'case';
  vector_type: 'content' | 'title' | 'summary';
  similarity: number;
  boosted_score?: number;
  title: string;
  content?: string;
  summary?: string;
  metadata: {
    document_type?: string;
    risk_level?: string;
    confidence_level?: number;
    case_title?: string;
    jurisdiction?: string;
    practice_area?: string;
    created_at: string;
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const searchRequest: VectorSearchRequest = await request.json();

    // Validate request
    if (!searchRequest.query || searchRequest.query.trim().length === 0) {
      return json({ error: 'Query is required and cannot be empty' }, { status: 400 });
    }

    const {
      query,
      threshold = DEFAULT_SIMILARITY_THRESHOLD,
      limit = DEFAULT_LIMIT,
      entity_types = ['document', 'chunk', 'case'],
      vector_types = ['content', 'title', 'summary'],
      filters = {},
      include_content = false,
      boost_factors = { title: 1.2, content: 1.0, summary: 0.9 },
    } = searchRequest;

    // Build cache key
    const cacheKey = `vector_search:${Buffer.from(JSON.stringify(searchRequest)).toString('base64')}`;

    // Try cache first
    const cached = await getCachedSearchResults(query, 'vector-api', {
      threshold,
      limit,
      entity_types,
      vector_types,
      filters,
    });
    if (cached) {
      const payload = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return json(payload);
    }

    // Generate query embedding
    let queryEmbedding: number[];
    try {
      queryEmbedding = await createEmbedding(query);
    } catch (error) {
      console.error('Failed to generate query embedding:', error);
      return json({ error: 'Failed to generate embedding for query' }, { status: 500 });
    }

    // Search across different entity types
    const searchPromises = [];

    // 1. Search documents
    if (entity_types.includes('document')) {
      const documentSearches = vector_types
        .map((vectorType) => {
          let vectorColumn;
          switch (vectorType) {
            case 'title':
              vectorColumn = documents.title_embedding;
              break;
            case 'summary':
              vectorColumn = documents.summary_embedding;
              break;
            default:
              vectorColumn = documents.embedding;
          }

          if (!vectorColumn) return null;

          const conditions = [
            eq(documents.is_active, true),
            eq(documents.is_indexed, true),
            sql`${vectorColumn} IS NOT NULL`,
          ];

          // Apply filters
          if (filters.case_id) {
            conditions.push(eq(documents.case_id, filters.case_id));
          }
          if (filters.document_type) {
            conditions.push(eq(documents.document_type, filters.document_type));
          }
          if (filters.risk_level) {
            conditions.push(eq(documents.risk_level, filters.risk_level));
          }
          if (filters.jurisdiction) {
            conditions.push(eq(documents.jurisdiction, filters.jurisdiction));
          }
          if (filters.practice_area) {
            conditions.push(eq(documents.practice_area, filters.practice_area));
          }
          if (filters.created_after) {
            conditions.push(sql`${documents.created_at} >= ${filters.created_after}`);
          }
          if (filters.created_before) {
            conditions.push(sql`${documents.created_at} <= ${filters.created_before}`);
          }

          return db
            .select({
              id: documents.id,
              entity_type: sql`'document'::text`,
              vector_type: sql`'${vectorType}'::text`,
              similarity: sql`1 - (${vectorColumn} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
              title: documents.title,
              content: include_content ? documents.content : sql`NULL`,
              summary: documents.ai_summary,
              document_type: documents.document_type,
              risk_level: documents.risk_level,
              confidence_level: documents.confidence_level,
              case_title: sql`NULL`,
              jurisdiction: documents.jurisdiction,
              practice_area: documents.practice_area,
              created_at: documents.created_at,
            })
            .from(documents)
            .where(and(...conditions))
            .having(
              sql`1 - (${vectorColumn} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}`
            )
            .orderBy(sql`similarity DESC`)
            .limit(limit);
        })
        .filter(Boolean);

      searchPromises.push(...documentSearches);
    }

    // 2. Search document chunks
    if (entity_types.includes('chunk')) {
      const chunkSearch = db
        .select({
          id: document_chunks.id,
          entity_type: sql`'chunk'::text`,
          vector_type: sql`'content'::text`,
          similarity: sql`1 - (${document_chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
          title: document_chunks.section_title,
          content: include_content ? document_chunks.chunk_text : sql`NULL`,
          summary: document_chunks.chunk_summary,
          document_type: documents.document_type,
          risk_level: documents.risk_level,
          confidence_level: documents.confidence_level,
          case_title: cases.title,
          jurisdiction: documents.jurisdiction,
          practice_area: documents.practice_area,
          created_at: document_chunks.created_at,
        })
        .from(document_chunks)
        .leftJoin(documents, eq(document_chunks.document_id, documents.id))
        .leftJoin(cases, eq(documents.case_id, cases.id))
        .where(and(sql`${document_chunks.embedding} IS NOT NULL`, eq(documents.is_active, true)))
        .having(
          sql`1 - (${document_chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}`
        )
        .orderBy(sql`similarity DESC`)
        .limit(limit);

      searchPromises.push(chunkSearch);
    }

    // 3. Search cases
    if (entity_types.includes('case')) {
      const caseSearch = db
        .select({
          id: cases.id,
          entity_type: sql`'case'::text`,
          vector_type: sql`'content'::text`,
          similarity: sql`1 - (${cases.case_embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
          title: cases.title,
          content: include_content ? cases.description : sql`NULL`,
          summary: sql`NULL`,
          document_type: sql`'case'::text`,
          risk_level: sql`NULL`,
          confidence_level: sql`NULL`,
          case_title: cases.title,
          jurisdiction: cases.jurisdiction,
          practice_area: sql`NULL`,
          created_at: cases.created_at,
        })
        .from(cases)
        .where(and(sql`${cases.case_embedding} IS NOT NULL`, eq(cases.status, 'active')))
        .having(
          sql`1 - (${cases.case_embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}`
        )
        .orderBy(sql`similarity DESC`)
        .limit(limit);

      searchPromises.push(caseSearch);
    }

    // Execute all searches in parallel
    const searchResults = await Promise.all(searchPromises);

    // Flatten and process results
    const allResults: VectorSearchResult[] = searchResults.flat().map((result: any) => {
      const similarity = Number(result.similarity);
      const vectorType = result.vector_type as keyof typeof boost_factors;
      const boostFactor = boost_factors[vectorType] || 1.0;
      const boostedScore = similarity * boostFactor;

      return {
        id: result.id,
        entity_type: result.entity_type,
        vector_type: result.vector_type,
        similarity,
        boosted_score: boostedScore,
        title: result.title || 'Untitled',
        content: result.content,
        summary: result.summary,
        metadata: {
          document_type: result.document_type,
          risk_level: result.risk_level,
          confidence_level: result.confidence_level,
          case_title: result.case_title,
          jurisdiction: result.jurisdiction,
          practice_area: result.practice_area,
          created_at: result.created_at?.toISOString() || new Date().toISOString(),
        },
      };
    });

    // Sort by boosted score and limit results
    const sortedResults = allResults
      .sort((a, b) => (b.boosted_score || b.similarity) - (a.boosted_score || a.similarity))
      .slice(0, limit);

    // Prepare response
    const response = {
      query,
      results: sortedResults,
      metadata: {
        total_found: sortedResults.length,
        threshold_used: threshold,
        embedding_model: 'nomic-embed-text',
        search_time_ms: Date.now(), // Will be calculated by client
        entity_types_searched: entity_types,
        vector_types_searched: vector_types,
        boost_factors_applied: boost_factors,
      },
    };

    // Cache results
    await cacheSearchResults(query, 'vector-api', response.results, {
      threshold,
      limit,
      entity_types,
      vector_types,
      filters,
    });

    return json(response);
  } catch (error) {
    console.error('Vector search error:', error);
    return json(
      {
        error: 'Vector search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || url.searchParams.get('query');
    if (!query) {
      return json({ error: 'Query parameter "q" or "query" is required' }, { status: 400 });
    }

    // Convert URL params to POST request format
    const searchRequest: VectorSearchRequest = {
      query,
      threshold: parseFloat(
        url.searchParams.get('threshold') || String(DEFAULT_SIMILARITY_THRESHOLD)
      ),
      limit: parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)),
      entity_types: (url.searchParams.get('entity_types')?.split(',') as any) || ['document'],
      vector_types: (url.searchParams.get('vector_types')?.split(',') as any) || ['content'],
      include_content: url.searchParams.get('include_content') === 'true',
      filters: {},
    };

    // Add filters from URL params
    const filterParams = [
      'case_id',
      'document_type',
      'risk_level',
      'jurisdiction',
      'practice_area',
      'created_after',
      'created_before',
    ];
    filterParams.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value) {
        (searchRequest.filters as any)[param] = value;
      }
    });

    // Create a fake request object to reuse POST logic
    const fakeRequest = {
      json: async () => searchRequest,
    };

    return await exports.POST({ request: fakeRequest as any, url } as any);
  } catch (error) {
    console.error('Vector search GET error:', error);
    return json(
      {
        error: 'Vector search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
