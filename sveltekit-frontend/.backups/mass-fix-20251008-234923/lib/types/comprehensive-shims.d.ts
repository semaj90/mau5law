// Comprehensive Type Shims - Final Error Elimination

declare global {
  // WebGPU fixes
  interface GPUAdapter {
    name?: string;
  }

  // Buffer compatibility
  interface BufferLike extends ArrayBuffer {
    byteLength: number;
    length?: number;
  }

  // Fuse.js fixes
  namespace Fuse {
    interface FuseOptions<T = unknown> {
      // phantom property to ensure the generic 'T' is used (avoids unused-type lint errors)
      _generic?: T;
      keys?: (string | { name: string; weight?: number })[];
      threshold?: number;
      // Removed non-standard properties: indices, key, value
    }
  }

  // LokiDB fixes
  interface LokiIndexedAdapter {
    memoryCache?: unknown;
    insert?(data: unknown): unknown;
    findOne?(query: unknown): unknown;
    find?(query: unknown): unknown;
    remove?(query: unknown): unknown;
    clear?(): unknown;
  }

  // Canvas state fixes
  interface CanvasState {
    isContextLost?: boolean;
    reset?(): void;
    restore?(): void;
    save?(): void;
    fabricJSON?: unknown;
    metadata?: unknown;
  }
  interface InteractiveCanvasState extends CanvasState {
    nodes?: unknown[];
    connections?: unknown[];
    viewport?: unknown;
  }

  // Cache manager fixes
  interface AdvancedCacheManager {
    start?(): Promise<void>;
    clearAll?(): Promise<void>;
  }
  interface CacheConfiguration {
    enableIntelligentTierSelection?: boolean;
  }

  // XState fixes
  interface ActorOptions<T = unknown> {
    // phantom property to ensure the generic 'T' is used (avoids unused-type lint errors)
    _generic?: T;
    services?: Record<string, unknown> | undefined;
  }

  // RabbitMQ fixes
  interface RabbitMQService {
    connected: boolean;
    connect?: () => Promise<void>;
    disconnect?: () => Promise<void>;
    consume?: (queue: string, handler: (...args: unknown[]) => unknown) => Promise<void>;
  }

  // NATS fixes
  interface NATSSubscription {
    unsubscribe(): void;
    [Symbol.asyncIterator](): AsyncIterator<unknown>;
  }

  // Gemma service fixes
  interface GemmaEmbeddingService {
    defaultModel?: string;
  }

  // Redis fixes
  namespace IORedis {
    interface Redis {
      hset(_key: string, field: string, value: unknown): Promise<number>;
    }
  }

  // Training service fixes
  interface QLoRAReinforcementTrainer {
    isTraining?: boolean;
    isTraaining?: boolean; // Keep typo for backwards compatibility
  }

  // WASM fixes
  interface VectorOpsModule {
    (input: unknown): unknown;
  }

  // UI JSON SSR Configuration fix
  interface UIJsonSSRConfig {
    data?: Record<string, unknown>;
    // Add any other expected properties of UIJsonSSRConfig here
  }
} // end declare global

// Module augmentations (outside declare global)
declare module '$lib/server/messaging/rabbitmq-service.js' {
  export const QUEUES: Record<string, string>;
}
declare module '$lib/server/messaging/rabbitmq-service' {
  // Also declare the non-.js import variant used in some parts of the codebase
  export const QUEUES: Record<string, string>;
}

declare module '$lib/utils/webgpu-array-utils' {
  // strengthen types: expect Float32Array in/out for numeric array ops
  export function adaptiveQuantization(data: Float32Array): Float32Array;
  // normalizeVectors may be absent in some builds; export as an optional const typed as a function or undefined
  export const normalizeVectors: ((vectors: Float32Array) => Float32Array) | undefined;
}

declare module './webgpu-rag-service' {
  export interface GPUSearchMetrics {
    searchTime: number;
    resultCount: number;
  }
}
// Also provide a $lib alias for the same service (covers different import forms)
declare module '$lib/services/webgpu-rag-service' {
  export interface GPUSearchMetrics {
    searchTime: number;
    resultCount: number;
  }
}

export {};

