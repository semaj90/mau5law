/**
 * XState GPU Memory Management Orchestration for TensorRT Q4_K_M
 * Manages RTX 3060 Ti VRAM (8GB) with 11.8B Gemma3-Legal model
 */

import { createMachine, assign, interpret } from 'xstate';

// GPU Memory Configuration for RTX 3060 Ti + Q4_K_M
const GPU_MEMORY_CONFIG = {
  total_vram_gb: 8,
  q4km_model_gb: 5.9,        // 11.8B model with Q4_K_M quantization
  available_gb: 2.1,         // Remaining for operations
  embedding_cache_mb: 512,   // 512D embeddings cache
  tensorrt_workspace_gb: 1.5, // TensorRT optimization workspace
} as const;

// Memory States for GPU orchestration
type GPUMemoryContext = {
  allocated_memory: number;
  model_loaded: boolean;
  cache_size: number;
  inference_active: boolean;
  memory_pressure: 'low' | 'medium' | 'high' | 'critical';
  last_gc_timestamp: number;
  active_requests: number;
  tensorrt_engine_ready: boolean;
};

// Events for GPU memory management
type GPUMemoryEvent =
  | { type: 'LOAD_MODEL'; model_size_gb: number }
  | { type: 'START_INFERENCE'; request_id: string }
  | { type: 'COMPLETE_INFERENCE'; request_id: string }
  | { type: 'MEMORY_PRESSURE'; level: 'high' | 'critical' }
  | { type: 'GARBAGE_COLLECT' }
  | { type: 'CACHE_EMBEDDINGS'; size_mb: number }
  | { type: 'TENSORRT_ENGINE_READY' }
  | { type: 'HEALTH_CHECK' };

// XState GPU Memory Management Machine
export const gpuMemoryMachine = createMachine<GPUMemoryContext, GPUMemoryEvent>({
  id: 'gpuMemoryOrchestration',
  initial: 'initializing',

  context: {
    allocated_memory: 0,
    model_loaded: false,
    cache_size: 0,
    inference_active: false,
    memory_pressure: 'low',
    last_gc_timestamp: 0,
    active_requests: 0,
    tensorrt_engine_ready: false,
  },

  states: {
    initializing: {
      entry: 'logInitialization',
      always: {
        target: 'idle',
        actions: 'initializeGPUMemory'
      }
    },

    idle: {
      entry: 'logIdleState',
      on: {
        LOAD_MODEL: {
          target: 'loading_model',
          cond: 'hasSpaceForModel',
          actions: 'reserveModelMemory'
        },
        TENSORRT_ENGINE_READY: {
          target: 'ready_for_inference',
          actions: 'markTensorRTReady'
        },
        HEALTH_CHECK: {
          actions: 'reportHealthStatus'
        }
      }
    },

    loading_model: {
      entry: 'logModelLoading',
      invoke: {
        id: 'loadGemmaLegalModel',
        src: 'loadQ4KMModel',
        onDone: {
          target: 'model_loaded',
          actions: 'markModelLoaded'
        },
        onError: {
          target: 'error',
          actions: 'logModelError'
        }
      }
    },

    model_loaded: {
      entry: 'logModelReady',
      always: {
        target: 'ready_for_inference',
        cond: 'tensorRTEngineReady'
      },
      on: {
        TENSORRT_ENGINE_READY: {
          target: 'ready_for_inference',
          actions: 'markTensorRTReady'
        }
      }
    },

    ready_for_inference: {
      entry: 'logReadyState',
      on: {
        START_INFERENCE: {
          target: 'processing_inference',
          cond: 'canStartInference',
          actions: 'startInferenceRequest'
        },
        CACHE_EMBEDDINGS: {
          actions: 'cacheEmbeddings',
          cond: 'hasSpaceForCache'
        },
        MEMORY_PRESSURE: [
          {
            target: 'memory_cleanup',
            cond: 'isCriticalPressure',
            actions: 'flagCriticalPressure'
          },
          {
            actions: 'flagHighPressure',
            cond: 'isHighPressure'
          }
        ]
      }
    },

    processing_inference: {
      entry: 'logInferenceStart',
      invoke: {
        id: 'runTensorRTInference',
        src: 'processTensorRTInference',
        onDone: {
          target: 'ready_for_inference',
          actions: 'completeInferenceRequest'
        },
        onError: {
          target: 'error',
          actions: 'logInferenceError'
        }
      },
      on: {
        COMPLETE_INFERENCE: {
          target: 'ready_for_inference',
          actions: 'completeInferenceRequest'
        }
      }
    },

    memory_cleanup: {
      entry: 'logCleanupStart',
      invoke: {
        id: 'cleanupGPUMemory',
        src: 'performGarbageCollection',
        onDone: {
          target: 'ready_for_inference',
          actions: 'completeCleanup'
        }
      }
    },

    error: {
      entry: 'logErrorState',
      on: {
        HEALTH_CHECK: {
          target: 'idle',
          actions: 'resetErrorState'
        }
      }
    }
  }
}, {
  actions: {
    logInitialization: () => {
      console.log('🚀 GPU Memory Orchestration: Initializing RTX 3060 Ti');
      console.log(`💾 Total VRAM: ${GPU_MEMORY_CONFIG.total_vram_gb}GB`);
      console.log(`🧠 Q4_K_M Model: ${GPU_MEMORY_CONFIG.q4km_model_gb}GB`);
    },

    initializeGPUMemory: assign({
      allocated_memory: 0,
      memory_pressure: 'low',
      last_gc_timestamp: Date.now()
    }),

    logIdleState: () => console.log('⏳ GPU Memory: Idle state - Ready for model loading'),

    reserveModelMemory: assign({
      allocated_memory: (context, event) =>
        context.allocated_memory + (event as any).model_size_gb
    }),

    markTensorRTReady: assign({
      tensorrt_engine_ready: true
    }),

    logModelLoading: () => console.log('📥 Loading Gemma3-Legal 11.8B with Q4_K_M quantization...'),

    markModelLoaded: assign({
      model_loaded: true,
      allocated_memory: (context) => context.allocated_memory + GPU_MEMORY_CONFIG.q4km_model_gb
    }),

    logModelReady: () => console.log('✅ Model loaded! Q4_K_M quantization active'),

    logReadyState: () => console.log('🎯 GPU Ready: TensorRT engine active, accepting inference requests'),

    startInferenceRequest: assign({
      inference_active: true,
      active_requests: (context) => context.active_requests + 1
    }),

    completeInferenceRequest: assign({
      inference_active: false,
      active_requests: (context) => Math.max(0, context.active_requests - 1)
    }),

    cacheEmbeddings: assign({
      cache_size: (context, event) =>
        context.cache_size + (event as any).size_mb
    }),

    flagCriticalPressure: assign({
      memory_pressure: 'critical'
    }),

    flagHighPressure: assign({
      memory_pressure: 'high'
    }),

    logCleanupStart: () => console.log('🧹 Memory cleanup: Freeing GPU memory'),

    completeCleanup: assign({
      memory_pressure: 'low',
      last_gc_timestamp: Date.now(),
      cache_size: 0
    }),

    reportHealthStatus: (context) => {
      const usage = (context.allocated_memory / GPU_MEMORY_CONFIG.total_vram_gb) * 100;
      console.log(`💊 GPU Health: ${usage.toFixed(1)}% VRAM used, ${context.active_requests} active requests`);
    },

    logInferenceStart: () => console.log('⚡ Running TensorRT inference with FlashAttention Ampere'),
    logModelError: () => console.error('❌ Model loading failed'),
    logInferenceError: () => console.error('❌ Inference failed'),
    logErrorState: () => console.error('💥 GPU Memory Management error'),
    resetErrorState: assign({
      allocated_memory: 0,
      model_loaded: false,
      inference_active: false,
      memory_pressure: 'low'
    })
  },

  guards: {
    hasSpaceForModel: (context, event) => {
      const required = (event as any).model_size_gb;
      const available = GPU_MEMORY_CONFIG.total_vram_gb - context.allocated_memory;
      return available >= required;
    },

    tensorRTEngineReady: (context) => context.tensorrt_engine_ready,

    canStartInference: (context) => {
      return context.model_loaded &&
             context.tensorrt_engine_ready &&
             context.memory_pressure !== 'critical' &&
             context.active_requests < 4; // Max 4 concurrent
    },

    hasSpaceForCache: (context, event) => {
      const required_mb = (event as any).size_mb;
      const available_mb = (GPU_MEMORY_CONFIG.total_vram_gb * 1024) -
                           (context.allocated_memory * 1024) -
                           context.cache_size;
      return available_mb >= required_mb;
    },

    isCriticalPressure: (context, event) =>
      (event as any).level === 'critical',

    isHighPressure: (context, event) =>
      (event as any).level === 'high'
  },

  services: {
    loadQ4KMModel: async () => {
      // Simulate model loading with progress
      console.log('🔄 Loading Q4_K_M weights...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Q4_K_M model loaded in GPU memory');
      return { success: true };
    },

    processTensorRTInference: async (context, event) => {
      const requestId = (event as any).request_id;
      console.log(`⚡ Processing inference ${requestId} with TensorRT`);

      // Simulate inference with FlashAttention
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms inference

      console.log(`✅ Inference ${requestId} complete: 512D embeddings generated`);
      return { success: true, embeddings_512d: true };
    },

    performGarbageCollection: async () => {
      console.log('🧹 Running GPU garbage collection...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ GPU memory cleaned');
      return { freed_mb: 256 };
    }
  }
});

