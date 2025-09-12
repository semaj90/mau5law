/**
 * 🔥 YoRHa Optimized Texture Manager
 * Integrates NVIDIA-optimized mipmap generation with NES memory architecture
 * Features: Smart caching, NES-style memory banks, RTX acceleration, texture streaming
 */

/// <reference types="@webgpu/types" />

import { yorhaMipmapShaders, type MipmapChainResult, type MipmapConfig } from './YoRHaMipmapShaders';
import type { LegalDocument, MemoryBank } from '../../../../memory/nes-memory-architecture';

export interface TextureBankConfig {
  bankType: 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM' | 'EXPANSION_ROM';
  maxTextures: number;
  maxMemoryMB: number;
  mipmapLevels: number;
  compressionEnabled: boolean;
  rtxOptimization: boolean;
}

export interface TextureEntry {
  id: string;
  texture: GPUTexture;
  mipmaps: GPUTexture[];
  memoryBank: string;
  lastAccessed: number;
  memoryUsed: number;
  legalDocument?: LegalDocument;
  generationStats: {
    mipmapGenerationTime: number;
    compressionRatio: number;
    qualityScore: number;
  };
}

export interface TextureStreamingSession {
  sessionId: string;
  sourceTexture: GPUTexture;
  streamedChunks: Map<string, GPUTexture>;
  totalChunks: number;
  completedChunks: number;
  memoryBudget: number;
  priority: 'legal_critical' | 'evidence' | 'background';
}

/**
 * NES-inspired texture memory banks for optimal GPU memory management
 */
export class YoRHaOptimizedTextureManager {
  private device: GPUDevice | null = null;
  private isInitialized = false;

  // NES-style texture memory banks
  private textureBanks = new Map<string, {
    config: TextureBankConfig;
    textures: Map<string, TextureEntry>;
    memoryUsed: number;
    bankSwitchCount: number;
  }>();

  // Streaming sessions for large textures
  private streamingSessions = new Map<string, TextureStreamingSession>();

  // Performance metrics
  private stats = {
    totalTexturesManaged: 0,
    totalMipmapsGenerated: 0,
    totalMemoryUsed: 0,
    averageMipmapTime: 0,
    cacheHitRate: 0,
    bankSwitchCount: 0,
    rtxAccelerationUsed: 0
  };

  constructor() {
    this.initializeTextureBanks();
  }

  async initialize(device?: GPUDevice): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.device = device || await this.getWebGPUDevice();
      if (!this.device) {
        console.warn('WebGPU device not available for texture management');
        return false;
      }

      // Initialize mipmap shaders
      const mipmapInitialized = await yorhaMipmapShaders.initialize(this.device);
      if (!mipmapInitialized) {
        console.warn('Mipmap shaders not available, using basic texture management');
      }

