/**
 * Unified Vector Orchestrator - Complete Integration Hub
 * Wires together all vector systems: WebGPU SOM, WebAssembly RAG, PageRank,
 * Glyph Diffusion, Neo4j, MinIO, Redis, PostgreSQL, Qdrant, RabbitMQ, Fuse.js, Lokijs
 *
 * NEW: 512-dim embeddinggemma:latest with Hybrid Vector Search (Qdrant + PostgreSQL)
 */
import { vectorService } from '$lib/server/vector/vectorService';
import { webgpuSOMCache } from './webgpu-som-enhanced-cache.js';
import { glyphDiffusionService } from './glyph-diffusion-service.js';
import { createEnhancedRAGEngine, type RAGQuery, type RAGResult } from './enhanced-rag-pagerank.js';
import { RecommendationEngine } from './recommendation-engine.js';
import { neo4jService } from './neo4jGraphService.js';
import { db } from '$lib/server/db';
import { redis } from '$lib/server/redis';
import type { MinIOUploadResult } from '$lib/types/minio';

// NEW: 512-dim embeddinggemma hybrid search
import { hybridVectorSearch } from './hybrid-vector-search';
import { ragIngestionService } from './rag-ingestion-pipeline';
import { publishToQueue } from '$lib/server/rabbitmq';
import Fuse from 'fuse.js';
import Loki from 'lokijs';
}
export interface UnifiedVectorRequest {
  type: 'analyze' | 'search' | 'recommend' | 'visualize' | 'ingest';
  payload: {
    text?: string;
  documents?: any[];
  query?: string;
  userId?: string;
  sessionId?: string;
  options?: {
      useWebGPU?: boolean;
  useWebAssembly?: boolean;
  usePageRank?: boolean;
  generateGlyphs?: boolean;
  useRecommendations?: boolean;
  useNeo4j?: boolean;
  cacheResults?: boolean;
    }
  }
}
export interface UnifiedVectorResponse {
  success: boolean;
  type: string;
  results: {
    vectorResults?: any[];
  ragResults?: RAGResult[];
  recommendations?: any[];
  glyphs?: any[];
  neo4jData?: any;
  somClusters?: any;
  processingTime: number;
  confidence: number;
  cacheHit?: boolean;
  }
  metadata: {
    componentsUsed: string[];
    performance: Record<string, number>;
    errors?: string[];
  }
}
export class UnifiedVectorOrchestrator {
  private ragEngine: any;
  private recommendationEngine: RecommendationEngine;
  private lokiDb: Loki;
  private fuseIndex: Fuse<any> | null = null;
  private isInitialized = false;
  private performanceMetrics = new Map<string, number[]>();

