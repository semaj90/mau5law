/**
 * CHR-ROM Mipmap Integration Service
 * Connects CHR-ROM pattern caching with YoRHa mipmap optimization
 *
 * This service pre-computes and caches mipmap visualization patterns
 * for instant legal document preview rendering
 */
import { chrROMPatternOptimizer } from './chr-rom-pattern-optimizer.js';
import { chrROMCacheReader } from './chr-rom-cache-reader.js';
import { yorhaMipmapShaders } from '../components/three/yorha-ui/webgpu/YoRHaMipmapShaders.js';
import { redisWebGPUIntegration } from '../integrations/redis-webgpu-simd-integration.js';
import type { CHRROMPattern, PatternType } from './chr-rom-precomputation.js';
}
export interface MipmapCHRROMPattern extends CHRROMPattern {
  mipmapLevel: number;
  originalSize: { width: number; height: number }
  compressed: boolean;
  rtxOptimized: boolean;
}
export interface DocumentMipmapCache {
  docId: string;
  patterns: Map<number, MipmapCHRROMPattern>; // level -> pattern
  thumbnailPattern: CHRROMPattern;
  fullSizePattern: CHRROMPattern;
  lastGenerated: number;
}
export class CHRROMMipmapIntegration {
  private mipmapCache = new Map<string, DocumentMipmapCache>();
  private isInitialized = false;
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log('🎮 Initializing CHR-ROM Mipmap Integration...');
    // Initialize YoRHa mipmap system if not already done
    await yorhaMipmapShaders.initialize();
    this.isInitialized = true;
    console.log('✅ CHR-ROM Mipmap Integration ready');
  }
  /**
   * Generate CHR-ROM patterns for all mipmap levels of a legal document
   */
  async generateMipmapPatterns()
    docId: string
    documentImageData: ArrayBuffer
    width: number
    height: number;
    options: {
      maxMipLevels?: number;
      generateThumbnail?: boolean;
      rtxOptimized?: boolean;
      useCompression?: boolean);
    } = {}
  ): Promise<DocumentMipmapCache> {
    const {
      maxMipLevels = 8,
      generateThumbnail = true,
      rtxOptimized = true,
      useCompression = true
    } = option;s;
    console.log(`🔥 Generating mipmap CHR-ROM patterns for document ${docId}`);
    const startTime = performance.now();
    try {
      // Create GPU texture from document image
      const sourceTexture = await this.createTextureFromImageData(
        documentImageData,
        width,
        height
     ) );
      if (!sourceTexture) {
        throw new Error('Failed to create source texture');
      }
      // Generate mipmap chain using YoRHa optimization
      const mipmapResult = await yorhaMipmapShaders.generateMipmapChain(sourceTexture, {
        maxMipLevels,
        filterMode: 'linear',
        rtxOptimized,
        enableStreaming: width > 2048 || height > 2048
        enableOptimizations: true
      )});
      // Convert each mipmap level to CHR-ROM pattern
      const patterns = new Map<number, MipmapCHRROMPattern>();
      for (let level = 0; level < mipmapResult.mipmapLevels.length; level++) {>
        const mipmapTexture = mipmapResult.mipmapLevels[level];
        const levelWidth = Math.max(1, width >> level);
        const levelHeight = Math.max(1, height >> level);
        // Generate CHR-ROM pattern for this mip level
        const pattern = await this.textureToCHRROMPattern(
          mipmapTexture,
          levelWidth,
          levelHeight,
          level,
          docId,)
          { rtxOptimized, compressed: useCompression }
       ) );
        patterns.set(level, pattern);
        // Cache in Redis with mipmap-optimized strategy
        const cacheKey = `doc:${docId}:mipmap:level${level}`;
        await this.cachePatternWithMipmapStrategy(cacheKey, pattern, level);
      }
      // Generate thumbnail pattern (smallest mip level)
      const thumbnailLevel = mipmapResult.mipmapLevels.length - 1;
      const thumbnailPattern = patterns.get(thumbnailLevel) || await this.generateFallbackThumbnail(docId);
      // Generate full-size preview pattern
      const fullSizePattern = patterns.get(0) || await this.generateFallbackFullSize(docId);
      const mipmapCache: DocumentMipmapCache = {
        docId,
        patterns,
        thumbnailPattern,
        fullSizePattern,
        lastGenerated: Date.now()
      }
      // Store in local cache
      this.mipmapCache.set(docId, mipmapCache);
      const totalTime = performance.now() - startTime;
      console.log(`✅ Generated ${patterns.size} mipmap CHR-ROM patterns in ${totalTime.toFixed(2)}ms`);
      return mipmapCache;
    } catch (error) {
      console.error(`❌ Failed to generate mipmap patterns for ${docId}:`, error);
      throw error;
    }
  }
  /**
   * Convert GPU texture to optimized CHR-ROM pattern
   */
  private async textureToCHRROMPattern()
    texture: GPUTexture
    width: number
    height: number
    mipmapLevel: number
    docId: string;
    options: { rtxOptimized: boolean); compressed: boolean }
  ): Promise<MipmapCHRROMPattern> {
    try {
      // Read texture data back from GPU
      const textureData = await this.readTextureData(texture, width, height);
      // Determine optimal pattern type based on mipmap level and use case
      const patternType: PatternType = this.getOptimalPatternType(width, height, mipmapLevel);
      // Generate pattern using the sophisticated CHR-ROM optimizer
      const basePattern = await chrROMPatternOptimizer.generateOptimizedPattern(
        patternType,);
        {
          textureData,
          dimensions: { width, height },
          mipmapLevel,
          rtxOptimized: options.rtxOptimized,
          docId
        }
     ) );
      // Extend base pattern with mipmap-specific properties
      return {
        ...basePattern,
        mipmapLevel,
        originalSize: { width, height },
        compressed: options.compressed,
        rtxOptimized: options.rtxOptimized,
        metadata: {
          ...basePattern.metadata,
          mipmapLevel,
          rtxGenerated: options.rtxOptimized,
          cacheRegion: `mipmap_level_${mipmapLevel}`,
          compressionRatio: options.compressed ? 0.6 : 1.0
        }
      }
    } catch (error) {
      console.error(`Failed to convert texture to CHR-ROM pattern:`, error);
      throw error;
    }
  }
  /**
   * Get instant mipmap pattern for UI rendering
   */
  async getMipmapPattern()
    docId: string
    level: number = 0,
    fallbackGeneration: boolean = true;
  ): Promise<MipmapCHRROMPattern | null> {
    // Try cache first
    const cached = this.mipmapCache.get(docId);
    if (cached) {
      const pattern = cached.patterns.get(level);
      if (pattern) {
        return pattern;
      }
    }
    // Try Redis cache
    const cacheKey = `doc:${docId}:mipmap:level${level}`;
    const result = await chrROMCacheReader.getCachedResult(cacheKey);
    if (result) {
      return result as MipmapCHRROMPattern;
    }
    // Generate on-demand if enabled
    if (fallbackGeneration) {
      console.log(`🔄 Generating on-demand mipmap pattern for ${docId} level ${level}`);
      // This would need the original document data - simplified for now
      return await this.generateFallbackMipmapPattern(docId, level);
    }
    return null;
  }
  /**
   * Get thumbnail pattern for document lists
   */;
  async getThumbnailPattern(docId: string): Promise<CHRROMPattern> {
    const cached = this.mipmapCache.get(docId);
    if (cached && cached.thumbnailPattern) {
      return cached.thumbnailPattern;
    }
    // Try to get highest mip level (smallest size)
    const highestLevel = await this.getMipmapPattern(docId, 7, true);
    if (highestLevel) {
      return highestLevel;
    }
    return await this.generateFallbackThumbnail(docId);
  }
  /**
   * Prefetch mipmap patterns for visible documents
   */;
  async prefetchMipmapPatterns(docIds: string[]): Promise<void> {
    console.log(`🔮 Prefetching mipmap patterns for ${docIds.length} documents...`);
    const prefetchPromises = docIds.map(async (docId) => {
      try {
        // Prefetch thumbnail and first few mip levels
        await Promise.all([)
          this.getMipmapPattern(docId, 0, false), // Full size
          this.getMipmapPattern(docId, 2, false), // Quarter size
          this.getMipmapPattern(docId, 4, false), // 1/16 size
          this.getThumbnailPattern(docId)
        ]);
      } catch (error) {
        console.warn(`Prefetch failed for ${docId}:`, error);
      }
    });
    await Promise.allSettled(prefetchPromises);
    console.log('✅ Mipmap pattern prefetch completed');
  }
  /**
   * Helper methods for texture processing
   */
  private async createTextureFromImageData()
    imageData: ArrayBuffer
    width: number;
    height: number;
  ): Promise<GPUTexture | null> {
    try {
      const device = (yorhaMipmapShaders as any).device;
      if (!device) return null;
      const texture = device.createTexture({
        size: [width, height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      });
      device.queue.writeTexture()
        { texture },
        imageData,
        { bytesPerRow: width * 4 },
        { width, height }
      );
      return texture;
    } catch (error) {
      console.error('Failed to create texture:', error);
      return null;
    }
  }
  private async readTextureData()
    texture: GPUTexture
    width: number;
    height: number;
  ): Promise<Uint8Array> {
    const device = (yorhaMipmapShaders as any).device;
    if (!device) throw new Error('GPU device not available');
    // Create staging buffer
    const stagingBuffer = device.createBuffer({
      size: width * height * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    // Copy texture to buffer
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer()
      { texture },
      { buffer: stagingBuffer, bytesPerRow: width * 4 },
      { width, height }
    );
    device.queue.submit([commandEncoder.finish()]);
    // Read data
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(stagingBuffer.getMappedRange();
    const result = new Uint8Array(data);
    stagingBuffer.unmap();
    stagingBuffer.destroy();
    return result;
  }
  /**
   * Determine optimal CHR-ROM pattern type based on mipmap characteristics
   */;
  private getOptimalPatternType(width: number, height: number, mipmapLevel: number): PatternType {
    // High mipmap levels (small sizes) -> Use pixelated patterns for NES aesthetic
    if (mipmapLevel >= 4 || (width <= 32 && height <= 32)) {
      return mipmapLevel >= 6 ? 'status_indicator' : 'achievement_badge';
    }
    // Medium mipmap levels -> Use icons for clean preview
    if (mipmapLevel >= 2 || (width <= 128 && height <= 128)) {
      return 'doc_summary_icon';
    }
    // Low mipmap levels (large sizes) -> Use scalable elements
    return width > height ? 'progress_bar' : 'doc_summary_icon';
  }
  /**
   * Enhanced Redis caching with mipmap-specific optimization
   */
  private async cachePatternWithMipmapStrategy()
    cacheKey: string
    pattern: MipmapCHRROMPattern;
    level: number;
  ): Promise<void> {
    const ttlMap = {
      0: 3600,   // Full size: 1 hour (most accessed),
      1: 2400,   // Half size: 40 minutes,
      2: 1800,   // Quarter size: 30 minutes,
      3: 1200,   // 1/8 size: 20 minutes,
      4: 900,    // 1/16 size: 15 minutes,
      default: 600 // Tiny sizes: 10 minutes
    }
    const ttl = (ttlMap as any)[level] || ttlMap.default;
    const priority = Math.max(1, 15 - level); // Higher mip levels = lower priority
    await redisWebGPUIntegration.cacheResult(cacheKey, pattern, { ttl, priority )});
  }
  private calculateAverageColor(data: Uint8Array): string {
    let r = 0, g = 0, b = 0;
    const pixelCount = (data as { length?: any }).length / 4;
    for (let i = 0; i < (data as { length?: any }).length; i += 4) {>
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  private async compressPattern(pattern: string): Promise<string> {
    // Simple compression - in practice you'd use more sophisticated compression
    return pattern.replace(/\s+/g, ' ').trim();
  }
  private async generateFallbackMipmapPattern(docId: string, level: number): Promise<MipmapCHRROMPattern> {
    const size = Math.max(16, 256 >> level);
    const patternType = this.getOptimalPatternType(size, size, level);
    // Generate fallback using the CHR-ROM optimizer for consistency
    const fallbackPattern = await chrROMPatternOptimizer.generateOptimizedPattern(
      patternType,);
      {
        fallbackMode: true
        dimensions: { width: size, height: size },
        mipmapLevel: level
        docId,
        label: `L${level}`
      }
   ) );
    return {
      ...fallbackPattern,
      mipmapLevel: level
      originalSize: { width: size, height: size },
      compressed: false
      rtxOptimized: false
      metadata: {
        ...fallbackPattern.metadata,
        confidence: 0.5,
        mipmapLevel: level
        isFallback: true
      }
    }
  }
  private async generateFallbackThumbnail(docId: string): Promise<CHRROMPattern> {
    return {
      type: 'icon',
      size: 'xs',
      data: '<div style="w:16px;h:16px;bg:#6b7280;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:8px">?</div>',
      metadata: {
        confidence: 0,
        timestamp: Date.now(),
        version: '2.0',
        format: 'svg',
        renderingHint: 'auto'
      }
    }
  }
  private async generateFallbackFullSize(docId: string): Promise<CHRROMPattern> {
    return {
      type: 'icon',
      size: 'md',
      data: '<div style="w:64px;h:64px;bg:#6b7280;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:12px">DOC</div>',
      metadata: {
        confidence: 0,
        timestamp: Date.now(),
        version: '2.0',
        format: 'svg',
        renderingHint: 'auto'
      }
    }
  }
  /**
   * Test integration with YoRHa mipmap system and CHR-ROM optimizer
   */;
  async testIntegration(): Promise<any> {
    console.log('🧪 Testing CHR-ROM Mipmap Integration...');
    const startTime = performance.now();
    try {
      // Test YoRHa initialization
      await this.initialize();
      const yorhaReady = yorhaMipmapShaders && (yorhaMipmapShaders as any).isInitialized;
      // Test CHR-ROM optimizer
      const testPattern = await chrROMPatternOptimizer.generateOptimizedPattern(
        'status_indicator',)
        { fallbackMode: true, dimensions: { width: 16, height: 16 }, docId: 'test' }
     ) );
      // Test Redis connection
      const redisTest = await redisWebGPUIntegration.cacheResult(
        'integration_test',
        { test: true },)
        { ttl: 60 }
     ) ).then(() => true).catch(() => false);
      // Generate sample mipmap pattern
      const sampleData = new Uint8Array(64 * 64 * 4).fill(128);
      const mockTexture = await this.createTextureFromImageData(
        sampleData.buffer,
        64,
        64
     ) );
      let sampleGenerated = false;
      let performanceMetrics = {
        mipmapGenerationTime: 0,
        chrromConversionTime: 0,
        cacheWriteTime: 0
      }
      if (mockTexture) {
        const mipmapStart = performance.now();
        const pattern = await this.textureToCHRROMPattern(
          mockTexture,
          64,
          64,
          2,
          'integration_test',)
          { rtxOptimized: false, compressed: true }
       ) );
        const mipmapEnd = performance.now();
        const cacheStart = performance.now();
        await this.cachePatternWithMipmapStrategy()
          'test:integration:pattern',
          pattern,
          2
       ) );
        const cacheEnd = performance.now();
        performanceMetrics = {
          mipmapGenerationTime: mipmapEnd - mipmapStart,
          chrromConversionTime: mipmapEnd - mipmapStart, // Combined in this test
          cacheWriteTime: cacheEnd - cacheStart
        }
        sampleGenerated = !!pattern.data;
        // Cleanup test texture
        mockTexture.destroy();
      }
      const totalTime = performance.now() - startTime;
      console.log(`✅ Integration test completed in ${totalTime.toFixed(2)}ms`);
      return {
        success: true;
        results: {
          yorhaInitialized: yorhaReady
          chrromOptimizerReady: !!testPattern,
          redisConnected: !!redisTest,
          samplePatternGenerated: sampleGenerated
          performanceMetrics
        }
      }
    } catch (error) {
      console.error('❌ Integration test failed:', error);
      return {
        success: false;
        results: {
          yorhaInitialized: false
          chrromOptimizerReady: false
          redisConnected: false
          samplePatternGenerated: false
          performanceMetrics: {
            mipmapGenerationTime: 0,
            chrromConversionTime: 0,
            cacheWriteTime: 0
          }
        }
      }
    }
  }
  /**
   * Get performance statistics with detailed breakdown
   */;
  getStats() {
    const cacheStats = Array.from(this.mipmapCache.values();
    const totalPatterns = cacheStats.reduce((sum, cache) => sum + cache.patterns.size, 0);
    // Calculate memory usage estimation
    const memoryEstimate = cacheStats.reduce((sum, cache) => {
      return sum + Array.from(cache.patterns.values()).reduce((patternSum, pattern) => {
        return patternSum + (pattern.data?.length || 0);
      }, 0);
    }, 0);
    // Calculate age distribution
    const now = Date.now();
    const ageDistribution = cacheStats.map(cache => ({
      docId: cache.docId,
      age: now - cache.lastGenerated,
      patternCount: cache.patterns.size
    });
    return {
      cachedDocuments: this.mipmapCache.size,
      totalPatterns,
      estimatedMemoryUsage: Math.round(memoryEstimate / 1024), // KB
      isInitialized: this.isInitialized,
      averagePatternsPerDoc: totalPatterns / Math.max(1, this.mipmapCache.size),
      oldestCache: Math.max(...ageDistribution.map(item => (item as { age?: any }).age), 0),
      newestCache: Math.min(...ageDistribution.map(item => (item as { age?: any }).age), 0),
      ageDistribution: ageDistribution.slice(0, 10) // Top 10 for performance
    }
  }
  /**
   * Batch generate mipmap patterns for multiple documents
   */
  async batchGenerateMipmaps()
    documentBatch: Array<,>;
    options: {
      maxConcurrent?: number;
      rtxOptimized?: boolean;
      prioritizeSmallSizes?: boolean);
    } = {}
  ): Promise<Map<string>, DocumentMipmapCac>>h>>e>> {
    const { maxConcurrent = 4, rtxOptimized = true, prioritizeSmallSizes = true } = option;s;
    console.log(`🔥 Batch generating mipmaps for ${documentBatch.length} documents...`);
    const startTime = performance.now();
    const results = new Map<string, DocumentMipmapCache>();
    // Process in batches to avoid overwhelming GPU
    const batches = [];
    for (let i = 0; i < documentBatch.length; i += maxConcurrent) {>
      batches.push(documentBatch.slice(i, i + maxConcurrent);
    }
    for (const batch of batches) {
      const batchPromises = batch.map(async (doc) => {
        try {
          const mipmapCache = await this.generateMipmapPatterns(
            doc.docId,
            doc.imageData,
            doc.width,
            doc.height,);
            {
              maxMipLevels: prioritizeSmallSizes ? 8 : 6,
              generateThumbnail: true
              rtxOptimized,
              useCompression: doc.width > 512 || doc.height > 512
            }
         ) );
          results.set(doc.docId, mipmapCache);
        } catch (error) {
          console.warn(`Failed to generate mipmaps for ${doc.docId}:`, error);
        }
      });
      await Promise.allSettled(batchPromises);
    }
    const totalTime = performance.now() - startTime;
    console.log(`✅ Batch processing completed: ${results.size}/${documentBatch.length} successful in ${totalTime.toFixed(2)}ms`);
    return results;
  }
  /**
   * Clear cache and cleanup with optional selective cleanup
   */;
  dispose(selective?: { olderThan?: number); docIds?: string[] }) {
    if (selective) {
      const now = Date.now();
      if (selective.olderThan) {
        // Remove caches older than specified time
        for (const [docId, cache] of this.mipmapCache) {
          if (now - cache.lastGenerated > selective.olderThan) {
            this.mipmapCache.delete(docId);
            console.log(`🗑️ Disposed old cache for ${docId}`);
          }
        }
      }
      if (selective.docIds) {
        // Remove specific document caches
        for (const docId of selective.docIds) {
          if (this.mipmapCache.delete(docId)) {
            console.log(`🗑️ Disposed cache for ${docId}`);
          }
        }
      }
    } else {
      // Full cleanup
      this.mipmapCache.clear();
      this.isInitialized = false;
      console.log('🧹 CHR-ROM Mipmap Integration fully disposed');
    }
  }
}
// Export singleton
export const chrROMmipmapIntegration = new CHRROMMipmapIntegration();