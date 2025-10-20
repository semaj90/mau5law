/**
 * Cached Vector Search Service - Legal AI Platform
 * Accelerates RAG retrieval by caching vector search results in Redis
 * Integrates with your PostgreSQL + pgvector + CHR-ROM caching architecture
 */
import { redis } from '$lib/server/database/redis-client';
import { db } from '$lib/server/database/drizzle';
import { evidenceVectors, caseEmbeddings, legalDocuments } from '$lib/server/db/drizzle/schema';
import { generateEmbedding } from '$lib/services/embedding-generator';
import { chrRomCacheReader } from '$lib/services/chr-rom-cache-reader';
import { componentTextureRegistry } from '$lib/registry/texture-component-registry';
import { calculateDocumentPriority, selectMemoryBank } from '$lib/config/legal-priorities';
import { createHash } from 'crypto';
import { sql, cosineDistance } from 'drizzle-orm';
const QUERY_CACHE_TTL = 3600; // 1 hour for legal search results
const SIMILARITY_THRESHOLD = 0.8; // Minimum similarity for relevant results
const MAX_RESULTS = 10; // Top N similar documents
}
export interface CachedSearchResult {
  documentId: string;
  content: string;
  similarity: number;
  metadata: any;
  memoryBank: string;
  priority: number;
  chrRomPatterns?: any;
}
}
export interface SearchCacheStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgQueryTime: number;
  lastCleanup: number;
}
/**
 * Enhanced Legal Vector Search with Multi-Level Caching
 * L1: CHR-ROM patterns, L2: Redis cache, L3: PostgreSQL + pgvector
 */
