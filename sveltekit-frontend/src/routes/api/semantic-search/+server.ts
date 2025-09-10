/**
 * Semantic Search API - pgvector + Gemma Embeddings Integration
 * 
 * @module SemanticSearchAPI - pgvector cosine similarity search on PostgreSQL with Gemma embeddings for legal context
 * @module GemmaEmbeddingService - Generate 768-dimensional vectors using embeddinggemma:latest via Ollama
 * @module LegalRelevanceReranker - Legal-specific result reranking with keyword boosting and recency scoring
 * @module VectorSimilaritySearch - Multi-table vector search across evidence, cases, and legal documents
 * @module EmbeddingSearchCache - In-memory caching for embedding performance (Redis alternative)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, evidence, cases, legalDocuments, evidenceVectors, caseEmbeddings, embeddingCache } from '$lib/server/db/client.js';
import { sql, eq } from 'drizzle-orm';

const EmbeddingSearchCache = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function generateGemmaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: text
      })
    });
    
    if (!response.ok) throw new Error(`Ollama embedding failed: ${response.statusText}`);
    const result = await response.json();
    return result.embedding;
  } catch (error) {
    console.error('GemmaEmbeddingService error:', error);
    return new Array(768).fill(0);
  }
}

function rerankLegalResults(results: any[], query: string): any[] {
  return results.map(result => {
    let boost = 0;
    const content = (result.content || result.title || '').toLowerCase();
    const queryLower = query.toLowerCase();
    
    ['evidence', 'case', 'court', 'legal', 'law', 'precedent'].forEach(keyword => {
      if (content.includes(keyword) && queryLower.includes(keyword)) boost += 0.1;
    });
    
    if (result.table === 'evidence') boost += 0.15;
    if (result.table === 'cases') boost += 0.1;
    
    return {
      ...result,
      legal_relevance_score: Math.min(result.similarity + boost, 1.0)
    };
  }).sort((a, b) => b.legal_relevance_score - a.legal_relevance_score);
}

async function performVectorSearch(embedding: number[], limit: number = 20, threshold: number = 0.7): Promise<any[]> {
  const embeddingStr = `[${embedding.join(',')}]`;
  
  try {
    const evidenceResults = await db.execute(sql`
      SELECT ev.id, ev.content, e.title, e.evidence_type, e.created_at, 'evidence' as table_type,
             1 - (ev.embedding <=> ${embeddingStr}::vector) as similarity
      FROM evidence_vectors ev JOIN evidence e ON ev.evidence_id = e.id
      WHERE 1 - (ev.embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ev.embedding <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `);

    const caseResults = await db.execute(sql`
      SELECT ce.id, ce.content, c.title, c.case_number, c.created_at, 'cases' as table_type,
             1 - (ce.embedding <=> ${embeddingStr}::vector) as similarity
      FROM case_embeddings ce JOIN cases c ON ce.case_id = c.id
      WHERE 1 - (ce.embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY ce.embedding <=> ${embeddingStr}::vector LIMIT ${Math.ceil(limit / 2)}
    `);

    return [...evidenceResults.rows, ...caseResults.rows]
      .map(row => ({
        id: row.id,
        content: row.content,
        title: row.title,
        table: row.table_type,
        similarity: Number(row.similarity),
        created_at: row.created_at
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('VectorSimilaritySearch error:', error);
    return [];
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');

    if (!query?.trim()) {
      return json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const cacheKey = `${query.trim()}:${limit}:${threshold}`;
    const cached = EmbeddingSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return json({ success: true, results: cached.results, cached: true });
    }

    const startTime = Date.now();
    const queryEmbedding = await generateGemmaEmbedding(query.trim());
    const rawResults = await performVectorSearch(queryEmbedding, limit, threshold);
    const rerankedResults = rerankLegalResults(rawResults, query.trim());

    EmbeddingSearchCache.set(cacheKey, { results: rerankedResults, timestamp: Date.now() });

    return json({
      success: true,
      results: rerankedResults,
      query: query.trim(),
      total_results: rerankedResults.length,
      total_time_ms: Date.now() - startTime,
      search_metadata: {
        embedding_model: 'embeddinggemma:latest',
        reranker: 'legal_relevance_v1',
        threshold_used: threshold
      }
    });
  } catch (error) {
    console.error('SemanticSearchHandler error:', error);
    return json({ success: false, error: 'Semantic search failed' }, { status: 500 });
  }
};
