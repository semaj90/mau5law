/**
 * Knowledge Searcher
 * Phase 76 - Knowledge Search Engine
 *
 * Core search component that combines:
 * - Qdrant semantic search (cosine similarity)
 * - TF-IDF keyword ranking
 * - MinIO full content retrieval
 * - Redis result caching
 *
 * Implements hybrid scoring: 0.7 * semantic + 0.3 * tfidf
 */

import type {
  SearchOptions,
  SearchResult,
  FullDocument,
  CollectionStats
} from './types';
import { getQdrantKnowledgeStore } from './QdrantKnowledgeStore';
import { getTfIdfRanker } from './TfIdfRanker';
import { getMinioKnowledgeStore } from './MinioKnowledgeStore';
import { getRedisCacheService } from './RedisCacheService';

export class KnowledgeSearcher {
  private qdrant = getQdrantKnowledgeStore();
  private tfidf = getTfIdfRanker();
  private minio = getMinioKnowledgeStore();
  private cache = getRedisCacheService();

  /**
   * Search knowledge base with hybrid ranking
   * Property 2: Results SHALL be sorted by combined score (0.7*semantic + 0.3*tfidf)
   * Property 3: Results SHALL contain all required fields
   * Property 8: Repeated queries SHALL use cache
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      topK = 10,
      threshold = 0.5,
      filters,
      includeContent = false,
      useCache = true
    } = options;

    // Check cache first
    if (useCache) {
      const cached = await this.cache.getCachedResults(query);
      if (cached) {
        return cached;
      }
    }

    // Perform semantic search in Qdrant
    const semanticResults = await this.qdrant.search(query, { topK: topK * 2, threshold });

    // Compute TF-IDF scores for each result
    const hybridResults: SearchResult[] = [];

    for (const result of semanticResults) {
      // Get TF-IDF vector from payload
      const tfIdfVector = result.payload?.tfIdfVector as Record<string, number> | undefined;

      if (!tfIdfVector) {
        // If no TF-IDF vector, use semantic score only
        hybridResults.push({
          id: result.id.toString(),
          title: result.payload?.title as string,
          url: result.payload?.url as string,
          summary: result.payload?.summary as string,
          tags: (result.payload?.tags as string[]) || [],
          scores: {
            semantic: result.score || 0,
            tfidf: 0,
            combined: result.score || 0
          }
        });
        continue;
      }

      // Convert Map to object for TF-IDF scoring
      const tfIdfMap = new Map(Object.entries(tfIdfVector));
      const tfidfScore = this.tfidf.score(query, tfIdfMap);

      // Calculate hybrid score: 0.7 * semantic + 0.3 * tfidf
      const semanticScore = result.score || 0;
      const combinedScore = 0.7 * semanticScore + 0.3 * tfidfScore;

      hybridResults.push({
        id: result.id.toString(),
        title: result.payload?.title as string,
        url: result.payload?.url as string,
        summary: result.payload?.summary as string,
        tags: (result.payload?.tags as string[]) || [],
        scores: {
          semantic: semanticScore,
          tfidf: tfidfScore,
          combined: combinedScore
        }
      });
    }

    // Sort by combined score (Property 2)
    hybridResults.sort((a, b) => b.scores.combined - a.scores.combined);

    // Take top K
    const topResults = hybridResults.slice(0, topK);

    // Fetch full content from MinIO if requested
    if (includeContent) {
      await Promise.all(
        topResults.map(async (result) => {
          try {
            const doc = await this.getDocument(result.id);
            if (doc) {
              result.content = doc.content;
            }
          } catch (error) {
            console.warn(`Failed to fetch content for ${result.id}:`, error);
          }
        })
      );
    }

    // Cache results
    if (useCache) {
      await this.cache.cacheSearchResults(query, topResults);
    }

    return topResults;
  }

  /**
   * Get full document by ID with content from MinIO
   * Property 4: Storage round-trip SHALL return identical content
   */
  async getDocument(id: string): Promise<FullDocument | null> {
    try {
      // Get metadata from Qdrant
      const point = await this.qdrant.getDocument(id);
      if (!point) {
        return null;
      }

      // Get full content from MinIO
      const minioKey = point.payload?.minioKey as string;
      if (!minioKey) {
        console.warn(`No MinIO key for document ${id}`);
        return null;
      }

      const content = await this.minio.getDocument(minioKey);

      return {
        id: point.id.toString(),
        title: point.payload?.title as string,
        url: point.payload?.url as string,
        content,
        summary: point.payload?.summary as string,
        entities: (point.payload?.entities as string[]) || [],
        tags: (point.payload?.tags as string[]) || [],
        scrapedAt: new Date(point.payload?.scrapedAt as string),
        minioKey
      };
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error);
      return null;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<CollectionStats> {
    try {
      const qdrantStats = await this.qdrant.getStats();
      // TODO: Add PostgreSQL and MinIO stats when those stores are fully integrated

      return {
        totalDocuments: qdrantStats.points,
        indexedVectors: qdrantStats.points,
        collections: {
          qdrant: {
            points: qdrantStats.points,
            status: qdrantStats.status
          },
          postgres: {
            rows: 0 // TODO: Implement
          },
          minio: {
            objects: 0, // TODO: Implement
            size: '0 MB' // TODO: Implement
          }
        },
        lastIndexed: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific query or all queries
   */
  async invalidateCache(queryHash?: string): Promise<void> {
    await this.cache.invalidateCache(queryHash);
  }
}

// Singleton instance
let instance: KnowledgeSearcher | null = null;

export function getKnowledgeSearcher(): KnowledgeSearcher {
  if (!instance) {
    instance = new KnowledgeSearcher();
  }
  return instance;
}
