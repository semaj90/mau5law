
/**
 * Embedding Worker
 * Multi-threaded processing worker for embeddings and text processing
 * Runs complex computations off the main thread for better UI performance
 */

import type { 
  EmbeddingResult, 
  BatchEmbeddingResult, 
  DocumentChunk 
} from '$lib/services/nomic-embedding-service';

export interface WorkerMessage {
  id: string;
  type: 'embeddings' | 'similarity' | 'chunking' | 'processing';
  data: any;
  options?: Record<string, any>;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingTask {
  texts: string[];
  batchSize: number;
  model: string;
  dimensions: number;
}

export interface ChunkingTask {
  content: string;
  chunkSize: number;
  overlap: number;
  metadata: Record<string, any>;
}

export interface SimilarityTask {
  queryEmbedding: number[];
  targetEmbeddings: number[][];
  threshold: number;
  maxResults: number;
}

// Worker implementation
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  // We're in a worker context
  
  class EmbeddingWorker {
    private processing = false;
    private cache = new Map<string, any>();
    
    constructor() {
      self.addEventListener('message', this.handleMessage.bind(this));
      console.log('🔧 Embedding Worker initialized');
    }
    
    private async handleMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
      const { id, type, data, options } = event.data;
      
      try {
        let result: any;
        
        switch (type) {
          case 'embeddings':
            result = await this.processEmbeddings(data as EmbeddingTask, id);
            break;
          case 'chunking':
            result = await this.processChunking(data as ChunkingTask, id);
            break;
          case 'similarity':
            result = await this.processSimilarity(data as SimilarityTask, id);
            break;
          case 'processing':
            result = await this.processGeneral(data, options, id);
            break;
          default:
            throw new Error(`Unknown task type: ${type}`);
        }
        
        this.postResponse({
          id,
          success: true,
          data: result
        });
      } catch (error: any) {
        this.postResponse({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    private async processEmbeddings(task: EmbeddingTask, taskId: string): Promise<BatchEmbeddingResult> {
      const { texts, batchSize, model, dimensions } = task;
      const results: EmbeddingResult[] = [];
      const errors: any[] = [];
      
      const startTime = Date.now();
      let processed = 0;
      
      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        try {
          // Simulate embedding generation (in real implementation, this would call Ollama)
          const batchResults = await this.generateMockEmbeddings(batch, dimensions);
          results.push(...batchResults);
          
          processed += batch.length;
          
          // Report progress
          this.postResponse({
            id: taskId,
            success: true,
            progress: Math.round((processed / texts.length) * 100),
            data: { processed, total: texts.length }
          });
          
          // Small delay to prevent overwhelming
          await new Promise((resolve: any) => setTimeout(resolve, 10));
        } catch (error: any) {
          batch.forEach((text, index) => {
            errors.push({
              index: i + index,
              content: text.substring(0, 100) + '...',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        results,
        totalProcessed: results.length,
        averageTime: results.length > 0 ? totalTime / results.length : 0,
        errors,
        metrics: {
          tokenCount: this.estimateTokenCount(texts),
          embeddingDimensions: dimensions,
          cacheHits: 0,
          cacheMisses: texts.length
        }
      };
    }
    
    private async processChunking(task: ChunkingTask, taskId: string): Promise<DocumentChunk[]> {
      const { content, chunkSize, overlap, metadata } = task;
      
      const chunks = this.splitTextIntoChunks(content, chunkSize, overlap);
      const documentChunks: DocumentChunk[] = [];
      
      chunks.forEach((chunk, index) => {
        documentChunks.push({
          id: this.generateId(),
          content: chunk,
          metadata: {
            ...metadata,
            source: metadata?.source || 'unknown',
            chunkIndex: index,
            totalChunks: chunks.length,
            startIndex: content.indexOf(chunk),
            endIndex: content.indexOf(chunk) + chunk.length
          }
        });
        
        // Report progress
        if (index % 10 === 0) {
          this.postResponse({
            id: taskId,
            success: true,
            progress: Math.round((index / chunks.length) * 100),
            data: { processed: index, total: chunks.length }
          });
        }
      });
      
      return documentChunks;
    }
    
    private async processSimilarity(task: SimilarityTask, taskId: string): Promise<Array<{index: number, similarity: number}>> {
      const { queryEmbedding, targetEmbeddings, threshold, maxResults } = task;
      
      const similarities: Array<{index: number, similarity: number}> = [];
      
      for (let i = 0; i < targetEmbeddings.length; i++) {
        const similarity = this.cosineSimilarity(queryEmbedding, targetEmbeddings[i]);
        
        if (similarity >= threshold) {
          similarities.push({ index: i, similarity });
        }
        
        // Report progress every 100 items
        if (i % 100 === 0) {
          this.postResponse({
            id: taskId,
            success: true,
            progress: Math.round((i / targetEmbeddings.length) * 100),
            data: { processed: i, total: targetEmbeddings.length }
          });
        }
      }
      
      // Sort by similarity and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);
    }
    
    private async processGeneral(data: any, options: any = {}, taskId: string): Promise<any> {
      // General purpose processing for other tasks
      const { operation } = options;
      
      switch (operation) {
        case 'text-analysis':
          return await this.analyzeText(data.text);
        case 'vector-operations':
          return await this.performVectorOperations(data);
        case 'data-transformation':
          return await this.transformData(data);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }
    
    private async generateMockEmbeddings(texts: string[], dimensions: number): Promise<EmbeddingResult[]> {
      // Mock embedding generation - in real implementation, this would interface with Ollama
      return texts.map((text: any) => ({
        id: this.generateId(),
        embedding: new Array(dimensions).fill(0).map(() => Math.random() - 0.5),
        content: text,
        metadata: {
          tokenCount: Math.ceil(text.length / 4),
          processingTime: Math.random() * 100
        },
        processingTime: Math.random() * 100
      }));
    }
    
    private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
      const chunks: string[] = [];
      const sentences = text.split(/[.!?]+/).filter((s: any) => s.trim().length > 0);
      
      let currentChunk = '';
      let currentSize = 0;
      
      for (const sentence of sentences) {
        const sentenceLength = sentence.length;
        
        if (currentSize + sentenceLength > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          
          // Handle overlap
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + sentence;
          currentSize = overlapText.length + sentenceLength;
        } else {
          currentChunk += sentence + '. ';
          currentSize += sentenceLength + 2;
        }
      }
      
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      return chunks;
    }
    
    private cosineSimilarity(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0;
      
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      
      const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
      return magnitude > 0 ? dotProduct / magnitude : 0;
    }
    
    private async analyzeText(text: string): Promise<any> {
      // Text analysis implementation
      const words = text.split(/\s+/);
      const sentences = text.split(/[.!?]+/).filter((s: any) => s.trim().length > 0);
      const paragraphs = text.split(/\n\s*\n/).filter((p: any) => p.trim().length > 0);
      
      return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgWordsPerSentence: words.length / sentences.length,
        avgSentencesPerParagraph: sentences.length / paragraphs.length,
        readabilityScore: this.calculateReadabilityScore(words, sentences),
        keyPhrases: this.extractKeyPhrases(text),
        sentiment: this.analyzeSentiment(text)
      };
    }
    
    private async performVectorOperations(data: any): Promise<any> {
      const { operation, vectors } = data;
      
      switch (operation) {
        case 'normalize':
          return vectors.map((v: number[]) => this.normalizeVector(v));
        case 'average':
          return this.averageVectors(vectors);
        case 'distance':
          return this.calculateDistances(vectors);
        default:
          throw new Error(`Unknown vector operation: ${operation}`);
      }
    }
    
    private async transformData(data: any): Promise<any> {
      // Data transformation utilities
      const { transformation, input } = data;
      
      switch (transformation) {
        case 'flatten':
          return this.flattenObject(input);
        case 'group':
          return this.groupData(input);
        case 'filter':
          return this.filterData(input, data.criteria);
        default:
          throw new Error(`Unknown transformation: ${transformation}`);
      }
    }
    
    // Utility methods
    private estimateTokenCount(texts: string[]): number {
      return texts.reduce((total, text) => total + Math.ceil(text.length / 4), 0);
    }
    
    private generateId(): string {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    private calculateReadabilityScore(words: string[], sentences: string[]): number {
      // Simplified Flesch Reading Ease score
      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = words.reduce((total, word) => total + this.countSyllables(word), 0) / words.length;
      
      return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    }
    
    private countSyllables(word: string): number {
      // Simple syllable counting
      word = word.toLowerCase();
      if (word.length <= 3) return 1;
      
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      word = word.replace(/^y/, '');
      const matches = word.match(/[aeiouy]{1,2}/g);
      
      return matches ? matches.length : 1;
    }
    
    private extractKeyPhrases(text: string): string[] {
      // Simple key phrase extraction
      const words = text.toLowerCase().split(/\s+/);
      const phrases: Record<string, number> = {};
      
      // Extract 2-word and 3-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const phrase2 = words.slice(i, i + 2).join(' ');
        phrases[phrase2] = (phrases[phrase2] || 0) + 1;
        
        if (i < words.length - 2) {
          const phrase3 = words.slice(i, i + 3).join(' ');
          phrases[phrase3] = (phrases[phrase3] || 0) + 1;
        }
      }
      
      return Object.entries(phrases)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([phrase]) => phrase);
    }
    
    private analyzeSentiment(text: string): number {
      // Simplified sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate'];
      
      const words = text.toLowerCase().split(/\s+/);
      let score = 0;
      
      words.forEach((word: any) => {
        if (positiveWords.includes(word)) score += 1;
        if (negativeWords.includes(word)) score -= 1;
      });
      
      return Math.max(-1, Math.min(1, score / Math.sqrt(words.length)));
    }
    
    private normalizeVector(vector: number[]): number[] {
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map((val: any) => val / magnitude) : vector;
    }
    
    private averageVectors(vectors: number[][]): number[] {
      if (vectors.length === 0) return [];
      
      const dimensions = vectors[0].length;
      const average = new Array(dimensions).fill(0);
      
      vectors.forEach((vector: any) => {
        vector.forEach((val, i) => {
          average[i] += val / vectors.length;
        });
      });
      
      return average;
    }
    
    private calculateDistances(vectors: number[][]): number[][] {
      const distances: number[][] = [];
      
      for (let i = 0; i < vectors.length; i++) {
        distances[i] = [];
        for (let j = 0; j < vectors.length; j++) {
          if (i === j) {
            distances[i][j] = 0;
          } else {
            distances[i][j] = this.euclideanDistance(vectors[i], vectors[j]);
          }
        }
      }
      
      return distances;
    }
    
    private euclideanDistance(a: number[], b: number[]): number {
      return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }
    
    private flattenObject(obj: any, prefix = ''): Record<string, any> {
      const flattened: Record<string, any> = {};
      
      Object.keys(obj).forEach((key: any) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      });
      
      return flattened;
    }
    
    private groupData(data: any[]): Record<string, unknown[]> {
      // Simple grouping by first property
      const grouped: Record<string, unknown[]> = {};
      
      data.forEach((item: any) => {
        const key = Object.values(item)[0] as string;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
      
      return grouped;
    }
    
    private filterData(data: any[], criteria: Record<string, any>): unknown[] {
      return data.filter((item: any) => {
        return Object.entries(criteria).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }
    
    private postResponse(response: WorkerResponse): void {
      self.postMessage(response);
    }
  }
  
  // Initialize the worker
  new EmbeddingWorker();
}

// Client-side worker manager
export class EmbeddingWorkerManager {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: number, data?: unknown) => void;
  }>();
  
  constructor() {
    this.initializeWorker();
  }
  
  private initializeWorker(): void {
    if (typeof Worker !== 'undefined') {
      // Create worker from this same file
      const workerCode = `
        ${this.constructor.toString()}
        // Worker code will be injected here
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
      this.worker.addEventListener('error', this.handleWorkerError.bind(this));
    }
  }
  
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, success, data, error, progress } = event.data;
    const task = this.pendingTasks.get(id);
    
    if (!task) return;
    
    if (progress !== undefined && task.onProgress) {
      task.onProgress(progress, data);
      return;
    }
    
    if (success) {
      task.resolve(data);
    } else {
      task.reject(new Error(error || 'Worker task failed'));
    }
    
    this.pendingTasks.delete(id);
  }
  
  private handleWorkerError(event: ErrorEvent): void {
    console.error('Worker error:', event.error);
    
    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error(`Worker error: ${event.error?.message || 'Unknown error'}`));
    }
    
    this.pendingTasks.clear();
  }
  
  public async processEmbeddings(
    task: EmbeddingTask,
    onProgress?: (progress: number, data?: unknown) => void
  ): Promise<BatchEmbeddingResult> {
    return this.executeTask('embeddings', task, onProgress);
  }
  
  public async processChunking(
    task: ChunkingTask,
    onProgress?: (progress: number, data?: unknown) => void
  ): Promise<DocumentChunk[]> {
    return this.executeTask('chunking', task, onProgress);
  }
  
  public async processSimilarity(
    task: SimilarityTask,
    onProgress?: (progress: number, data?: unknown) => void
  ): Promise<Array<{index: number, similarity: number}>> {
    return this.executeTask('similarity', task, onProgress);
  }
  
  public async processGeneral(
    data: any,
    options: any,
    onProgress?: (progress: number, data?: unknown) => void
  ): Promise<any> {
    return this.executeTask('processing', data, onProgress, options);
  }
  
  private async executeTask(
    type: WorkerMessage['type'],
    data: any,
    onProgress?: (progress: number, data?: unknown) => void,
    options?: unknown
  ): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }
    
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject, onProgress });
      
      this.worker!.postMessage({
        id,
        type,
        data,
        options
      } as WorkerMessage);
    });
  }
  
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error('Worker terminated'));
    }
    
    this.pendingTasks.clear();
  }
  
  public get isAvailable(): boolean {
    return this.worker !== null;
  }
  
  public get pendingTaskCount(): number {
    return this.pendingTasks.size;
  }
}

// Types are already exported above