// GPU Memory Service for integration
export class GPUMemoryService {
  private machine = interpret(gpuMemoryMachine);

  constructor() {
    this.machine.start();
  }

  // Load Gemma3-Legal model with Q4_K_M quantization
  async loadLegalModel(): Promise<void> {
    this.machine.send({
      type: 'LOAD_MODEL',
      model_size_gb: GPU_MEMORY_CONFIG.q4km_model_gb
    });
  }

  // Mark TensorRT engine as ready
  enableTensorRT(): void {
    this.machine.send({ type: 'TENSORRT_ENGINE_READY' });
  }

  // Start inference request
  async startInference(requestId: string): Promise<void> {
    this.machine.send({
      type: 'START_INFERENCE',
      request_id: requestId
    });
  }

  // Complete inference
  completeInference(requestId: string): void {
    this.machine.send({
      type: 'COMPLETE_INFERENCE',
      request_id: requestId
    });
  }

  // Cache embeddings
  cacheEmbeddings(sizeMb: number): void {
    this.machine.send({
      type: 'CACHE_EMBEDDINGS',
      size_mb: sizeMb
    });
  }

  // Health check
  healthCheck(): void {
    this.machine.send({ type: 'HEALTH_CHECK' });
  }

  // Get current state
  getCurrentState(): string {
    return this.machine.getSnapshot().value as string;
  }

  // Get memory stats
  getMemoryStats() {
    const context = this.machine.getSnapshot().context;
    return {
      allocated_gb: context.allocated_memory,
      available_gb: GPU_MEMORY_CONFIG.total_vram_gb - context.allocated_memory,
      cache_mb: context.cache_size,
      pressure: context.memory_pressure,
      active_requests: context.active_requests,
      model_loaded: context.model_loaded,
      tensorrt_ready: context.tensorrt_engine_ready
    };
  }
}

// Export for integration
export default GPUMemoryService;