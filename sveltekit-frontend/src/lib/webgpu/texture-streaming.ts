/**
 * WebGPU Texture Streaming System - Phase 14
 * 
 * Lightweight 3D asset management with NES-like memory constraints:
 * - 2KB RAM for active textures
 * - 40KB total memory budget  
 * - Meshoptimizer compression with legal document context
 * - WebGL2 fallback for universal browser support
 * - Buffer conversion utilities for proper ArrayBuffer/Float32Array handling
 */

import { 
  WebGPUBufferUtils, 
  toArrayBuffer, 
  BufferTypeGuards, 
  type BufferLike,
  BufferDebugUtils
} from '../utils/buffer-conversion.js';

// Memory constraints (Nintendo NES inspired)
const MEMORY_CONSTRAINTS = {
  RAM: 2048, // 2KB for active textures (like NES)
  TOTAL: 40960, // 40KB total budget (like NES)
  CHR_ROM: 8192, // 8KB for texture patterns
  PRG_ROM: 32768, // 32KB for program data
  SPRITE_LIMIT: 64, // Max sprites on screen
  PALETTE_COLORS: 52 // NES-like color palette
} as const;

export interface NESTexture {
  id: string;
  data: ArrayBuffer;
  width: number;
  height: number;
  format: GPUTextureFormat;
  size: number;
  lastUsed: number;
  priority: number;
  compressed: boolean;
  legalContext?: {
    documentType: 'contract' | 'evidence' | 'brief' | 'citation';
    confidenceLevel: number;
    riskIndicator: boolean;
  };
}

export interface MemoryRegion {
  name: 'RAM' | 'CHR_ROM' | 'PRG_ROM';
  size: number;
  used: number;
  textures: Map<string, NESTexture>;
}

export class WebGPUTextureStreamer {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  
  // NES-inspired memory regions
  private memoryRegions: Map<string, MemoryRegion> = new Map();
  private textureCache: Map<string, GPUTexture> = new Map();
  private compressionWorker: Worker | null = null;
  
  // WebGL2 fallback
  private gl: WebGL2RenderingContext | null = null;
  private webglTextures: Map<string, WebGLTexture> = new Map();
  
  // Memory management
  private gcThreshold = 0.85; // Trigger cleanup at 85% memory usage
  private isInitialized = false;
  private workerUrl: string | null = null;

  constructor() {
    this.initializeMemoryRegions();
  }

  private initializeMemoryRegions() {
    this.memoryRegions.set('RAM', {
      name: 'RAM',
      size: MEMORY_CONSTRAINTS.RAM,
      used: 0,
      textures: new Map()
    });

    this.memoryRegions.set('CHR_ROM', {
      name: 'CHR_ROM', 
      size: MEMORY_CONSTRAINTS.CHR_ROM,
      used: 0,
      textures: new Map()
    });

    this.memoryRegions.set('PRG_ROM', {
      name: 'PRG_ROM',
      size: MEMORY_CONSTRAINTS.PRG_ROM,
      used: 0,
      textures: new Map()
    });
  }

  async initialize(canvas?: HTMLCanvasElement): Promise<boolean> {
    try {
      // Try WebGPU first
      if (await this.initWebGPU(canvas)) {
        console.log('✅ WebGPU texture streaming initialized');
        this.isInitialized = true;
        return true;
      }
      
      // Fallback to WebGL2
      if (this.initWebGL2(canvas)) {
        console.log('✅ WebGL2 texture streaming fallback initialized');
        this.isInitialized = true;
        return true;
      }

      throw new Error('Neither WebGPU nor WebGL2 available');

    } catch (error: any) {
      console.error('❌ Texture streaming initialization failed:', error);
      return false;
    }
  }

  private async initWebGPU(canvas?: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) return false;