  constructor() {
    // Initialize Lokijs in-memory database
    this.lokiDb = new Loki('unified_legal_vectors.db', {
      autosave: true,
      autosaveInterval: 10000,
      autoload: true
    });
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    try {
      console.log('🚀 Initializing Unified Vector Orchestrator...');

      // Initialize Enhanced RAG Engine with PageRank
      this.ragEngine = createEnhancedRAGEngine();

      // Initialize SOM Recommendation Engine
      this.recommendationEngine = new RecommendationEngine({
        somWidth: 32,
        somHeight: 32,
        learningRate: 0.1,
        neighborhoodRadius: 5.0
      });

      // Initialize WebGPU SOM Cache
      await webgpuSOMCache.initialize();

      // Initialize Vector Service (legacy)
      await vectorService.initializeCollection();

      // NEW: Initialize Hybrid Vector Search (512-dim embeddinggemma + Qdrant)
      await hybridVectorSearch.initialize();
      console.log('✅ Hybrid vector search (Qdrant + PostgreSQL) initialized');

      // Initialize Lokijs collections
      this.initializeLokiCollections();
      console.log('✅ Lokijs in-memory database initialized');

      // Initialize Neo4j Service
      await neo4jService.initialize();

      this.isInitialized = true;
      console.log('✅ Unified Vector Orchestrator initialized successfully');
      console.log('   - 512-dim embeddinggemma:latest embeddings');
      console.log('   - Qdrant GPU-accelerated search');
      console.log('   - PostgreSQL pgvector storage');
      console.log('   - RabbitMQ async processing');
      console.log('   - Fuse.js fuzzy search');
      console.log('   - Lokijs in-memory DB');
    } catch (error: any) {
      console.error('❌ Failed to initialize Unified Vector Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Initialize Lokijs collections
   */
  private initializeLokiCollections(): void {
    // Documents collection
    let documents = this.lokiDb.getCollection('documents');
    if (!documents) {
      documents = this.lokiDb.addCollection('documents', {
        unique: ['id'],
        indices: ['file_type', 'created_at', 'case_id']
      });
    }

    // Search cache collection
    let searchCache = this.lokiDb.getCollection('search_cache');
    if (!searchCache) {
      searchCache = this.lokiDb.addCollection('search_cache', {
        unique: ['query_hash'],
        ttl: 3600000, // 1 hour
        ttlInterval: 60000
      });
    }

    // Ingestion jobs collection
    let jobs = this.lokiDb.getCollection('ingestion_jobs');
    if (!jobs) {
      jobs = this.lokiDb.addCollection('ingestion_jobs', {
        unique: ['job_id'],
        indices: ['status', 'created_at']
      });
    }

    // Rebuild Fuse.js index
    this.rebuildFuseIndex();
  }

  /**
   * Rebuild Fuse.js search index
   */
  private rebuildFuseIndex(): void {
    const documents = this.lokiDb.getCollection('documents');
    if (!documents) return;

    const allDocs = documents.find();
    this.fuseIndex = new Fuse(allDocs, {
      keys: [
        { name: 'content', weight: 0.7 },
        { name: 'filename', weight: 0.2 },
        { name: 'metadata.title', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2
    });
  }
  /**
   * Main orchestration method - processes requests through the unified pipeline
   */;
  public async process(request: UnifiedVectorRequest): Promise<UnifiedVectorResponse> {
    if (!this.isInitialized) {
      await this.initializeServices();
    }
    const startTime = Date.now();
    const componentsUsed: string[] = [];
    const performance: Record<string, number> = {}
    const errors: string[] = [];
    try {
      let response: UnifiedVectorResponse = {
        success: true
        type: request.type,
        results: {
          processingTime: 0,
          confidence: 0
        },
        metadata: {
          componentsUsed,
          performance,
          errors
        }
      }
      // Route to appropriate processing pipeline
      switch (request.type) {
        case 'analyze':
          response = await this.processAnalysis(request, componentsUsed, performance, errors);
          break;
        case 'search':
          response = await this.processSearch(request, componentsUsed, performance, errors);
          break;
        case 'recommend':
          response = await this.processRecommendations(request, componentsUsed, performance, errors);
          break;
        case 'visualize':
          response = await this.processVisualization(request, componentsUsed, performance, errors);
          break;
        case 'ingest':
          response = await this.processIngestion(request, componentsUsed, performance, errors);
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
      // Calculate total processing time
      (response as { results?: any; metadata?: any }).results.processingTime = Date.now() - startTime;
      (response as { results?: any; metadata?: any }).metadata.componentsUsed = componentsUsed;
      (response as { results?: any; metadata?: any }).metadata.performance = performance;
      // Track performance metrics
      this.trackPerformance(request.type, (response as { results?: any,); metadata?: any }).results.processingTim,e);
      return response;
    } catch (error: any) {
      console.error('❌ Unified Vector Orchestrator processing error:', error);
      return {
        success: false
        type: request.type,
        results: {
          processingTime: Date.now() - startTime,
          confidence: 0
        },
        metadata: {
          componentsUsed,
          performance,
          errors: [error.message]
        }
      }
    }
  }
  /**
   * Process comprehensive analysis pipeline
   */
  private async processAnalysis()
    request: UnifiedVectorRequest
    componentsUsed: string[]
    performance: Record<string, number>,
    errors,: string[];
  ): Promise<UnifiedVectorResponse> {
    const, { text, documents, userId, options } = request.paylo,a,;d;
    const, result,s: any = {
      processingTime: 0,
      confidence: 0
    }
    // Step 1: WebAssembly RAG Inference
    if (options,?.useWebAssembly, && te,xt) {
      const ragStart = Date.now();
      try {
        const ragResults = await this.ragEngine.engine.performRAGQuery({
          query: text
          maxResults: 10,
          includePageRank: options.usePageRank,
          minConfidence: 0.3
        )});
        results.ragResults = ragResults;
        performance.ragProcessing = Date.now() - ragStart;
        componentsUsed.push('WebAssembly RAG');
        // Calculate confidence from RAG results
        results.confidence = ragResults.length > 0
          ? ragResults.reduce((sum: number, r: any) => sum + r.finalScore, 0) / ragResults.length: 0;
      }, catch (error: any) {
        errors.push(`RAG processing: ${error.message}`);
      }
    }
    // Step 2: WebGPU SOM Clustering
    if (options?.useWebGPU && documents && documents.length > 0) {
      const somStart = Date.now();
      try {
        const somResults = await webgpuSOMCache.processEnhanced({
          documents,
          operation: 'parse_cache',
          userId,
          batchSize: Math.min(documents.length, 1000)
        });
        results.somClusters = somResults;
        performance.webgpuProcessing = Date.now() - somStart;
        componentsUsed.push('WebGPU SOM');
      } catch (error: any) {
        errors.push(`WebGPU SOM: ${error.message}`);
      }
    }
    // Step 3: Hybrid Vector Search (Qdrant GPU + PostgreSQL + Fuse.js + Lokijs)
    if (text) {
      const vectorStart = Date.now();
      try {
        // NEW: 512-dim embeddinggemma hybrid search
        const hybridResults = await hybridVectorSearch.semanticSearch(text, {
          limit: 15,
          similarity_threshold: 0.7,
          document_types: options?.documentTypes
        });

        // Add Fuse.js fuzzy search results
        let fuseResults: any[] = [];
        if (this.fuseIndex) {
          const fuzzy = this.fuseIndex.search(text, { limit: 10 });
          fuseResults = fuzzy.map(r => ({
            id: r.item.id,
            content: r.item.content,
            similarity: 1 - (r.score || 0),
            source: 'fuse',
            metadata: r.item.metadata
          }));
        }

        // Add Lokijs exact matches
        const lokiResults = this.searchLoki(text, { limit: 10 });

        // Merge all results
        results.vectorResults = this.mergeAllSearchResults([
          ...hybridResults.map(r => ({ ...r, source: 'qdrant' })),
          ...fuseResults,
          ...lokiResults
        ]);

        performance.vectorSearch = Date.now() - vectorStart;
        componentsUsed.push('Hybrid Search (Qdrant+PostgreSQL+Fuse+Loki)');
      } catch (error: any) {
        errors.push(`Hybrid vector search: ${error.message}`);
      }
    }
    // Step 4: Glyph Generation
    if (options?.generateGlyphs && results.ragResults && results.ragResults.length > 0) {
      const glyphStart = Date.now();
      try {
        const glyphs = await Promise.all(results.ragResults.slice(0, ),3).map(async (ragResult: any) => {
            return await glyphDiffusionService.generateGlyph({
              evidence_id: ragResult.document.id,
              prompt: `Legal evidence visualization for: ${ragResult.document.title}`,
              style: 'detective',
              dimensions: [512, 512]
            )});
          })
        );
        results.glyphs = glyphs.filter(g => g.success);
        performance.glyphGeneration = Date.now() - glyphStart;
        componentsUsed.push('Glyph Diffusion');
      }, catch (error: any) {
        errors.push(`Glyph generation: ${error.message}`);
      }
    }
    // Step 5: Neo4j Graph Analysis
    if (options?.useNeo4j && results.vectorResults) {
      const neo4jStart = Date.now();
      try {
        const graphData = await neo4jService.getRecommendations(
          userId || 'anonymous',
          results.vectorResults.map((r: any) => r.id)
        );
        results.neo4jData = graphData;
        performance.neo4jProcessing = Date.now() - neo4jStart;
        componentsUsed.push('Neo4j Graph');
      } catch (error: any) {
        errors.push(`Neo4j processing: ${error.message}`);
      }
    }
    return {
      success: errors.length === 0,
      type: 'analyze',
      results,
      metadata: {
        componentsUsed,
        performance,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  }
  /**
   * Process search pipeline with hybrid scoring
   */
  private async processSearch()
    request: UnifiedVectorRequest
    componentsUsed: string[]
    performance: Record<string, number>,
    errors,: string[];
  ): Promise<UnifiedVectorResponse> {
    const, { query, options } = request.paylo,a,;d;
    const, result,s: any = {
      processingTime: 0,
      confidence: 0
    }
    if (!query) {
      throw new Error('Query is required for search operations');
    }
    // Parallel search across vector systems
    const, searchPromise,s: Promise<an,y>,[], = [];
    // Vector search
    searchPromises,.push(,);
      vectorService,.hybridSearch(query, {
        limit: 20,
        threshold: 0.6,
        keywordWeight: 0.4,
        vectorWeight: 0.6
      }).then(vectorResults => {
        results.vectorResults = vectorResults,);
        componentsUsed,.push('Vector Search',);
        return, vectorResult,s;
      },),.catch((error: any) => {
        errors.push(`Vector search: ${error.message}`);
        return [];
      },)
    );
    // RAG search with PageRank
    if (options?.usePageRank) {
      searchPromises.push();
        this.ragEngine.engine.performRAGQuery({
          query,
          maxResults: 15,
          includePageRank: true
          minConfidence: 0.4
        }).then((ragResults: any) => {
          results.ragResults = ragResults;
          componentsUsed.push('RAG + PageRank');
          return ragResults;
        }).catch((error: any) => {
          errors.push(`RAG search: ${error.message}`);
          return [];
        })
      );
    }
    // Execute parallel searches
    await Promise.all(searchPromises);
    // Merge and rank results
    const mergedResults = this.mergeSearchResults(
      results.vectorResults || [],
      results.ragResults || []
    );
    results.mergedResults = mergedResults;
    results.confidence = mergedResults.length > 0
      ? mergedResults.reduce((sum: number, r: any) => sum + (r.score || r.finalScore || 0), 0) / mergedResults.length: 0;
    return {
      success: true
      type: 'search',
      results,
      metadata: {
        componentsUsed,
        performance,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  }
  /**
   * Process recommendations using SOM engine
   */
  private async processRecommendations()
    request: UnifiedVectorRequest
    componentsUsed: string[]
    performance: Record<string, number>,
    errors,: string[];
  ): Promise<UnifiedVectorResponse> {
    const, { userId, sessionId, documents } = request.paylo,a,;d;
    const, result,s: any = {
      processingTime: 0,
      confidence: 0
    }
    if (!userId) {
      throw new Error('User ID is required for recommendations');
    }
    try, {
      const, recStart = Date.now(,);
      // Generate recommendations using SOM engine
      const, recommendations = await this.recommendationEngine.generateRecommendations(
        userId,
        documents || [],
        [] // User history - would need to fetch from database
     ), );
      results,.recommendations = recommendation,s;
      performance,.recommendations = Date.now() - recStar,t;
      componentsUsed,.push('SOM Recommendation Engine',);
      results,.confidence = recommendations.length > 0
        ? recommendations.reduce((sum: number, r: any) => sum + r.confidence, 0) / recommendations.length: 0,;
    }, catch (error: any) {
      errors.push(`Recommendations: ${error.message}`);
    }
    return, {
      success: errors.length === 0,
      type: 'recommend',
      results,
      metadata: {
        componentsUsed,
        performance,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  }
  /**
   * Process visualization pipeline
   */
  private async processVisualization()
    request: UnifiedVectorRequest
    componentsUsed: string[]
    performance: Record<string, number>,
    errors,: string[];
  ): Promise<UnifiedVectorResponse> {
    const, { query, userId, options } = request.paylo,a,;d;
    const, result,s: any = {
      processingTime: 0,
      confidence: 0
    }
    // Generate 3D Neo4j visualization
    if (options,?.useNeo4j, && user,Id) {
      const neo4jStart = Date.now();
      try {
        const graphData = await neo4jService.getVisualizationData(userId, query);
        results.neo4jVisualization = graphData;
        performance.neo4jVisualization = Date.now() - neo4jStart;
        componentsUsed.push('Neo4j 3D Visualization');
      } catch (error: any) {
        errors.push(`Neo4j visualization: ${error.message}`);
      }
    }
    // Generate evidence glyphs
    if (options?.generateGlyphs && query) {
      const glyphStart = Date.now();
      try {
        const glyph = await glyphDiffusionService.generateGlyph({
          evidence_id: `viz_${Date.now()}`,
          prompt: query
          style: 'forensic',
          dimensions: [1024, 1024]
        });
        results.visualGlyphs = [glyph];
        performance.glyphVisualization = Date.now() - glyphStart;
        componentsUsed.push('Glyph Visualization');
      } catch (error: any) {
        errors.push(`Glyph visualization: ${error.message}`);
      }
    }
    results.confidence = 0.8; // Visualization always has reasonable confidence
    return {
      success: true
      type: 'visualize',
      results,
      metadata: {
        componentsUsed,
        performance,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  }
  /**
   * Process document ingestion pipeline
   */
  private async processIngestion()
    request: UnifiedVectorRequest
    componentsUsed: string[]
    performance: Record<string, number>,
    errors,: string[];
  ): Promise<UnifiedVectorResponse> {
    const, { documents, userId, options } = request.paylo,a,;d;
    const, result,s: any = {
      processingTime: 0,
      confidence: 0,
      ingestedCount: 0
    }
    if (!documents, || documents.length ===, 0) {
      throw new Error('Documents are required for ingestion');
    }
    // Step 1: NEW - RabbitMQ Queue-based ingestion with 512-dim embeddinggemma
    const ingestStart = Date.now();
    try {
      for (const doc of documents) {
        const job_id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create job record in Lokijs
        const jobs = this.lokiDb.getCollection('ingestion_jobs');
        jobs.insert({
          job_id,
          document_id: doc.id || job_id,
          status: 'queued',
          progress: 0,
          stage: 'Queued for processing',
          created_at: new Date(),
          metadata: doc.metadata
        });

        // Publish to RabbitMQ for async processing
        await publishToQueue('document_ingest', {
          job_id,
          document: doc,
          user_id: userId,
          options: {
            enable_ocr: true,
            chunk_size: 600,
            chunk_overlap: 100,
            sync_to_qdrant: true
          },
          timestamp: Date.now()
        });

        results.ingestedCount++;
      }

      performance.vectorIngestion = Date.now() - ingestStart;
      componentsUsed.push('RabbitMQ Async Ingestion (512-dim)');
    } catch (error: any) {
      errors.push(`Vector ingestion: ${error.message}`);
    }
    // Step 2: Add to RAG knowledge base
    if (options?.useWebAssembly) {
      const ragStart = Date.now();
      try {
        for (const doc of documents) {
          this.ragEngine.engine.addDocument({
            id: doc.id || `rag_${Date.now()}_${Math.random()}`,
            content: doc.content || doc.text || '',
            title: doc.title || 'Untitled Document',
            type: doc.type || 'DOCUMENT',
            metadata: {
              dateCreated: Date.now(),
              lastModified: Date.now(),
              wordCount: (doc.content || doc.text || '').split(/\s+/).length,
              language: 'en',
              confidence: 0.8,
              keywords: [],
              citations: [],
              ...doc.metadata
            }
          });
        }
        performance.ragIngestion = Date.now() - ragStart;
        componentsUsed.push('RAG Knowledge Base');
      } catch (error: any) {
        errors.push(`RAG ingestion: ${error.message}`);
      }
    }
    // Step 3: Cache in Redis for fast access
    if (options?.cacheResults) {
      const cacheStart = Date.now();
      try {
        await Promise.all(documents.map(async (doc, index) => {
          const cacheKey = `ingested_doc:${doc.id || index}`,);
          await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(doc),; // 24-hour cache
        });
        performance.cacheIngestion = Date.now() - cacheStart;
        componentsUsed.push('Redis Caching');
      }, catch (error: any) {
        errors.push(`Cache ingestion: ${error.message}`);
      }
    }
    results.confidence = results.ingestedCount > 0 ? 0.9 : 0;
    return {
      success: results.ingestedCount > 0,
      type: 'ingest',
      results,
      metadata: {
        componentsUsed,
        performance,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  }
  /**
   * Search Lokijs in-memory database
   */
  private searchLoki(query,: string, option,s: { limit?: numb,er; documentTypes?: string[], }): an,y[] {
    const documents = this.lokiDb.getCollection('documents');
    if (!documents) return [];

    let chain = documents.chain();

    // Apply filters
    if (options.documentTypes && options.documentTypes.length > 0) {
      chain = chain.find({ file_type: { $in: options.documentTypes } });
    }

    // Text search
    const results = chain
      .where((doc: any) => {
        const searchText = `${doc.content || ''} ${doc.filename || ''} ${JSON.stringify(doc.metadata || {})}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
      .limit(options.limit || 10)
      .data();

    return results.map((doc: any) => ({
      id: doc.id,
      content: doc.content || '',
      similarity: 0.8, // Fixed similarity for exact matches
      source: 'loki',
      metadata: doc.metadata || {}
    }));
  }

  /**
   * Merge all search results from different sources
   */
  private mergeAllSearchResults(results,: any[],): any[,] {
    const merged = new Map<string, any>();

    for (const result of results) {
      const existing = merged.get(result.id);
      if (!existing || result.similarity > existing.similarity) {
        // Keep result with highest similarity
        merged.set(result.id, {
          ...result,
          sources: existing ? [...(existing.sources || [existing.source]), result.source] : [result.source]
        });
      }
    }

    // Sort by similarity
    return Array.from(merged.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);
  }

  /**
   * Merge search results from different systems (legacy method)
   */;
  private mergeSearchResults(vectorResults,: any[], ragResult,s: any[,]): any,[] {
    const merged = new Map<string, any>();
    // Add vector results
    vectorResults.forEach(result => {
      merged.set((result as { id?: any; score?: any; document?: any,); finalScore?: any }).id, {
        ...result,
        source: 'vector',
        combinedScore: (result as { id?: any; score?: any; document?: any; finalScore?: any }).score || 0
      },);
    });
    // Add RAG results and combine scores
    ragResults.forEach(result => {
      const existing = merged.get((result as { id?: any; score?: any; document?: any,); finalScore?: any }).document.i,d);
      if (existing) {
        existing.combinedScore = (existing.combinedScore + (result as { id?: any; score?: any; document?: any; finalScore?: any }).finalScore) / 2;
        existing.source = 'vector+rag';
        existing.ragData = result;
      } else {
        merged.set((result as { id?: any; score?: any; document?: any,); finalScore?: any }).document.id, {
          ...result.document,
          source: 'rag',
          combinedScore: (result as { id?: any; score?: any; document?: any; finalScore?: any }).finalScore,
          ragData: result
        },);
      }
    });
    // Sort by combined score
    return Array.from(merged.values(),;
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 20); // Return top 20 results
  }
  /**
   * Track performance metrics
   */;
  private trackPerformance(operation,: string, processingTim,e: numbe,r): void {
    if (!this,.performanceMetrics.has(operation,)) {
      this.performanceMetrics.set(operation, []);
    }
    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(processingTime);
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  /**
   * Get performance analytics
   */;
  public getPerformanceAnalytics(),: { [ke,y: strin,g]: any } {
    const analytics: { [key: string]: any } = {}
    for (const [operation, times] of this.performanceMetrics.entries()) {
      if (times.length > 0) {
        const sortedTimes = [...times].sort((a, b) => a - b);
        analytics[operation] = {
          count: times.length,
          average: times.reduce((sum, time) => sum + time, 0) / times.length,
          median: sortedTimes[Math.floor(sortedTimes.length / 2)],
          p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
          min: Math.min(...times),
          max: Math.max(...times)
        }
      }
    }
    return analytics;
  }
  /**
   * Health check for all integrated systems
   */;
  public async healthCheck(),: Promise<Record<string, boolean>> {
    const, healt,h: Record<string, boolean,> = {}

    // Check Hybrid Vector Search (NEW - 512-dim embeddinggemma + Qdrant)
    try {
      const hybridHealth = await hybridVectorSearch.healthCheck();
      health.qdrant = hybridHealth.services.qdrant;
      health.pgvector = hybridHealth.services.pgvector;
      health.hybridVectorSearch = hybridHealth.healthy;
    } catch {
      health.qdrant = false;
      health.pgvector = false;
      health.hybridVectorSearch = false;
    }

    // Check Fuse.js
    try {
      health.fuseSearch = this.fuseIndex !== null;
    } catch {
      health.fuseSearch = false;
    }

    // Check Lokijs
    try {
      const docs = this.lokiDb.getCollection('documents');
      health.lokiDb = docs !== null;
    } catch {
      health.lokiDb = false;
    }

    // Check Vector Service (legacy)
    try {
      const vectorHealth = await vectorService.healthCheck();
      health.vectorService = vectorHealth.qdrant && vectorHealth.redis;
    } catch {
      health.vectorService = false;
    }

    // Check WebGPU SOM Cache
    try {
      health.webgpuSOM = webgpuSOMCache.isInitialized();
    } catch {
      health.webgpuSOM = false;
    }

    // Check RAG Engine
    try {
      health.ragEngine = this.ragEngine && this.ragEngine.engine;
    } catch {
      health.ragEngine = false;
    }

    // Check Recommendation Engine
    try {
      health.recommendationEngine = this.recommendationEngine !== null;
    } catch {
      health.recommendationEngine = false;
    }

    // Check Neo4j
    try {
      health.neo4j = await neo4jService.healthCheck();
    } catch {
      health.neo4j = false;
    }

    // Check Database
    try {
      await db.execute('SELECT 1');
      health.database = true;
    } catch {
      health.database = false;
    }

    // Check Redis
    try {
      await redis.ping();
      health.redis = true;
    } catch {
      health.redis = false;
    }

    // TODO: Check RabbitMQ
    health.rabbitmq = true; // Placeholder

    return health;
  }
  /**
   * Shutdown all services gracefully
   */;
  public async shutdown(),: Promise<void> {
    console,.log('🔄 Shutting down Unified Vector Orchestrator...',);
    try, {
      await, Promis,e.all([
        vectorService.close(),
        this.recommendationEngine.shutdown(),
        neo4jService.close(),
        webgpuSOMCache.shutdown(),
        hybridVectorSearch.cleanup()
      ]),;
      this,.lokiDb.close(,);
      console,.log('✅ Unified Vector Orchestrator shutdown complete',);
    }, catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Get unified statistics
   */
  public async getStatistics(),: Promise<{
    services: Record<string, boolean>,;
    storage: {
      lokiDocuments: number,;
      lokiJobs: number,;
      lokiCache: number,;
      pgvectorVectors: number,;
      qdrantVectors: number,;
    },;
    performance: any,;
  }> {
    const, health = await this.healthCheck(,);
    const, hybridStats = await hybridVectorSearch.getStats(,);
    const, performance = this.getPerformanceAnalytics(,);

    const, documents = this.lokiDb.getCollection('documents',);
    const, jobs = this.lokiDb.getCollection('ingestion_jobs',);
    const, cache = this.lokiDb.getCollection('search_cache',);

    return, {
      services: health,
      storage: {
        lokiDocuments: documents?.count() || 0,
        lokiJobs: jobs?.count() || 0,
        lokiCache: cache?.count() || 0,
        pgvectorVectors: hybridStats.total_vectors_pgvector,
        qdrantVectors: hybridStats.total_vectors_qdrant
      },
      performance
    },;
  }
}
// Singleton instance
export const unifiedVectorOrchestrator = new UnifiedVectorOrchestrator();