/**
 * Enhanced GPU Types and Validation
 * Production-ready GPU abstraction with Nintendo memory architecture
 */

export type GPUBackend = 'webgpu' | 'webgl2' | 'webgl1' | 'cpu';

// Enhanced performance profiling
export type PerformanceProfile = 'auto' | 'mobile' | 'desktop' | 'high-end';
export type AdaptiveScalingMode = 'conservative' | 'balanced' | 'aggressive' | 'disabled';

// Vector encoding types
export type VectorDimensions = 128 | 256 | 512 | 768 | 1024 | 1536 | 2048;
export type QuantizationLevel = 'none' | 'int8' | 'int4' | 'binary';

// Nintendo Memory Bank Types (enhanced)
export type MemoryBankType = 'L1_GPU' | 'L2_RAM' | 'L3_REDIS' | 'CHR_ROM' | 'PRG_ROM' | 'OAM' | 'PALETTE';

export interface NintendoMemoryBudget {
  l1GpuBudget: number;     // VRAM budget (bytes)
  l2RamBudget: number;     // System RAM budget (bytes)  
  l3RedisBudget: number;   // Redis cache budget (bytes)
  chrRomSize: number;      // CHR-ROM total size (bytes)
  chrRomBanks: number;     // Number of CHR-ROM banks
}

export interface BackendCapabilities {
  backend: GPUBackend;
  supportsCompute: boolean;
  supportsFloat32: boolean;
  supportsInteger: boolean;
  maxTextureSize: number;
  maxBufferSize: number;
  memoryBudget: number;
  maxWorkgroupSize?: number;
}

export interface ShaderBundle {
  name: string;
  backend: GPUBackend;
  vertex?: string;
  fragment?: string;
  compute?: string;
  // Optional metadata to aid selection / logging
  entryPoint?: string;
  defines?: Record<string, string | number | boolean>;
}

export interface MultiBackendShaderResources {
  webgpu?: Omit<ShaderBundle, 'backend'>;
  webgl2?: Omit<ShaderBundle, 'backend'>;
  webgl1?: Omit<ShaderBundle, 'backend'>;
  cpu?: Omit<ShaderBundle, 'backend'>;
}

export interface GPUContextFactoryConfig {
  preferWebGPU: boolean;
  allowWebGL2: boolean;
  allowWebGL1: boolean;
  requireCompute: boolean;
  nesMemoryOptimization: boolean;
  lodSystemIntegration: boolean;
  memoryLimit: number; // bytes
  performanceProfile: 'auto' | 'mobile' | 'desktop' | 'high-end';
  enableDebug: boolean;
  enableShaderDebug: boolean;
  gracefulFallback: boolean;
  fallbackToSoftware: boolean;
}

export interface MemoryUsageTracker {
  allocatedBytes: number;
  peakBytes: number;
  allocations: number;
  deallocations: number;
}

export interface TrackedBuffer {
  id: string;
  size: number;
  backend: GPUBackend;
  resource: unknown;
}

export function normalizePerformanceProfile(input: string | undefined): 'auto' | 'mobile' | 'desktop' | 'high-end' {
  switch ((input || '').toLowerCase()) {
    case 'mobile': return 'mobile';
    case 'desktop': return 'desktop';
    case 'high-end':
    case 'hi-end':
    case 'highend': return 'high-end';
    default: return 'auto';
  }
}

export function clampMemoryMB(value: number, min = 64, max = 8192): number {
  if (Number.isNaN(value) || value <= 0) return 512;
  return Math.min(Math.max(value, min), max);
}

// Enhanced interfaces for production use

export interface AdaptiveGPUConfig extends GPUContextFactoryConfig {
  adaptiveScaling: AdaptiveScalingMode;
  memoryBudget: NintendoMemoryBudget;
  vectorQuantization: QuantizationLevel;
  realTimeMetrics: boolean;
  performanceThresholds: {
    maxRenderTime: number;    // milliseconds
    maxMemoryUsage: number;   // percentage 0-100
    maxTemperature: number;   // celsius
  };
}

export interface VectorEncodingConfig {
  dimensions: VectorDimensions;
  quantization: QuantizationLevel;
  compressionTarget: number;   // 0-1 ratio
  adaptiveDimensions: boolean;
  batchSize: number;
}

