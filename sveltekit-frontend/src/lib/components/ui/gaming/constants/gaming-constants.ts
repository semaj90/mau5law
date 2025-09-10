/**
 * Gaming UI Constants and Color Palettes
 * Authentic retro gaming colors and presets
 */

import type { NESColorPalette, SNESColorPalette, N64RenderingOptions } from '../types/gaming-types.js';

// NES Color Palette (hardware accurate)
export const NES_COLOR_PALETTE: NESColorPalette & {
  success: string;
  warning: string;
  error: string;
  info: string;
} = {
  background: [
    '#0f0f0f',  // Black
    '#7c7c7c',  // Dark gray
    '#bcbcbc',  // Light gray
    '#fcfcfc'   // White
  ],
  sprites: [
    '#f83800',  // Red
    '#3cbcfc',  // Blue
    '#92cc41',  // Green
    '#f7d51d'   // Yellow
  ],
  ui: [
    '#0f0f0f',  // Black
    '#fcfcfc',  // White
    '#7c7c7c',  // Dark gray
    '#bcbcbc'   // Light gray
  ],
  
  // Status colors (NES-compatible)
  success: '#92cc41',    // Green
  warning: '#f7d51d',    // Yellow
  error: '#f83800',      // Red
  info: '#3cbcfc'        // Blue
};

// SNES Color Palette (enhanced 16-bit)
export const SNES_COLOR_PALETTE: SNESColorPalette & {
  purple: string;
  orange: string;
  cyan: string;
  magenta: string;
  pink: string;
  lime: string;
  primaryGradient: string[];
  secondaryGradient: string[];
} = {
  background: [
    '#0f0f0f',  // Black
    '#7c7c7c',  // Dark gray
    '#bcbcbc',  // Light gray
    '#fcfcfc'   // White
  ],
  sprites: [
    '#f83800',  // Red
    '#3cbcfc',  // Blue
    '#92cc41',  // Green
    '#f7d51d'   // Yellow
  ],
  ui: [
    '#0f0f0f',  // Black
    '#fcfcfc',  // White
    '#7c7c7c',  // Dark gray
    '#bcbcbc'   // Light gray
  ],
  effects: [
    '#8b41fc',  // Purple
    '#fc9838',  // Orange
    '#38fcfc',  // Cyan
    '#fc38fc'   // Magenta
  ],
  // Additional 16-bit colors (preserved)
  purple: '#8b41fc',
  orange: '#fc9838', 
  cyan: '#38fcfc',
  magenta: '#fc38fc',
  pink: '#fc9cfc',
  lime: '#9cfc38',
  // Gradient definitions for SNES-style depth (preserved)
  primaryGradient: ['#3cbcfc', '#0084ff', '#0050cc'],
  secondaryGradient: ['#f7d51d', '#cc8800', '#996600']
};

