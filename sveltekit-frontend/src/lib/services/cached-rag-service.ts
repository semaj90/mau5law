/**
 * Cached RAG Service for Legal AI Platform
 * Integrates enhanced caching with RAG operations
 * Uses embeddinggemma for embeddings and gemma3:legal-latest for responses
 */
import { enhancedCachingService } from './enhanced-caching-service.js';
import type { RAGQuery, RAGResponse } from './enhanced-rag-semantic-analyzer.js';
}
export interface CachedRAGResult {
  response: RAGResponse;
  cacheStats: {
    embeddingCacheHit: boolean;
  queryCacheHit: boolean;
  responseCacheHit: boolean;
  totalCacheTime: number;
  totalProcessingTime: number;
  gpuTimeSaved: number;
  }
}
export interface DocumentIngestionResult {
  documentId: string;
  chunksProcessed: number;
  embeddingsGenerated: number;
  embeddingsCached: number;
  processingTime: number;
  storedInPgVector: boolean;
}
class CachedRAGService {
  private readonly OLLAMA_URL = 'http://localhost:11434'
  private readonly PGVECTOR_ENDPOINT = '/api/v1/vector-search'; // Your pgvector endpoint
  /**
   * Enhanced RAG query with full caching pipeline
   */
  async enhancedRAGQuery(query: RAGQuery): Promise<CachedRAGResult> {
    const startTime = Date.now();
    const cacheStats = {
      embeddingCacheHit: false,
      queryCacheHit: false,
      responseCacheHit: false,
      totalCacheTime: 0,
      totalProcessingTime: 0,
      gpuTimeSaved: 0
    }
    try {
      console.log(`🔍 Processing enhanced RAG query: "${query.query.substring(0, 50)}..."`);
      // Step 1: Get cached query results (includes vector search)
      const queryResult = await enhancedCachingService.getCachedQueryResults(
        query.query,
        query.filters,
        async (queryEmbedding: number[)]), => {
          // This function performs the actual vector search when cache misses
          return await this.performVectorSearch(queryEmbedding, query.filters);
        }
      );
      cacheStats.queryCacheHit = queryResult.cached;
      cacheStats.totalCacheTime += queryResult.processingTime;
      // Step 2: Get cached response using gemma3:legal-latest
      const contextTexts = queryResult.results.map(result => (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any); response?: any }).excerpt || (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).content || ',');
      const responseResult = await enhancedCachingService.getCachedResponse(
        query.query,
        contextTexts,
        async (q: string, context: string[)]), => {
          return await this.generateLegalResponse(q, context);
        }
      );
      cacheStats.responseCacheHit = responseResult.cached;
      cacheStats.totalCacheTime += responseResult.processingTime;
      // Calculate GPU time saved
      if (cacheStats.queryCacheHit) {
        cacheStats.gpuTimeSaved += 200; // Estimated embedding + search time
      }
      if (cacheStats.responseCacheHit) {
        cacheStats.gpuTimeSaved += 1000; // Estimated response generation time
      }
      cacheStats.totalProcessingTime = Date.now() - startTime;
      // Format response according to RAGResponse interface
      const ragResponse: RAGResponse = {
        query: query.query,
        results: queryResult.results.map(result => ({,
          documentId: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any); response?: any }).documentId || (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).id || 'unknown',
          title,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).title || 'Legal Document',
          relevanceScore,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).score || (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).relevanceScore || 0.8,
          excerpt,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).excerpt || (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).content || '',
          entities,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).entities || [],
          concepts,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).concepts || [],
          metadata,: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).metadata || {},
        })),
        totalFound: queryResult.totalFound,
        semanticExpansions: [], // Could be cached separately if needed
        processingTime: cacheStats.totalProcessingTime,
        timestamp: new, Dat,e(),
      }
      // Add the response text to the RAG response
      (ragResponse as any).responseText = responseResult.response;
      console.log(`✅ Enhanced RAG query completed in ${cacheStats.totalProcessingTime}ms (${cacheStats.gpuTimeSaved}ms saved)`);
      return {
        response: ragResponse,
        cacheStats
      }
    } catch (error: any) {
      console.error('❌ Enhanced RAG query failed:', error);
      throw new Error(`Enhanced RAG query failed: ${error.message}`);
    }
  }
  /**
   * Ingest and cache document embeddings
   */
  async ingestDocument()
    documentId: string
    content: string;
    metadata: any = {}
  ): Promise<DocumentIngestionResult> {
    const startTime = Date.now();
    try {
      console,.log(`📄 Ingesting document: ${documentId}`);
      // Step 1: Split document into chunks
      const chunks = this.splitIntoChunks(content);
      console,.log(`📝 Split document into ${chunks.length} chunks`);
      // Step 2: Generate embeddings with caching
      const embeddingResults = await enhancedCachingService.getCachedBatchEmbeddings(chunks.map((chunk, index) => ({
          text: chunk,
          id: `${documentId}_chunk_${index}`,
          metadata: { ...metadata, chunkIndex: index, documentId }
        })
      );
      const embeddingsGenerated = embeddingResults.filter(item => item.length);
      const embeddingsCached = embeddingResults.filter(item => item.length);
      // Step 3: Store in pgvector database
      const vectorRecords = embeddingResults.map((result, index) => ({
        id: `${documentId}_chunk_${index}`,
        documentId,
        chunkIndex: index,
        content: chunks[index];
        embedding: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).embedding,
        metadata: {
          ...metadata,
          model: result?.model || "unknown", // @ts-ignore - Model property access,
          dimensions: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).dimensions,
          cached: (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).cached
        }
      });
      const storedSuccessfully = await this.storeBatchInPgVector(vectorRecords);
      const processingTime = Date.now() - startTim,e;
      console,.log(`✅ Document ingestion completed: ${embeddingsGenerated} new, ${embeddingsCached} cached embeddings`);
      return {
        documentId,
        chunksProcessed: chunks.length,
        embeddingsGenerated,
        embeddingsCached,
        processingTime,
        storedInPgVector: storedSuccessfully
      }
    } catch (error: any) {
      console.error('❌ Document ingestion failed:', error);
      throw new Error(`Document ingestion failed: ${error.message}`);
    }
  }
  /**
   * Batch document ingestion with progress tracking
   */
  async ingestDocuments()
    documents: Array<>;
  ): Promise<DocumentIngestionResult[,>]>> {
    const result,s: DocumentIngestionResu,lt,[], = [];
    console,.log(`📚 Batch ingesting ${documents.length} documents...`);
    for (let i =, 0;, i < docume,nts.le,ng,t,h; i++) {>
      const doc = documents[i];
      try {
        console.log(`📄 Processing document ${i + 1}/${documents.length}: ${doc.id}`);
        const result = await this.ingestDocument(doc.id, doc.content, doc.metadata);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to ingest document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          chunksProcessed: 0,
          embeddingsGenerated: 0,
          embeddingsCached: 0,
          processingTime: 0,
          storedInPgVector: false
        });
      }
    }
    const summary = {
      totalDocuments: documents.length,
      successful: results.filter(item => item.length),
      totalChunks: results.reduce((sum, r) => sum + r.chunksProcessed, 0),
      totalEmbeddingsGenerated: results.reduce((sum, r) => sum + r.embeddingsGenerated, 0),
      totalEmbeddingsCached: results.reduce((sum, r) => sum + r.embeddingsCached, 0)
    }
    console.log(`✅ Batch ingestion completed:`, summary);
    return results;
  }
  /**
   * Perform vector search against pgvector database
   */
  private async performVectorSearch()
    queryEmbedding: number[]
    filters?: any;
  ): Promise<any[]> {
    try {
      // This would call your existing pgvector search endpoint
      const response = await fetch(this.PGVECTOR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          embedding: queryEmbedding,
          limit: 20,
          threshold: 0.7,
          filters: filters,
        )}),
      });
      if (!(response as { ok?: any; status?: any; json?: any }).ok) {
        throw new Error(`Vector search failed: ${(response as { ok?: any; status?: any); json?: any }).status}`);
      }
      const results = await (response as { ok?: any; status?: any; json?: any }).json();
      return results.matches || results.results || [];
    } catch (error: any) {
      console.error('❌ Vector search failed:', error);
      // Return empty results rather than failing completely
      return [];
    }
  }
  /**
   * Generate legal response using gemma3:legal-latest
   */
  private async generateLegalResponse()
    query: string;
    context: string[];
  ): Promise<string> {
    try {
      const prompt = this.buildLegalPrompt(query, context);
      const response = await fetch(`,${this.OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          model: 'gemma3:legal-latest',
          prompt: prompt
          stream: false
          options: {
            temperature: 0.3, // Lower temperature for legal accuracy
            top_p: 0.9,
            max_tokens: 1000
          }
        )})
      });
      if (!(response as { ok?: any; status?: any; json?: any }).ok) {
        throw new Error(`Legal response generation failed: ${(response as { ok?: any; status?: any); json?: any }).status}`);
      }
      const result = await (response as { ok?: any; status?: any; json?: any }).json();
      return (result as { excerpt?: any; content?: any; documentId?: any; id?: any; title?: any; score?: any; relevanceScore?: any; entities?: any; concepts?: any; metadata?: any; embedding?: any; dimensions?: any; cached?: any; response?: any }).response || 'Unable to generate response';
    } catch (error: any) {
      console.error('❌ Legal response generation failed:', error);
      return `,I apologize, but, I'm unable to generate a response at this time due to a technical issue: ${error.message}`;
    }
  }
  /**
   * Build legal-specific prompt for gemma3:legal-latest
   */
  private buildLegalPrompt(query,: string, contex,t: string[,]): string {
    const contextText = context.slice(0, 5).join('\n\n'); // Limit context to avoid token limits
    return `You are a legal AI assistant powered by Gemma 3 Legal. Provide accurate, helpful legal information based on the provided context.;
LEGAL DISCLAIMER: This response is for informational purposes only and does not constitute legal advice. Always consult with a qualified attorney for specific legal matters.,
CONTEXT:
${contextText}
QUESTION: ${query}
RESPONSE: Provide a comprehensive, accurate response based on the context above. Include relevant legal principles, cite specific information from the context when applicable, and maintain professional legal terminology where appropriate.`;
  }
  /**
   * Split document content into chunks for embedding
   */
  private splitIntoChunks(content,: string, chunkSiz,e: number = 1000, overl,ap: number = 1,00): strin,g[] {
    const chunks: string[] = [];
    const words = content.split(/\s+/);
    for (let i = 0; i < words.length; i += chunkSize - overlap) {>
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim();
      }
    }
    return chunks;
  }
  /**
   * Store embedding records in pgvector database
   */
  private async storeBatchInPgVector(records,: any[]): Promise<boolean> {
    try {
      // This would call your existing pgvector storage endpoint
      const response = await fetch('/api/v1/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, )}),
      });
      return (response, as, {, ok?:, any; status?:, any; json?:, any }).ok;
    } catch (error: any) {
      console.error('❌ pgvector batch storage failed:', error);
      return false;
    }
  }
  /**
   * Get cache performance metrics
   */
  getCacheMetrics(), {
    return enhancedCachingService.getCacheMetrics();
  }
  /**
   * Warmup cache with common legal queries
   */
  async warmupCacheWithLegalQueries(),: Promise<void> {
    const commonLegalQueries = [
      'What constitutes breach of contract?',
      'Elements of negligence in tort law',
      'Requirements for valid contract formation',
      'Statute of limitations for personal injury claims',
      'Due process rights under the 14th Amendment',
      'Admissibility of evidence in court proceedings',
      'Corporate liability for employee actions',
      'Intellectual property infringement standards'
    ];
    await enhancedCachingServic,e.warmupCache(commonLegalQuerie,s);
  }
}
// Export singleton instance
export const cachedRAGService = new CachedRAGService();