import type { LegalDocument, Evidence } from "$lib/types/legal-types";
// New: typed worker message shapes and memory stats
type MemoryStats = {
  rss?: number;
  heapTotal?: number;
  heapUsed?: number;
  external?: number;
  [key: string]: unknown;
};

type WorkerToMain =
  | { type: 'initialized' }
  | { type: 'memory_stats'; stats: MemoryStats }
  | { type: 'response'; success: boolean; embedding?: number[]; embeddings?: number[][]; error?: string }
  | { type: 'optimize_done' };

/**
 * Client-side embedding generator for legal documents
 * Uses WebAssembly for efficient client-side vector generation
 */
export class ClientEmbeddingGenerator {
  private initialized = false;
  private worker: Worker | null = null;
  private embedModel: 'nomic-embed' | 'llama-cpp' | 'ollama-embedding' = 'ollama-embedding';
  private ollamaUrl: string;
  constructor(
    model: 'nomic-embed' | 'llama-cpp' | 'ollama-embedding' = 'ollama-embedding',
    ollamaUrl = 'http://localhost:11434'
  ) {
    this.embedModel = model;
    this.ollamaUrl = ollamaUrl;
  }
  /**
   * Initialize the embedding generator with WASM module
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      // Initialize web worker for embedding generation
      this.worker = new Worker('/workers/embedding-worker.js');
      // Wait for worker initialization
      await new Promise((resolve, reject) => {
        const timeout: ReturnType<typeof setTimeout> = setTimeout(
          () => reject(new Error('Worker initialization timeout')),
          30000
        );

        // typed message event
        this.worker!.onmessage = (e: MessageEvent<WorkerToMain>) => {
          const data = e.data;
          if (data?.type === 'initialized') {
            clearTimeout(timeout);
            this.initialized = true;
            resolve(true);
          }
        };
        this.worker!.onerror = error => {
          clearTimeout(timeout);
          reject(error);
        };
        this.worker!.postMessage({
          type: 'initialize',
          model: this.embedModel,
        });
      });
      console.log(`Client embedding generator initialized with ${this.embedModel}`);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to initialize embedding generator:', error);
      this.initialized = false;
      return false;
    }
  }
  /**
   * Generate embeddings for legal document text
   * Optimized for legal terminology and case law
   */
  async generateEmbedding(text: string): Promise<Float32Array | null> {
    // If using Ollama remote embedding model, call the Ollama HTTP API directly
    if (this.embedModel === 'ollama-embedding') {
      return await this.callOllamaEmbedding(text);
    }
    if (!this.initialized || !this.worker) {
      console.warn('Embedding generator not initialized');
      return null;
    }
    try {
      return new Promise((resolve, reject) => {
        const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
          reject(new Error('Embedding generation timeout'));
        }, 60000); // 60 second timeout

        this.worker!.onmessage = (e: MessageEvent<WorkerToMain>) => {
          clearTimeout(timeout);
          const data = e.data;

          if ('success' in data) {
            if (data.success && Array.isArray(data.embedding)) {
              resolve(new Float32Array(data.embedding));
            } else {
              reject(new Error(data.error ?? 'Unknown worker error'));
            }
          } else {
            reject(new Error('Unexpected worker message'));
          }
        };

        this.worker!.postMessage({
          type: 'generate_embedding',
          text: text,
          options: {
            maxLength: 8192, // Legal documents can be long
            normalize: true,
            legal_mode: true,
          },
        });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Embedding generation failed:', error);
      return null;
    }
  }
  /**
   * Generate embeddings for legal documents with legal-specific preprocessing
   */
  async generateLegalDocumentEmbedding(document: LegalDocument): Promise<Float32Array | null> {
    try {
      // Construct legal-optimized text for embedding
      const embeddingText = this.prepareLegalText(document);
      return await this.generateEmbedding(embeddingText);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Legal document embedding failed:', error);
      return null;
    }
  }
  /**
   * Batch generate embeddings for multiple documents
   * Optimized for memory efficiency (70% reduction target)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    // If using Ollama remote embedding model, call the Ollama HTTP API for batches
    if (this.embedModel === 'ollama-embedding') {
      return await this.callOllamaBatch(texts);
    }
    if (!this.initialized || !this.worker) {
      console.warn('Embedding generator not initialized');
      return [];
    }
    try {
      return new Promise((resolve, reject) => {
        const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
          reject(new Error('Batch embedding timeout'));
        }, 120000); // 2 minute timeout for batches

        this.worker!.onmessage = (e: MessageEvent<WorkerToMain>) => {
          clearTimeout(timeout);
          const data = e.data;

          if ('success' in data) {
            if (data.success && Array.isArray(data.embeddings)) {
              const embeddings = (data.embeddings ?? []).map((emb: number[]) => new Float32Array(emb));
              resolve(embeddings);
            } else {
              reject(new Error(data.error ?? 'Unknown worker error'));
            }
          } else {
            reject(new Error('Unexpected worker message'));
          }
        };

        this.worker!.postMessage({
          type: 'generate_batch_embeddings',
          texts: texts,
          options: {
            batchSize: 10, // Process in batches to manage memory
            maxLength: 4096,
            normalize: true,
            legal_mode: true,
          },
        });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Batch embedding generation failed:', error);
      return [];
    }
  }
  /**
   * Generate embeddings for evidence with metadata integration
   */
  async generateEvidenceEmbedding(evidence: Evidence): Promise<Float32Array | null> {
    try {
      const embeddingText = this.prepareEvidenceText(evidence);
      return await this.generateEmbedding(embeddingText);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Evidence embedding failed:', error);
      return null;
    }
  }
  /**
   * Prepare legal document text for optimal embedding generation
   */
  private prepareLegalText(document: LegalDocument): string {
    const components: string[] = [];
    const doc = document as Partial<LegalDocument>;

    // Add document title with legal emphasis
    if (typeof doc.title === 'string' && doc.title.trim()) {
      components.push(`Title: ${doc.title}`);
    }
    // Add document type for legal categorization
    if (typeof doc.documentType === 'string' && doc.documentType.trim()) {
      components.push(`Document Type: ${doc.documentType}`);
    }
    // Add jurisdiction for legal context
    if (typeof doc.jurisdiction === 'string' && doc.jurisdiction.trim()) {
      components.push(`Jurisdiction: ${doc.jurisdiction}`);
    }
    // Add court information
    if (typeof doc.court === 'string' && doc.court.trim()) {
      components.push(`Court: ${doc.court}`);
    }
    // Add parties for case context
    if (doc.parties && typeof doc.parties === 'object') {
      const partyInfo = Object.entries(doc.parties as Record<string, unknown>)
        .filter(([_, value]) => value)
        .map(([role, name]) => `${role}: ${String(name)}`)
        .join(', ');
      if (partyInfo) {
        components.push(`Parties: ${partyInfo}`);
      }
    }
    // Add legal principles/topics
    if (Array.isArray(doc.topics) && doc.topics.length > 0) {
      const topics = doc.topics.filter(t => typeof t === 'string').join(', ');
      if (topics) components.push(`Legal Topics: ${topics}`);
    }
    // Add summary or headnotes (prioritized content)
    if (typeof doc.headnotes === 'string' && doc.headnotes.trim()) {
      components.push(`Headnotes: ${doc.headnotes}`);
    } else if (typeof doc.summary === 'string' && doc.summary.trim()) {
      components.push(`Summary: ${doc.summary}`);
    }
    // Add full content (truncated if too long)
    if (typeof doc.fullText === 'string' && doc.fullText.length > 0) {
      const maxContentLength = 6000; // Leave room for metadata
      const content =
        doc.fullText.length > maxContentLength ? doc.fullText.substring(0, maxContentLength) + '...' : doc.fullText;
      components.push(`Content: ${content}`);
    }
    return components.join('\n\n');
  }
  /**
   * Prepare evidence text for embedding generation
   */
  private prepareEvidenceText(evidence: Evidence): string {
    const components = [];
    // Add evidence title
    if (evidence.title) {
      components.push(`Evidence: ${evidence.title}`);
    }
    // Add evidence type
    if (evidence.evidenceType) {
      components.push(`Type: ${evidence.evidenceType}`);
    }
    // Add description
    if (evidence.description) {
      components.push(`Description: ${evidence.description}`);
    }
    // Add AI tags if available
    if (evidence.aiTags && Array.isArray(evidence.aiTags)) {
      components.push(`Tags: ${evidence.aiTags.join(', ')}`);
    }
    // Add AI summary
    if (evidence.aiSummary) {
      components.push(`Summary: ${evidence.aiSummary}`);
    }
    // Add location context
    if (evidence.location) {
      components.push(`Location: ${evidence.location}`);
    }
    return components.join('\n\n');
  }
  /**
   * Get embedding model information
   */
  getModelInfo(): { model: string; dimensions: number; initialized: boolean } {
    const dimensions = this.embedModel === 'nomic-embed' ? 384 : this.embedModel === 'ollama-embedding' ? 1536 : 512;
    return {
      model: this.embedModel,
      dimensions: dimensions,
      initialized: this.initialized,
    };
  }
  /**
   * Check if the client can support embedding generation
   */
  static isSupported(): boolean {
    // Support if either worker+WASM is present or fetch is available for remote Ollama
    const hasWasmWorker = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
    const hasFetch = typeof fetch === 'function';
    return typeof Float32Array !== 'undefined' && (hasWasmWorker || hasFetch);
  }
  /**
   * Call Ollama embedding endpoint for a single input.
   */
  private async callOllamaEmbedding(text: string): Promise<Float32Array | null> {
    try {
      const payload = { model: 'embeddinggemma:latest', input: text };
      const res = await fetch(`${this.ollamaUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('Ollama embedding request failed', await res.text());
        return null;
      }
      const json = await res.json().catch(() => null);
      if (!json) return null;
      // handle common shapes: { embedding: [...] } or { embeddings: [[...]] } or { data: [{embedding: [...]}] }
      let vec: number[] | undefined;
      if (Array.isArray(json.embedding)) vec = json.embedding;
      else if (Array.isArray(json.embeddings) && Array.isArray(json.embeddings[0])) vec = json.embeddings[0];
      else if (Array.isArray(json.data) && json.data[0] && Array.isArray(json.data[0].embedding))
        vec = json.data[0].embedding;
      if (!vec) return null;
      return new Float32Array(vec);
    } catch (err) {
      console.error('Ollama embedding error', err);
      return null;
    }
  }
  /**
   * Call Ollama embedding endpoint for a batch of inputs.
   */
  private async callOllamaBatch(texts: string[]): Promise<Float32Array[]> {
    try {
      const payload = { model: 'embeddinggemma:latest', input: texts };
      const res = await fetch(`${this.ollamaUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('Ollama batch embedding request failed', await res.text());
        return [];
      }
      const json = await res.json().catch(() => null);
      if (!json) return [];
      // Normalize shapes: { embeddings: [[...], ...] or { data: [{embedding:[...]}, ...] }
      let arrays: number[][] = [];
      if (Array.isArray(json.embeddings)) arrays = json.embeddings;
      else if (Array.isArray(json.data)) arrays = json.data.map((d: any) => d.embedding).filter(Array.isArray);
      else if (Array.isArray(json.embedding) && Array.isArray(json.embedding[0])) arrays = json.embedding;
      return arrays.map(a => new Float32Array(a));
    } catch (err) {
      console.error('Ollama batch embedding error', err);
      return [];
    }
  }
  /**
   * Get memory usage statistics for optimization monitoring
   */
  async getMemoryStats(): Promise<MemoryStats | null> {
    if (!this.worker) return null;
    try {
      return new Promise(resolve => {
        const timeout: ReturnType<typeof setTimeout> = setTimeout(() => resolve(null), 5000);
        this.worker!.onmessage = (e: MessageEvent<WorkerToMain>) => {
          const data = e.data;
          if (data?.type === 'memory_stats') {
            clearTimeout(timeout);
            resolve(data.stats);
          }
        };
        this.worker!.postMessage({ type: 'get_memory_stats' });
      });
    } catch (err) {
      // swallow and return null on error
      return null;
    }
  }
  /**
   * Optimize memory usage - clear caches and trigger garbage collection
   */
  async optimizeMemory(): Promise<void> {
    if (this.worker) {
      this.worker.postMessage({ type: 'optimize_memory' });
    }
    // Trigger garbage collection if available
    if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') {
      (globalThis as unknown as { gc: () => void }).gc();
    }
  }
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
}
// Singleton instance for application use (default wired to Ollama embeddinggemma:latest)
export const clientEmbeddingGenerator = new ClientEmbeddingGenerator('ollama-embedding', typeof process !== 'undefined' && (process.env?.OLLAMA_URL as string) ? (process.env.OLLAMA_URL as string) : 'http://localhost:11434');
// Utility functions for embedding management
export class EmbeddingCache {
  private cache = new Map<string, { embedding: Float32Array; timestamp: number }>();
  private maxCacheSize = 1000;
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  /**
   * Get cached embedding or generate new one
   */
  async getCachedEmbedding(text: string): Promise<Float32Array | null> {
    const cacheKey = this.generateCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.embedding;
    }
    // Generate new embedding
    const embedding = await clientEmbeddingGenerator.generateEmbedding(text);
    if (embedding) {
      this.setCachedEmbedding(text, embedding);
    }
    return embedding;
  }
  /**
   * Cache an embedding
   */
  setCachedEmbedding(text: string, embedding: Float32Array): void {
    const cacheKey = this.generateCacheKey(text);
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }
    this.cache.set(cacheKey, {
      embedding: embedding,
      timestamp: Date.now(),
    });
  }
  /**
   * Generate cache key from text
   */
  private generateCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  /**
   * Cleanup old cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    // Sort by timestamp and remove oldest entries
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest 20% of entries
    const removeCount = Math.floor(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: this.cache.size * 384 * 4, // Approximate bytes
    };
  }
}
export const embeddingCache = new EmbeddingCache();