// N64 Texture and Rendering Presets (Enhanced)
export const N64_TEXTURE_PRESETS = {
  // Low-poly optimized settings
  lowPoly: {
    textureQuality: 'low',
    enableBilinearFiltering: false,
    enableTrilinearFiltering: false,
    anisotropicLevel: 1,
    meshComplexity: 'low',
    materialType: 'basic',
    enableShadows: false,
    enableReflections: false,
    shadowMapSize: 256
  } as N64RenderingOptions,
  
  // Balanced quality for most components
  balanced: {
    // Required N64RenderingOptions properties
    textureQuality: 'medium',
    enableBilinearFiltering: true,
    enableTrilinearFiltering: false,
    anisotropicLevel: 4,
    meshComplexity: 'medium',
    materialType: 'phong',
    enableShadows: true,
    enableReflections: false,
    shadowMapSize: 512,
    // Additional gaming-specific properties
    enableAntiAliasing: true,
    enableTextureFiltering: true,
    enableMipMapping: false,
    polygonCount: 'medium' as const,
    enableFog: true,
    fogColor: '#202020',
    fogDensity: 0.05,
    enableZBuffer: true,
    depthTesting: true
  } as N64RenderingOptions & {
    enableAntiAliasing: boolean;
    enableTextureFiltering: boolean;
    enableMipMapping: boolean;
    polygonCount: 'low' | 'medium' | 'high' | 'ultra';
    enableFog: boolean;
    fogColor: string;
    fogDensity: number;
    enableZBuffer: boolean;
    depthTesting: boolean;
  },
  
  // High quality for hero components
  highQuality: {
    textureQuality: 'high',
    enableBilinearFiltering: true,
    enableTrilinearFiltering: true,
    anisotropicLevel: 16,
    meshComplexity: 'high',
    materialType: 'pbr',
    enableShadows: true,
    enableReflections: true,
    shadowMapSize: 1024
  } as N64RenderingOptions,
  
  // New ultra-enhanced preset for modern hardware
  ultraEnhanced: {
    textureQuality: 'ultra',
    enableBilinearFiltering: true,
    enableTrilinearFiltering: true,
    anisotropicLevel: 16,
    meshComplexity: 'ultra',
    materialType: 'pbr',
    enableShadows: true,
    enableReflections: true,
    shadowMapSize: 2048
  } as N64RenderingOptions
};

// Responsive gaming breakpoints
export const GAMING_BREAKPOINTS = {
  // Screen sizes that impact gaming component rendering
  handheld: '(max-width: 320px)',     // Game Boy size
  nes: '(max-width: 480px)',          // NES TV resolution equivalent
  snes: '(max-width: 768px)',         // SNES enhanced resolution
  n64: '(min-width: 769px)',          // N64 and above
  
  // Performance-based breakpoints
  lowPerformance: '(max-device-memory: 2)',
  mediumPerformance: '(max-device-memory: 4)',
  highPerformance: '(min-device-memory: 5)'
};

