
import { json } from "@sveltejs/kit";
import { db, legalDocuments } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { getVectorStore } from "$lib/ai/langchain-rag";
import type { RequestHandler } from './$types';

interface EnhancedSearchRequest {
  query: string;
  k?: number;
  limit?: number;
  threshold?: number;
  useGemmaEmbeddings?: boolean;
  includePgVector?: boolean;
  filters?: {
    category?: string;
    jurisdiction?: string;
    parties?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
}

interface EnhancedSearchResult {
  chunk: string;
  score?: number;
  distance?: number;
  semantic_score?: number;
  relevance_level?: 'high' | 'medium' | 'low';
  doc?: any;
  metadata?: any;
  source: 'langchain' | 'pgvector' | 'hybrid';
}

interface EnhancedSearchResponse {
  success: boolean;
  query: string;
  results: EnhancedSearchResult[];
  langchain_results?: number;
  pgvector_results?: number;
  total_results: number;
  processing_time: number;
  embedding_time?: number;
  search_time?: number;
  semantic_scores?: {
    highest_relevance: number;
    lowest_relevance: number;
    average_relevance: number;
  };
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  const startTime = Date.now();

  try {
    const body: EnhancedSearchRequest = await request.json();
    const {
      query,
      k = 5,
      limit,
      threshold,
      useGemmaEmbeddings = false,
      includePgVector = false,
      filters,
    } = body;

    if (!query) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    const results: EnhancedSearchResult[] = [];
    let embeddingTime = 0;
    let searchTime = 0;

    // Option 1: Use LangChain vector store (original functionality)
    if (!useGemmaEmbeddings && !includePgVector) {
      const searchStart = Date.now();

      // Retrieve from LangChain vector store
      const store = getVectorStore();
      const langchainResults = await store.similaritySearch(query, k);

      searchTime = Date.now() - searchStart;

      // Hydrate documents from DB for richer metadata
      for (const r of langchainResults) {
        const id = r.metadata?.id;
        if (id) {
          const docs = await db
            .select()
            .from(legalDocuments)
            .where(eq(legalDocuments.id, id))
            .limit(1);

          if (docs[0]) {
            results.push({
              chunk: r.pageContent,
              score: r.score,
              semantic_score: r.score ? 1 - r.score : undefined,
              relevance_level: r.score
                ? r.score < 0.3
                  ? 'high'
                  : r.score < 0.7
                    ? 'medium'
                    : 'low'
                : 'medium',
              doc: docs[0],
              source: 'langchain',
            });
          }
        } else {
          results.push({
            chunk: r.pageContent,
            score: r.score,
            semantic_score: r.score ? 1 - r.score : undefined,
            relevance_level: r.score
              ? r.score < 0.3
                ? 'high'
                : r.score < 0.7
                  ? 'medium'
                  : 'low'
              : 'medium',
            source: 'langchain',
          });
        }
      }
    }

    // Option 2: Use Gemma embeddings + pgvector (enhanced functionality)
    if (useGemmaEmbeddings || includePgVector) {
      try {
        const semanticResponse = await fetch('/api/rag/semantic-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: limit || k,
            threshold: threshold || 1.0,
            filters,
          }),
        });

        if (semanticResponse.ok) {
          const semanticData = await semanticResponse.json();

          if (semanticData.success) {
            embeddingTime = semanticData.embedding_time;
            searchTime += semanticData.search_time;

            // Add pgvector results
            for (const result of semanticData.results) {
              results.push({
                chunk: result.content || `Document: ${result.title}`,
                distance: result.distance,
                semantic_score: result.semantic_score,
                relevance_level: result.relevance_level,
                doc: result,
                metadata: result.metadata,
                source: includePgVector && !useGemmaEmbeddings ? 'pgvector' : 'hybrid',
              });
            }
          }
        }
      } catch (error) {
        console.error('Enhanced search fallback error:', error);
        // Fallback to LangChain if Gemma/pgvector fails
        if (results.length === 0) {
          const store = getVectorStore();
          const fallbackResults = await store.similaritySearch(query, k);

          for (const r of fallbackResults) {
            results.push({
              chunk: r.pageContent,
              score: r.score,
              source: 'langchain',
            });
          }
        }
      }
    }

    // Calculate semantic scores if available
    const distances = results.filter((r) => r.distance !== undefined).map((r) => r.distance!);
    const scores = results.filter((r) => r.score !== undefined).map((r) => r.score!);

    let semanticScores;
    if (distances.length > 0) {
      semanticScores = {
        highest_relevance: Math.min(...distances),
        lowest_relevance: Math.max(...distances),
        average_relevance: distances.reduce((a, b) => a + b, 0) / distances.length,
      };
    } else if (scores.length > 0) {
      semanticScores = {
        highest_relevance: Math.min(...scores),
        lowest_relevance: Math.max(...scores),
        average_relevance: scores.reduce((a, b) => a + b, 0) / scores.length,
      };
    }

    const response: EnhancedSearchResponse = {
      success: true,
      query,
      results,
      langchain_results: results.filter((r) => r.source === 'langchain').length,
      pgvector_results: results.filter((r) => r.source === 'pgvector' || r.source === 'hybrid')
        .length,
      total_results: results.length,
      processing_time: Date.now() - startTime,
      ...(embeddingTime && { embedding_time: embeddingTime }),
      ...(searchTime && { search_time: searchTime }),
      ...(semanticScores && { semantic_scores: semanticScores }),
    };

    return json(response);
  } catch (e: any) {
    console.error('Enhanced RAG API error:', e);
    return json(
      {
        success: false,
        error: e.message,
        processing_time: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
};

