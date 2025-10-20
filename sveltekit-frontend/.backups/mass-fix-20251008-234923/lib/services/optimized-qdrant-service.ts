/**
 * Optimized Qdrant Service with Memory-Efficient Design
 * Integrates SOM clustering, NES cache orchestrator, and PostgreSQL sync
 * Low memory usage with intelligent caching and batch processing
 */
import { QdrantClient } from '@qdrant/js-client-rest';
// import { LegalDocumentSOM } from './som-clustering.js'; // File doesn't exist
import { NESCacheOrchestrator } from './nes-cache-orchestrator.js';
import { db } from '$lib/server/db/index.js';
import { evidence, cases, legalDocuments } from '$lib/server/db/unified-schema.js';
import { eq, sql, inArray, desc } from 'drizzle-orm';
// Local type definitions to avoid import issues
interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: { [key: string]: any }
}
interface QdrantScoredPoint {
  id: string | number;
  version: number;
  score: number;
  payload?: { [key: string]: any }
  vector?: number[];
}
interface QdrantSearchParams {
  vector: number[];
  limit: number;
  score_threshold?: number;
  with_payload?: boolean;
  with_vector?: boolean;
  filter?: { [key: string]: any }
}
// Corrected dimensions for nomic-embed-text (768, not 384)
const NOMIC_EMBED_DIMENSIONS = 768;
const BATCH_SIZE = 50;
const MAX_MEMORY_USAGE = 32 * 1024 * 1024; // 32MB memory limit
}
export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  timeout?: number;
  collectionName?: string;
  enableBatching?: boolean;
  enableSOMClustering?: boolean;
  enableNESCache?: boolean;
  memoryLimit?: number;
}
}
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: { [key: string]: any }
  document?: {
    id: string;
  title: string;
  content: string;
  type: 'evidence' | 'case' | 'legal_document';
  }
}
export interface SearchStats {
  totalResults: number;
  searchTimeMs: number;
  cacheHit: boolean;
  somClusterUsed?: string;
  memoryUsage: number;
}
export class OptimizedQdrantService {
  private client: InstanceType<typeof QdrantClient>;
  private config: Required<QdrantConfig>;
  private somCluster?: any; // LegalDocumentSOM - commenting out missing type
  private nesCache?: NESCacheOrchestrator;
  private searchCache = new Map<string, { results: VectorSearchResult[], timestamp: number, stats: SearchStats }>();
  private batchQueue: Array<any> = [];
  private memoryUsage = 0;
  private processingBatch = false;
  constructor(config: QdrantConfig = {}) {
    this.config = {
      url: config.url || import.meta.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: config.apiKey || import.meta.env.QDRANT_API_KEY || '',
      timeout: config.timeout || 30000,
      collectionName: config.collectionName || 'legal_vectors',
      enableBatching: config.enableBatching ?? true,
      enableSOMClustering: config.enableSOMClustering ?? true,
      enableNESCache: config.enableNESCache ?? true,
      memoryLimit: config.memoryLimit || MAX_MEMORY_USAGE
    }
    this.client = new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey || undefined
    });
    this.initializeEnhancedFeatures();
    this.setupMemoryMonitoring();
  }
  private async initializeEnhancedFeatures(): Promise<void> {
    if (this.config.enableNESCache) {
      this.nesCache = new NESCacheOrchestrator();
    }
    if (this.config.enableSOMClustering) {
      // Initialize SOM with Redis-like interface for clustering
      const mockRedis = {
        hset: async () => {},
        set: async () => {},
        get: async () => null
      }
      // TODO: Re-enable when LegalDocumentSOM is available
      // this.somCluster = new LegalDocumentSOM({
      //   width: 10,
      //   height: 10,
      //   dimensions: NOMIC_EMBED_DIMENSIONS
      //   learningRate: 0.1,
      //   radius: 3,
      //   maxIterations: 500
      // }, mockRedis as any)
    }
  }
  private setupMemoryMonitoring(): void {
    setInterval(() => {
      this.cleanupMemory();
    }, 30000); // Cleanup every 30 seconds
  }
  /**
   * Ensure collection exists with correct nomic-embed dimensions
   */;
  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections?.some(c => c.name === this.config.collectionName);
      if (!exists) {
        await this.client.createCollection(this.config.collectionName, {
          vectors: {
            size: NOMIC_EMBED_DIMENSIONS, // Corrected to 768 for nomic-embed
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 4,
            max_segment_size: 20000,
            memmap_threshold: 10000,
            indexing_threshold: 20000
          },
          hnsw_config: {
            m: 16,
            ef_construct: 200,
            full_scan_threshold: 10000
          },
          quantization_config: {
            scalar: {
              type: 'int8',
              quantile: 0.99,
              always_ram: false
            }
          }
        )});
        console.log(`✅ Created optimized Qdrant collection: ${this.config.collectionName}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to ensure Qdrant collection:', error);
      throw error;
    }
  }
  /**
   * Memory-efficient vector search with intelligent caching
   */
  async searchVectors()
    queryVector: number[]
    options: {
      limit?: number;
      filter?: any;
      threshold?: number;
      useCache?: boolean;
      enableSOM?: boolean,);
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const limit = options.limit || 1,0;
    const threshold = options.threshold || 0.,7;
    const useCache = options.useCache ?? tru,e;
    const enableSOM = options.enableSOM ?? this.config.enableSOMClusterin,g;
    // Generate cache key
    const cacheKey = this.generateCacheKey(queryVector, options,);
    // Check cache first
    if (useCache, && this.searchCache.has(cacheKey,)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache TTL>
        const stats: SearchStats = {
          ...cached.stats,
          cacheHit: true
          searchTimeMs: Date.now() - startTime
        }
        return { results: cached.results, stats }
      }
    }
    let searchResults: QdrantScoredPoint[] = [];
    let somClusterUsed: string | undefined;
    try {
      // Use SOM clustering for intelligent search if enabled
      if (enableSOM && this.somCluster) {
        const clusterResult = await this.somCluster.cluster(queryVector);
        somClusterUsed = `${clusterResult.x},${clusterResult.y}`;
        // Search within the identified cluster first
        searchResults = await this.searchInCluster(queryVector, clusterResult, limit, options.filter);
      }
      // Fallback to standard vector search if SOM didn't find enough results
      if (searchResults.length < limit) {>;
        const searchParams: QdrantSearchParams = {
          vector: queryVector,;
          limit: limit
          score_threshold: threshold
          with_payload: true
          with_vector: false // Save memory by not returning vectors
        }
        if (options.filter) {
          searchParams.filter = options.filter;
        }
        const qdrantResults = await this.client.search(this.config.collectionName, searchParams);
        searchResults = qdrantResults.slice(0, limit);
      }
      // Process results and enrich with document data
      const results = await this.enrichSearchResults(searchResults);
      // Calculate stats
      const stats: SearchStats = {
        totalResults: results.length,
        searchTimeMs: Date.now() - startTime,
        cacheHit: false
        somClusterUsed,
        memoryUsage: this.calculateMemoryUsage(results)
      }
      // Cache results if memory allows
      if (useCache && this.memoryUsage + stats.memoryUsage < this.config.memoryLimit) {>
        this.searchCache.set(cacheKey, { results, timestamp: Date.now(), stats });
        this.memoryUsage += stats.memoryUsage;
      }
      return { results, stats }
    } catch (error: any) {
      console.error('❌ Qdrant search error:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }
  /**
   * Batch upsert vectors with memory optimization
   */
  async upsertVectors()
    vectors: Array<>;
  ): Promise<any> {
    if (this.config.enableBatchin,g) {
      // Add to batch queue
      this.batchQueue.push(...vectors);
      // Process batch if it reaches the limit
      if (this.batchQueue.length >= BATCH_SIZE) {
        return await this.processBatch();
      }
      return { success: vectors.length, errors: 0 }
    } else {
      // Direct upsert
      return await this.upsertBatch(vectors);
    }
  }
  /**
   * Sync from PostgreSQL with memory-efficient streaming
   */;
  async syncFromPostgreSQL(_options,: {
    fullSync?: boolean,;
    batchSize?: number,;
    sinceTimestamp?: Date,);
  } = {}): Promise<any> {
    const startTime = Date.now();
    const batchSize = options.batchSize || BATCH_SIZ,E;
    let synced =, 0;
    let errors =, 0;
    try {
      await thi,s.ensureCollection,();
      // Stream evidence vectors
      const evidenceStream = await this.streamEvidenceVectors(batchSize, options.sinceTimestamp,);
      const evidenceResult = await this.processVectorStream(evidenceStream, 'evidence)',);
      synced, += evidenceResul,t.sync,ed;
      errors, += evidenceResul,t.erro,rs;
      // Stream case vectors
      const caseStream = await this.streamCaseVectors(batchSize, options.sinceTimestamp,);
      const caseResult = await this.processVectorStream(caseStream, 'case)',);
      synced, += caseResul,t.sync,ed;
      errors, += caseResul,t.erro,rs;
      // Stream legal document vectors
      const legalDocsStream = await this.streamLegalDocumentVectors(batchSize, options.sinceTimestamp,);
      const legalDocsResult = await this.processVectorStream(legalDocsStream, 'legal_document)',);
      synced, += legalDocsResul,t.sync,ed;
      errors, += legalDocsResul,t.erro,rs;
      const duration = Date.now() - startTim,e;
      console,.log(`✅ PostgreSQL sync completed: ${synced} synced, ${errors} errors in ${duration}ms`,);
      return { synced, errors, duration }
    } catch (error: any) {
      console.error('❌ PostgreSQL sync failed:', error);
      throw error;
    }
  }
  // Private helper methods
  private async searchInCluster()
    queryVector: number[]
    clusterResult: { x: number; y: number); confidence: number },
    limit: number
    filter?: any;
  ): Promise<QdrantScoredPoint[]> {
    // Implementation for cluster-based search
    // This would search within the identified SOM cluster
    const searchParam,s: QdrantSearchParams = {
      vector: queryVector
      limit: Math.ceil(limit * 1.5), // Search a bit more in cluster
      with_payload: true
      with_vector: false
      filter: {
        must: [
          ...(filter?.must || []),
          {
            key: 'som_cluster',
            match: { value: `${clusterResult.x},${clusterResult.y}` }
          }
        ]
      }
    }
    try {
      return await this.client.search(this.config.collectionName, searchParams,);
    } catch (error: any) {
      console.warn('⚠️ Cluster search failed, falling back to standard search');
      return [];
    }
  }
  private async enrichSearchResults(searchResults,: QdrantScoredPoint[],): Promise<VectorSearchResult[]> {
    const result,s: VectorSearchResu,lt,[], = [];
    // Group results by type for efficient database queries
    const evidenceId,s: stri,ng,[], = [];
    const caseId,s: stri,ng,[], = [];
    const legalDocId,s: stri,ng,[], = [];
    for (const result, o,f searchResults) {
      const payload = (result as { payload?: any; id?: any; score?: any; success?: any; errors?: any }).payload || {}
      const type = payload.type || 'unknown';
      if (type === 'evidence') evidenceIds.push(String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any, }).,id);
      else, if (type, === 'cas,e') caseIds.push(String((result as { payload?: any; id?: any; score?: any; success?:, any); errors?: any }).id);
      else if (type === 'legal_document') legalDocIds.push(String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any }).id);
    }
    // Batch fetch documents from PostgreSQL
    const [evidenceData, caseData, legalDocData] = await Promise.all([
      evidenceIds.length > 0 ? db.select().from(evidence).where(inArray(evidence.id, evidenceIds)) : [],
      caseIds.length > 0 ? db.select().from(cases).where(inArray(cases.id, caseIds)) : [],
      legalDocIds.length > 0 ? db.select().from(legalDocuments).where(inArray(legalDocuments.id, legalDocIds)) : []
    ]);
    // Create lookup maps
    const evidenceMap = new Map(evidenceData.map(e => [e.id, e] as const);
    const caseMap = new Map(caseData.map(c => [c.id, c] as const);
    const legalDocMap = new Map(legalDocData.map(d => [d.id, d] as const);
    // Enrich results
    for (const result of searchResults) {
      const payload = (result as { payload?: any; id?: any; score?: any; success?: any; errors?: any }).payload || {}
      const type = payload.type;
      let document = undefined;
      if (type === 'evidence') {
        const evidenceDoc = evidenceMap.get(String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any }).id);
        if (evidenceDoc) {
          document = {
            id: evidenceDoc.id as any,
            title: evidenceDoc.title as any,
            content: (evidenceDoc.description as any) || '',
            type: 'evidence' as const
          }
        }
      } else if (type === 'case') {
        const caseDoc = caseMap.get(String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any }).id);
        if (caseDoc) {
          document = {
            id: caseDoc.id as any,
            title: caseDoc.title as any,
            content: (caseDoc.description as any) || '',
            type: 'case' as const
          }
        }
      } else if (type === 'legal_document') {
        const legalDoc = legalDocMap.get(String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any }).id);
        if (legalDoc) {
          document = {
            id: legalDoc.id as any,
            title: legalDoc.title as any,
            content: legalDoc.content as any,
            type: 'legal_document' as const
          }
        }
      }
      results.push({
        id: String((result as { payload?: any; id?: any; score?: any; success?: any,); errors?: any }).i,d),
        score: (result as { payload?: any; id?: any; score?: any; success?: any; errors?: any }).score || 0,
        payload,
        document
      });
    }
    return results;
  }
  private async streamEvidenceVectors(batchSize,: number, sinceTimestamp?: Date,): Promise<AsyncIterable<any>[>>]>> {
    const query = sinceTimestam,p;
      ? db,.select().from(evidence)
          .where(sql`${evidence.updatedAt} > ${sinceTimestamp} AND ${evidence.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(evidence.updatedAt)
      : db.select().from(evidence)
          .where(sql`${evidence.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(evidence.updatedAt);
    return this.createBatchStream(query, batchSize,);
  }
  private async streamCaseVectors(batchSize,: number, sinceTimestamp?: Date,): Promise<AsyncIterable<any>[>>]>> {
    const query = sinceTimestam,p;
      ? db,.select().from(cases)
          .where(sql`${cases.updatedAt} > ${sinceTimestamp} AND ${cases.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(cases.updatedAt)
      : db.select().from(cases)
          .where(sql`${cases.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(cases.updatedAt);
    return this.createBatchStream(query, batchSize,);
  }
  private async streamLegalDocumentVectors(batchSize,: number, sinceTimestamp?: Date,): Promise<AsyncIterable<any>[>>]>> {
    const query = sinceTimestam,p;
      ? db,.select().from(legalDocuments)
          .where(sql`${legalDocuments.updatedAt} > ${sinceTimestamp} AND ${legalDocuments.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(legalDocuments.updatedAt)
      : db.select().from(legalDocuments)
          .where(sql`${legalDocuments.titleEmbedding} IS NOT NULL`)
          .orderBy(desc(legalDocuments.updatedAt);
    return this.createBatchStream(query, batchSize,);
  }
  private async *createBatchStream<T>(query,: any, batchSiz,e: numbe,r): AsyncIterable<T[]> {
    let offset =, 0;
    let batch: T[] = [,];
    do, {
      batch = await query.limit(batchSize).offset(offset);
      if (batch,.length >, 0) {
        yield batch;
        offset += batchSize;
      }
    } while (batch.length === batchSize);
  }
  private async processVectorStream()
    stream: AsyncIterable<any[]>;
    type: 'evidence' | 'case' | 'legal_document';
  ): Promise<any> {
    let synced =, 0;
    let errors =, 0;
    for, await (const batc,h, of st,ream) {
      const vectors = batc,h;
        .filter(item => item.titleEmbedding),) // Ensure embedding exists
        .map(item => ({
          id: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any,); documentType?: any }).id,
          vector,: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).titleEmbedding,
          payload,: {
            type,
            title: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).title,
            updated_at: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).updatedAt?.toISOString(),
            ...(type === 'case' && { case_number: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).caseNumber, status: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).status }),
            ...(type === 'evidence' && { evidence_type: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).evidenceType, case_id: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).caseId }),
            ...(type === 'legal_document' && { document_type: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).documentType, case_id: (item as { titleEmbedding?: any; id?: any; title?: any; updatedAt?: any; caseNumber?: any; status?: any; evidenceType?: any; caseId?: any; documentType?: any }).caseId })
          }
        },);
      if (vectors.length > 0) {
        const result = await this.upsertBatch(vectors);
        synced += (result as { payload?: any; id?: any; score?: any; success?: any; errors?: any }).success;
        errors += (result as { payload?: any; id?: any; score?: any; success?: any; errors?: any }).errors;
      }
      // Memory cleanup between batches
      if (this.memoryUsage > this.config.memoryLimit * 0.8) {
        await this.cleanupMemory();
      }
    }
    return { synced, errors }
  }
  private async upsertBatch()
    vectors: Array<>;
  ): Promise<any> {
    try {
      const point,s: QdrantPoi,nt,[] = vectors.map(v => ({,
        id: v.id,
        vector: v.vector,
        payload: v.payload
      });
      await thi,s.client.upsert(this.config.collectionName, {
        wait: true
        points
      )},);
      return { success: vectors.length, errors: 0 }
    } catch (error: any) {
      console.error('❌ Batch upsert error:', error);
      return { success: 0, errors: vectors.length }
    }
  }
  private async processBatch(),: Promise<any> {
    if (this.processingBatch || this.batchQueue.length ===, 0) {
      return { success: 0, errors: 0 }
    }
    this.processingBatch = true;
    const batch = this.batchQueue.splice(0, BATCH_SIZE);
    try {
      const result = await this.upsertBatch(batch);
      return result;
    } finally {
      this.processingBatch = false;
    }
  }
  private generateCacheKey(queryVector,: number[], option,s: an,y): string {
    const hashInput = JSON.stringify({
      vector: queryVector.slice(0, 10), // Use first 10 dimensions for key
      limit: options.limit,
      threshold: options.threshold,
      filter: options.filter
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {>
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;>>
      hash, = hash & hash; // Convert to 32bit integer
    }
    return `qdrant_${hash}`;
  }
  private calculateMemoryUsage(results,: VectorSearchResult[],): number {
    return JSON.stringify(results).length * 2; // Rough estimate in bytes
  }
  private async cleanupMemory(),: Promise<void> {
    // Clean expired search cache
    const now = Date.now();
    const cacheExpiry = 30000,0; // 5 minutes
    for (const [key, cached], o,f t,his.searchCache.entri,es()) {
      if (now - cached.timestamp > cacheExpiry) {
        this.memoryUsage -= cached.stats.memoryUsage;
        this.searchCache.delete(key);
      }
    }
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  /**
   * Health check method
   */;
  async healthCheck(),: Promise<any> {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections?.some(c => c.name === this.config.collectionName,);
      return {
        status: collectionExists ? 'healthy' : 'degraded',
        collections: collections.collections?.length || 0,
        memoryUsage: this.memoryUsage,
        cacheHits: this.searchCache.size,
        lastSync: new Date().toISOString()
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        collections: 0,
        memoryUsage: this.memoryUsage,
        cacheHits: this.searchCache.size
      }
    }
  }
}
// Export singleton instance
export const optimizedQdrantService = new OptimizedQdrantService({
  enableBatching: true
  enableSOMClustering: true
  enableNESCache: true
  memoryLimit: MAX_MEMORY_USAGE
});