// Gaming era specifications with advanced memory optimization
export const GAMING_ERA_SPECS = {
  '8bit': {
    maxColors: 25,        // NES on-screen limit
    totalColors: 64,      // NES total palette
    resolution: { width: 256, height: 240 },
    refreshRate: 60,
    audioChannels: 4,
    memoryKB: 2,
    cpuMhz: 1.79,
    // 8-bit caching with decompiled auto-encoder SOM
    memoryArchitecture: {
      chrRom: 8192,       // Pattern tables (8KB)
      prgRom: 32768,      // Program ROM (32KB)
      vram: 2048,         // Video RAM (2KB)
      oam: 256,           // Object Attribute Memory (256 bytes)
      palette: 32,        // Palette RAM (32 bytes)
      autoEncoderCache: 1024, // SOM clustering cache (1KB)
      lodScalingBuffer: 512   // DNN LOD buffer (512 bytes)
    },
    somClustering: {
      enabled: true,
      gridSize: [16, 16],   // 16x16 SOM grid for 8-bit patterns
      learningRate: 0.1,
      neighborhoodRadius: 2,
      maxIterations: 1000,
      compressionRatio: 4.0  // 4:1 compression via clustering
    }
  },
  
  '16bit': {
    maxColors: 256,       // SNES enhanced
    totalColors: 32768,   // SNES total palette
    resolution: { width: 512, height: 448 },
    refreshRate: 60,
    audioChannels: 8,
    memoryKB: 128,
    cpuMhz: 3.58,
    // Enhanced 16-bit memory with mode 7 scaling
    memoryArchitecture: {
      vram: 65536,        // Video RAM (64KB)
      cgram: 512,         // Color Generator RAM (512 bytes)
      oam: 544,           // Object Attribute Memory (544 bytes)
      wram: 131072,       // Work RAM (128KB)
      autoEncoderCache: 8192, // Enhanced SOM cache (8KB)
      lodScalingBuffer: 4096, // Advanced DNN LOD (4KB)
      mode7Buffer: 2048   // Mode 7 transformation buffer (2KB)
    },
    somClustering: {
      enabled: true,
      gridSize: [32, 32],   // 32x32 SOM grid for 16-bit complexity
      learningRate: 0.05,
      neighborhoodRadius: 3,
      maxIterations: 2000,
      compressionRatio: 6.0  // 6:1 compression for 16-bit
    }
  },
  
  'n64': {
    maxColors: 16777216,  // 24-bit color
    totalColors: 16777216,
    resolution: { width: 640, height: 480, maxWidth: 1280, maxHeight: 720 }, // N64 720p support
    refreshRate: 60,
    audioChannels: 64,
    memoryMB: 4,
    cpuMhz: 93.75,
    // N64 4MB RAM achieving 720p through advanced optimization
    memoryArchitecture: {
      rdram: 4194304,     // Rambus DRAM (4MB total)
      textureCache: 1048576, // Texture cache (1MB)
      frameBuffer: 921600,   // 720p framebuffer (900KB)
      zBuffer: 921600,       // Z-buffer for 720p (900KB)
      audioBuffer: 262144,   // Audio buffer (256KB)
      autoEncoderCache: 65536, // Advanced SOM cache (64KB)
      lodScalingBuffer: 32768, // DNN LOD auto-scaling (32KB)
      compressionBuffer: 16384 // Real-time texture compression (16KB)
    },
    somClustering: {
      enabled: true,
      gridSize: [64, 64],   // 64x64 SOM grid for 3D complexity
      learningRate: 0.01,
      neighborhoodRadius: 4,
      maxIterations: 5000,
      compressionRatio: 8.0, // 8:1 compression for 3D textures
      realTimeOptimization: true,
      dynamicLOD: true
    },
    // DNN-based Level of Detail auto-scaling
    dnnLodSystem: {
      enabled: true,
      neuralLayers: [256, 128, 64, 32], // DNN architecture
      activationFunction: 'relu',
      lodLevels: 4,         // 4 LOD levels (full, half, quarter, eighth)
      distanceThresholds: [10, 25, 50, 100], // Distance-based switching
      adaptiveScaling: true, // Real-time adaptation
      memoryThreshold: 0.85  // Switch LOD at 85% memory usage
    }
  }
};

// CSS Custom Properties for theming
export const GAMING_CSS_VARS = {
  // NES Era
  '--nes-black': NES_COLOR_PALETTE.background[0],
  '--nes-white': NES_COLOR_PALETTE.background[3],
  '--nes-dark-gray': NES_COLOR_PALETTE.background[1],
  '--nes-light-gray': NES_COLOR_PALETTE.background[2],
  '--nes-red': NES_COLOR_PALETTE.sprites[0],
  '--nes-blue': NES_COLOR_PALETTE.sprites[1],
  '--nes-green': NES_COLOR_PALETTE.sprites[2],
  '--nes-yellow': NES_COLOR_PALETTE.sprites[3],
  
  // SNES Era additions
  '--snes-purple': SNES_COLOR_PALETTE.purple,
  '--snes-orange': SNES_COLOR_PALETTE.orange,
  '--snes-cyan': SNES_COLOR_PALETTE.cyan,
  '--snes-magenta': SNES_COLOR_PALETTE.magenta,
  '--snes-pink': SNES_COLOR_PALETTE.pink,
  '--snes-lime': SNES_COLOR_PALETTE.lime,
  
  // Component sizing (pixel-perfect)
  '--gaming-unit': '8px',          // Base 8px grid
  '--nes-border-width': '2px',     // NES standard border
  '--snes-border-width': '1px',    // SNES refined border
  '--n64-border-radius': '4px',    // N64 rounded corners
  
  // Typography
  '--gaming-font-8bit': '"Press Start 2P", monospace',
  '--gaming-font-16bit': '"Orbitron", sans-serif',
  '--gaming-font-n64': '"Rajdhani", sans-serif',
  
  // Animation timings
  '--gaming-transition-instant': '0ms',
  '--gaming-transition-fast': '100ms',
  '--gaming-transition-normal': '200ms',
  '--gaming-transition-slow': '400ms'
};

