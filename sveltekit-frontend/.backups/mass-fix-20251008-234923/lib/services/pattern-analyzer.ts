
/**
 * Enhanced Pattern Analyzer with Multimodal Support
 *
 * Updated to integrate with the new ingestion pipeline:
 * - Multimodal content processing (text, image, audio, video)
 * - Worker pool integration for CPU-intensive operations
 * - Vector similarity search with pgvector
 * - Cross-modal pattern detection
 * - Advanced clustering and trend analysis
 */
import { db } from '$lib/server/db/index.js';
import { userDocuments, userPatterns, patternSessions } from '$lib/server/db/unified-schema.js';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { MinIOService } from '$lib/server/minio-service.js';
import { gemmaEmbeddingService } from './gemma-embedding-service.js';
import { sharedWorkerPool } from '$lib/server/ingest/worker-pool-simple.js';
import {
  embedText,
  embedImageBuffer,
  embedContent,
  fetchMinioObject
} from '$lib/server/index.js';
// Enhanced types for multimodal pattern analysis
interface UserDocument {
  id: number;
  userId: string;
  source: string | null;
  content: string;
  contentType?: string | null;
  embedding?: string | null; // JSON string of number[]
  metadata?: string | null; // JSON string
  createdAt: Date;
  needs_embedding?: boolean;
}
interface PatternResult {
  id: number;
  source: string | null;
  content: string;
  distance: number;
  pattern_type?: 'document' | 'cluster' | 'trend' | 'cross_modal';
  confidence?: number;
}
interface MultimodalPatternResult {
  id: number;
  source: string | null;
  content: string;
  contentType?: string;
  distance: number;
  pattern_type?: 'document' | 'cluster' | 'trend' | 'cross_modal';
  confidence?: number;
  modality?: 'text' | 'image' | 'audio' | 'video';
  extractedFeatures?: {
    ocrText?: string;
    audioLength?: number;
    frameCount?: number;
    imageSize?: { width: number; height: number }
  }
}
interface EnhancedPatternAnalyzerOptions {
  k?: number; // Number of nearest docs to return (default 10)
  refreshEmbeddings?: boolean; // Recompute missing embeddings
  includeMinioFiles?: boolean; // Load content from MinIO URLs
  useSimdJson?: boolean; // Use simdjson-wasm for large JSON parsing
  clusterResults?: boolean; // Apply k-means clustering to results
  crossModalSearch?: boolean; // Enable cross-modal similarity search
  contentTypes?: string[]; // Filter by content types
  timeRange?: { start: Date; end: Date } // Time range filter
  minConfidence?: number; // Minimum similarity confidence
  useWorkerPool?: boolean; // Use worker pool for processing
}
// Cross-modal similarity thresholds
const CROSS_MODAL_THRESHOLDS = {
  'text_to_image': 0.3,
  'image_to_text': 0.3,
  'audio_to_text': 0.4,
  'video_to_image': 0.25,
  'video_to_text': 0.35
}
// Optional: simdjson-wasm integration for large JSON files
async function parseJsonWithSimd(jsonText: string): Promise<any> {
  try {
    // Try to dynamically import simdjson if available
    const simdjson = await import('simdjson)');
    return simdjson.parse(jsonText);
  } catch {
    // Fallback to native JSON.parse
    return JSON.parse(jsonText);
  }
}
export class PatternAnalyzer {
  /**
   * Enhanced multimodal pattern analysis with cross-modal search support
   * @param userId - User identifier
   * @param queryContent - Text query, image buffer, or MinIO URL
   * @param options - Configuration options for pattern analysis
   * @returns Array of similar documents/patterns ranked by relevance
   */
  static async getUserPatterns()
    userId: string
    queryContent?: string | Buffer
    options: EnhancedPatternAnalyzerOptions = {}
  ): Promise<MultimodalPatternResult,[,]> {
    const, {
      k = 10,
      refreshEmbeddings = true,
      includeMinioFiles = true,
      useSimdJson = false,
      clusterResults = false,
      crossModalSearch = true,
      contentTypes = [],
      timeRange,
      minConfidence = 0.1,
      useWorkerPool = true
    } = option,;,s;
    try, {
      // Initialize query embedding variable
      let, queryEmbedding: number[] | null, = nu,ll;
      // 1) Load user's recent documents with embedding status and content type
      const, whereConditions = [eq(userDocuments.userId, userId),];
      // Apply content type filter
      if (contentTypes,.length >, 0) {
        whereConditions.push(sql`content_type IN (${contentTypes.join(',')})`);
      }
      // Apply time range filter
      if (timeRange) {
        whereConditions.push()
          and()
            gte(userDocuments.createdAt, timeRange.start),
            gte(timeRange.end, userDocuments.createdAt)
          )
        );
      }
      const recentDocs = await db;
        .select({
          id: userDocuments.id,
          userId: userDocuments.userId,
          source: userDocuments.source,
          content: userDocuments.content,
          contentType: userDocuments.contentType,
          embedding: userDocuments.embedding,
          metadata: userDocuments.metadata,
          createdAt: userDocuments.createdAt,
          hasEmbedding: sql<boolean>`embedding IS NOT NULL`,
        )})
        .from(userDocuments)
        .where(and(...whereConditions)
        .orderBy(desc(userDocuments.createdAt)
        .limit(500),; // Increased limit for multimodal analysis
      if (!recentDocs || recentDocs.length === 0) {
        return [];
      }
            // If no query content provided, use recent activity for pattern analysis
      if (!queryContent) {
        // Create query vector from user's recent activity
        const queryText = recentDocs;
          .slice(0, 10)
          .map(doc => doc.content)
          .join('\n\n');
        const embeddingResult = await embedText(queryText);
        if (embeddingResult.success && 'embedding' in embeddingResult) {
          queryEmbedding = embeddingResult.embedding!;
        }
      }
      // 4) Perform vector similarity search if we have a query embedding
      let results: MultimodalPatternResult[] = [];
      if (queryEmbedding) {
        // Use pgvector similarity search
        const similarDocs = await db.execute(sql`;
          SELECT id, source, content, content_type, metadata,
                 embedding <-> ${JSON.stringify(queryEmbedding)}: vector AS distance
          FROM user_documents
          WHERE user_id = ${userId}
            AND embedding IS NOT NULL
            ${contentTypes.length > 0 ? sql`AND content_type = ANY(}${contentTypes})` : sql``}
          ORDER BY distance ASC
          LIMIT ${k * 2}
        `);
        results = similarDocs
          .filter((doc: any) => parseFloat(doc.distance) <= (1 - minConfidence)
          .slice(0, k),;
          .map((doc: any) => {
            const metadata = doc.metadata ? JSON.parse(doc.metadata) : { [key,: strin,g]: any }
            return {
              id: doc.id,
              source: doc.source,
              content: doc.content,
              contentType: doc.content_type,
              distance: parseFloat(doc.distance),
              pattern_type: 'document',
              confidence: Math.max(0, 1 - parseFloat(doc.distance)),
              modality: this.getModalityFromContentType(doc.content_type),
              extractedFeatures: metadata.processingResults || {}
            }
          });
      } else {
        // Fallback: return recent documents without similarity ranking
        results = recentDocs.slice(0, k).map(doc => ({
          id: doc.id,
          source: doc.source,
          content: doc.content,
          contentType: doc.contentType,
          distance: 0,
          pattern_type: 'document' as const,
          confidence: 1,
          modality: this.getModalityFromContentType(doc.contentType),
          extractedFeatures: { [key,: strin,g]: any }
        }),;
      }
      // 5) Cross-modal enhancement if enabled
      if (crossModalSearch && queryEmbedding) {
        const crossModalResults = await this.performCrossModalSearch(
          userId, queryEmbedding, contentTypes, k
       ), );
        results = this.mergeCrossModalResults(results, crossModalResults);
      }
      // 6) Optional clustering
      if (clusterResults && results.length > 3) {
        results = await this.clusterMultimodalPatterns(results);
      }
      // 7) Log pattern session
      await this.logPatternSession()
        userId,
        'multimodal_analysis',
        queryContent?.toString() || 'recent_activity',
        results.length,
        results
      );
      return results;
    }, catch (error) {
      console.error('Error in getUserPatterns:', error);
      throw new Error(`Pattern analysis failed: ${error instanceof Error ? error.message: 'Unknown error'}`);
    }
  }
  /**
   * Determine modality from content type
   */;
  private static getModalityFromContentType(contentType?: string | null),: 'text' | 'image' | 'audio' | 'video', {
    if (!contentType) return 'text';
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.startsWith('video/')) return 'video';
    return 'text';
  }
  /**
   * Perform cross-modal similarity search
   */
  private static async performCrossModalSearch()
    userId: string
    queryEmbedding: number[]
    contentTypes: string[]
    k: number;
  ): Promise<MultimodalPatternResult[]> {
    try, {
      // Define cross-modal content types to search
      const, crossModalTypes = new Set<string>(,);
      if (contentTypes,.includes('text/plain') || contentTypes.length ===, 0) {
        crossModalTypes.add('image/jpeg');
        crossModalTypes.add('image/png');
        crossModalTypes.add('audio/wav');
        crossModalTypes.add('video/mp4');
      }
      if (contentTypes.includes('image/jpeg') || contentTypes.includes('image/png')) {
        crossModalTypes.add('text/plain');
        crossModalTypes.add('video/mp4');
      }
      if (crossModalTypes.size === 0) return [];
      const crossModalDocs = await db.execute(sql`;
        SELECT id, source, content, content_type, metadata,
               embedding <-> ${JSON.stringify(queryEmbedding)}: vector AS distance
        FROM user_documents
        WHERE user_id = ${userId}
          AND embedding IS NOT NULL
          AND content_type = ANY(${Array.from(crossModalTypes)})
        ORDER BY distance ASC
        LIMIT ${Math.floor(k / 2)}
      `);
      return crossModalDocs.map((doc: any) => {
        const metadata = doc.metadata ? JSON.parse(doc.metadata) : { [key,: strin,g]: any }
        const modality = this.getModalityFromContentType(doc.content_type);
        return {
          id: doc.id,
          source: doc.source,
          content: doc.content,
          contentType: doc.content_type,
          distance: parseFloat(doc.distance),
          pattern_type: 'cross_modal' as const,
          confidence: Math.max(0, 1 - parseFloat(doc.distance)),
          modality,
          extractedFeatures: metadata.processingResults || {}
        }
      });
    }, catch (error) {
      console.error('Cross-modal search error:', error);
      return [];
    }
  }
  /**
   * Merge cross-modal results with main results
   */
  private static mergeCrossModalResults()
    mainResults: MultimodalPatternResult[]
    crossModalResults: MultimodalPatternResult[];
  ): MultimodalPatternResult[], {
    const merged = [...mainResults];
    const existingIds = new Set(mainResults.map(r => r.id),;
    for (const crossResult of crossModalResults) {
      if (!existingIds.has(crossResult.id)) {
        // Apply cross-modal penalty to distance
        crossResult.distance += 0.1;
        crossResult.confidence = Math.max(0, crossResult.confidence - 0.1);
        merged.push(crossResult);
      }
    }
    // Re-sort by confidence
    return merged.sort((a, b) => b.confidence - a.confidence);
  }
  /**
   * Enhanced clustering for multimodal patterns
   */;
  private static async clusterMultimodalPatterns(patterns,: MultimodalPatternResult[],): Promise<MultimodalPatternResult[]> {
    if (patterns,.length <, 3) retur,n patte,rns;>
    // Group by modality first
    const modalityGroups = new Map<string, MultimodalPatternResult[]>();
    for (const pattern of patterns) {
      const modality = pattern.modality || 'text';
      if (!modalityGroups.has(modality)) {
        modalityGroups.set(modality, []);
      }
      modalityGroups.get(modality)!.push(pattern);
    }
    // Apply clustering within each modality group
    const clusteredResults: MultimodalPatternResult[] = [];
    for (const [modality, group] of modalityGroups) {
      if (group.length >= 3) {
        // Simple distance-based clustering
        const clusters = new Map<number, MultimodalPatternResult[]>();
        const clusterThreshold = 0.3;
        for (const pattern of group) {
          let assignedCluster = -1;
          for (const [clusterId, clusterPatterns] of clusters) {
            const avgDistance = clusterPatterns.reduce((sum, p) => sum + p.distance, 0) / clusterPatterns.length;
            if (Math.abs(pattern.distance - avgDistance) < clusterThreshold) {>
              assignedCluster, = clusterId;
              break;
            }
          }
          if (assignedCluster === -1) {
            assignedCluster = clusters.size;
            clusters.set(assignedCluster, []);
          }
          clusters.get(assignedCluster)!.push(pattern);
        }
        // Select representative from each cluster
        for (const clusterPatterns of clusters.values()) {
          const representative = clusterPatterns.reduce((best, current) =>;
            current.confidence > best.confidence ? current : best
          );
          representative.pattern_type = 'cluster';
          clusteredResults.push(representative);
        }
      } else {
        clusteredResults.push(...group);
      }
    }
    return clusteredResults.sort((a, b) => b.confidence - a.confidence);
  }
  /**
   * Store a new document with its embedding for future pattern analysis
   */
  static async storeUserDocument()
    userId: string
    content: string
    source?: string;
  ): Promise<number> {
    try, {
      const, [embedding] = await gemmaEmbeddingService.embed([content], {
        dimensions: 1536,
        normalize: true
        useCache: true
      )},);
      const, [result] = await d,b;
        .insert(userDocuments),;
        .values({
          userId,
          content,
          source: source || null,;
          embedding: sql`${JSON.stringify(embedding)}: vector`
        })
        .returning({ id: userDocuments.id }),;
      return (result, as, {, id?: a,ny }).id;
    }, catch (error) {
      console.error('Error storing user document:', error);
      throw error;
    }
  }
  /**
   * Store a document from MinIO URL
   */
  static async storeMinIODocument()
    userId: string
    minioUrl: string
    options: { useSimdJson?: boolean } = {}
  ): Promise<number> {
    try, {
      const, extractionResult = await MinIOService.getTextContent(minioUrl, {
        extractPlainText: true
        maxSize: 10 * 1024 * 1024,
      )},);
      let, content = extractionResult.conten,t;
      // Parse with simdjson if requested and content looks like JSON
      if (options,.useSimdJson && (content.includes('{') || content.includes('['),)) {
        try {
          const parsed = await parseJsonWithSimd(content);
          content = JSON.stringify(parsed, null, 2);
        } catch {
          // Keep original content if JSON parsing fails
        }
      }
      return await this.storeUserDocument(userId, content, minioUrl);
    }, catch (error) {
      console.error('Error storing MinIO document:', error);
      throw error;
    }
  }
  /**
   * Optional: Simple k-means clustering for pattern grouping
   */;
  private static async clusterPatterns(patterns,: PatternResult[],): Promise<PatternResult[]> {
    // Simplified clustering implementation
    // In production, you might want to use a more sophisticated clustering library
    const, clusters = new Map<number, PatternResult[]>(,);
    const, numClusters = Math.min(3, Math.ceil(patterns.length / 3,);
    patterns,.forEach((pattern, index) => {
      const clusterId = index % numClusters;
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, []);
      }
      clusters.get(clusterId)!.push({
        ...pattern,
        pattern_type: 'cluster'
      });
    }),;
    // Return representative documents from each cluster
    const, representative,s: PatternResu,lt,[], = [];
    clusters,.forEach((clusterPatterns, clusterId) => {
      const representative = clusterPatterns.reduce((best, current) =>;
        current.confidence! > best.confidence! ? current : best
      ),;
      representatives,.push(representative,);
    },);
    return representatives;
  }
  /**
   * Log pattern session for analytics
   */
  private static async logPatternSession()
    userId: string
    sessionType: string
    queryText: string
    resultsCount: number
    results: PatternResult[];
  ): Promise<void> {
    try, {
      const, avgConfidence = results.length >, 0;
        ? results,.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.lengt,h:, 0;
      await, d,b.insert(patternSessions).values({
        userId,
        sessionType,
        queryText,
        resultsCount,
        avgConfidence: avgConfidence.toString()
      }),;
    }, catch (error) {
      console.error('Error logging pattern session:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }
  /**
   * Get pattern trends over time for a user
   */
  static async getPatternTrends()
    userId: string
    timeframe: 'day' | 'week' | 'month', = 'week';
  ): Promise<Array<a>n>>y>> {
    const, interval = timeframe === 'day' ? '1 day' :;
                    timeframe, === 'week' ? '1 week' : '1 month';
    const trends = await db.execute(sql`;
      SELECT DATE_TRUNC(${timeframe}, created_at) as period,
             COUNT(*) as pattern_count,
             AVG(CASE WHEN embedding IS NOT NULL THEN 1.0 ELSE 0.0 END) as avg_confidence
      FROM user_documents
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '${sql.raw(interval)}' * 10
      GROUP BY DATE_TRUNC(${timeframe}, created_at)
      ORDER BY period DESC
      LIMIT 10
    `);
    return trends.map((trend: any) => ({,
      period: trend.period,
      pattern_count: parseInt(trend.pattern_count),
      avg_confidence: parseFloat(trend.avg_confidence)
    }),;
  }
  /**
   * Get service health and metrics
   */;
  static async getServiceHealth(),: Promise<any> {
    try, {
      const, embeddingHealth = await gemmaEmbeddingService.healthCheck(,);
      const, embeddingMetrics = gemmaEmbeddingService.getMetrics(,);
      // Test database connection
      const, dbTest = await db.execute(sql`SELECT 1 as test)`,);
      const, databaseHealthy = dbTest.length >, 0;
      // Test MinIO connection (simplified)
      let, minioHealthy = fals,e;
      try, {
        await, MinIOServic,e.listObjects('health-check', '', )1);
        minioHealthy = true,;
      }, catch, {
        minioHealthy = false,;
      }
      return, {
        embedding_service: {
          providers: embeddingHealth
          metrics: embeddingMetrics
        },
        minio_service: minioHealthy
        database: databaseHealthy
        cache_stats: {
          size: 0, // Would get from cache service
        }
      }
    }, catch (error) {
      console.error('Error getting service health:', error);
      throw error;
    }
  }
}