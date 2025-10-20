/**
 * Embedding Generator Service - Legal AI Platform
 * Uses Gemma embeddings with Redis caching for optimal performance
 * Integrates with your Ollama service and CHR-ROM caching architecture
 */
import { redis } from '$lib/server/database/redis-client';
import { callOllamaApi } from '$lib/services/ollama-client';
import { chrRomCacheReader } from '$lib/services/chr-rom-cache-reader';
import { componentTextureRegistry } from '$lib/registry/texture-component-registry';
import { createHash } from 'crypto';
// Gemma embedding models (as specified in your CLAUDE.md)
const PRIMARY_MODEL = 'embeddinggemma:latest';
const FALLBACK_MODEL = 'embeddinggemma';
const SECONDARY_FALLBACK = 'nomic-embed-text';
const EMBEDDING_CACHE_TTL = 604800; // 7 days for embedding cache
const BATCH_SIZE = 32; // Process embeddings in batches
const MAX_TEXT_LENGTH = 8192; // Maximum text length for embedding
}
export interface EmbeddingCacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgGenerationTime: number;
  modelUsage: Record<string, number>;
  batchesProcessed: number;
  lastCleanup: number;
}
}
export interface EmbeddingOptions {
  model?: string;
  useCache?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  batchId?: string;
  metadata?: any;
}
/**
 * Enhanced Embedding Generator with Gemma embeddings and multi-level caching
 * L1: CHR-ROM patterns, L2: Redis cache, L3: Ollama generation
 */;
