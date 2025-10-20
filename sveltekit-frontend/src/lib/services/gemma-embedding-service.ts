/**
 * Gemma Embedding Service
 *
 * Generic HTTP endpoint wrapper for Gemma embeddings with configurable local/remote endpoints.
 * Supports multiple embedding providers and automatic fallback strategies.
 *
 * Features:
 * - Local and remote Gemma endpoint support
 * - Automatic batching and rate limiting
 * - Caching for repeated embeddings
 * - Multiple provider fallback
 * - Performance monitoring and metrics
 */
// Types for embedding operations
interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}
interface EmbeddingResponse {
  embeddings?: number[][];
  data?: Array<any>;
  usage?: {
    prompt_tokens: number;
  total_tokens: number;
  }
  model?: string;
}
interface EmbeddingProvider {
  name: string;
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxBatchSize?: number;
  rateLimit?: number; // requests per minute
}
interface EmbeddingMetrics {
  provider: string;
  requestCount: number;
  totalTokens: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
}
interface CachedEmbedding {
  embedding: number[];
  timestamp: number;
  provider: string;
  ttl: number; // milliseconds
}
class EmbeddingCache {
  private cache = new Map<string, CachedEmbedding>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  set(text: string, embedding: number[], provider: string, ttl?: number): void {
    const key = this.hashText(text);
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      provider,
      ttl: ttl || this.defaultTTL
    });
  }
  get(text: string): number[] | null {
    const key = this.hashText(text);
    const cached = this.cache.get(key);
    if (!cached) return null;
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.embedding;
  }
  clear(): void {
    this.cache.clear();
  }
  size(): number {
    return this.cache.size;
  }
  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {>
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;>>
      hash, = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
export class GemmaEmbeddingService {
  private providers: EmbeddingProvider[] = [];
  private metrics = new Map<string, EmbeddingMetrics>();
  private cache = new EmbeddingCache();
  private rateLimiters = new Map<string, { requests: number; lastReset: number }>();
  constructor() {
    this.initializeProviders();
  }
  /**
   * Initialize embedding providers from environment variables
   */
  private initializeProviders(): void {
    // Primary Gemma endpoint (local or remote)
    const primaryEndpoint = process.env.GEMMA_EMBED_ENDPOINT || 'http://localhost:8080/embed'
    this.providers.push({
      name: 'gemma-primary',
      endpoint: primaryEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.GEMMA_API_KEY && { 'Authorization': `Bearer ${process.env.GEMMA_API_KEY}` })
      },
      timeout: parseInt(process.env.GEMMA_TIMEOUT || '30000'),
      maxBatchSize: parseInt(process.env.GEMMA_BATCH_SIZE || '32'),
      rateLimit: parseInt(process.env.GEMMA_RATE_LIMIT || '60')
    });
    // Fallback endpoints
    if (process.env.GEMMA_FALLBACK_ENDPOINT) {
      this.providers.push({
        name: 'gemma-fallback',
        endpoint: process.env.GEMMA_FALLBACK_ENDPOINT,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.GEMMA_FALLBACK_API_KEY && { 'Authorization': `Bearer ${process.env.GEMMA_FALLBACK_API_KEY}` })
        },
        timeout: 30000,
        maxBatchSize: 16,
        rateLimit: 30
      });
    }
    // OpenAI-compatible fallback (if configured)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai-fallback',
        endpoint: 'https://api.openai.com/v1/embeddings',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 30000,
        maxBatchSize: 2048, // OpenAI has higher limits
        rateLimit: 3000
      });
    }
    // Initialize metrics for each provider
    this.providers.forEach(provider => {
      this.metrics.set(provider.name, {
        provider: provider.name,
        requestCount: 0,
        totalTokens: 0,
        averageLatency: 0,
        errorRate: 0,
        cacheHitRate: 0
      });
    });
  }
  /**
   * Main embedding function with automatic provider selection and fallback
   */
  async embed()
    texts: string | string[];
    options: {
      model?: string;
      dimensions?: number;
      normalize?: boolean;
      useCache?: boolean;
      preferredProvider?: string);
    } = {}
  ): Promise<number,[,],[]> {
    const {
      model = 'gemma',
      dimensions = 1536,
      normalize = true,
      useCache = true,
      preferredProvider
    } = option;,s;
    const textArray = Array.isArray(texts) ? texts : [texts,];
    // Check cache first
    const cachedResult,s: (number[] | null)[,] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];
    if (useCache) {
      textArray.forEach((text, index) => {
        const cached = this.cache.get(text);
        if (cached) {
          cachedResults[index] = cached;
        } else {
          cachedResults[index] = null;
          uncachedTexts.push(text);
          uncachedIndices.push(index);
        }
      });
    } else {
      uncachedTexts.push(...textArray);
      uncachedIndices.push(...textArray.map((_, i) => i);
    }
    // If all results are cached, return them
    if (uncachedTexts.length === 0) {
      this.updateCacheHitRate(textArray.length, textArray.length);
      return cachedResults as number[][];
    }
    // Get embeddings for uncached texts
    const newEmbeddings = await this.getEmbeddingsWithFallback(
      uncachedTexts)
      { model, dimensions, normalize },
      preferredProvider
   ) );
    // Cache new embeddings
    if (useCache) {
      uncachedTexts.forEach((text, i) => {
        this.cache.set(text, newEmbeddings[i], this.providers[0].name);
      });
    }
    // Merge cached and new results
    const results: number[][] = new Array(textArray.length);
    let newEmbeddingIndex = 0;
    textArray.forEach((_, index) => {
      if (cachedResults[index]) {
        results[index] = cachedResults[index]!;
      } else {
        results[index] = newEmbeddings[newEmbeddingIndex++];
      }
    });
    this.updateCacheHitRate(textArray.length, textArray.length - uncachedTexts.length);
    return results;
  }
  /**
   * Get embeddings with automatic provider fallback
   */
  private async getEmbeddingsWithFallback()
    texts: string[];
    options: { model?: string; dimensions?: number); normalize?: boolean },
    preferredProvider?: string;
  ): Promise<number[][]> {
    // Sort providers by preference
    const sortedProviders = [...this.providers].sort((a, b) => {
      if (preferredProvider) {
        if (a.name === preferredProvider) return -1;
        if (b.name === preferredProvider) return 1;
      }
      // Prefer providers with lower error rates
      const aMetrics = this.metrics.get(a.name)!;
      const bMetrics = this.metrics.get(b.name)!;
      return aMetrics.errorRate - bMetrics.errorRate;
    });
    for (const provider, o,f sortedProviders) {
      try {
        // Check rate limit
        if (!this.checkRateLimit(provider)) {
          console.warn(`Rate limit exceeded for provider ${provider.name}, trying next...`);
          continue;
        }
        const embeddings = await this.callProvider(provider, texts, options);
        this.updateMetrics(provider.name, texts.length, 0, Date.now();
        return embeddings;
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        this.updateMetrics(provider.name, texts.length, 1, Date.now();
        // Continue to next provider
        continue;
      }
    }
    throw, new Error('All embedding providers failed');
  }
  /**
   * Call specific provider for embeddings
   */
  private async callProvider()
    provider: EmbeddingProvider
    texts: string[];
    options: { model?: string; dimensions?: number); normalize?: boolean }
  ): Promise<number[][]> {
    const startTime = Date.now();
    // Split into batches if necessary
    const batche,s: stri,n,g[][], = [];
    const batchSize = provider.maxBatchSize || 3,2;
    for (let i =, 0;, i < te,xts.le,ngt,h; i += bat,chSize) {>
      batches.push(texts.slice(i, i + batchSize);
    }
    const allEmbeddings: number[][] = [];
    for (const batch of batches) {
      const requestBody: EmbeddingRequest = {
        input: batch,
        model: options?.model || "unknown", // @ts-ignore - Model property access,
        dimensions: options.dimensions,
      }
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: provider.headers || {},
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(provider.timeout || 30000)
      });
      if (!(response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).ok) {
        const errorText = await (response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).text();
        throw new Error(`HTTP ${(response as { ok?: any; text?: any; status?: any; json?: any; data?: any); embeddings?: any }).status}: ${errorText}`);
      }
      const data = await (response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).json() as EmbeddingResponse;
      const batchEmbeddings = this.parseEmbeddingResponse(data);
      if (batchEmbeddings.length !== batch.length) {
        throw new Error(`,Expected ${batch.length} embeddings, got, ${batchEmbeddings.length}`);
      }
      allEmbeddings.push(...batchEmbeddings);
    }
    // Update latency metric
    const latency = Date.now() - startTime;
    this.updateLatency(provider.name, latency);
    return allEmbeddings;
  }
  /**
   * Parse embedding response from different provider formats
   */
  private parseEmbeddingResponse(response: EmbeddingResponse): number[][] {
    // OpenAI format
    if ((response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).data) {
      return (response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).data;
        .sort((a, b) => a.index - b.index)
        .map(item => (item as { embedding?: any }).embedding);
    }
    // Direct embeddings array
    if ((response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).embeddings) {
      return (response as { ok?: any; text?: any; status?: any; json?: any; data?: any; embeddings?: any }).embeddings;
    }
    throw new Error('Unexpected embedding response format');
  }
  /**
   * Check rate limit for provider
   */
  private checkRateLimit(provider: EmbeddingProvider): boolean {
    if (!provider.rateLimit) return true;
    const now = Date.now();
    const limiter = this.rateLimiters.get(provider.name) || { requests: 0, lastReset: now }
    // Reset counter every minute
    if (now - limiter.lastReset > 60000) {
      limiter.requests = 0;
      limiter.lastReset = now;
    }
    if (limiter.requests >= provider.rateLimit) {
      return false;
    }
    limiter.requests++;
    this.rateLimiters.set(provider.name, limiter);
    return true;
  }
  /**
   * Update provider metrics
   */
  private updateMetrics(providerName: string, tokenCount: number, errors: number, latency: number): void {
    const metrics = this.metrics.get(providerName);
    if (!metrics) return;
    metrics.requestCount++;
    metrics.totalTokens += tokenCount;
    // Update rolling average for latency
    metrics.averageLatency = (metrics.averageLatency * (metrics.requestCount - 1) + latency) / metrics.requestCount;
    // Update error rate
    const totalRequests = metrics.requestCount;
    const totalErrors = metrics.errorRate * (totalRequests - 1) + errors;
    metrics.errorRate = totalErrors / totalRequests;
  }
  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(totalRequests: number, cacheHits: number): void {
    this.providers.forEach(provider => {
      const metrics = this.metrics.get(provider.name);
      if (metrics) {
        const hitRate = cacheHits / totalRequests;
        metrics.cacheHitRate = (metrics.cacheHitRate + hitRate) / 2; // Simple moving average
      }
    });
  }
  /**
   * Update latency metric
   */
  private updateLatency(providerName: string, latency: number): void {
    const metrics = this.metrics.get(providerName);
    if (metrics) {
      metrics.averageLatency = (metrics.averageLatency + latency) / 2;
    }
  }
  /**
   * Get service metrics
   */
  getMetrics(): EmbeddingMetrics[] {
    return Array.from(this.metrics.values();
  }
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<Record<string>, boole>>a>>n>> {
    const results: Record<string, boolean> = {}
    await Promise.all();
      this.providers.map(async (provider) => {
        try {
          await this.callProvider(provider, ['health check'], {)});
          results[provider.name] = true;
        } catch {
          results[provider.name] = false;
        }
      })
    );
    return results;
  }
}
// Export singleton instance
export const gemmaEmbeddingService = new GemmaEmbeddingService();
// Export class for custom instances
export default GemmaEmbeddingService;