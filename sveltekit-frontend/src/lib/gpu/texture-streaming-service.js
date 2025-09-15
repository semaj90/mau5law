// Nintendo-Style Texture Streaming Service
// CHR-ROM Pattern Bank Management with N64-Style LOD System

export class TextureStreamingService {
  constructor() {
    this.textureBank = new Map(); // CHR-ROM style texture bank
    this.streamCache = new Map(); // L1 cache for active streams
    this.lodManager = new N64LODManager();
    this.memoryBanks = {
      CHR_ROM: new Map(),    // Pattern tiles (8x8)
      PRG_ROM: new Map(),    // Program data
      SRAM: new Map(),       // Save RAM for persistent cache
      VRAM: new Map()        // Video RAM for active textures
    };
    this.maxCacheSize = 1000; // Nintendo memory constraints
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🎮 Initializing Nintendo Texture Streaming Service...');
    
    // Initialize GPU context if available
    if (typeof window !== 'undefined' && window.navigator?.gpu) {
      try {
        this.adapter = await navigator.gpu.requestAdapter();
        if (this.adapter) {
          this.device = await this.adapter.requestDevice();
          console.log('✅ WebGPU texture acceleration available');
        }
      } catch (error) {
        console.log('⚠️ WebGPU not available, using CPU fallback');
      }
    }
    
    this.isInitialized = true;
  }

  // Stream texture data with CHR-ROM banking
  async streamTexture(textureId, data, options = {}) {
    await this.initialize();
    
    const {
      format = 'chr-rom',
      tileSize = 8,
      lodLevel = 0,
      bankRegion = 'CHR_ROM',
      compress = true
    } = options;

    // Nintendo bank switching - check memory constraints
    if (this.memoryBanks[bankRegion].size >= this.maxCacheSize) {
      this.performBankSwitch(bankRegion);
    }

    const textureData = {
      id: textureId,
      format,
      tileSize,
      lodLevel,
      data: compress ? this.compressTexture(data) : data,
      timestamp: Date.now(),
      accessCount: 0
    };

    // Store in appropriate memory bank
    this.memoryBanks[bankRegion].set(textureId, textureData);
    
    // Update LOD manager
    this.lodManager.registerTexture(textureId, {
      originalSize: data.length,
      lodLevel,
      priority: options.priority || 'normal'
    });

    console.log(`🎮 Streamed texture ${textureId} to ${bankRegion} (LOD ${lodLevel})`);
    return textureData;
  }

  // Get texture with automatic LOD selection
  getTexture(textureId, requestedLOD = null) {
    // Search across memory banks
    for (const [bankName, bank] of Object.entries(this.memoryBanks)) {
      const texture = bank.get(textureId);
      if (texture) {
        texture.accessCount++;
        
        // LOD adjustment based on memory pressure
        const optimalLOD = requestedLOD ?? this.lodManager.getOptimalLOD(textureId);
        if (optimalLOD !== texture.lodLevel) {
          return this.adjustTextureLOD(texture, optimalLOD);
        }
        
        return texture;
      }
    }
    
    return null;
  }

  // Nintendo-style bank switching when memory is full
  performBankSwitch(bankRegion) {
    const bank = this.memoryBanks[bankRegion];
    const entries = Array.from(bank.entries());
    
    // Sort by access count and age (LRU + Nintendo priority system)
    entries.sort((a, b) => {
      const [, textureA] = a;
      const [, textureB] = b;
      
      // Priority: low access count + older timestamp = first to evict
      const priorityA = textureA.accessCount + (Date.now() - textureA.timestamp) / 1000;
      const priorityB = textureB.accessCount + (Date.now() - textureB.timestamp) / 1000;
      
      return priorityA - priorityB;
    });

    // Remove bottom 25% to make room (Nintendo cartridge constraints)
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [textureId] = entries[i];
      bank.delete(textureId);
      this.lodManager.unregisterTexture(textureId);
    }