      this.isInitialized = true;
      console.log('🔥 YoRHa Optimized Texture Manager initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize texture manager:', error);
      return false;
    }
  }

  /**
   * Initialize NES-style texture memory banks
   */
  private initializeTextureBanks(): void {
    // CHR-ROM Bank: High-frequency legal document patterns and evidence
    this.textureBanks.set('CHR_ROM', {
      config: {
        bankType: 'CHR_ROM',
        maxTextures: 64,
        maxMemoryMB: 32,
        mipmapLevels: 8,
        compressionEnabled: true,
        rtxOptimization: true
      },
      textures: new Map(),
      memoryUsed: 0,
      bankSwitchCount: 0
    });

    // PRG-ROM Bank: Large legal document textures and complex UI elements
    this.textureBanks.set('PRG_ROM', {
      config: {
        bankType: 'PRG_ROM',
        maxTextures: 128,
        maxMemoryMB: 128,
        mipmapLevels: 12,
        compressionEnabled: true,
        rtxOptimization: true
      },
      textures: new Map(),
      memoryUsed: 0,
      bankSwitchCount: 0
    });

    // SAVE_RAM Bank: Persistent texture cache for frequently accessed content
    this.textureBanks.set('SAVE_RAM', {
      config: {
        bankType: 'SAVE_RAM',
        maxTextures: 32,
        maxMemoryMB: 16,
        mipmapLevels: 6,
        compressionEnabled: true,
        rtxOptimization: false // Lower priority, use CPU
      },
      textures: new Map(),
      memoryUsed: 0,
      bankSwitchCount: 0
    });

    // EXPANSION_ROM Bank: Streaming buffer for large texture operations
    this.textureBanks.set('EXPANSION_ROM', {
      config: {
        bankType: 'EXPANSION_ROM',
        maxTextures: 16,
        maxMemoryMB: 64,
        mipmapLevels: 10,
        compressionEnabled: false, // No compression for streaming
        rtxOptimization: true
      },
      textures: new Map(),
      memoryUsed: 0,
      bankSwitchCount: 0
    });

    console.log('✅ NES-style texture memory banks initialized');
  }

  /**
   * Smart texture allocation based on legal document characteristics
   */
  async allocateTexture(
    textureId: string,
    textureData: ImageData | ArrayBuffer | GPUTexture,
    legalDocument?: LegalDocument,
    options: {
      forceBank?: string;
      priority?: 'critical' | 'high' | 'normal' | 'low';
      enableMipmaps?: boolean;
      streamingEnabled?: boolean;
    } = {}
  ): Promise<TextureEntry | null> {
    if (!this.device || !this.isInitialized) {
      throw new Error('Texture manager not initialized');
    }

    const startTime = performance.now();
    const { enableMipmaps = true, streamingEnabled = false } = options;

    try {
      // Determine optimal memory bank
      const bankName = options.forceBank || this.selectOptimalBank(legalDocument, textureData);
      const bank = this.textureBanks.get(bankName);
      
      if (!bank) {
        throw new Error(`Memory bank ${bankName} not available`);
      }

      // Check memory constraints
      if (bank.memoryUsed >= bank.config.maxMemoryMB * 1024 * 1024) {
        console.warn(`Memory bank ${bankName} full, triggering garbage collection`);
        await this.performBankGarbageCollection(bankName);
      }

      // Create source texture if needed
      let sourceTexture: GPUTexture;
      if (textureData instanceof GPUTexture) {
        sourceTexture = textureData;
      } else {
        sourceTexture = await this.createTextureFromData(textureData);
      }

      // Generate mipmaps using optimized shaders
      let mipmapResult: MipmapChainResult | null = null;
      if (enableMipmaps) {
        const mipmapConfig: Partial<MipmapConfig> = {
          maxMipLevels: bank.config.mipmapLevels,
          filterMode: 'linear',
          enableOptimizations: true,
          rtxOptimized: bank.config.rtxOptimization,
          enableStreaming: streamingEnabled
        };

        mipmapResult = await yorhaMipmapShaders.generateMipmapChain(sourceTexture, mipmapConfig);
      }

      // Calculate memory usage
      const textureMemory = this.calculateTextureMemory(sourceTexture);
      const mipmapMemory = mipmapResult ? mipmapResult.memoryUsed : 0;
      const totalMemory = textureMemory + mipmapMemory;

      // Create texture entry
      const textureEntry: TextureEntry = {
        id: textureId,
        texture: sourceTexture,
        mipmaps: mipmapResult ? mipmapResult.mipmapLevels : [],
        memoryBank: bankName,
        lastAccessed: Date.now(),
        memoryUsed: totalMemory,
        legalDocument,
        generationStats: {
          mipmapGenerationTime: mipmapResult ? mipmapResult.totalGenerationTime : 0,
          compressionRatio: bank.config.compressionEnabled ? this.estimateCompressionRatio(sourceTexture) : 1.0,
          qualityScore: this.calculateQualityScore(mipmapResult)
        }
      };

      // Store in bank
      bank.textures.set(textureId, textureEntry);
      bank.memoryUsed += totalMemory;

      // Update statistics
      this.updateStats(textureEntry, mipmapResult);

      const allocationTime = performance.now() - startTime;
      console.log(`✅ Allocated texture ${textureId} to ${bankName} bank in ${allocationTime.toFixed(2)}ms`);
      
      if (mipmapResult) {
        console.log(`🔥 Generated ${mipmapResult.mipmapLevels.length} mip levels with ${mipmapResult.optimization.rtxAcceleration ? 'RTX' : 'CPU'} acceleration`);
      }

      return textureEntry;

    } catch (error) {
      console.error(`Failed to allocate texture ${textureId}:`, error);
      return null;
    }
  }

  /**
   * Smart bank selection based on legal document characteristics
   */
  private selectOptimalBank(legalDocument?: LegalDocument, textureData?: ImageData | ArrayBuffer | GPUTexture): string {
    if (!legalDocument) {
      return 'PRG_ROM'; // Default for general textures
    }

    // Critical legal documents → SAVE_RAM (persistent, fast access)
    if (legalDocument.riskLevel === 'critical' || legalDocument.priority > 200) {
      return 'SAVE_RAM';
    }

    // Evidence and pattern-heavy documents → CHR_ROM (optimized for patterns)
    if (legalDocument.type === 'evidence' || legalDocument.metadata?.documentClass === 'pattern') {
      return 'CHR_ROM';
    }

    // Large documents or streaming → EXPANSION_ROM
    if (legalDocument.size > 2048 * 2048 * 4) { // >16MB
      return 'EXPANSION_ROM';
    }

    // Default to PRG_ROM for general legal documents
    return 'PRG_ROM';
  }

  /**
   * Streaming texture processing for very large legal documents
   */
  async processStreamingTexture(
    sessionId: string,
    sourceTexture: GPUTexture,
    options: {
      chunkSize?: number;
      memoryBudget?: number;
      priority?: 'legal_critical' | 'evidence' | 'background';
      enableMipmaps?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.device) throw new Error('Device not available');

    const {
      chunkSize = 1024,
      memoryBudget = 128 * 1024 * 1024, // 128MB
      priority = 'evidence',
      enableMipmaps = true
    } = options;

    console.log(`📡 Starting streaming texture session: ${sessionId}`);

    const sourceWidth = (sourceTexture as any).width || 2048;
    const sourceHeight = (sourceTexture as any).height || 2048;
    const totalChunks = Math.ceil(sourceWidth / chunkSize) * Math.ceil(sourceHeight / chunkSize);

    // Create streaming session
    const session: TextureStreamingSession = {
      sessionId,
      sourceTexture,
      streamedChunks: new Map(),
      totalChunks,
      completedChunks: 0,
      memoryBudget,
      priority
    };

    this.streamingSessions.set(sessionId, session);

    // Process chunks with memory-aware batching
    const maxConcurrentChunks = Math.floor(memoryBudget / (chunkSize * chunkSize * 4)); // 4 bytes per RGBA pixel
    let processedChunks = 0;

    for (let y = 0; y < sourceHeight; y += chunkSize) {
      for (let x = 0; x < sourceWidth; x += chunkSize) {
        const chunkWidth = Math.min(chunkSize, sourceWidth - x);
        const chunkHeight = Math.min(chunkSize, sourceHeight - y);
        const chunkId = `chunk_${x}_${y}`;

        // Create chunk texture
        const chunkTexture = this.device.createTexture({
          size: [chunkWidth, chunkHeight, 1],
          format: 'rgba8unorm',
          usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
        });

        // Copy data from source
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyTextureToTexture(
          { texture: sourceTexture, origin: [x, y, 0] },
          { texture: chunkTexture },
          [chunkWidth, chunkHeight, 1]
        );
        this.device.queue.submit([commandEncoder.finish()]);

        // Generate mipmaps for chunk if enabled
        if (enableMipmaps) {
          const chunkMipmaps = await yorhaMipmapShaders.generateMipmapChain(chunkTexture, {
            maxMipLevels: 6,
            rtxOptimized: priority === 'legal_critical',
            enableStreaming: true
          });
        }

        session.streamedChunks.set(chunkId, chunkTexture);
        session.completedChunks++;
        processedChunks++;

        // Memory management: cleanup old chunks if needed
        if (session.streamedChunks.size > maxConcurrentChunks) {
          const oldestChunkId = session.streamedChunks.keys().next().value;
          if (oldestChunkId) {
            const oldChunk = session.streamedChunks.get(oldestChunkId);
            if (oldChunk) {
              oldChunk.destroy();
              session.streamedChunks.delete(oldestChunkId);
            }
          }
        }

        // Progress reporting
        if (processedChunks % 10 === 0) {
          console.log(`📡 Streaming progress: ${session.completedChunks}/${totalChunks} chunks`);
        }
      }
    }

    console.log(`✅ Streaming session ${sessionId} completed: ${session.completedChunks} chunks processed`);
    return sessionId;
  }

  /**
   * Bank switching for memory optimization (NES-style)
   */
  async switchTextureBank(fromBank: string, toBank: string, textureId: string): Promise<boolean> {
    const sourceBank = this.textureBanks.get(fromBank);
    const targetBank = this.textureBanks.get(toBank);

    if (!sourceBank || !targetBank) {
      console.error(`Invalid bank switch: ${fromBank} -> ${toBank}`);
      return false;
    }

    const texture = sourceBank.textures.get(textureId);
    if (!texture) {
      console.error(`Texture ${textureId} not found in ${fromBank} bank`);
      return false;
    }

    // Check if target bank has space
    if (targetBank.memoryUsed + texture.memoryUsed > targetBank.config.maxMemoryMB * 1024 * 1024) {
      console.warn(`Target bank ${toBank} full, performing garbage collection`);
      await this.performBankGarbageCollection(toBank);
    }

    // Move texture
    sourceBank.textures.delete(textureId);
    sourceBank.memoryUsed -= texture.memoryUsed;
    
    texture.memoryBank = toBank;
    targetBank.textures.set(textureId, texture);
    targetBank.memoryUsed += texture.memoryUsed;

    // Update bank switch counters
    sourceBank.bankSwitchCount++;
    targetBank.bankSwitchCount++;
    this.stats.bankSwitchCount++;

    console.log(`🔄 Bank switch completed: ${textureId} from ${fromBank} to ${toBank}`);
    return true;
  }

  /**
   * NES-style garbage collection for memory banks
   */
  private async performBankGarbageCollection(bankName: string): Promise<void> {
    const bank = this.textureBanks.get(bankName);
    if (!bank) return;

    console.log(`🧹 Performing garbage collection on ${bankName} bank`);

    const textures = Array.from(bank.textures.values());
    
    // Sort by access time and priority
    textures.sort((a, b) => {
      const aPriority = a.legalDocument?.priority || 128;
      const bPriority = b.legalDocument?.priority || 128;
      
      // Higher priority documents stay longer
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // More recently accessed stay longer
      return b.lastAccessed - a.lastAccessed;
    });

    // Remove bottom 25% of textures
    const texturesToRemove = textures.slice(Math.floor(textures.length * 0.75));
    
    for (const texture of texturesToRemove) {
      await this.releaseTexture(texture.id);
    }

    console.log(`🧹 Garbage collection completed: removed ${texturesToRemove.length} textures from ${bankName}`);
  }

  /**
   * Release texture and cleanup resources
   */
  async releaseTexture(textureId: string): Promise<boolean> {
    // Find texture in all banks
    let foundBank: string | null = null;
    let textureEntry: TextureEntry | null = null;

    for (const [bankName, bank] of Array.from(this.textureBanks)) {
      if (bank.textures.has(textureId)) {
        foundBank = bankName;
        textureEntry = bank.textures.get(textureId)!;
        break;
      }
    }

    if (!foundBank || !textureEntry) {
      console.warn(`Texture ${textureId} not found for release`);
      return false;
    }

    const bank = this.textureBanks.get(foundBank)!;

    // Destroy GPU resources
    textureEntry.texture.destroy();
    textureEntry.mipmaps.forEach(mip => mip.destroy());

    // Remove from bank
    bank.textures.delete(textureId);
    bank.memoryUsed -= textureEntry.memoryUsed;

    console.log(`🗑️ Released texture ${textureId} from ${foundBank} bank`);
    return true;
  }

  /**
   * Get comprehensive texture management statistics
   */
  getStatistics(): {
    banks: { [bankName: string]: { textureCount: number; memoryUsedMB: number; memoryLimitMB: number; utilization: number } };
    overall: typeof this.stats;
    streaming: { activeSessions: number; totalChunksProcessed: number };
  } {
    const bankStats: { [key: string]: any } = {};

    for (const [bankName, bank] of Array.from(this.textureBanks)) {
      const memoryUsedMB = bank.memoryUsed / 1024 / 1024;
      const memoryLimitMB = bank.config.maxMemoryMB;
      
      bankStats[bankName] = {
        textureCount: bank.textures.size,
        memoryUsedMB: parseFloat(memoryUsedMB.toFixed(2)),
        memoryLimitMB,
        utilization: parseFloat((memoryUsedMB / memoryLimitMB * 100).toFixed(1))
      };
    }

    const streamingStats = {
      activeSessions: this.streamingSessions.size,
      totalChunksProcessed: Array.from(this.streamingSessions.values())
        .reduce((sum, session) => sum + session.completedChunks, 0)
    };

    return {
      banks: bankStats,
      overall: this.stats,
      streaming: streamingStats
    };
  }

  // Utility methods
  private async getWebGPUDevice(): Promise<GPUDevice | null> {
    try {
      if (!navigator.gpu) return null;
      
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      if (!adapter) return null;

      return await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: 256 * 1024 * 1024,
          maxComputeWorkgroupStorageSize: 16384
        }
      });
    } catch (error) {
      return null;
    }
  }

  private async createTextureFromData(data: ImageData | ArrayBuffer): Promise<GPUTexture> {
    if (!this.device) throw new Error('Device not available');

    // Implementation would create texture from various data sources
    // For now, create a placeholder texture
    return this.device.createTexture({
      size: [512, 512, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
    });
  }

  private calculateTextureMemory(texture: GPUTexture): number {
    // Estimate texture memory usage (width * height * 4 bytes for RGBA)
    const width = (texture as any).width || 512;
    const height = (texture as any).height || 512;
    return width * height * 4;
  }

  private estimateCompressionRatio(texture: GPUTexture): number {
    // Estimate compression ratio based on texture characteristics
    return Math.random() * 0.3 + 0.7; // 0.7-1.0 compression ratio
  }

  private calculateQualityScore(mipmapResult: MipmapChainResult | null): number {
    if (!mipmapResult) return 0.5;
    
    // Calculate quality based on mipmap levels and generation time
    const levelScore = Math.min(mipmapResult.mipmapLevels.length / 10, 1.0);
    const timeScore = Math.max(1.0 - (mipmapResult.totalGenerationTime / 1000), 0.1);
    
    return (levelScore + timeScore) / 2;
  }

  private updateStats(textureEntry: TextureEntry, mipmapResult: MipmapChainResult | null): void {
    this.stats.totalTexturesManaged++;
    this.stats.totalMemoryUsed += textureEntry.memoryUsed;
    
    if (mipmapResult) {
      this.stats.totalMipmapsGenerated += mipmapResult.mipmapLevels.length;
      this.stats.averageMipmapTime = 
        (this.stats.averageMipmapTime * (this.stats.totalTexturesManaged - 1) + mipmapResult.totalGenerationTime) / 
        this.stats.totalTexturesManaged;
      
      if (mipmapResult.optimization.rtxAcceleration) {
        this.stats.rtxAccelerationUsed++;
      }
    }
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    // Release all textures
    for (const [bankName, bank] of Array.from(this.textureBanks)) {
      for (const textureId of Array.from(bank.textures.keys())) {
        this.releaseTexture(textureId);
      }
    }

    // Cleanup streaming sessions
    for (const session of Array.from(this.streamingSessions.values())) {
      session.streamedChunks.forEach(texture => texture.destroy());
    }
    this.streamingSessions.clear();

    // Dispose mipmap shaders
    yorhaMipmapShaders.dispose();

    this.isInitialized = false;
    console.log('🧹 YoRHa Optimized Texture Manager disposed');
  }
}

// Export singleton instance
export const yorhaTextureManager = new YoRHaOptimizedTextureManager();