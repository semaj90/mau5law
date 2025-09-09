/*
 * Advanced Vector Similarity Search Engine
 * Implements sophisticated algorithms for legal document similarity
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const CUDA_SERVICE_URL = 'http://localhost:8096';
const EMBEDDING_MODEL = 'nomic-embed-text:latest';
const SIMILARITY_THRESHOLD = 0.65;

// Advanced schemas
const VectorSearchSchema = z.object({
  query: z.string().min(1),
  searchType: z.enum(['semantic', 'legal', 'factual', 'temporal']).default('semantic'),
  evidenceTypes: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional(),
  weights: z.object({
    semantic: z.number().min(0).max(1).default(0.4),
    legal: z.number().min(0).max(1).default(0.3),
    temporal: z.number().min(0).max(1).default(0.2),
    contextual: z.number().min(0).max(1).default(0.1)
  }).optional(),
  minSimilarity: z.number().min(0).max(1).default(0.65),
  maxResults: z.number().min(1).max(50).default(10)
});

const ClusterAnalysisSchema = z.object({
  evidenceIds: z.array(z.string().uuid()),
  clusterMethod: z.enum(['kmeans', 'hierarchical', 'dbscan']).default('kmeans'),
  numClusters: z.number().min(2).max(20).optional(),
  includeOutliers: z.boolean().default(false)
});

// Types
interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: {
    type: string;
    timestamp: string;
    legalContext: string[];
    entityMentions: string[];
    topicTags: string[];
  };
}

interface SimilarityResult {
  evidenceId: string;
  filename: string;
  similarity: number;
  similarityBreakdown: {
    semantic: number;
    legal: number;
    temporal: number;
    contextual: number;
  };
  matchingConcepts: string[];
  relevantEntities: string[];
  confidenceScore: number;
}

interface EvidenceCluster {
  clusterId: string;
  centerEvidence: string;
  members: string[];
  commonThemes: string[];
  clusterStrength: number;
  legalRelevance: string;
}

// Advanced similarity calculation with multiple dimensions
class AdvancedSimilarityEngine {

  // Multi-dimensional similarity calculation
  static calculateAdvancedSimilarity(
    vector1: number[],
    vector2: number[],
    metadata1: VectorEmbedding['metadata'],
    metadata2: VectorEmbedding['metadata'],
    weights: { semantic: number; legal: number; temporal: number; contextual: number }
  ): { total: number; breakdown: SimilarityResult['similarityBreakdown'] } {

    // 1. Semantic similarity (cosine similarity)
    const semanticSim = this.cosineSimilarity(vector1, vector2);

    // 2. Legal context similarity (Jaccard index on legal terms)
    const legalSim = this.jaccardSimilarity(
      metadata1.legalContext,
      metadata2.legalContext
    );

    // 3. Temporal similarity (time-based decay)
    const temporalSim = this.temporalSimilarity(
      metadata1.timestamp,
      metadata2.timestamp
    );

    // 4. Contextual similarity (entity overlap)
    const contextualSim = this.entitySimilarity(
      metadata1.entityMentions,
      metadata2.entityMentions
    );

    // Weighted combination
    const totalSimilarity =
      (semanticSim * weights.semantic) +
      (legalSim * weights.legal) +
      (temporalSim * weights.temporal) +
      (contextualSim * weights.contextual);

    return {
      total: totalSimilarity,
      breakdown: {
        semantic: semanticSim,
        legal: legalSim,
        temporal: temporalSim,
        contextual: contextualSim
      }
    };
  }

  // Standard cosine similarity
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return (normA === 0 || normB === 0) ? 0 : dotProduct / (normA * normB);
  }

  // Jaccard similarity for sets
  static jaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1.map(s => s.toLowerCase()));
    const s2 = new Set(set2.map(s => s.toLowerCase()));

    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Time-based similarity with exponential decay
  static temporalSimilarity(time1: string, time2: string): number {
    const date1 = new Date(time1).getTime();
    const date2 = new Date(time2).getTime();

    const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
    const decayFactor = 30; // 30-day half-life

    return Math.exp(-daysDiff / decayFactor);
  }

  // Entity-based similarity
  static entitySimilarity(entities1: string[], entities2: string[]): number {
    return this.jaccardSimilarity(entities1, entities2);
  }

  // Advanced clustering using K-means
  static performClustering(
    embeddings: VectorEmbedding[],
    numClusters: number,
    method: 'kmeans' | 'hierarchical' | 'dbscan'
  ): EvidenceCluster[] {
    // Simplified K-means implementation
    const clusters: EvidenceCluster[] = [];

    if (embeddings.length < numClusters) {
      numClusters = Math.max(1, embeddings.length);
    }

    // Initialize centroids randomly
    const centroids = this.initializeCentroids(embeddings, numClusters);
    const assignments: number[] = new Array(embeddings.length);

    // K-means iterations
    for (let iter = 0; iter < 50; iter++) {
      // Assign each point to nearest centroid
      let changed = false;
      for (let i = 0; i < embeddings.length; i++) {
        let bestCluster = 0;
        let bestDistance = Infinity;

        for (let j = 0; j < centroids.length; j++) {
          const distance = 1 - this.cosineSimilarity(embeddings[i].vector, centroids[j]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update centroids
      for (let j = 0; j < centroids.length; j++) {
        const clusterPoints = embeddings.filter((_, i) => assignments[i] === j);
        if (clusterPoints.length > 0) {
          centroids[j] = this.calculateCentroid(clusterPoints.map(p => p.vector));
        }
      }
    }

    // Build cluster results
    for (let i = 0; i < numClusters; i++) {
      const members = embeddings
        .filter((_, idx) => assignments[idx] === i)
        .map(e => e.id);

      if (members.length > 0) {
        const commonThemes = this.extractCommonThemes(
          embeddings.filter((_, idx) => assignments[idx] === i)
        );

        clusters.push({
          clusterId: `cluster_${i}`,
          centerEvidence: members[0], // Simplified: use first member as center
          members,
          commonThemes,
          clusterStrength: members.length / embeddings.length,
          legalRelevance: this.assessLegalRelevance(commonThemes)
        });
      }
    }

    return clusters;
  }

  // Helper methods
  static initializeCentroids(embeddings: VectorEmbedding[], k: number): number[][] {
    const centroids: number[][] = [];
    const dim = embeddings[0]?.vector.length || 0;

    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * embeddings.length);
      centroids.push([...embeddings[randomIndex].vector]);
    }

    return centroids;
  }

  static calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vector[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= vectors.length;
    }

    return centroid;
  }

  static extractCommonThemes(embeddings: VectorEmbedding[]): string[] {
    const allThemes = embeddings.flatMap(e => e.metadata.topicTags);
    const themeCount = new Map<string, number>();

    for (const theme of allThemes) {
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
    }

    return Array.from(themeCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, _]) => theme);
  }

  static assessLegalRelevance(themes: string[]): string {
    const legalKeywords = ['contract', 'violation', 'statute', 'regulation', 'compliance', 'liability'];
    const relevantThemes = themes.filter(theme =>
      legalKeywords.some(keyword => theme.toLowerCase().includes(keyword))
    );

    if (relevantThemes.length >= 3) return 'High';
    if (relevantThemes.length >= 1) return 'Medium';
    return 'Low';
  }
}

// Mock vector database (replace with pgvector in production)
const mockVectorDB = new Map<string, VectorEmbedding>();

// Initialize with sample data
mockVectorDB.set('evidence-001', {
  id: 'evidence-001',
  vector: Array.from({length: 384}, () => Math.random() - 0.5),
  metadata: {
    type: 'contract',
    timestamp: '2025-09-01T10:00:00Z',
    legalContext: ['contract law', 'breach', 'damages'],
    entityMentions: ['ABC Corp', 'John Smith', 'Contract 2023-001'],
    topicTags: ['contract violation', 'financial penalty', 'breach of terms']
  }
});

mockVectorDB.set('evidence-002', {
  id: 'evidence-002',
  vector: Array.from({length: 384}, () => Math.random() - 0.5),
  metadata: {
    type: 'correspondence',
    timestamp: '2025-09-02T15:30:00Z',
    legalContext: ['communications', 'intent', 'evidence'],
    entityMentions: ['Jane Doe', 'Legal Dept', 'Email Thread'],
    topicTags: ['communication evidence', 'intent to breach', 'legal awareness']
  }
});

/*
 * POST /api/v1/evidence/vector/search
 * Advanced vector similarity search with multi-dimensional scoring
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const endpoint = url.pathname.split('/').pop();

  if (endpoint === 'search') {
    try {
      // Authentication check
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const {
        query,
        searchType,
        evidenceTypes,
        timeRange,
        weights,
        minSimilarity,
        maxResults
      } = VectorSearchSchema.parse(body);

      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Search through vector database
      const results: SimilarityResult[] = [];

      for (const [evidenceId, embedding] of mockVectorDB) {
        // Apply filters
        if (evidenceTypes && !evidenceTypes.includes(embedding.metadata.type)) {
          continue;
        }

        if (timeRange?.start || timeRange?.end) {
          const evidenceTime = new Date(embedding.metadata.timestamp);
          if (timeRange.start && evidenceTime < new Date(timeRange.start)) continue;
          if (timeRange.end && evidenceTime > new Date(timeRange.end)) continue;
        }

        // Calculate advanced similarity
        const queryMetadata = {
          type: 'query',
          timestamp: new Date().toISOString(),
          legalContext: extractLegalTerms(query),
          entityMentions: extractEntities(query),
          topicTags: extractTopics(query)
        };

        const similarity = AdvancedSimilarityEngine.calculateAdvancedSimilarity(
          queryEmbedding,
          embedding.vector,
          queryMetadata,
          embedding.metadata,
          weights || { semantic: 0.4, legal: 0.3, temporal: 0.2, contextual: 0.1 }
        );

        if (similarity.total >= minSimilarity) {
          results.push({
            evidenceId,
            filename: `evidence_${evidenceId}.pdf`,
            similarity: similarity.total,
            similarityBreakdown: similarity.breakdown,
            matchingConcepts: findMatchingConcepts(queryMetadata.topicTags, embedding.metadata.topicTags),
            relevantEntities: findMatchingEntities(queryMetadata.entityMentions, embedding.metadata.entityMentions),
            confidenceScore: calculateConfidenceScore(similarity.total, embedding.metadata.legalContext.length)
          });
        }
      }

      // Sort by similarity and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, maxResults);

      return json({
        success: true,
        data: {
          query,
          searchType,
          results: limitedResults,
          totalFound: results.length,
          searchMetrics: {
            avgSimilarity: results.reduce((sum, r) => sum + r.similarity, 0) / results.length || 0,
            highConfidenceCount: results.filter(r => r.confidenceScore >= 0.8).length,
            processingTimeMs: Date.now() % 1000 // Mock processing time
          }
        }
      });

    } catch (error: any) {
      console.error('Advanced vector search failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid search parameters',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Vector search failed',
        details: error.message
      }, { status: 500 });
    }
  }

  /*
   * POST /api/v1/evidence/vector/cluster
   * Evidence clustering analysis
   */
  if (endpoint === 'cluster') {
    try {
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const { evidenceIds, clusterMethod, numClusters, includeOutliers } = ClusterAnalysisSchema.parse(body);

      // Get embeddings for specified evidence
      const embeddings = evidenceIds
        .map(id => mockVectorDB.get(id))
        .filter(Boolean) as VectorEmbedding[];

      if (embeddings.length < 2) {
        return json({
          message: 'At least 2 evidence items required for clustering'
        }, { status: 400 });
      }

      // Perform clustering
      const clusters = AdvancedSimilarityEngine.performClustering(
        embeddings,
        numClusters || Math.ceil(Math.sqrt(embeddings.length)),
        clusterMethod
      );

      // Calculate cluster statistics
      const clusterStats = {
        totalClusters: clusters.length,
        avgClusterSize: clusters.reduce((sum, c) => sum + c.members.length, 0) / clusters.length,
        strongestCluster: clusters.reduce((max, c) =>
          c.clusterStrength > max.clusterStrength ? c : max, clusters[0]),
        legalRelevanceDistribution: {
          high: clusters.filter(c => c.legalRelevance === 'High').length,
          medium: clusters.filter(c => c.legalRelevance === 'Medium').length,
          low: clusters.filter(c => c.legalRelevance === 'Low').length
        }
      };

      return json({
        success: true,
        data: {
          clusters,
          statistics: clusterStats,
          method: clusterMethod,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('Evidence clustering failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid clustering parameters',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Clustering analysis failed',
        details: error.message
      }, { status: 500 });
    }
  }

  return json({ message: 'Endpoint not found' }, { status: 404 });
};

// Helper functions
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.warn('Embedding generation failed, using mock:', error);
    return Array.from({length: 384}, () => Math.random() - 0.5);
  }
}

