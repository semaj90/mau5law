/**
 * Global GPU Context Manager
 * Provides centralized GPU acceleration across the entire app
 * Integrates NES memory architecture for 8-bit color quantization
 */

import type { HybridGPUContext } from './hybrid-gpu-context.js';

// Import GPU configuration from environment
import { GPU_CONFIG, CLIENT_ENV } from '../config/env.js';

// NES PPU (Picture Processing Unit) Memory Map
export const NES_MEMORY_MAP = {
  // Pattern Tables (CHR-ROM/RAM) - 8KB
  PATTERN_TABLE_0: { start: 0x0000, size: 0x1000 }, // Background patterns
  PATTERN_TABLE_1: { start: 0x1000, size: 0x1000 }, // Sprite patterns
  
  // Name Tables (Screen data) - 2KB actual, 4KB addressable
  NAME_TABLE_0: { start: 0x2000, size: 0x400 },     // Screen 0
  NAME_TABLE_1: { start: 0x2400, size: 0x400 },     // Screen 1
  NAME_TABLE_2: { start: 0x2800, size: 0x400 },     // Screen 2 (mirror)
  NAME_TABLE_3: { start: 0x2C00, size: 0x400 },     // Screen 3 (mirror)
  
  // Attribute Tables - 64 bytes each
  ATTR_TABLE_0: { start: 0x23C0, size: 0x40 },
  ATTR_TABLE_1: { start: 0x27C0, size: 0x40 },
  
  // Palette RAM - 32 bytes
  PALETTE_RAM: { start: 0x3F00, size: 0x20 },
  
  // OAM (Object Attribute Memory) - 256 bytes for sprites
  OAM: { start: 0x0000, size: 0x100 }, // Separate address space
} as const;

// NES Color Palette (52 total colors)
export const NES_PALETTE = new Uint32Array([
  0x666666, 0x002A88, 0x1412A7, 0x3B00A4, 0x5C007E, 0x6E0040, 0x6C0600, 0x561D00,
  0x333500, 0x0B4800, 0x005200, 0x004F08, 0x00404D, 0x000000, 0x000000, 0x000000,
  0xADADAD, 0x155FD9, 0x4240FF, 0x7527FE, 0xA01ACC, 0xB71E7B, 0xB53120, 0x994E00,
  0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
  0xFEFEFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
  0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
  0xFEFEFF, 0xC0DFFF, 0xD3D2FF, 0xE8C8FF, 0xFBC2FF, 0xFEC4EA, 0xFECCC5, 0xF7D8A5,
  0xE4E594, 0xCFEF96, 0xBDF4AB, 0xB3F3CC, 0xB5EBF2, 0xB8B8B8, 0x000000, 0x000000
]);

export interface NESMemoryRegion {
  buffer: ArrayBuffer;
  view: DataView;
  gpuBuffer?: GPUBuffer | WebGLBuffer;
  isDirty: boolean;
}

export interface GPUAcceleration {
  isEnabled: boolean;
  contextType: 'webgpu' | 'webgl2' | 'webgl1' | 'cpu';
  hybridContext?: HybridGPUContext;
  nesMemory: Map<string, NESMemoryRegion>;
  colorQuantizationShader?: string;
}

class GlobalGPUManager {
  private static instance: GlobalGPUManager;
  private acceleration: GPUAcceleration;
  private canvas?: HTMLCanvasElement;
  private initialized = false;

  private constructor() {
    // Only create canvas in browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 256;  // NES resolution
      this.canvas.height = 240;
    }
    