// Component size mappings
export const GAMING_COMPONENT_SIZES = {
  small: {
    padding: 'calc(var(--gaming-unit) * 1)',
    fontSize: '10px',
    minHeight: 'calc(var(--gaming-unit) * 4)'
  },
  
  medium: {
    padding: 'calc(var(--gaming-unit) * 2)', 
    fontSize: '12px',
    minHeight: 'calc(var(--gaming-unit) * 6)'
  },
  
  large: {
    padding: 'calc(var(--gaming-unit) * 3)',
    fontSize: '14px', 
    minHeight: 'calc(var(--gaming-unit) * 8)'
  },
  
  xl: {
    padding: 'calc(var(--gaming-unit) * 4)',
    fontSize: '16px',
    minHeight: 'calc(var(--gaming-unit) * 10)'
  }
};

// Retro effect presets
export const RETRO_EFFECTS = {
  scanlines: {
    name: 'Scanlines',
    cssFilter: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.3) 2px, rgba(0,0,0,.3) 4px)',
    performance: 'low'
  },
  
  crt: {
    name: 'CRT Monitor',
    cssFilter: 'contrast(1.2) brightness(1.1) saturate(1.3)',
    borderRadius: '10px',
    boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.3)',
    performance: 'medium'
  },
  
  pixelate: {
    name: 'Pixel Perfect',
    imageRendering: 'pixelated',
    msInterpolationMode: 'nearest-neighbor',
    performance: 'low'
  },
  
  glitch: {
    name: 'Digital Glitch',
    animation: 'glitch 2s infinite',
    performance: 'high'
  }
};

// Gaming sound effect mappings
export const GAMING_SOUND_EFFECTS = {
  '8bit': {
    buttonPress: '/sounds/8bit/button-press.wav',
    menuMove: '/sounds/8bit/menu-move.wav',
    error: '/sounds/8bit/error.wav',
    success: '/sounds/8bit/success.wav'
  },
  
  '16bit': {
    buttonPress: '/sounds/16bit/button-press.wav', 
    menuMove: '/sounds/16bit/menu-move.wav',
    error: '/sounds/16bit/error.wav',
    success: '/sounds/16bit/success.wav'
  },
  
  'n64': {
    buttonPress: '/sounds/n64/button-press.wav',
    menuMove: '/sounds/n64/menu-move.wav', 
    error: '/sounds/n64/error.wav',
    success: '/sounds/n64/success.wav'
  }
};

