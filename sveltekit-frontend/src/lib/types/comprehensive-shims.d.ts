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
    interface FuseOptions<T> {
      keys?: string[];
      threshold?: number;
      indices?: any;
      key?: string;
      value?: any;
    }
  }
  // LokiDB fixes
  interface LokiIndexedAdapter {
    memoryCache?: any;
    insert?(data: any): any;
    findOne?(query: any): any;
    find?(query: any): any;
    remove?(query: any): any;
    clear?(): any;
  }
  // Canvas state fixes
  interface CanvasState {
    isContextLost?: boolean;
    reset?(): void;
    restore?(): void;
    save?(): void;
    fabricJSON?: any;
    metadata?: any;
  }
  interface InteractiveCanvasState extends CanvasState {
    nodes?: any[];
    connections?: any[];
    viewport?: any;
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
  interface ActorOptions<T> {
    services?: any;
  }
  // RabbitMQ fixes
  interface RabbitMQService {
    connected: boolean;
    connect?: () => Promise<void>;
    disconnect?: () => Promise<void>;
    consume?: (queue: string, handler: Function) => Promise<void>;
  }
  // NATS fixes
  interface NATSSubscription {
    unsubscribe(): void;
    [Symbol.asyncIterator](): AsyncIterator<any>;
  }
  // Gemma service fixes
  interface GemmaEmbeddingService {
    defaultModel?: string;
  }
  // Redis fixes
  namespace IORedis {
    interface Redis {
      hset(_key: string, field: string, value: any): Promise<number>;
    }
  }
  // Training service fixes
  interface QLoRAReinforcementTrainer {
    isTraining?: boolean;
    isTraaining?: boolean; // Keep typo for backwards compatibility
  }
  // WASM fixes
  interface VectorOpsModule {
    (input: any): any;
  }
}
// Module augmentations
declare module '$lib/server/messaging/rabbitmq-service.js' {
  export const QUEUES: Record<string, string>;
}
declare module '$lib/utils/webgpu-array-utils' {
  export function adaptiveQuantization(data: any): any;
}
declare module './webgpu-rag-service' {
  export interface GPUSearchMetrics {
    searchTime: number;
    resultCount: number;
  }
}
export {}