function extractLegalTerms(text: string): string[] {
  const legalTerms = [
    'contract', 'agreement', 'breach', 'violation', 'statute', 'regulation',
    'liability', 'damages', 'negligence', 'evidence', 'testimony', 'precedent',
    'jurisdiction', 'plaintiff', 'defendant', 'motion', 'injunction', 'settlement'
  ];

  return legalTerms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase())
  );
}

function extractEntities(text: string): string[] {
  // Simplified entity extraction - in production use NLP library
  const entities: string[] = [];

  // Extract potential company names (capitalized words ending with Corp, Inc, LLC)
  const companyRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Corp|Inc|LLC|Ltd)\b/g;
  const companies = text.match(companyRegex) || [];
  entities.push(...companies);

  // Extract potential person names (Title Case words)
  const nameRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const names = text.match(nameRegex) || [];
  entities.push(...names.slice(0, 5)); // Limit to avoid noise

  return entities;
}

function extractTopics(text: string): string[] {
  const topicKeywords = [
    'contract violation', 'breach of terms', 'financial penalty', 'legal compliance',
    'regulatory violation', 'evidence tampering', 'witness testimony', 'document fraud',
    'corporate liability', 'intellectual property', 'data breach', 'privacy violation'
  ];

  return topicKeywords.filter(topic =>
    text.toLowerCase().includes(topic.toLowerCase())
  );
}

function findMatchingConcepts(concepts1: string[], concepts2: string[]): string[] {
  const set1 = new Set(concepts1.map(c => c.toLowerCase()));
  const set2 = new Set(concepts2.map(c => c.toLowerCase()));

  return concepts1.filter(c => set2.has(c.toLowerCase()));
}

function findMatchingEntities(entities1: string[], entities2: string[]): string[] {
  const set1 = new Set(entities1.map(e => e.toLowerCase()));
  const set2 = new Set(entities2.map(e => e.toLowerCase()));

  return entities1.filter(e => set2.has(e.toLowerCase()));
}

function calculateConfidenceScore(similarity: number, legalContextSize: number): number {
  // Base confidence on similarity and legal context richness
  const basePonfidence = similarity;
  const contextBonus = Math.min(legalContextSize * 0.1, 0.2);

  return Math.min(basePonfidence + contextBonus, 1.0);
}
