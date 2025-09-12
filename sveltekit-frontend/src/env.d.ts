/// <reference types="vite/client" />

/**
 * Enhanced Vite Environment Variables
 * Production-ready typing for all environment configurations
 */
interface ImportMetaEnv {
  // Core Configuration  
  readonly OLLAMA_URL: string;
  readonly OLLAMA_MODEL: string;
  readonly OPENAI_API_KEY: string;
  readonly DATABASE_URL: string;
  readonly PUBLIC_APP_URL: string;
  
  // GPU Acceleration Settings
  readonly VITE_GPU_ACCELERATION: string;
  readonly VITE_WEBGPU_ENABLED: string;
  readonly VITE_NES_QUANTIZATION: string;
  readonly VITE_GPU_MEMORY_LIMIT: string;
  readonly VITE_PERFORMANCE_PROFILE: string;
  
  // Debug Configuration
  readonly VITE_GPU_DEBUG: string;
  readonly VITE_SHADER_DEBUG: string;
  
  // Telemetry and Analytics
  readonly VITE_TELEMETRY_ENABLED: string;
  readonly VITE_ANALYTICS_ENDPOINT: string;
  readonly VITE_PERFORMANCE_MONITORING: string;
  
  // Production Optimization
  readonly VITE_BUNDLE_ANALYZER: string;
  readonly VITE_SOURCE_MAPS: string;
  readonly VITE_MINIFICATION: string;
  
  // Nintendo Memory Architecture
  readonly VITE_CHR_ROM_SIZE: string;
  readonly VITE_CHR_ROM_BANKS: string;
  readonly VITE_L1_GPU_BUDGET: string;
  readonly VITE_L2_RAM_BUDGET: string;
  readonly VITE_L3_REDIS_BUDGET: string;
  
  // Advanced Features
  readonly VITE_VECTOR_QUANTIZATION: string;
  readonly VITE_ADAPTIVE_SCALING: string;
  readonly VITE_REAL_TIME_SYNC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extended global types for enhanced development experience
declare global {
  interface Window {
    // GPU Context Management
    __GPU_MANAGER__?: import('$lib/gpu/global-gpu-manager').GlobalGPUManager;
    __TELEMETRY__?: import('$lib/telemetry/event-bus').TelemetryEventBus;
    
    // Development Utilities
    __DEV_TOOLS__?: {
      showGPUStats: () => void;
      exportTelemetry: () => Promise<Blob>;
      resetMemoryBanks: () => void;
    };
    
    // Performance Monitoring
    __PERFORMANCE_OBSERVER__?: PerformanceObserver;
    __MEMORY_TRACKER__?: {
      l1GpuUsage: number;
      l2RamUsage: number; 
      l3RedisUsage: number;
    };
  }

  // Nintendo Memory Architecture Types
  namespace Nintendo {
    interface MemoryBank {
      id: number;
      size: number;
      used: number;
      available: number;
      type: 'L1_GPU' | 'L2_RAM' | 'L3_REDIS' | 'CHR_ROM' | 'PRG_ROM';
    }

    interface CHRROMBank {
      bankId: number;
      address: number;
      size: 0x1000; // 4KB per bank
      patternData: Uint8Array;
      isDirty: boolean;
    }
  }

  // Enhanced Telemetry Events
  namespace Telemetry {
    interface BaseEvent {
      timestamp: number;
      sessionId: string;
      userId?: string;
    }

    interface GPUEvent extends BaseEvent {
      type: 'gpu_usage' | 'context_switch' | 'memory_allocation';
      gpuUtilization: number;
      memoryUsed: number;
      temperature?: number;
    }

    interface PerformanceEvent extends BaseEvent {
      type: 'render_time' | 'api_latency' | 'cache_hit' | 'vector_encoding';
      duration: number;
      operation: string;
      success: boolean;
    }

    interface ErrorEvent extends BaseEvent {
      type: 'error' | 'warning' | 'critical';
      message: string;
      stack?: string;
      component: string;
    }
  }
}

export {};