// Enhanced bit-level caching architecture with multi-tier storage
export const ENHANCED_MEMORY_CACHING = {
  // Tier 1: JavaScript Redis-style in-memory cache
  redisCache: {
    enabled: true,
    maxMemoryMB: 64,          // 64MB Redis-style cache
    evictionPolicy: 'lru',    // Least Recently Used
    compressionEnabled: true,
    bitPackingEnabled: true,  // Pack 8-bit values into single bytes
    keyExpiration: 3600,      // 1 hour cache expiration
    hashSlots: 16384,         // Redis cluster-style hash slots
    pipelineBufferSize: 1024, // Pipeline commands for efficiency
    clusterNodes: 3           // Simulate Redis cluster
  },

  // Tier 2: Loki.js document store for structured game data
  lokiCache: {
    enabled: true,
    autoSave: true,
    autoSaveInterval: 10000,  // Auto-save every 10 seconds
    serializationMethod: 'normal',
    throttledSaves: true,
    collections: {
      sprites: {
                indices: ['id', 'type', 'era'],
                binary: true,         // Binary indices for speed
                adaptiveBinaryIndices: true,
                cloneObjects: false,  // Reference-based for memory efficiency
                disableChangesApi: false,
                ttl: 300000          // 5 minute TTL
      },
      textures: {
        indices: ['hash', 'compression'],
        binary: true,
        clone: false,
        unique: ['hash'],
        ttl: 600000             // 10 minute TTL for textures
      },
      soundBuffers: {
        indices: ['format', 'era'],
        binary: true,
        adaptiveBinaryIndices: true,
        ttl: 900000             // 15 minute TTL for audio
      }
    },
    // Enhanced bit-level compression
    compression: {
      enabled: true,
      algorithm: 'lz-string',   // Fast JavaScript compression
      threshold: 1024,          // Compress data > 1KB
      level: 6                  // Compression level (1-9)
    }
  },

  // Tier 3: WebGPU vertex buffers for graphics data
  webgpuCache: {
    enabled: true,
    deviceLimits: {
      maxBufferSize: 268435456,    // 256MB max buffer
      maxStorageBufferBindingSize: 134217728, // 128MB storage buffers
      maxVertexBuffers: 8,
      maxVertexAttributes: 16,
      maxBindGroups: 4
    },
    bufferTypes: {
      vertex: {
        usage: 'VERTEX | COPY_DST',
        size: 16777216,           // 16MB vertex buffer
        format: 'float32x3',      // Position data
        cacheDuration: 1800000    // 30 minutes
      },
      texture: {
        usage: 'TEXTURE_BINDING | COPY_DST',
        size: 67108864,           // 64MB texture buffer  
        format: 'rgba8unorm',     // Standard RGBA
        mipmaps: true,
        cacheDuration: 3600000    // 1 hour
      },
      uniform: {
        usage: 'UNIFORM | COPY_DST',
        size: 65536,              // 64KB uniform buffer
        format: 'bytes',
        cacheDuration: 300000     // 5 minutes
      },
      storage: {
        usage: 'STORAGE | COPY_DST | COPY_SRC',
        size: 134217728,          // 128MB storage buffer
        format: 'bytes',
        readWrite: true,
        cacheDuration: 7200000    // 2 hours
      }
    },
    // Advanced compression and optimization
    optimization: {
      vertexCompression: true,    // Compress vertex data
      textureCompression: {
        enabled: true,
        formats: ['bc1', 'bc3', 'bc7'], // GPU texture compression
        qualityLevel: 0.8
      },
      meshOptimization: true,     // Optimize mesh data
      cullingEnabled: true,       // Frustum culling
      lodBias: 0.5               // LOD bias for distance culling
    }
  },

  // Cross-tier synchronization and bit-level optimization
  synchronization: {
    enabled: true,
    strategy: 'write-through',    // Write to all tiers simultaneously
    consistencyLevel: 'eventual', // Eventual consistency across tiers
    bitLevelPacking: {
      enabled: true,
      packingRatio: 8,           // Pack 8 boolean values per byte
      alignmentBytes: 4,         // 4-byte alignment for GPU
      endianness: 'little'       // Little-endian for x86/ARM
    },
    prefetching: {
      enabled: true,
      distance: 2,               // Prefetch 2 levels ahead
      probability: 0.7,          // 70% probability threshold
      maxPrefetchMB: 16          // Max 16MB prefetch buffer
    }
  },

  // Performance monitoring and adaptive tuning
  performance: {
    monitoring: true,
    metrics: {
      hitRatio: 0.0,            // Cache hit ratio (updated runtime)
      evictionRate: 0.0,        // Cache eviction rate
      compressionRatio: 0.0,    // Compression efficiency
      memoryPressure: 0.0,      // Memory pressure indicator
      gpuUtilization: 0.0       // GPU memory utilization
    },
    adaptiveTuning: {
      enabled: true,
      adjustmentInterval: 30000, // Adjust every 30 seconds
      aggressiveness: 0.5,       // Tuning aggressiveness (0-1)
      thresholds: {
        lowMemory: 0.8,          // Switch to aggressive mode at 80%
        criticalMemory: 0.95,    // Emergency cleanup at 95%
        highEviction: 0.1        // Optimize if eviction > 10%
      }
    }
  }
};

