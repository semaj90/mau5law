import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/*
 * RAG Search API - Semantic search across processed documents
 */
import { db } from '$lib/server/database';
import { documents, embeddings, searchSessions } from '$lib/server/db/schema-postgres';
import { readBodyFastWithMetrics, parseVectorData } from '$lib/simd/simd-json-integration';
import { fastStringify, fastParse } from '$lib/utils/fast-json';

import { desc, eq, sql } from 'drizzle-orm';

// Generate embedding for search query with improved error handling
async function generateQueryEmbedding(
  query: string,
  fetchFn: typeof fetch,
  model?: string,
  origin?: string
): Promise<number[] | null> {
  try {
    const endpoint = origin ? `${origin}/api/ai/embeddings` : '/api/ai/embeddings';
    const resp = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fastStringify({ text: query, model: model || 'embeddinggemma:latest', save: false }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Embedding API failed: ${resp.status} - ${txt}`);
    }

    const payload = await fastParse(await resp.text());
    if (!payload?.embedding || !Array.isArray(payload.embedding)) {
      throw new Error('Invalid embedding format received');
    }

    return payload.embedding;
  } catch (err: any) {
    console.error('Failed to generate query embedding:', err);
    if (!model || model === 'embeddinggemma:latest') {
      // Try a single fallback model once
      try {
        return await generateQueryEmbedding(query, fetchFn, 'nomic-embed-text', origin);
      } catch (e) {
        console.warn('Fallback embedding also failed:', e);
      }
    }
    return null;
  }
}

// Perform vector similarity search
async function vectorSearch(
  queryEmbedding: number[],
  limit: number,
  threshold: number,
  filters?: {
    caseId?: string;
    documentTypes?: string[];
    dateRange?: { start?: string; end?: string };
    confidenceMin?: number;
  }
): Promise<any[]> {
  try {
    let q = db
      .select({
        id: embeddings.id,
        documentId: embeddings.documentId,
        content: embeddings.content,
        metadata: embeddings.metadata,
        filename: documents.filename,
        fullContent: documents.content,
        confidence: documents.confidence,
        legalAnalysis: documents.legalAnalysis,
        createdAt: documents.createdAt,
        similarity:
          sql<number>`1 - (${embeddings.embedding} <=> ${fastStringify(queryEmbedding)}::vector)`.as(
            'similarity'
          ),
      })
      .from(embeddings)
      .innerJoin(documents, eq(embeddings.documentId, documents.id))
      .where(
        sql`1 - (${embeddings.embedding} <=> ${fastStringify(queryEmbedding)}::vector) > ${threshold}`
      );

    if (filters) {
      if (filters.caseId) q = q.where(sql`${documents.metadata}->>'caseId' = ${filters.caseId}`);
      if (filters.documentTypes && filters.documentTypes.length > 0)
        q = q.where(sql`${documents.metadata}->>'documentType' = ANY(${filters.documentTypes})`);
      if (filters.dateRange?.start)
        q = q.where(sql`${documents.createdAt} >= ${filters.dateRange.start}`);
      if (filters.dateRange?.end)
        q = q.where(sql`${documents.createdAt} <= ${filters.dateRange.end}`);
      if (filters.confidenceMin)
        q = q.where(sql`${documents.confidence} >= ${filters.confidenceMin}`);
    }

    const rows = await q
      .orderBy(
        desc(sql`1 - (${embeddings.embedding} <=> ${fastStringify(queryEmbedding)}::vector)`)
      )
      .limit(limit);

    return rows.map((r: any) => ({ ...r, searchType: 'semantic', score: r.similarity }));
  } catch (err: any) {
    console.error('Vector search failed:', err);
    if (filters) {
      console.log('Retrying vector search without filters');
      try {
        return await vectorSearch(queryEmbedding, limit, threshold);
      } catch {
        return [];
      }
    }
    return [];
  }
}

// Perform text-based search
async function textSearch(
  query: string,
  limit: number,
  filters?: {
    caseId?: string;
    documentTypes?: string[];
    dateRange?: { start?: string; end?: string };
    confidenceMin?: number;
  }
): Promise<any[]> {
  try {
    let q = db
      .select({
        id: documents.id,
        filename: documents.filename,
        content: documents.content,
        metadata: documents.metadata,
        confidence: documents.confidence,
        legalAnalysis: documents.legalAnalysis,
        createdAt: documents.createdAt,
        rank: sql<number>`ts_rank(to_tsvector('english', ${documents.content}), plainto_tsquery('english', ${query}))`.as(
          'rank'
        ),
      })
      .from(documents)
      .where(
        sql`to_tsvector('english', ${documents.content}) @@ plainto_tsquery('english', ${query})`
      );

    if (filters) {
      if (filters.caseId) q = q.where(sql`${documents.metadata}->>'caseId' = ${filters.caseId}`);
      if (filters.documentTypes && filters.documentTypes.length > 0)
        q = q.where(sql`${documents.metadata}->>'documentType' = ANY(${filters.documentTypes})`);
      if (filters.dateRange?.start)
        q = q.where(sql`${documents.createdAt} >= ${filters.dateRange.start}`);
      if (filters.dateRange?.end)
        q = q.where(sql`${documents.createdAt} <= ${filters.dateRange.end}`);
      if (filters.confidenceMin)
        q = q.where(sql`${documents.confidence} >= ${filters.confidenceMin}`);
    }

    const rows = await q
      .orderBy(
        desc(
          sql`ts_rank(to_tsvector('english', ${documents.content}), plainto_tsquery('english', ${query}))`
        )
      )
      .limit(limit);

    return rows.map((r: any) => ({
      ...r,
      similarity: Math.min(r.rank * 2, 1.0),
      searchType: 'text',
      score: r.rank,
    }));
  } catch (err: any) {
    console.error('Text search failed:', err);
    try {
      const fallback = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          content: documents.content,
          metadata: documents.metadata,
          confidence: documents.confidence,
          legalAnalysis: documents.legalAnalysis,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(sql`${documents.content} ILIKE ${`%${query}%`}`)
        .orderBy(desc(documents.createdAt))
        .limit(limit);

      return fallback.map((r: any) => ({ ...r, similarity: 0.7, searchType: 'text', score: 0.7 }));
    } catch (fallbackErr) {
      console.error('Fallback text search failed:', fallbackErr);
      return [];
    }
  }
}

export const POST: RequestHandler = async ({ request, fetch, url }) => {
  const startTime = Date.now();
  let queryEmbedding: number[] | null = null;

  try {
    const {
      query,
      searchType = 'hybrid',
      limit = 10,
      threshold = 0.7,
      caseId,
      documentTypes,
      dateRange,
      confidenceMin,
      model,
      includeMetadata = true,
      includeContent = true,
    } = await readBodyFastWithMetrics(request);

    if (!query) return json({ error: 'Query is required' }, { status: 400 });

    const filters = { caseId, documentTypes, dateRange, confidenceMin };
    let results: any[] = [];

    if (searchType === 'semantic' || searchType === 'hybrid') {
      queryEmbedding = await generateQueryEmbedding(query, fetch, model, url.origin);
      if (queryEmbedding) {
        const vectorResults = await vectorSearch(queryEmbedding, limit, threshold, filters);
        results = results.concat(vectorResults);
      }
    }

    if (searchType === 'text' || searchType === 'hybrid') {
      const textResults = await textSearch(query, limit, filters);
      results = results.concat(textResults);
    }

    const uniqueResults = results
      .filter((r, i, arr) => i === arr.findIndex((x) => x.id === r.id))
      .map((result) => {
        const baseScore = result.similarity || result.score || 0;
        const confidenceBoost = result.confidence ? result.confidence * 0.2 : 0;
        const combinedScore = Math.min(baseScore + confidenceBoost, 1.0);

        return {
          id: result.id,
          documentId: result.documentId,
          filename: result.filename,
          content: includeContent ? result.content : undefined,
          fullContent: includeContent ? result.fullContent : undefined,
          similarity: result.similarity,
          score: combinedScore,
          searchType: result.searchType,
          confidence: result.confidence,
          metadata: includeMetadata ? result.metadata : undefined,
          legalAnalysis: includeMetadata ? result.legalAnalysis : undefined,
          createdAt: result.createdAt,
          rank: results.indexOf(result) + 1,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const processingTime = Date.now() - startTime;

    if (queryEmbedding && uniqueResults.length > 0) {
      try {
        await db.insert(searchSessions).values({
          query,
          queryEmbedding,
          results: uniqueResults,
          searchType,
          resultCount: uniqueResults.length,
        });
      } catch (e) {
        console.error('Failed to save search session:', e);
      }
    }

    return json({
      success: true,
      query,
      results: uniqueResults,
      analytics: {
        totalResults: uniqueResults.length,
        searchType,
        processingTime: `${processingTime}ms`,
        hasEmbedding: !!queryEmbedding,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Enhanced RAG search error:', error);
    return json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        query: 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'health';

    switch (action) {
      case 'health': {
        const startTime = Date.now();
        const dbTest = await db.select({ count: sql<number>`count(*)` }).from(documents);
        const processingTime = Date.now() - startTime;

        return json({
          success: true,
          healthy: true,
          database: {
            connected: true,
            documentsCount: dbTest[0]?.count || 0,
            responseTime: `${processingTime}ms`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'stats': {
        const [docStats, embeddingStats, sessionStats] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(documents),
          db.select({ count: sql<number>`count(*)` }).from(embeddings),
          db.select({ count: sql<number>`count(*)` }).from(searchSessions),
        ]);

        return json({
          docCount: docStats[0]?.count || 0,
          embeddingCount: embeddingStats[0]?.count || 0,
          sessionCount: sessionStats[0]?.count || 0,
        });
      }

      default:
        return json({ success: true, action });
    }
  } catch (err: any) {
    console.error('GET /api/rag/search error:', err);
    return json(
      { error: 'Failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
};