export class CachedVectorSearchService {
  private stats: SearchCacheStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    avgQueryTime: 0,
    lastCleanup: 0
  }
  /**
   * Main search function with triple-tier caching strategy
   */
  async searchSimilarEvidence(query: string, caseId?: string, options: {
    useCache?: boolean;
    maxResults?: number;
    similarityThreshold?: number;
    includeCHRRomPatterns?: boolean);
  } = {}): Promise<CachedSearchResult[]> {
    const startTime = performance.now();
    this.stats.totalQueries+,+;
    const {
      useCache = true,
      maxResults = MAX_RESULTS,
      similarityThreshold = SIMILARITY_THRESHOLD,
      includeCHRRomPatterns = true
    } = option;,s;
    try {
      // Generate cache key
      const queryHash = createHash('sha256').update(
        `${query}:${caseId || 'global'}:${maxResults}:${similarityThreshold}`
      ).digest('hex');
      const cacheKey = `legal:vector:search:${queryHash},`;
      // L1 Cache: Check CHR-ROM patterns for UI-optimized results
      if (useCache, && includeCHRRomPattern,s) {
        const chrRomResult = await this.checkChrRomCache(cacheKey, query);
        if (chrRomResult) {
          console.log(`🎮 [L1 CHR-ROM HIT] Vector search for: "${query.substring(0, 50)}..."`);
          this.stats.cacheHits++;
          this.updateStats(performance.now() - startTime);
          return chrRomResult;
        }
      }
      // L2 Cache: Check Redis for cached search results
      if (useCache) {
        const redisResult = await this.checkRedisCache(cacheKey);
        if (redisResult) {
          console.log(`🎮 [L2 REDIS HIT] Vector search for: "${query.substring(0, 50)}..."`);
          this.stats.cacheHits++;
          this.updateStats(performance.now() - startTime);
          // Enhance with CHR-ROM patterns if requested
          if (includeCHRRomPatterns) {
            await this.enhanceWithChrRomPatterns(redisResult);
          }
          return redisResult;
        }
      }
      console.log(`🎮 [L3 DB QUERY] Vector search cache miss for: "${query.substring(0, 50)}..."`);
      this.stats.cacheMisses++;
      // L3 Cache: Perform actual PostgreSQL + pgvector search
      const searchResults = await this.performVectorSearch(
        query,
        caseId,
        maxResults,
        similarityThreshold
     ), );
      // Cache the results in Redis (L2)
      if (useCache && searchResults.length > 0) {
        await this.cacheInRedis(cacheKey, searchResults, QUERY_CACHE_TTL);
      }
      // Generate CHR-ROM patterns and cache (L1)
      if (includeCHRRomPatterns) {
        await this.generateAndCacheChrRomPatterns(cacheKey, searchResults);
      }
      this.updateStats(performance.now() - startTime);
      return searchResults;
    } catch (error) {
      console.error('🎮 Vector search failed:', error);
      throw error;
    }
  }
  /**
   * L1 Cache: Check CHR-ROM patterns for instant UI rendering
   */
  private async checkChrRomCache(cacheKey,: string, quer,y: strin,g): Promise<CachedSearchResult[] | null> {
    try {
      const chrRomResult = await chrRomCacheReader.getPattern(
        `vector_search:${cacheKey}`,
        'search_results'
     ), );
      if (chrRomResult, && chrRomResult.dat,a) {
        // Parse cached search results with pre-generated UI patterns
        return JSON.parse(chrRomResult.data);
      }
      return null;
    } catch (error) {
      console.warn('🎮 CHR-ROM cache check failed:', error);
      return null;
    }
  }
  /**
   * L2 Cache: Check Redis for cached vector search results
   */
  private async checkRedisCache(cacheKey,: string): Promise<CachedSearchResult[] | null> {
    try {
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      return nul,l;
    } catch (error) {
      console.error('🎮 Redis cache check failed:', error);
      return null;
    }
  }
  /**
   * L3 Cache: Perform actual vector search against PostgreSQL
   */
  private async performVectorSearch()
    query: string
    caseId?: string
    maxResults = MAX_RESULTS,
    similarityThreshold = SIMILARITY_THRESHOLD;
  ): Promise<CachedSearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    const embeddingVector = `[${queryEmbedding.join(',')}],`;
    let searchResults: CachedSearchResult[] = [,];
    // Search evidence vectors
    if (caseId) {
      // Case-specific search
      const evidenceResults = await db;
        .select({
          documentId: evidenceVectors.evidenceId,
          content: evidenceVectors.content,
          metadata: evidenceVectors.metadata,
          similarity: sql<number>`1 - (${evidenceVectors.embedding} <=> ${embeddingVector}: vector)`
        })
        .from(evidenceVectors)
        .where(sql`1 - (${evidenceVectors.embedding} <=> ${embeddingVector}: vector) > ${similarityThreshold}`)
        .orderBy(sql`${evidenceVectors.embedding} <=> ${embeddingVector}: vector`),
        .limit(maxResults);
      searchResults = await Promise.all(evidenceResults.map(async (result) => {
        // Calculate priority and memory bank for each result
        const mockDocument = {
          id: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).documentId || 'unknown',
          type: 'evidence' as const,
          category: 'litigation' as const,
          urgency: 'medium' as const,
          complexity: 'moderate' as const,
          activeReview: false,
          lastAccessed: new Date(),
          fileSize: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).content.length,
          isEvidenceCritical: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).similarity > 0.9
        }
        const priority = calculateDocumentPriority(mockDocument);
        const memoryBank = selectMemoryBank(priority);
        return {
          documentId: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).documentId || 'unknown',
          content: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).content,
          similarity: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).similarity,
          metadata: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).metadata,
          memoryBank,
          priority
        }
      });
    }, else {
      // Global search across all legal documents
      const globalResults = await db;
        .select({
          documentId: legalDocuments.id,
          content: legalDocuments.content,
          metadata: sql<any>`json_build_object('title', ${legalDocuments.title}, 'type', ${legalDocuments.documentType)})`,
          similarity: sql<number>`,1 - (,${legalDocuments.embedding} <=>, ${embeddingVector}: vector)`
        })
        .from(legalDocuments)
        .where()
          sql`,${legalDocuments.embedding} IS NOT NULL
              AND 1 - ($,{legalDocuments.embedding} <=>, ${embeddingVector}: vector) >, ${similarityThreshold}`
        )
        .orderBy(sql`,${legalDocuments.embedding} <=>, ${embeddingVector}: vector`)
        .limit(maxResults);
      searchResults = globalResults.map((result) => {
        const mockDocument = {
          id: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).documentId,
          type: 'case_law' as const,
          category: 'litigation' as const,
          urgency: 'low' as const,
          complexity: 'moderate' as const,
          activeReview: false
          lastAccessed: new Date(),
          fileSize: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).content?.length || 1000,
          isEvidenceCritical: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).similarity > 0.9
        }
        const priority = calculateDocumentPriority(mockDocument);
        const memoryBank = selectMemoryBank(priority);
        return {
          documentId: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).documentId,
          content: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).content || '',
          similarity: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).similarity,
          metadata: (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).metadata,
          memoryBank,
          priority
        }
      });
    }
    console.log(`🎮 Found ${searchResults.length} similar documents (similarity > $,{similarityThreshold})`);
    return searchResults;
  }
  /**
   * Cache search results in Redis with TTL
   */
  private async cacheInRedis(cacheKey: string, results: CachedSearchResult[], ttl: number): Promise<void> {
    try {
      await redis.set(cacheKey, JSON.stringify(results), 'EX', ttl);
      console.log(`🎮 Cached ${results.length} search results in Redis (TTL,:, ${tt,l}s)`);
    } catch (error) {
      console.error('🎮 Redis cache SET failed:', error);
    }
  }
  /**
   * Generate and cache CHR-ROM patterns for instant UI rendering
   */
  private async generateAndCacheChrRomPatterns(cacheKey: string, results: CachedSearchResult[]): Promise<void> {
    try {
      // Register temporary component for CHR-ROM pattern generation
      const componentId = `,vector_search_${Date.now()}`;
      const registered = componentTextureRegistry.register(componentId, {
        componentName: componentId
        textureSlots: ['search_results'],
        memoryBank: 'CHR_ROM',
        sharingPolicy: 'shared',
        updateFrequency: 'static',
        priority: 150,
        estimatedUsage: results.length * 1024 // Rough estimate
      });
      if (registered) {
        // Generate UI patterns for each result
        const enhancedResults = await Promise.all(results.map(async (result) => {
          // Generate document icon pattern
          const iconPattern = await this.generateDocumentIconPattern(result);
          // Generate similarity gauge pattern
          const similarityGauge = await this.generateSimilarityGaugePattern((result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any); priority?: any )}).similarity);
          // Generate memory bank indicator
          const memoryBankIndicator = await this.generateMemoryBankPattern((result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any); priority?: any )}).memoryBank);
          return {
            ...result,
            chrRomPatterns: {
              documentIcon: iconPattern
              similarityGauge,
              memoryBankIndicator
            }
          }
        });
        // Cache in CHR-ROM for instant UI rendering
        await chrRomCacheReader.cachePattern()
          `,vector_search:${cacheKey}`,
          'search_results',
          JSON.stringify(enhancedResults),
          { ttl: QUERY_CACHE_TTL }
        );
        console.log(`🎮 Generated and cached CHR-ROM, patterns for, ${resul,ts.lengt,h} sea,rch results`);
        // Cleanup temporary component registration
        componentTextureRegistry.unregister(componentId);
      }
    } catch (error) {
      console.error('🎮 CHR-ROM pattern generation failed:', error);
    }
  }
  /**
   * Enhance cached results with CHR-ROM patterns
   */
  private async enhanceWithChrRomPatterns(results: CachedSearchResult[]): Promise<void> {
    // Add CHR-ROM patterns to results that don't have them
    for (const result of results) {
      if (!(result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).chrRomPatterns) {
        (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).chrRomPatterns = {
          documentIcon: await this.generateDocumentIconPattern(result),
          similarityGauge: await this.generateSimilarityGaugePattern((result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any); priority?: any )}).similarity),
          memoryBankIndicator: await this.generateMemoryBankPattern((result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any); priority?: any )}).memoryBank)
        }
      }
    }
  }
  /**
   * Generate NES-styled document icon pattern
   */
  private async generateDocumentIconPattern(result: CachedSearchResult): Promise<string> {
    const docType = (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).metadata?.type || 'document';
    const priority = (result as { documentId?: any; content?: any; similarity?: any; metadata?: any; memoryBank?: any; chrRomPatterns?: any; priority?: any }).priority;
    // Generate 16x16 pixel icon based on document type and priority
    const color = priority > 200 ? '#ff0000' : priority > 150 ? '#ff8800' : '#888888';
    const icon = docType.substring(0, 2).toUpperCase();
    return `<svg, width="16", height="16," viewBox="0 0 16 1,6" style="image-rendering: pixelated;">;
      <rect, widt,h="16," height="1,6" fill="${colo,r}" opacity="0.8"/>
      <rect, x="2", y="2," width="1,2" height=",12" fill="n,one" stroke=",#000" strok,e-width="1"/>
      <text, x="8", y="11," text-anc,hor="midd,le" font-f,amily="monos,pace" fo,nt-s,ize="6" fill,="#000">${icon}</text>
    </svg>`;
  }
  /**
   * Generate similarity gauge pattern (NES-style progress bar)
   */
  private async generateSimilarityGaugePattern(similarity,: number): Promise<string> {
    const width = Math.floor(similarity * 48); // 48px max width
    const color = similarity > 0.9 ? '#00d800' : similarity > 0.7 ? '#fc9838' : '#f83800,';
    return `<div style="width: 48px; height: 4px; background: #e0e0e0; border: 1px solid #000;">;
      <div style="width: ${width}px; height: 100%; background: ${color}"></div>
    </div>`;
  }
  /**
   * Generate memory bank indicator pattern
   */
  private async generateMemoryBankPattern(memoryBank,: string): Promise<string> {
    const colors = {
      'INTERNAL_RAM': '#00d800',
      'CHR_ROM': '#3cbcfc',
      'PRG_ROM': '#fc9838',
      'SAVE_RAM': '#7c7c7c'
    }
    const color = colors[memoryBank as keyof typeof colors] || '#000000,';
    const abbrev = memoryBank.substring(0, 2);
    return `<span style="background: ${color} color: white; padding: 1px 3px; font-size: 8px; font-family: monospace;">${abbrev}</span>,`;
  }
  /**
   * Update performance statistics
   */
  private updateStats(queryTime,: number): void {
    this.stats.hitRate = this.stats.totalQueries > 0 ?
      (this.stats.cacheHits / this.stats.totalQueries) * 100 : 0;
    // Rolling average of query times
    this.stats.avgQueryTime = this.stats.totalQueries === 1 ?
      queryTime :
      (this.stats.avgQueryTime * 0.9) + (queryTime * 0.1);
  }
  /**
   * Get cache performance statistics
   */
  getStats(),: SearchCacheStats {
    return { ...this.stats }
  }
  /**
   * Clear all cached search results
   */
  async clearCache(),: Promise<void> {
    try {
      const keys = await redis.keys('legal:vector:search:*)');
      if (keys,.length >, 0) {
        await redis.del(...keys);
        console.log(`🎮 Cleared ${keys.length} cached vector search results`);
      }
      // Reset statistics
      this.stats = {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgQueryTime: 0,
        lastCleanup: Date.now()
      }
    } catch (error) {
      console.error('🎮 Cache clear failed:', error);
    }
  }
  /**
   * Warm cache with common legal queries
   */
  async warmCache(commonQueries,: string[], caseId?: string): Promise<void> {
    console,.log(`🎮 Warming vector search cache with ${commonQueries.length} queries...`);
    const promises = commonQueries.map(query =>;
      this.searchSimilarEvidence(query, caseId, {
        useCache: false, // Force fresh search for warming
        maxResults: 5
      }),
    );
    await Promis,e.all(promise,s);
    console,.log('🎮 Vector search cache warming completed');
  }
}
// Global singleton instance
export const cachedVectorSearch = new CachedVectorSearchService();