    try {
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!this.adapter) return false;

      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });

      if (canvas) {
        this.context = canvas.getContext('webgpu');
        if (this.context) {
          this.context.configure({
            device: this.device,
            format: 'bgra8unorm',
            alphaMode: 'premultiplied'
          });
        }
      }

      // Initialize compression worker
      this.setupCompressionWorker();
      
      return true;

    } catch (error: any) {
      console.warn('WebGPU initialization failed:', error);
      return false;
    }
  }

  private initWebGL2(canvas?: HTMLCanvasElement): boolean {
    if (!canvas) return false;

    try {
      this.gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false, // Disable for pixel-perfect NES style
        depth: true,
        premultipliedAlpha: true
      });

      if (!this.gl) return false;

      // Configure WebGL2 for NES-style rendering
      this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      return true;

    } catch (error: any) {
      console.warn('WebGL2 initialization failed:', error);
      return false;
    }
  }

  private setupCompressionWorker() {
    // Create worker for texture compression
    const workerCode = `
      // Meshoptimizer-style compression for textures
      self.onmessage = function(e) {
        const { textureData, width, height, format, legalContext } = e.data;
        
        try {
          // Simple RLE compression for NES-style textures
          const compressed = compressTexture(textureData, legalContext);
          
          self.postMessage({
            success: true,
            compressedData: compressed.data,
            compressionRatio: compressed.ratio,
            originalSize: textureData.byteLength,
            compressedSize: compressed.data.byteLength
          });
        } catch (error: any) {
          self.postMessage({ success: false, error: error.message });
        }
      };
      
      function compressTexture(data, legalContext) {
        const input = new Uint8Array(data);
        const output = [];
        let i = 0;
        
        // Legal context-aware compression
        const contextMultiplier = legalContext?.confidenceLevel > 0.8 ? 2 : 1;
        
        while (i < input.length) {
          const value = input[i];
          let count = 1;
          
          // Count consecutive values (RLE encoding)
          while (i + count < input.length && input[i + count] === value && count < 255 * contextMultiplier) {
            count++;
          }
          
          if (count > 3) {
            // Use RLE for sequences
            output.push(0xFF, count, value);
          } else {
            // Raw data for short sequences
            for (let j = 0; j < count; j++) {
              output.push(value);
            }
          }
          
          i += count;
        }
        
        const compressed = new Uint8Array(output);
        return {
          data: compressed.buffer,
          ratio: input.length / compressed.length
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    this.compressionWorker = new Worker(this.workerUrl);
    
    // Clean up the worker URL to prevent memory leaks
    this.compressionWorker.addEventListener('error', () => {
      if (this.workerUrl) {
        URL.revokeObjectURL(this.workerUrl);
        this.workerUrl = null;
      }
    });
    this.compressionWorker.addEventListener('messageerror', () => {
      if (this.workerUrl) {
        URL.revokeObjectURL(this.workerUrl);
        this.workerUrl = null;
      }
    });
  }

  async loadTexture(
    id: string,
    data: BufferLike,
    width: number,
    height: number,
    options: {
      priority?: number;
      legalContext?: NESTexture['legalContext'];
      region?: 'RAM' | 'CHR_ROM' | 'PRG_ROM';
      compress?: boolean;
    } = {}
  ): Promise<boolean> {
    const {
      priority = 1,
      legalContext,
      region = 'CHR_ROM',
      compress = true
    } = options;

    try {
      // Check memory constraints
      const textureSize = width * height * 4; // RGBA
      const memoryRegion = this.memoryRegions.get(region)!;
      
      if (memoryRegion.used + textureSize > memoryRegion.size) {
        // Try garbage collection
        await this.garbageCollect(region);
        
        if (memoryRegion.used + textureSize > memoryRegion.size) {
          console.warn(`❌ Not enough memory in ${region} for texture ${id}`);
          return false;
        }
      }

      // Convert to ArrayBuffer and compress texture if enabled
      let finalData = toArrayBuffer(data);
      let compressed = false;
      
      if (compress && this.compressionWorker) {
        finalData = await this.compressTexture(finalData, width, height, legalContext);
        compressed = true;
      }
      
      // Debug buffer info for legal context textures
      if (legalContext?.riskIndicator) {
        BufferDebugUtils.logBuffer(data, `Legal Risk Texture ${id}`);
      }

      // Clean up existing texture if it exists to prevent duplicates
      await this.unloadTexture(id);

      // Create NES texture metadata
      const nesTexture: NESTexture = {
        id,
        data: finalData,
        width,
        height,
        format: 'rgba8unorm',
        size: finalData.byteLength,
        lastUsed: Date.now(),
        priority,
        compressed,
        legalContext
      };

      // Store in appropriate memory region
      memoryRegion.textures.set(id, nesTexture);
      memoryRegion.used += nesTexture.size;

      // Create GPU/WebGL texture
      if (this.device) {
        await this.createWebGPUTexture(nesTexture);
      } else if (this.gl) {
        this.createWebGLTexture(nesTexture);
      }

      console.log(`✅ Loaded texture ${id} in ${region} (${this.formatBytes(nesTexture.size)})`);
      return true;

    } catch (error: any) {
      console.error(`❌ Failed to load texture ${id}:`, error);
      return false;
    }
  }

  private async compressTexture(
    data: ArrayBuffer,
    width: number,
    height: number,
    legalContext?: NESTexture['legalContext']
  ): Promise<ArrayBuffer> {
    if (!this.compressionWorker) return data;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);

      const handleMessage = (e: any) => {
        clearTimeout(timeout);
        this.compressionWorker!.removeEventListener('message', handleMessage);
        
        if (e.data.success) {
          console.log(`🗜️ Compressed texture: ${this.formatBytes(e.data.originalSize)} → ${this.formatBytes(e.data.compressedSize)} (${e.data.compressionRatio.toFixed(2)}x)`);
          resolve(e.data.compressedData);
        } else {
          reject(new Error(e.data.error));
        }
      };

      this.compressionWorker!.addEventListener('message', handleMessage);

      this.compressionWorker!.postMessage({
        textureData: data,
        width,
        height,
        format: 'rgba8unorm',
        legalContext
      });
    });
  }

  private async createWebGPUTexture(nesTexture: NESTexture): Promise<void> {
    if (!this.device) return;

    const texture = this.device.createTexture({
      size: { width: nesTexture.width, height: nesTexture.height },
      format: nesTexture.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    // Upload texture data with proper buffer handling
    const textureData = BufferTypeGuards.isArrayBuffer(nesTexture.data) 
      ? nesTexture.data 
      : toArrayBuffer(nesTexture.data);
      
    this.device.queue.writeTexture(
      { texture },
      textureData,
      { bytesPerRow: nesTexture.width * 4, rowsPerImage: nesTexture.height },
      { width: nesTexture.width, height: nesTexture.height }
    );

    this.textureCache.set(nesTexture.id, texture);
  }

  private createWebGLTexture(nesTexture: NESTexture): void {
    if (!this.gl) return;

    const texture = this.gl.createTexture();
    if (!texture) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // Set texture parameters for pixel-perfect NES style
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Upload texture data with proper buffer conversion
    const textureData = BufferTypeGuards.isArrayBuffer(nesTexture.data)
      ? new Uint8Array(nesTexture.data)
      : new Uint8Array(toArrayBuffer(nesTexture.data));
      
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      nesTexture.width,
      nesTexture.height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      textureData
    );

    this.webglTextures.set(nesTexture.id, texture);
  }

  private async garbageCollect(region: string): Promise<void> {
    const memoryRegion = this.memoryRegions.get(region);
    if (!memoryRegion) return;

    const textures = Array.from(memoryRegion.textures.entries());
    
    // Sort by priority (low) and last used time (old first)
    textures.sort((a, b) => {
      const [, textureA] = a;
      const [, textureB] = b;
      
      if (textureA.priority !== textureB.priority) {
        return textureA.priority - textureB.priority;
      }
      
      return textureA.lastUsed - textureB.lastUsed;
    });

    // Remove textures until we're under the threshold
    const targetSize = memoryRegion.size * (1 - this.gcThreshold);
    
    for (const [id, texture] of textures) {
      if (memoryRegion.used <= targetSize) break;
      
      // Don't remove high-priority legal textures
      if (texture.legalContext?.riskIndicator || texture.priority > 8) continue;
      
      await this.unloadTexture(id, region);
      console.log(`🗑️ GC removed texture ${id} from ${region}`);
    }
  }

  async unloadTexture(id: string, region?: string): Promise<void> {
    // Remove from all regions if none specified
    const regionsToCheck = region ? [region] : ['RAM', 'CHR_ROM', 'PRG_ROM'];
    
    for (const regionName of regionsToCheck) {
      const memoryRegion = this.memoryRegions.get(regionName);
      if (!memoryRegion) continue;
      
      const texture = memoryRegion.textures.get(id);
      if (!texture) continue;
      
      // Remove from memory region
      memoryRegion.textures.delete(id);
      memoryRegion.used -= texture.size;
      
      // Remove GPU texture
      const gpuTexture = this.textureCache.get(id);
      if (gpuTexture) {
        gpuTexture.destroy();
        this.textureCache.delete(id);
      }
      
      // Remove WebGL texture
      const webglTexture = this.webglTextures.get(id);
      if (webglTexture && this.gl) {
        this.gl.deleteTexture(webglTexture);
        this.webglTextures.delete(id);
      }
    }
  }

  getTexture(id: string): GPUTexture | WebGLTexture | null {
    // Update last used time
    for (const region of this.memoryRegions.values()) {
      const texture = region.textures.get(id);
      if (texture) {
        texture.lastUsed = Date.now();
        break;
      }
    }
    
    return this.textureCache.get(id) || this.webglTextures.get(id) || null;
  }

  getMemoryStats() {
    const stats = {
      total: MEMORY_CONSTRAINTS.TOTAL,
      regions: {} as Record<string, { used: number; size: number; utilization: number; textureCount: number }>,
      textures: 0,
      isWebGPU: !!this.device,
      isWebGL2: !!this.gl
    };

    let totalUsed = 0;
    let totalTextures = 0;

    for (const [name, region] of this.memoryRegions) {
      stats.regions[name] = {
        used: region.used,
        size: region.size,
        utilization: region.used / region.size,
        textureCount: region.textures.size
      };
      
      totalUsed += region.used;
      totalTextures += region.textures.size;
    }

    stats.textures = totalTextures;

    return stats;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async destroy(): Promise<void> {
    // Clean up all textures
    for (const region of this.memoryRegions.keys()) {
      const memoryRegion = this.memoryRegions.get(region)!;
      for (const id of memoryRegion.textures.keys()) {
        await this.unloadTexture(id, region);
      }
    }

    // Clean up GPU resources
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    // Clean up worker URL
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }

    this.gl = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const textureStreamer = new WebGPUTextureStreamer();