    this.acceleration = {
      isEnabled: false,
      contextType: 'cpu',
      nesMemory: new Map()
    };
  }

  static getInstance(): GlobalGPUManager {
    if (!GlobalGPUManager.instance) {
      GlobalGPUManager.instance = new GlobalGPUManager();
    }
    return GlobalGPUManager.instance;
  }

  /**
   * Initialize the global GPU manager with NES memory architecture
   */
  async initialize(preferredCanvas?: HTMLCanvasElement): Promise<void> {
    if (this.initialized) return;

    // Check if GPU acceleration is enabled via environment
    if (!CLIENT_ENV.GPU_ACCELERATION) {
      console.log('🎮 GPU acceleration disabled via environment configuration');
      this.acceleration.isEnabled = false;
      this.acceleration.contextType = 'cpu';
      await this.initializeNESMemoryCPU();
      this.initialized = true;
      return;
    }

    if (preferredCanvas) {
      this.canvas = preferredCanvas;
    }

    try {
      const { createHybridGPUContext } = await import('./hybrid-gpu-context.js');
      
      // Use environment-based GPU configuration
      this.acceleration.hybridContext = await createHybridGPUContext(this.canvas, {
        preferWebGPU: GPU_CONFIG.preferWebGPU,
        allowWebGL2: GPU_CONFIG.allowWebGL2,
        allowWebGL1: GPU_CONFIG.allowWebGL1,
        requireCompute: GPU_CONFIG.requireCompute,
        lodSystemIntegration: GPU_CONFIG.lodSystemIntegration,
        nesMemoryOptimization: GPU_CONFIG.nesMemoryOptimization
      });

      this.acceleration.isEnabled = true;
      this.acceleration.contextType = this.acceleration.hybridContext.getActiveContextType();
      
      console.log(`🚀 Global GPU Manager initialized with ${this.acceleration.contextType} acceleration`);
      
      // Initialize NES memory regions
      await this.initializeNESMemory();
      
      // Create color quantization shader
      this.acceleration.colorQuantizationShader = this.createNESColorQuantizationShader();
      
      this.initialized = true;

    } catch (error) {
      console.warn('⚠️ GPU acceleration unavailable, using CPU fallback:', error);
      this.acceleration.isEnabled = false;
      this.acceleration.contextType = 'cpu';
      await this.initializeNESMemoryCPU();
      this.initialized = true;
    }
  }

  /**
   * Initialize NES memory regions with GPU buffers
   */
  private async initializeNESMemory(): Promise<void> {
    const regions = [
      'PATTERN_TABLE_0', 'PATTERN_TABLE_1',
      'NAME_TABLE_0', 'NAME_TABLE_1',
      'ATTR_TABLE_0', 'ATTR_TABLE_1',
      'PALETTE_RAM', 'OAM'
    ];

    for (const regionName of regions) {
      const region = NES_MEMORY_MAP[regionName as keyof typeof NES_MEMORY_MAP];
      const buffer = new ArrayBuffer(region.size);
      const view = new DataView(buffer);

      const memoryRegion: NESMemoryRegion = {
        buffer,
        view,
        isDirty: false
      };

      // Create GPU buffer if GPU acceleration is available
      if (this.acceleration.hybridContext) {
        try {
          if (this.acceleration.contextType === 'webgpu') {
            const device = this.acceleration.hybridContext.getActiveContext() as GPUDevice;
            memoryRegion.gpuBuffer = device.createBuffer({
              size: region.size,
              usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
            });
          } else {
            const gl = this.acceleration.hybridContext.getActiveContext() as WebGL2RenderingContext | WebGLRenderingContext;
            memoryRegion.gpuBuffer = gl.createBuffer();
          }
        } catch (error) {
          console.warn(`Failed to create GPU buffer for ${regionName}:`, error);
        }
      }

      this.acceleration.nesMemory.set(regionName, memoryRegion);
    }

    // Initialize NES palette in palette RAM
    await this.loadNESPalette();
  }

  /**
   * CPU fallback for NES memory initialization
   */
  private async initializeNESMemoryCPU(): Promise<void> {
    const regions = [
      'PATTERN_TABLE_0', 'PATTERN_TABLE_1',
      'NAME_TABLE_0', 'NAME_TABLE_1',
      'ATTR_TABLE_0', 'ATTR_TABLE_1',
      'PALETTE_RAM', 'OAM'
    ];

    for (const regionName of regions) {
      const region = NES_MEMORY_MAP[regionName as keyof typeof NES_MEMORY_MAP];
      const buffer = new ArrayBuffer(region.size);
      const view = new DataView(buffer);

      this.acceleration.nesMemory.set(regionName, {
        buffer,
        view,
        isDirty: false
      });
    }

    await this.loadNESPalette();
  }

  /**
   * Load NES color palette into palette RAM
   */
  private async loadNESPalette(): Promise<void> {
    const paletteRAM = this.acceleration.nesMemory.get('PALETTE_RAM');
    if (!paletteRAM) return;

    // Load background palette (16 colors)
    for (let i = 0; i < 16; i++) {
      const colorIndex = i % NES_PALETTE.length;
      const color = NES_PALETTE[colorIndex];
      paletteRAM.view.setUint32(i * 4, color, true);
    }

    // Load sprite palette (16 colors)
    for (let i = 0; i < 16; i++) {
      const colorIndex = (i + 16) % NES_PALETTE.length;
      const color = NES_PALETTE[colorIndex];
      paletteRAM.view.setUint32((16 + i) * 4, color, true);
    }

    paletteRAM.isDirty = true;
    await this.syncNESMemoryToGPU('PALETTE_RAM');
  }

  /**
   * Create NES-style color quantization shader
   */
  private createNESColorQuantizationShader(): string {
    return `
      @group(0) @binding(0) var<storage, read> inputPixels: array<vec4f>;
      @group(0) @binding(1) var<storage, read_write> outputPixels: array<vec4f>;
      @group(0) @binding(2) var<storage, read> nesPalette: array<vec4f>;
      @group(0) @binding(3) var<uniform> config: vec4f; // width, height, paletteSize, dithering
      
      // Convert RGB to NES color index
      fn rgbToNESIndex(color: vec3f) -> u32 {
        var bestIndex: u32 = 0;
        var bestDistance: f32 = 999999.0;
        
        let paletteSize = u32(config.z);
        
        for (var i: u32 = 0; i < paletteSize; i++) {
          let paletteColor = nesPalette[i].rgb;
          let distance = length(color - paletteColor);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }
        
        return bestIndex;
      }
      
      // Apply NES-style dithering
      fn applyNESDithering(color: vec3f, x: i32, y: i32) -> vec3f {
        let ditherPattern = array<f32, 4>(
          -0.5, 0.0, 0.5, 0.25
        );
        
        let patternIndex = (x % 2) + (y % 2) * 2;
        let dither = ditherPattern[patternIndex] * 0.1;
        
        return clamp(color + vec3f(dither), vec3f(0.0), vec3f(1.0));
      }
      
      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let width = i32(config.x);
        let height = i32(config.y);
        let x = i32(global_id.x);
        let y = i32(global_id.y);
        
        if (x >= width || y >= height) { return; }
        
        let index = y * width + x;
        let inputColor = inputPixels[index];
        
        var color = inputColor.rgb;
        
        // Apply dithering if enabled
        if (config.w > 0.5) {
          color = applyNESDithering(color, x, y);
        }
        
        // Quantize to NES palette
        let nesIndex = rgbToNESIndex(color);
        let quantizedColor = nesPalette[nesIndex];
        
        outputPixels[index] = vec4f(quantizedColor.rgb, inputColor.a);
      }
    `;
  }

  /**
   * Quantize colors to NES palette using GPU acceleration
   */
  async quantizeToNESPalette(
    imageData: Float32Array, 
    width: number, 
    height: number,
    options: {
      dithering?: boolean;
      paletteSubset?: 'background' | 'sprite' | 'full';
    } = {}
  ): Promise<Float32Array> {
    if (!this.acceleration.isEnabled || !this.acceleration.hybridContext) {
      return this.quantizeToNESPaletteCPU(imageData, width, height, options);
    }

    try {
      // Prepare NES palette for GPU
      const paletteSize = options.paletteSubset === 'background' ? 16 : 
                         options.paletteSubset === 'sprite' ? 16 : 52;
      
      const paletteData = new Float32Array(paletteSize * 4);
      for (let i = 0; i < paletteSize; i++) {
        const color = NES_PALETTE[i];
        paletteData[i * 4] = ((color >> 16) & 0xFF) / 255.0; // R
        paletteData[i * 4 + 1] = ((color >> 8) & 0xFF) / 255.0;  // G
        paletteData[i * 4 + 2] = (color & 0xFF) / 255.0;         // B
        paletteData[i * 4 + 3] = 1.0;                           // A
      }

      const results = await this.acceleration.hybridContext.runComputeShader(
        this.acceleration.colorQuantizationShader!,
        {
          inputPixels: imageData,
          nesPalette: paletteData,
          config: new Float32Array([
            width, 
            height, 
            paletteSize, 
            options.dithering ? 1.0 : 0.0
          ])
        }
      );

      console.log(`🎮 NES color quantization complete (${width}x${height}) using GPU`);
      return results.outputPixels as Float32Array;

    } catch (error) {
      console.warn('🔄 GPU quantization failed, falling back to CPU:', error);
      return this.quantizeToNESPaletteCPU(imageData, width, height, options);
    }
  }

  /**
   * CPU fallback for NES color quantization
   */
  private quantizeToNESPaletteCPU(
    imageData: Float32Array,
    width: number,
    height: number,
    options: { dithering?: boolean; paletteSubset?: string } = {}
  ): Float32Array {
    const output = new Float32Array(imageData.length);
    const paletteSize = options.paletteSubset === 'background' ? 16 : 
                       options.paletteSubset === 'sprite' ? 16 : 52;

    for (let i = 0; i < imageData.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      let r = imageData[i];
      let g = imageData[i + 1]; 
      let b = imageData[i + 2];
      const a = imageData[i + 3];

      // Apply dithering
      if (options.dithering) {
        const ditherPattern = [-0.5, 0.0, 0.5, 0.25];
        const patternIndex = (x % 2) + (y % 2) * 2;
        const dither = ditherPattern[patternIndex] * 0.1;
        
        r = Math.max(0, Math.min(1, r + dither));
        g = Math.max(0, Math.min(1, g + dither));
        b = Math.max(0, Math.min(1, b + dither));
      }

      // Find closest NES color
      let bestIndex = 0;
      let bestDistance = Infinity;

      for (let paletteIndex = 0; paletteIndex < paletteSize; paletteIndex++) {
        const nesColor = NES_PALETTE[paletteIndex];
        const pr = ((nesColor >> 16) & 0xFF) / 255.0;
        const pg = ((nesColor >> 8) & 0xFF) / 255.0;
        const pb = (nesColor & 0xFF) / 255.0;

        const distance = Math.sqrt(
          (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = paletteIndex;
        }
      }

      // Apply quantized color
      const quantizedColor = NES_PALETTE[bestIndex];
      output[i] = ((quantizedColor >> 16) & 0xFF) / 255.0;
      output[i + 1] = ((quantizedColor >> 8) & 0xFF) / 255.0;
      output[i + 2] = (quantizedColor & 0xFF) / 255.0;
      output[i + 3] = a;
    }

    return output;
  }

  /**
   * Sync NES memory region to GPU buffer
   */
  private async syncNESMemoryToGPU(regionName: string): Promise<void> {
    const region = this.acceleration.nesMemory.get(regionName);
    if (!region || !region.isDirty || !region.gpuBuffer) return;

    try {
      if (this.acceleration.contextType === 'webgpu') {
        const device = this.acceleration.hybridContext!.getActiveContext() as GPUDevice;
        const buffer = region.gpuBuffer as GPUBuffer;
        device.queue.writeBuffer(buffer, 0, region.buffer);
      } else {
        const gl = this.acceleration.hybridContext!.getActiveContext() as WebGL2RenderingContext | WebGLRenderingContext;
        const buffer = region.gpuBuffer as WebGLBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, region.buffer, gl.DYNAMIC_DRAW);
      }

      region.isDirty = false;
    } catch (error) {
      console.warn(`Failed to sync ${regionName} to GPU:`, error);
    }
  }

  /**
   * Get hybrid GPU context for external components
   */
  getHybridGPU(): HybridGPUContext | null {
    return this.acceleration.hybridContext || null;
  }

  /**
   * Get NES memory region
   */
  getNESMemory(regionName: string): NESMemoryRegion | null {
    return this.acceleration.nesMemory.get(regionName) || null;
  }

  /**
   * Check if GPU acceleration is available
   */
  isGPUEnabled(): boolean {
    return this.acceleration.isEnabled;
  }

  /**
   * Get current GPU context type
   */
  getContextType(): string {
    return this.acceleration.contextType;
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

// Export singleton instance
export const globalGPUManager = GlobalGPUManager.getInstance();
export type { NESMemoryRegion, GPUAcceleration };