    console.log(`🎮 Bank switch: removed ${toRemove} textures from ${bankRegion}`);
  }

  // N64-style LOD adjustment
  adjustTextureLOD(texture, targetLOD) {
    if (texture.lodLevel === targetLOD) return texture;

    const scaleFactor = Math.pow(2, texture.lodLevel - targetLOD);
    const adjustedData = this.scaleTextureData(texture.data, scaleFactor);

    return {
      ...texture,
      lodLevel: targetLOD,
      data: adjustedData,
      timestamp: Date.now()
    };
  }

  // CHR-ROM style texture compression
  compressTexture(data) {
    if (typeof data === 'string') {
      // Text data - use pattern-based compression
      return this.compressTextPattern(data);
    } else if (data instanceof Uint8Array) {
      // Binary data - use run-length encoding like NES
      return this.compressRLE(data);
    }
    return data;
  }

  compressTextPattern(text) {
    // Simple pattern-based compression for repeated text
    const patterns = {};
    let patternId = 0;
    
    // Find repeated 8-character patterns (like 8x8 tiles)
    for (let i = 0; i < text.length - 7; i++) {
      const pattern = text.substr(i, 8);
      if (!patterns[pattern]) {
        patterns[pattern] = `P${patternId++}`;
      }
    }

    let compressed = text;
    for (const [pattern, id] of Object.entries(patterns)) {
      compressed = compressed.replace(new RegExp(pattern, 'g'), id);
    }

    return {
      type: 'pattern',
      data: compressed,
      patterns,
      originalLength: text.length
    };
  }

  compressRLE(data) {
    // Run-length encoding like NES CHR-ROM
    const compressed = [];
    let count = 1;
    let current = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        compressed.push(count, current);
        current = data[i];
        count = 1;
      }
    }
    compressed.push(count, current);

    return {
      type: 'rle',
      data: new Uint8Array(compressed),
      originalLength: data.length
    };
  }

  scaleTextureData(data, scaleFactor) {
    // Simple scaling for demonstration
    if (typeof data === 'string') {
      // For text, truncate or pad based on scale
      if (scaleFactor < 1) {
        return data.substring(0, Math.floor(data.length * scaleFactor));
      } else {
        return data.repeat(Math.ceil(scaleFactor));
      }
    }
    
    // For compressed data, adjust accordingly
    if (data.type === 'pattern') {
      return {
        ...data,
        data: this.scaleTextureData(data.data, scaleFactor)
      };
    }

    return data;
  }

  // Batch streaming for performance
  async streamBatch(textures, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10;

    for (let i = 0; i < textures.length; i += batchSize) {
      const batch = textures.slice(i, i + batchSize);
      const batchPromises = batch.map(texture => 
        this.streamTexture(texture.id, texture.data, texture.options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // Memory management and diagnostics
  getMemoryStats() {
    const stats = {
      totalTextures: 0,
      memoryUsage: {},
      lodDistribution: {},
      cacheHitRate: this.lodManager.getCacheHitRate()
    };

    for (const [bankName, bank] of Object.entries(this.memoryBanks)) {
      const textures = Array.from(bank.values());
      stats.memoryUsage[bankName] = {
        count: textures.length,
        totalSize: textures.reduce((sum, t) => sum + (t.data.length || 0), 0)
      };
      stats.totalTextures += textures.length;

      // LOD distribution
      for (const texture of textures) {
        const lod = `LOD${texture.lodLevel}`;
        stats.lodDistribution[lod] = (stats.lodDistribution[lod] || 0) + 1;
      }
    }

    return stats;
  }

  // Clear specific memory bank
  clearBank(bankRegion) {
    if (this.memoryBanks[bankRegion]) {
      this.memoryBanks[bankRegion].clear();
      console.log(`🎮 Cleared ${bankRegion} memory bank`);
    }
  }

  // Clear all memory banks
  clearAll() {
    for (const bankName of Object.keys(this.memoryBanks)) {
      this.clearBank(bankName);
    }
    this.lodManager.clear();
    console.log('🎮 All texture memory banks cleared');
  }
}

// N64-Style Level of Detail Manager
class N64LODManager {
  constructor() {
    this.lodTable = new Map();
    this.memoryPressure = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  registerTexture(textureId, metadata) {
    this.lodTable.set(textureId, {
      ...metadata,
      lastAccessed: Date.now(),
      hitCount: 0
    });
  }

  unregisterTexture(textureId) {
    this.lodTable.delete(textureId);
  }

  getOptimalLOD(textureId) {
    const texture = this.lodTable.get(textureId);
    if (!texture) return 0;

    // N64-style LOD calculation
    // LOD 0: 64x64 (highest quality)
    // LOD 1: 32x32  
    // LOD 2: 16x16
    // LOD 3: 8x8 (NES-style tiles)

    let optimalLOD = 0;

    // Increase LOD under memory pressure
    if (this.memoryPressure > 0.8) {
      optimalLOD = Math.min(3, optimalLOD + 2);
    } else if (this.memoryPressure > 0.6) {
      optimalLOD = Math.min(3, optimalLOD + 1);
    }

    // Reduce LOD for frequently accessed textures
    if (texture.hitCount > 10) {
      optimalLOD = Math.max(0, optimalLOD - 1);
    }

    // Priority override
    if (texture.priority === 'high') {
      optimalLOD = Math.max(0, optimalLOD - 1);
    } else if (texture.priority === 'low') {
      optimalLOD = Math.min(3, optimalLOD + 1);
    }

    texture.hitCount++;
    texture.lastAccessed = Date.now();
    this.cacheHits++;

    return optimalLOD;
  }

  updateMemoryPressure(usedMemory, totalMemory) {
    this.memoryPressure = usedMemory / totalMemory;
  }

  getCacheHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  clear() {
    this.lodTable.clear();
    this.memoryPressure = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Export singleton instance
export const textureStreamer = new TextureStreamingService();

// Export for server-side usage
export default TextureStreamingService;