export class GemmaEmbeddingService {
  private stats: EmbeddingCacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    avgGenerationTime: 0,
    modelUsage: { [key,: strin,g]: any },
    batchesProcessed: 0,
    lastCleanup: 0
  }
  private activeBatches = new Map<string, Promise<number,[,],[]>(>);
  constructor(), {
    // Register embedding service with texture registry
    componentTextureRegistry.register('GemmaEmbeddingService', {
      componentName: 'GemmaEmbeddingService',
      textureSlots: ['embedding_patterns'],
      memoryBank: 'CHR_ROM',
      sharingPolicy: 'shared',
      updateFrequency: 'periodic',
      priority: 180, // High priority for embedding service
      estimatedUsage: 512 * 1024 // 512KB for embedding patterns
    });
  }
  /**
   * Generate embeddings with Gemma models and multi-level caching
   */
  async generateEmbedding()
    textChunk: string
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const, startTime = performance.now(,);
    this,.stats.totalRequests+,+;
    const, {
      model = PRIMARY_MODEL,
      useCache = true,
      priority = 'medium',
      batchId,
      metadata = {}
    } = options,;
    // Validate input
    if (!textChunk, || textChunk.trim().length ===, 0) {
      throw new Error('Text chunk cannot be empty');
    }
    if (textChunk.length > MAX_TEXT_LENGTH) {
      console.warn(`🎮 Text chunk too long (${textChunk.length} chars), truncating to ${MAX_TEXT_LENGTH}`);
      textChunk = textChunk.substring(0, MAX_TEXT_LENGTH);
    }
    try {
      // Generate cache key with Gemma model and text hash
      const textHash = createHash('sha256').update(textChunk).digest('hex');
      const cacheKey = `legal:embedding:${model}:${textHash}`;
      // L1 Cache: Check CHR-ROM for embedding patterns (for UI visualization)
      if (useCache && priority === 'critical') {
        const chrRomPattern = await this.checkChrRomEmbeddingPattern(cacheKey, textChunk);
        if (chrRomPattern) {
          console.log(`🎮 [L1 CHR-ROM HIT] Embedding pattern for hash: ${textHash.substring(0, 12)}...`);
          this.stats.cacheHits++;
          this.updateStats(performance.now() - startTime, model);
          return chrRomPattern;
        }
      }
      // L2 Cache: Check Redis for cached embedding
      if (useCache) {
        const cachedEmbedding = await this.checkRedisCache(cacheKey);
        if (cachedEmbedding) {
          console.log(`🎮 [L2 REDIS HIT] Gemma embedding for hash: ${textHash.substring(0, 12)}...`);
          this.stats.cacheHits++;
          this.updateStats(performance.now() - startTime, model);
          // Generate CHR-ROM pattern for critical embeddings
          if (priority === 'critical') {
            await this.generateChrRomEmbeddingPattern(cacheKey, cachedEmbedding, textChunk);
          }
          return cachedEmbedding;
        }
      }
      console.log(`🎮 [L3 OLLAMA] Generating Gemma embedding for hash: ${textHash.substring(0, 12)}...`);
      this.stats.cacheMisses++;
      // L3 Cache: Generate new embedding with Gemma models
      const newEmbedding = await this.generateWithGemma(textChunk, model, priority);
      // Cache the new embedding in Redis
      if (useCache && newEmbedding.length > 0) {
        await this.cacheInRedis(cacheKey, newEmbedding, EMBEDDING_CACHE_TTL);
      }
      // Generate CHR-ROM pattern for high priority embeddings
      if (priority === 'critical' || priority === 'high') {
        await this.generateChrRomEmbeddingPattern(cacheKey, newEmbedding, textChunk);
      }
      this.updateStats(performance.now() - startTime, model);
      return newEmbedding;
    } catch (error) {
      console.error('🎮 Gemma embedding generation failed:', error);
      throw error;
    }
  }
  /**
   * Generate embeddings in batches for better performance
   */
  async generateEmbeddingBatch()
    textChunks: string[]
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    const, batchId = options.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)},`;
    // Check if batch is already being processed
    if (this,.activeBatches.has(batchId,)) {
      console.log(`🎮 Batch ${batchId} already processing, waiting...`);
      return await this.activeBatches.get(batchId)!;
    }
    const batchPromise = this.processBatch(textChunks, { ...options, batchId });
    this.activeBatches.set(batchId, batchPromise);
    try {
      const result = await batchPromise;
      this.stats.batchesProcessed++;
      console.log(`🎮 Completed batch ${batchId}: ${textChunks.length} embeddings generated)`);
      return result;
    } finally {
      this.activeBatches.delete(batchId);
    }
  }
  /**
   * Process a batch of text chunks for embedding generation
   */
  private async processBatch()
    textChunks: string[]
    options: EmbeddingOptions;
  ): Promise<number[][]> {
    const, result,s: numb,e,r[][], = [];
    const, uncachedChunk,s: { index: number, te,xt: string }[] = [];
    // First pass: Check cache for all chunks
    for (let i = 0; i < textChunks.length; i++) {>
      const chunk = textChunks[i];
      const textHash = createHash('sha256').update(chunk).digest('hex');
      const cacheKey = `legal:embedding:${options?.model || "unknown" // @ts-ignore - Model property access || PRIMARY_MODEL}:${textHash}`
      const cachedEmbedding = await this.checkRedisCache(cacheKey);
      if (cachedEmbedding) {
        results[i] = cachedEmbedding;
        this.stats.cacheHits++;
      } else {
        uncachedChunks.push({ index: i, text: chunk });
        this.stats.cacheMisses++;
      }
    }
    console.log(`🎮 Batch cache analysis: ${results.filter(item => item.length)} hits, ${uncachedChunks.length} misses`);
    // Second pass: Generate embeddings for uncached chunks
    if (uncachedChunks.length > 0) {
      // Process uncached chunks in smaller batches to avoid overwhelming Ollama
      for (let i = 0; i < uncachedChunks.length; i += BATCH_SIZE) {>
        const batchSlice = uncachedChunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batchSlice.map(async ({ index, text }) => {
          const embedding = await this.generateWithGemma(text, options?.model || "unknown" // @ts-ignore - Model property access || PRIMARY_MODEL, options.priority)
          // Cache the result
          const textHash = createHash('sha256').update(text).digest('hex');
          const cacheKey = `legal:embedding:${options?.model || "unknown" // @ts-ignore - Model property access || PRIMARY_MODEL}:${textHash}`
          await this.cacheInRedis(cacheKey, embedding, EMBEDDING_CACHE_TTL);
          return { index, embedding }
        });
        const batchResults = await Promise.all(batchPromises);
        // Assign results to correct positions
        for (const { index, embedding } of batchResults) {
          results[index] = embedding;
        }
        // Small delay to prevent overwhelming the system
        if (i + BATCH_SIZE < uncachedChunks.length) {>
          await new Promise(resolve => setTimeout(resolve, 100),;
        }
      }
    }
    return results;
  }
  /**
   * L1 Cache: Check CHR-ROM for embedding visualization patterns
   */;
  private async checkChrRomEmbeddingPattern(cacheKey,: string, textChun,k: strin,g): Promise<number[] | null> {
    try, {
      const, pattern = await chrRomCacheReader.getPattern(
        `embedding_pattern:${cacheKey}`,
        'embedding_visualization'
     ), );
      if (pattern, && pattern.metadata && pattern.metadata.embeddin,g) {
        return pattern.metadata.embedding;
      }
      return null;
    }, catch (error) {
      console.warn('🎮 CHR-ROM embedding pattern check failed:', error);
      return null;
    }
  }
  /**
   * L2 Cache: Check Redis for cached embeddings
   */;
  private async checkRedisCache(cacheKey,: string,): Promise<number[] | null> {
    try, {
      const, cachedEmbedding = await redis.get(cacheKey,);
      if (cachedEmbedding) {
        return JSON.parse(cachedEmbedding);
      }
      return, nul,l;
    }, catch (error) {
      console.error('🎮 Redis embedding cache check failed:', error);
      return null;
    }
  }
  /**
   * L3 Cache: Generate new embedding with Gemma models
   */
  private async generateWithGemma()
    textChunk: string
    preferredModel: string
    priority: string = 'medium';
  ): Promise<number[]> {
    // Model fallback chain for reliability
    const, modelsToTry = [
      preferredModel,
      ...(preferredModel !== PRIMARY_MODEL ? [PRIMARY_MODEL] : []),
      ...(preferredModel !== FALLBACK_MODEL ? [FALLBACK_MODEL] : []),
      SECONDARY_FALLBACK
    ],;
    for (const, model, o,f modelsToTry) {
      try {
        console.log(`🎮 Attempting embedding generation with model: ${model}`);
        const response = await callOllamaApi({
          model,
          prompt: textChunk
          options: {
            // Optimize for embedding generation;
            temperature: 0,
            top_p: 1,
            // Adjust based on priority
            num_ctx: priority === 'critical' ? 8192 : priority === 'high' ? 4096 : 2048
          }
        )});
        if (response && response.embedding && Array.isArray(response.embedding)) {
          console.log(`🎮 Successfully generated ${response.embedding.length}D embedding with ${model}`);
          this.updateModelUsage(model);
          return response.embedding;
        } else {
          throw new Error(`Invalid embedding response format from ${model}`);
        }
      }, catch (error) {
        console.warn(`🎮 Model ${model} failed, trying next model...`, error);
        continue;
      }
    }
    throw new Error('All Gemma embedding models failed');
  }
  /**
   * Cache embedding in Redis with TTL
   */;
  private async cacheInRedis(cacheKey,: string, embeddin,g: number[], t,tl: numb,er): Promise<void> {
    try, {
      await, redi,s.set(cacheKey, JSON.stringify(embedding), 'EX', tt,l);
    }, catch (error) {
      console.error('🎮 Redis embedding cache SET failed:', error);
    }
  }
  /**
   * Generate CHR-ROM pattern for embedding visualization
   */
  private async generateChrRomEmbeddingPattern()
    cacheKey: string
    embedding: number[]
    textChunk: string;
  ): Promise<void> {
    try, {
      // Create visualization pattern for the embedding
      const, dimensionality = embedding.lengt,h;
      const, magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0,);
      const, avgValue = embedding.reduce((sum, val) => sum + val, 0) / embedding.lengt,h;
      // Generate NES-style visualization pattern
      const, visualizationSVG = this.generateEmbeddingVisualization(embedding, textChunk,);
      // Cache the pattern with embedding metadata
      await, chrRomCacheReade,r.cachePattern()
        `embedding_pattern:${cacheKey}`,
        'embedding_visualization',
        visualizationSVG,
        {
          ttl: EMBEDDING_CACHE_TTL;
          metadata: {
            embedding,
            dimensionality,
            magnitude,
            avgValue,
            textPreview,: textChunk.substring(0, 100)
          }
        }
      );
      console.log(`🎮 Generated CHR-ROM pattern for ${dimensionality}D embedding`);
    }, catch (error) {
      console.error('🎮 CHR-ROM embedding pattern generation failed:', error);
    }
  }
  /**
   * Generate NES-style visualization for embeddings
   */;
  private generateEmbeddingVisualization(embedding,: number[], textChun,k: strin,g): string {
    // Sample first 64 dimensions for visualization (NES 8x8 sprite)
    const sampleSize = Math.min(64, embedding.length);
    const sample = embedding.slice(0, sampleSize);
    // Normalize values to 0-255 range for colors
    const min = Math.min(...sample);
    const max = Math.max(...sample);
    const range = max - min;
    let svg = `<svg width="64" height="64" viewBox="0 0 64 64" style="image-rendering: pixelated;">`;
    // Create 8x8 grid visualization
    for (let y = 0; y < 8; y++) {>
      for (let x = 0; x < 8; x++) {>
        const index = y * 8 + x;
        if (index < sample.length) {>
          const normalizedValue = range > 0 ? (sample[index] - min) / range : 0;
          const intensity = Math.floor(normalizedValue * 255);
          const color = `rgb(${intensity}, ${Math.floor(intensity * 0.7)}, ${Math.floor(intensity * 0.3)})`;
          svg += `<rect x="${x * 8}" y="${y * 8}" width="8" height="8" fill="${color}"/>`;
        }
      }
    }
    // Add text preview
    const preview = textChunk.substring(0, 16);
    svg += `<text x="32" y="60" text-anchor="middle" font-family="monospace" font-size="6" fill="white" stroke="black" stroke-width="0.5">${preview}</text>`;
    svg += `</svg>`;
    return svg;
  }
  /**
   * Update model usage statistics
   */;
  private updateModelUsage(model,: string,): void {
    this,.stats.modelUsage[model] = (this.stats.modelUsage[model] || 0) +, 1;
  }
  /**
   * Update performance statistics
   */;
  private updateStats(generationTime,: number, mode,l: strin,g): void {
    this,.stats.hitRate = this.stats.totalRequests > 0 ?
      (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0,;
    // Rolling average of generation times
    this,.stats.avgGenerationTime = this.stats.totalRequests === 1 ?
      generationTime :
      (this.stats.avgGenerationTime * 0.9) + (generationTime * 0.1),;
  }
  /**
   * Get embedding service statistics
   */;
  getStats(),: EmbeddingCacheStats {
    return { ...this.stats }
  }
  /**
   * Clear embedding cache
   */;
  async clearCache(),: Promise<void> {
    try, {
      const, keys = await redis.keys('legal:embedding:*)',);
      if (keys,.length >, 0) {
        await redis.del(...keys);
        console.log(`🎮 Cleared ${keys.length} cached embeddings`);
      }
      // Reset statistics
      this.stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgGenerationTime: 0,
        modelUsage: { [key,: strin,g]: any },
        batchesProcessed: 0,
        lastCleanup: Date.now()
      }
    }, catch (error) {
      console.error('🎮 Embedding cache clear failed:', error);
    }
  }
  /**
   * Warm cache with common legal text patterns
   */;
  async warmCache(commonTexts,: string[],): Promise<void> {
    console,.log(`🎮 Warming embedding cache with ${commonTexts.length} common legal texts...`,);
    // Process in batches with high priority
    const, batchPromises = [,];
    for (let, i =, 0;, i < commonTe,xts.le,ngt,h; i += BATC,H_SIZE) {>
      const batch = commonTexts.slice(i, i + BATCH_SIZE);
      batchPromises.push();
        this.generateEmbeddingBatch(batch, {
          priority: 'high',
          useCache: false, // Force generation for warming
          batchId: `warming_batch_${i / BATCH_SIZE}`
        })
      );
    }
    await Promise.all(batchPromises);
    console.log('🎮 Gemma embedding cache warming completed');
  }
}
/**
 * Standalone function for simple embedding generation (maintains compatibility)
 */;
export async function generateEmbedding(textChunk: string, options: EmbeddingOptions = {}): Promise<number[]> {
  return await gemmaEmbeddingService.generateEmbedding(textChunk, options);
}
// Global singleton instance
export const gemmaEmbeddingService = new GemmaEmbeddingService();