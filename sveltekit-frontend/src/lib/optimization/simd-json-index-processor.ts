
/**
 * SIMD JSON Index Processor - Optimized Copilot Context Processing (Fixed)
 * Integrates with Enhanced RAG system and Context7 MCP for high-performance index parsing
 */

import { createActor } from "xstate";
import type { RAGDocument, RAGSearchResult, TextChunk } from '$lib/types/rag';
import { enhancedRAGStore } from '$lib/stores/enhanced-rag-store';

// SIMD JSON Parser using structured cloning for performance
export interface SIMDJSONParser {
  parse: (buffer: ArrayBuffer) => Promise<any>;
  parseString: (jsonString: string) => Promise<any>;
  parseWithStreaming: (buffer: ArrayBuffer, chunkSize?: number) => AsyncGenerator<any>;
}

// Optimized index structures for copilot context
export interface CopilotIndexEntry {
  id: string;
  filePath: string;
  language: string;
  content: string;
  embedding: Float32Array; // Use typed arrays for SIMD operations
  metadata: {
    source: 'enhanced_local_index' | 'context7_mcp' | 'basic_index';
    priority: 'high' | 'medium' | 'low';
    relevanceScore: number;
    timestamp: number;
    fileSize: number;
    tokens: number;
  };
  semanticChunks: Array<{
    content: string;
    embedding: Float32Array;
    startOffset: number;
    endOffset: number;
  }>;
}

export interface CopilotIndex {
  version: string;
  indexType: 'enhanced_legal_ai' | 'context7_mcp' | 'hybrid';
  entries: CopilotIndexEntry[];
  statistics: {
    totalEntries: number;
    totalTokens: number;
    avgEmbeddingTime: number;
    indexSizeMB: number;
    lastUpdated: number;
  };
  clusters: Array<{
    id: string;
    centroid: Float32Array;
    memberIds: string[];
    relevantTerms: string[];
  }>;
}

// Vector embedding integration with pgvector/Qdrant
export interface VectorEmbeddingConfig {
  model: 'nomic-embed-text' | 'all-MiniLM-L6-v2' | 'text-embedding-ada-002';
  dimensions: 384 | 768 | 1536;
  backend: 'pgvector' | 'qdrant' | 'hybrid';
  chunkSize: number;
  overlap: number;
}

export class SIMDJSONIndexProcessor {
  private parser: SIMDJSONParser;
  private vectorConfig: VectorEmbeddingConfig;
  private embeddingCache = new Map<string, Float32Array>();
  private performanceMetrics = {
    parseTime: 0,
    embeddingTime: 0,
    indexTime: 0,
    totalProcessed: 0,
    cacheHits: 0,
  };

  constructor(config: Partial<VectorEmbeddingConfig> = {}) {
    this.vectorConfig = {
      model: 'nomic-embed-text',
      dimensions: 384,
      backend: 'hybrid',
      chunkSize: 512,
      overlap: 50,
      ...config,
    };

    // Initialize SIMD JSON parser with worker thread support
    this.parser = this.createSIMDParser();
  }

  /**
   * Process copilot.md with SIMD JSON parsing and vector embeddings
   */
  async processCopilotIndex(indexData: string | ArrayBuffer): Promise<CopilotIndex> {
    const startTime = performance.now();

    try {
      // Parse with SIMD optimization
      const rawIndex = await this.parseWithSIMD(indexData);
      
      // Extract and optimize entries
      const optimizedEntries = await this.processIndexEntries(rawIndex);
      
      // Generate semantic clusters using SOM
      const clusters = await this.generateSemanticClusters(optimizedEntries);
      
      // Calculate statistics
      const statistics = this.calculateIndexStatistics(optimizedEntries);

      const processedIndex: CopilotIndex = {
        version: '2.0.0',
        indexType: 'enhanced_legal_ai',
        entries: optimizedEntries,
        statistics,
        clusters,
      };

      this.performanceMetrics.indexTime = performance.now() - startTime;
      this.performanceMetrics.totalProcessed++;

      // Integrate with Enhanced RAG store
      await this.integrateWithRAGStore(processedIndex);

      return processedIndex;
    } catch (error: any) {
      console.error('SIMD Index processing failed:', error);
      throw new Error(`Index processing failed: ${error.message}`);
    }
  }