export interface GPUPerformanceMetrics {
  renderTime: number;         // milliseconds
  memoryUsage: number;        // bytes
  gpuUtilization: number;     // percentage 0-100
  temperature: number;        // celsius
  powerConsumption: number;   // watts
  contextSwitches: number;
  frameRate: number;          // fps
  lastMeasurement: number;    // timestamp
}

export interface MemoryBankStatus {
  type: MemoryBankType;
  allocated: number;          // bytes
  used: number;              // bytes
  available: number;         // bytes
  fragmentation: number;     // percentage 0-100
  bankSwitches: number;      // Nintendo-style bank switches
}

// Advanced validation functions

export function validateVectorDimensions(dimensions: number): VectorDimensions {
  const validDimensions: VectorDimensions[] = [128, 256, 512, 768, 1024, 1536, 2048];
  const closest = validDimensions.reduce((prev, curr) => 
    Math.abs(curr - dimensions) < Math.abs(prev - dimensions) ? curr : prev
  );
  return closest;
}

export function calculateOptimalQuantization(
  dimensions: VectorDimensions, 
  memoryBudget: number
): QuantizationLevel {
  const memoryPerVector = {
    'none': dimensions * 4,   // float32
    'int8': dimensions * 1,   // int8
    'int4': dimensions * 0.5, // int4
    'binary': dimensions / 8  // 1 bit per dimension
  };

  for (const [level, memory] of Object.entries(memoryPerVector)) {
    if (memory <= memoryBudget) {
      return level as QuantizationLevel;
    }
  }
  
  return 'binary'; // Most aggressive if nothing else fits
}

export function adaptiveScalingDecision(
  metrics: GPUPerformanceMetrics,
  thresholds: AdaptiveGPUConfig['performanceThresholds'],
  mode: AdaptiveScalingMode
): {
  shouldScale: boolean;
  recommendedDimensions: VectorDimensions;
  recommendedQuantization: QuantizationLevel;
  reason: string;
} {
  if (mode === 'disabled') {
    return {
      shouldScale: false,
      recommendedDimensions: 768,
      recommendedQuantization: 'none',
      reason: 'Adaptive scaling disabled'
    };
  }

  const isOverThreshold = 
    metrics.renderTime > thresholds.maxRenderTime ||
    (metrics.memoryUsage / (8 * 1024 * 1024 * 1024)) * 100 > thresholds.maxMemoryUsage ||
    metrics.temperature > thresholds.maxTemperature;

  if (!isOverThreshold) {
    return {
      shouldScale: false,
      recommendedDimensions: 768,
      recommendedQuantization: 'none',
      reason: 'Performance within thresholds'
    };
  }

  // Scaling recommendations based on mode
  const scalingStrategies = {
    'conservative': { dimensions: 512 as VectorDimensions, quantization: 'int8' as QuantizationLevel },
    'balanced': { dimensions: 256 as VectorDimensions, quantization: 'int4' as QuantizationLevel },
    'aggressive': { dimensions: 128 as VectorDimensions, quantization: 'binary' as QuantizationLevel }
  };

  const strategy = scalingStrategies[mode] || scalingStrategies.balanced;

  return {
    shouldScale: true,
    recommendedDimensions: strategy.dimensions,
    recommendedQuantization: strategy.quantization,
    reason: `Performance threshold exceeded (${mode} scaling)`
  };
}

export function validateNintendoMemoryBudget(budget: Partial<NintendoMemoryBudget>): NintendoMemoryBudget {
  return {
    l1GpuBudget: clampMemoryMB(budget.l1GpuBudget || 1048576) * 1024, // Convert MB to bytes
    l2RamBudget: clampMemoryMB(budget.l2RamBudget || 2097152) * 1024,
    l3RedisBudget: clampMemoryMB(budget.l3RedisBudget || 1048576) * 1024,
    chrRomSize: Math.max(budget.chrRomSize || 32768, 8192),  // Minimum 8KB CHR-ROM
    chrRomBanks: Math.max(budget.chrRomBanks || 4, 1)        // Minimum 1 bank
  };
}

// Utility type guards

export function isValidGPUBackend(backend: string): backend is GPUBackend {
  return ['webgpu', 'webgl2', 'webgl1', 'cpu'].includes(backend);
}

export function isValidPerformanceProfile(profile: string): profile is PerformanceProfile {
  return ['auto', 'mobile', 'desktop', 'high-end'].includes(profile);
}

export function isValidQuantizationLevel(level: string): level is QuantizationLevel {
  return ['none', 'int8', 'int4', 'binary'].includes(level);
}