// Predictive UI Analytics with YOLO and SSR Recognition - LOD Optimized for Local LLM Processing
export const PREDICTIVE_UI_ANALYTICS = {
  // YOLO-based object detection for UI element recognition - Local LLM optimized
  yoloDetection: {
    enabled: true,
    modelVersion: 'YOLOv8n',      // Nano version for local LLM speed
    inferenceEngine: 'webgpu',    // WebGPU for local GPU acceleration
    localLLMOptimization: {
      quantization: 'int8',       // 8-bit quantization for speed
      pruning: 0.3,               // 30% model pruning
      distillation: true,         // Knowledge distillation
      tensorOptimization: true,   // Tensor operation optimization
      memoryMapping: 'mmap',      // Memory mapping for large models
      batchingStrategy: 'dynamic' // Dynamic batching for efficiency
    },
    inputSize: [224, 224],        // Reduced for local processing
    confidenceThreshold: 0.6,     // Higher threshold for accuracy
    nmsThreshold: 0.4,            
    maxDetections: 50,            // Reduced for local LLM efficiency
    classLabels: [
      'button', 'input', 'dropdown', 'modal', 'sidebar', 'card',
      'menu', 'icon', 'text', 'link', 'form', 'chart', 'legal_document'
    ],
    framerate: 15,                // Reduced for local LLM processing
    batchSize: 4,                 // Optimized batch size for local GPU
    lodLevels: {
      high: { inputSize: [224, 224], confidence: 0.8 },
      medium: { inputSize: [160, 160], confidence: 0.6 },
      low: { inputSize: [96, 96], confidence: 0.4 }
    }
  },

  // Local LLM integration for intelligent UI prediction
  localLLMProcessing: {
    enabled: true,
    model: 'gemma3:legal-latest', // Local Gemma 3 legal model for specialized legal AI
    quantization: 'q4_k_m',       // 4-bit quantization for efficiency
    contextWindow: 2048,          // 2K context for UI analysis
    maxTokens: 512,               // Max response tokens
    temperature: 0.3,             // Low temperature for consistent predictions
    topP: 0.9,                    // Nucleus sampling
    repeatPenalty: 1.1,           // Reduce repetition
    streaming: true,              // Streaming responses
    lodOptimization: {
      enabled: true,
      complexityThreshold: 0.7,   // Switch to low LOD at 70% complexity
      memoryThreshold: 0.8,       // Memory pressure threshold
      adaptiveTokens: {
        high: 512,                // High detail responses
        medium: 256,              // Medium detail responses  
        low: 128                  // Low detail responses
      },
      promptCompression: true,    // Compress prompts for efficiency
      cacheEnabled: true,         // Cache frequent predictions
      parallelProcessing: false   // Sequential for memory efficiency
    }
  },

  // OCR tensor processing integration
  ocrTensorProcessing: {
    enabled: true,
    tensorBackend: 'webgpu',      // WebGPU tensor processing
    ocrModel: 'tesseract-wasm',   // Tesseract WebAssembly
    preprocessingPipeline: {
      deskewing: true,            // Automatic deskewing
      denoising: true,            // Noise reduction
      contrastEnhancement: true,  // Contrast enhancement
      resolutionUpscaling: false, // Disable for performance
      binarization: 'adaptive'    // Adaptive thresholding
    },
    legalDocumentOptimization: {
      enabled: true,
      fontRecognition: true,      // Legal document font detection
      layoutAnalysis: true,       // Document layout analysis
      sectionDetection: true,     // Detect legal sections
      confidenceFiltering: 0.8,   // High confidence for legal text
      languageModel: 'legal-en',  // Legal English language model
      postProcessing: {
        spellCorrection: true,    // Legal spell correction
        entityRecognition: true,  // Legal entity recognition
        citationDetection: true   // Legal citation detection
      }
    }
  }
};