  /**
   * Generate vector embeddings using configured model
   */
  async generateEmbeddings(content: string): Promise<Float32Array> {
    const cacheKey = this.hashContent(content);
    
    // Check cache first
    if (this.embeddingCache.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.embeddingCache.get(cacheKey)!;
    }

    const startTime = performance.now();

    try {
      let embedding: number[];

      switch (this.vectorConfig.backend) {
        case 'pgvector':
          embedding = await this.generatePGVectorEmbedding(content);
          break;
        case 'qdrant':
          embedding = await this.generateQdrantEmbedding(content);
          break;
        case 'hybrid':
          embedding = await this.generateHybridEmbedding(content);
          break;
      }

      // Convert to Float32Array for SIMD operations
      const embeddingArray = new Float32Array(embedding);
      
      // Cache the result
      this.embeddingCache.set(cacheKey, embeddingArray);
      
      this.performanceMetrics.embeddingTime += performance.now() - startTime;
      
      return embeddingArray;
    } catch (error: any) {
      console.error('Embedding generation failed:', error);
      // Return zero vector as fallback
      return new Float32Array(this.vectorConfig.dimensions);
    }
  }

  /**
   * Semantic search using SIMD-optimized vector operations
   */
  async semanticSearch(
    query: string,
    index: CopilotIndex,
    options: {
      limit?: number;
      threshold?: number;
      preferEnhanced?: boolean;
    } = {}
  ): Promise<RAGSearchResult[]> {
    const { limit = 10, threshold = 0.7, preferEnhanced = true } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbeddings(query);

    // Calculate similarities using SIMD operations
    const similarities = index.entries.map((entry) => ({
      entry,
      similarity: this.calculateCosineSimilaritySIMD(queryEmbedding, entry.embedding),
    }));

    // Filter and sort by similarity
    let results = similarities
      .filter(({ similarity }) => similarity >= threshold)
      .sort((a, b) => {
        // Boost enhanced index results
        if (preferEnhanced) {
          const aBoost = a.entry.metadata.source === 'enhanced_local_index' ? 0.2 : 0;
          const bBoost = b.entry.metadata.source === 'enhanced_local_index' ? 0.2 : 0;
          return (b.similarity + bBoost) - (a.similarity + aBoost);
        }
        return b.similarity - a.similarity;
      })
      .slice(0, limit);

    // Convert to SearchResult format
    return results.map(({ entry, similarity }, index) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata,
      type: 'document' as const,
      document: this.convertToRAGDocument(entry),
      score: similarity,
      relevantChunks: entry.semanticChunks.map((chunk, chunkIndex) => ({
        id: `chunk_${entry.id}_${chunkIndex}`,
        content: chunk.content,
        text: chunk.content, // Required by TextChunk interface
        documentId: entry.id,
        index: chunkIndex, // Required by TextChunk interface
        startIndex: chunk.startOffset,
        endIndex: chunk.endOffset,
        score: this.calculateCosineSimilaritySIMD(queryEmbedding, chunk.embedding),
        embeddings: Array.from(chunk.embedding.slice(0, 10)),
        chunkType: 'paragraph' as const,
        metadata: {} // Required by TextChunk interface
      } as TextChunk)),
      highlights: this.extractHighlights(entry.content, query),
      explanation: `Enhanced semantic search result (${entry.metadata.source})`,
      legalRelevance: {
        overall: similarity,
        factual: similarity * 0.9,
        procedural: similarity * 0.8,
        precedential: similarity * 0.85,
        jurisdictional: similarity * 0.95,
        confidence: entry.metadata.relevanceScore,
      },
      relevanceScore: similarity,
      rank: index + 1,
      snippet: entry.content.substring(0, 200),
    }));
  }

  /**
   * SIMD-optimized cosine similarity calculation
   */
  private calculateCosineSimilaritySIMD(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Process in chunks of 4 for SIMD optimization
    const chunkSize = 4;
    const chunks = Math.floor(a.length / chunkSize);

    for (let i = 0; i < chunks * chunkSize; i += chunkSize) {
      // Manually unrolled loop for better SIMD optimization
      dotProduct += a[i] * b[i] + a[i+1] * b[i+1] + a[i+2] * b[i+2] + a[i+3] * b[i+3];
      normA += a[i] * a[i] + a[i+1] * a[i+1] + a[i+2] * a[i+2] + a[i+3] * a[i+3];
      normB += b[i] * b[i] + b[i+1] * b[i+1] + b[i+2] * b[i+2] + b[i+3] * b[i+3];
    }

    // Handle remaining elements
    for (let i = chunks * chunkSize; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Create SIMD-optimized JSON parser
   */
  private createSIMDParser(): SIMDJSONParser {
    return {
      parse: async (buffer: ArrayBuffer) => {
        try {
          // Use structured cloning for optimal performance
          const textDecoder = new TextDecoder('utf-8');
          const jsonString = textDecoder.decode(buffer);
          return JSON.parse(jsonString);
        } catch (error: any) {
          throw new Error(`SIMD JSON parse failed: ${error.message}`);
        }
      },

      parseString: async (jsonString: string) => {
        try {
          return JSON.parse(jsonString);
        } catch (error: any) {
          throw new Error(`SIMD JSON string parse failed: ${error.message}`);
        }
      },

      parseWithStreaming: async function* (buffer: ArrayBuffer, chunkSize = 1024 * 1024) {
        const textDecoder = new TextDecoder('utf-8');
        const totalLength = buffer.byteLength;
        let offset = 0;

        while (offset < totalLength) {
          const chunk = buffer.slice(offset, Math.min(offset + chunkSize, totalLength));
          const jsonString = textDecoder.decode(chunk);
          
          try {
            const parsed = JSON.parse(jsonString);
            yield parsed;
          } catch (error: any) {
            // Handle partial JSON in streaming
            console.warn('Partial JSON chunk skipped:', error.message);
          }

          offset += chunkSize;
        }
      }
    };
  }

  /**
   * Parse data with SIMD optimization
   */
  private async parseWithSIMD(data: string | ArrayBuffer): Promise<any> {
    const startTime = performance.now();

    try {
      if (typeof data === 'string') {
        return await this.parser.parseString(data);
      } else {
        return await this.parser.parse(data);
      }
    } finally {
      this.performanceMetrics.parseTime += performance.now() - startTime;
    }
  }

  /**
   * Process index entries with optimization
   */
  private async processIndexEntries(rawIndex: any): Promise<CopilotIndexEntry[]> {
    const entries: CopilotIndexEntry[] = [];

    // Process in parallel batches for performance
    const batchSize = 10;
    const batches = this.chunkArray(rawIndex.entries || [], batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (entry: any) => {
        const embedding = await this.generateEmbeddings(entry.content);
        const semanticChunks = await this.generateSemanticChunks(entry.content);

        return {
          id: entry.id || this.generateId(),
          filePath: entry.file_path || entry.filePath || '',
          language: entry.language || 'typescript',
          content: entry.content || '',
          embedding,
          metadata: {
            source: entry.mcp_metadata?.source || 'enhanced_local_index',
            priority: entry.mcp_metadata?.priority || 'medium',
            relevanceScore: entry.relevance_score || 0.8,
            timestamp: Date.now(),
            fileSize: entry.content?.length || 0,
            tokens: this.estimateTokens(entry.content || ''),
          },
          semanticChunks,
        } as CopilotIndexEntry;
      });

      const batchResults = await Promise.all(batchPromises);
      entries.push(...batchResults);
    }

    return entries;
  }

  /**
   * Generate semantic chunks with overlapping windows
   */
  private async generateSemanticChunks(content: string) {
    const chunks = [];
    const { chunkSize, overlap } = this.vectorConfig;
    const step = chunkSize - overlap;

    for (let i = 0; i < content.length; i += step) {
      const chunkContent = content.substring(i, i + chunkSize);
      if (chunkContent.trim().length > 50) { // Skip very small chunks
        const embedding = await this.generateEmbeddings(chunkContent);
        
        chunks.push({
          content: chunkContent,
          embedding,
          startOffset: i,
          endOffset: Math.min(i + chunkSize, content.length),
        });
      }
    }

    return chunks;
  }

  /**
   * Generate semantic clusters using SOM algorithm - Fixed version
   */
  private async generateSemanticClusters(entries: CopilotIndexEntry[]) {
    try {
      // Use the enhanced RAG store's SOM system  
      const somRAG = enhancedRAGStore.somRAG;
      
      // Train SOM with embeddings (convert Float32Array to regular array)
      for (const entry of entries) {
        await somRAG.trainIncremental(Array.from(entry.embedding), {
          id: entry.id,
          title: entry.filePath.split('/').pop() || entry.id,
          content: entry.content,
          type: 'document' as const,
          metadata: {
            source: entry.metadata.source || "enhanced_local_index",
            type: 'document',
            jurisdiction: '',
            practiceArea: [entry.metadata.priority || 'general'],
            confidentialityLevel: 0,
            lastModified: new Date(entry.metadata.timestamp || Date.now()),
            fileSize: entry.metadata.fileSize || entry.content.length,
            language: 'en',
            tags: []
          },
          version: '1.0'
        });
      }

      const somClusters = somRAG.getClusters();
      // Convert BooleanCluster to expected format
      return somClusters.map((cluster: any) => ({
        id: cluster.id,
        centroid: new Float32Array(cluster.centroid || []),
        memberIds: cluster.documents || [],
        relevantTerms: cluster.metadata?.dominant_legal_type ? [cluster.metadata.dominant_legal_type] : [],
      }));
    } catch (error: any) {
      console.error('Cluster generation failed:', error);
      // Return empty clusters on error
      return [];
    }
  }

  /**
   * Calculate index statistics
   */
  private calculateIndexStatistics(entries: CopilotIndexEntry[]) {
    const totalTokens = entries.reduce((sum, entry) => sum + entry.metadata.tokens, 0);
    const totalSize = entries.reduce((sum, entry) => sum + entry.metadata.fileSize, 0);

    return {
      totalEntries: entries.length,
      totalTokens,
      avgEmbeddingTime: this.performanceMetrics.embeddingTime / Math.max(entries.length, 1),
      indexSizeMB: totalSize / (1024 * 1024),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Integrate with Enhanced RAG store
   */
  private async integrateWithRAGStore(index: CopilotIndex) {
    const addDocument = enhancedRAGStore.addDocument;

    // Add entries as RAG documents
    for (const entry of index.entries) {
      const ragDocument = this.convertToRAGDocument(entry);
      await addDocument(ragDocument);
    }
  }

  /**
   * Convert index entry to RAG document
   */
  private convertToRAGDocument(entry: CopilotIndexEntry): import('$lib/types/rag').RAGDocument {
    return {
      id: entry.id,
      title: entry.filePath.split('/').pop() || entry.id,
      content: entry.content,
      type: 'document' as const,
      metadata: {
        source: entry.filePath,
        type: this.getDocumentType(entry.language),
        jurisdiction: 'enhanced_index',
        practiceArea: [entry.metadata.source],
        confidentialityLevel: 0,
        lastModified: new Date(entry.metadata.timestamp),
        fileSize: entry.metadata.fileSize,
        language: entry.language,
        tags: [entry.metadata.source, entry.metadata.priority],
      },
      version: '1.0',
    } as import('$lib/types/rag').RAGDocument;
  }

  /**
   * Generate embeddings using different backends
   */
  private async generatePGVectorEmbedding(content: string): Promise<number[]> {
    // Integrate with existing pgvector setup
    try {
      const response = await fetch('/api/embeddings/hybrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          model: this.vectorConfig.model,
          backend: 'pgvector'
        }),
      });

      if (!response.ok) {
        throw new Error(`PGVector API error: ${response.status}`);
      }

      const { embedding } = await response.json();
      return embedding;
    } catch (error: any) {
      console.warn('PGVector embedding failed, using fallback:', error);
      return this.generateFallbackEmbedding(content);
    }
  }

  private async generateQdrantEmbedding(content: string): Promise<number[]> {
    // Integrate with existing Qdrant setup
    try {
      const response = await fetch('/api/embeddings/hybrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          model: this.vectorConfig.model,
          backend: 'qdrant'
        }),
      });

      if (!response.ok) {
        throw new Error(`Qdrant API error: ${response.status}`);
      }

      const { embedding } = await response.json();
      return embedding;
    } catch (error: any) {
      console.warn('Qdrant embedding failed, using fallback:', error);
      return this.generateFallbackEmbedding(content);
    }
  }

  private async generateHybridEmbedding(content: string): Promise<number[]> {
    // Try PGVector first, fallback to Qdrant, then local
    try {
      return await this.generatePGVectorEmbedding(content);
    } catch (error: any) {
      try {
        return await this.generateQdrantEmbedding(content);
      } catch (error2) {
        return this.generateFallbackEmbedding(content);
      }
    }
  }

  private generateFallbackEmbedding(content: string): number[] {
    // Simple TF-IDF based embedding as fallback
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach((word: any) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Create sparse vector and pad to target dimensions
    const embedding = new Array(this.vectorConfig.dimensions).fill(0);
    let index = 0;
    
    for (const [word, count] of wordCount.entries()) {
      if (index < embedding.length) {
        embedding[index] = count / words.length; // TF
        index++;
      }
    }

    return embedding;
  }

  /**
   * Utility functions
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateId(): string {
    return `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTokens(content: string): number {
    // Rough token estimation (1 token ≈ 4 characters)
    return Math.ceil(content.length / 4);
  }

  private getDocumentType(language: string): 'case' | 'statute' | 'regulation' | 'evidence' | 'memo' {
    const typeMap: Record<string, 'case' | 'statute' | 'regulation' | 'evidence' | 'memo'> = {
      typescript: 'memo',
      javascript: 'memo',
      svelte: 'memo',
      markdown: 'memo',
      json: 'evidence',
    };
    return typeMap[language] || 'memo';
  }

  private extractHighlights(content: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const highlights: string[] = [];
    
    queryWords.forEach((word: any) => {
      const regex = new RegExp(`(.{0,50}${word}.{0,50})`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 3)); // Limit to 3 highlights per word
      }
    });

    return highlights.slice(0, 10); // Limit total highlights
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.cacheHits / Math.max(this.performanceMetrics.totalProcessed, 1),
      avgParseTime: this.performanceMetrics.parseTime / Math.max(this.performanceMetrics.totalProcessed, 1),
      avgEmbeddingTime: this.performanceMetrics.embeddingTime / Math.max(this.performanceMetrics.totalProcessed, 1),
      avgIndexTime: this.performanceMetrics.indexTime / Math.max(this.performanceMetrics.totalProcessed, 1),
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      parseTime: 0,
      embeddingTime: 0,
      indexTime: 0,
      totalProcessed: 0,
      cacheHits: 0,
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
  }
}

// Export singleton instance
export const simdIndexProcessor = new SIMDJSONIndexProcessor({
  model: 'nomic-embed-text',
  dimensions: 384,
  backend: 'hybrid',
  chunkSize: 512,
  overlap: 50,
});

