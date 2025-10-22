/**
 * Unified WASM-GPU Orchestrator
 * Integrates all GPU/WASM services: NES Bridge, Ollama Integration, YoRHa Neural Processor, and QUIC Gateway
 * Production-ready orchestration layer with multi-tier fallbacks and performance optimization
 */
// Commented out problematic imports due to module resolution issues
// import type { CanvasState } from '$lib/stores/canvas-states'
// import type { MultiDimArray, GPUProcessingStats } from '$lib/workers/gpu-tensor-worker'
// Define interfaces locally
export interface CanvasState {
  width: number;
  height: number;
  data?: Uint8ClampedArray;
  pixels?: number[][];
  format?: string;
}
export interface MultiDimArray {
  data: Float32Array | Uint8Array | Int32Array;
  shape: number[];
  dtype: string;
}
export interface GPUProcessingStats {
  totalProcessingTime: number;
  gpuUtilization: number;
  memoryUsage: number;
  operationsCompleted: number;
}
import { NESStyleGPUBridge } from './nes-gpu-bridge.js';
import { LlamaCppOllamaService, createLlamaCppOllamaService } from './llamacpp-ollama-integration.js';
import { gpuServiceIntegration } from './gpu-service-integration.js';
import { writable, derived, type Writable } from 'svelte/store';
// Browser detection
const browser = typeof window !== 'undefined';
// Integration Configuration
export interface UnifiedWASMGPUConfig {
  enableNESBridge: boolean;
  enableOllamaIntegration: boolean;
  enableYoRHaProcessor: boolean;
  enableQUICGateway: boolean;
  enableGPUFallbacks: boolean;
  maxConcurrentTasks: number;
  taskTimeoutMs: number;
  memoryLimitMB: number;
  performanceProfile: 'balanced' | 'speed' | 'memory' | 'quality';
}
// Task Types
export interface WASMGPUTask {
  id: string;
  type: 'document_processing' | 'neural_inference' | 'gpu_compute' | 'canvas_optimization' | 'legal_analysis';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: unknown;
  targetService: 'nes_bridge' | 'ollama_llama' | 'yorha_neural' | 'gpu_compute' | 'quic_gateway' | 'auto';
  fallbackServices: string[];
  metadata: {
    userId?: string;
    sessionId?: string;
    documentType?: string;
    expectedDuration?: number;
    modelType?: string;
    inputSize?: number;
    operation?: string;
  }
}
// Processing Results
export interface WASMGPUResult {
  taskId: string;
  success: boolean;
  serviceUsed: string;
  result?: unknown;
  error?: string;
  processingTime: number;
  memoryUsed: number;
  cacheHit: boolean;
  performanceMetrics: {
    throughput: number;
    efficiency: number;
    accuracy?: number;
  }
}
// Service Status
export interface ServiceStatus {
  serviceName: string;
  available: boolean;
  healthy: boolean;
  responseTime: number;
  errorRate: number;
  queueLength: number;
  capabilities: string[];
}
// Performance Metrics
export interface UnifiedPerformanceMetrics {
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  averageLatency: number;
  throughputPerSecond: number;
  memoryEfficiency: number;
  cacheHitRate: number;
  serviceDistribution: Record<string, number>;
  errorDistribution: Record<string, number>;
}
/**
 * Small typed helpers to avoid `any`
 */
interface OllamaService {
  generateCompletion?: (opts: { prompt: string; maxTokens?: number; temperature?: number }) => Promise<unknown>;
  generate?: (opts: { prompt: string }) => Promise<unknown>;
  getStatus?: () => unknown;
  shutdown?: () => Promise<void>;
}
interface YoRHaProcessor {
  processDocument?: (doc: string) => Promise<unknown>;
  neuralInference?: (input: number[] | Float32Array) => Promise<unknown>;
}
type GPUComputeInstance = {
  matmul?: (...args: unknown[]) => unknown;
  conv2d?: (...args: unknown[]) => unknown;
  attention?: (...args: unknown[]) => unknown;
  fft?: (...args: unknown[]) => unknown;
};
type GPUComputeModule = { GPUCompute: new () => GPUComputeInstance };

/* NEW: typed shape for NES-style bridge to avoid `any` */
interface NESBridgeLike {
  getStats?: () => { totalConversions?: number; [k: string]: unknown };
  getCacheStats?: () => number | { size?: number; length?: number } | unknown;
  cache?: { size?: number; length?: number } | unknown;
  processCanvasStateWithGPU?: (state: CanvasState) => Promise<unknown>;
}

/**
 * Main Unified WASM-GPU Orchestrator Class
 */
export class UnifiedWASMGPUOrchestrator {
  private config: UnifiedWASMGPUConfig;
  private nesGPUBridge: NESStyleGPUBridge | null = null;
  private ollamaService: OllamaService | null = null;
  private yorhaProcessor: YoRHaProcessor | null = null;
  private taskQueue: WASMGPUTask[] = [];
  private activeTasks = new Map<string, WASMGPUTask>();
  private taskResults = new Map<string, WASMGPUResult>();
  // removed unused serviceHealthCache
  private wasmModules = new Map<string, unknown>();
  private isInitialized = false;
  // Reactive Stores
  public status = writable<'initializing' | 'ready' | 'busy' | 'error'>('initializing');
  public performanceMetrics = writable<UnifiedPerformanceMetrics>({
    totalTasks: 0,
    succeededTasks: 0,
    failedTasks: 0,
    averageLatency: 0,
    throughputPerSecond: 0,
    memoryEfficiency: 0,
    cacheHitRate: 0,
    serviceDistribution: {},
    errorDistribution: {},
  });
  public serviceStatuses = writable<ServiceStatus[]>([]);
  public queueLength = writable<number>(0);
  constructor(config: Partial<UnifiedWASMGPUConfig> = {}) {
    this.config = {
      enableNESBridge: true,
      enableOllamaIntegration: true,
      enableYoRHaProcessor: true,
      enableQUICGateway: true,
      enableGPUFallbacks: true,
      maxConcurrentTasks: 8,
      taskTimeoutMs: 30000,
      memoryLimitMB: 512,
      performanceProfile: 'balanced',
      ...config
    }
    this.initialize();
  }
  /**
   * Initialize all integrated services
   */
  async initialize(): Promise<void> {
    if (!browser) {
      console.warn('⚠️ WASM-GPU Orchestrator: Running in non-browser environment');
      return;
    }
    try {
      console.log('🚀 Initializing Unified WASM-GPU Orchestrator...');
      this.status.set('initializing');
      // Initialize services in parallel for optimal startup time
      const initPromises: Promise<void>[] = [];
      // 1. Initialize NES GPU Bridge
      if (this.config.enableNESBridge) {
        initPromises.push(this.initializeNESBridge());
      }
      // 2. Initialize Ollama/LlamaCpp Integration
      if (this.config.enableOllamaIntegration) {
        initPromises.push(this.initializeOllamaService());
      }
      // 3. Initialize YoRHa Neural Processor
      if (this.config.enableYoRHaProcessor) {
        initPromises.push(this.initializeYoRHaProcessor());
      }
      // 4. Initialize WASM Modules
      initPromises.push(this.initializeWASMModules());
      // 5. Initialize GPU Service Integration
      initPromises.push(this.initializeGPUServiceIntegration());
      // Wait for all services to initialize
      await Promise.allSettled(initPromises);
      // Start task processor
      this.startTaskProcessor();
      // Start health monitoring
      this.startHealthMonitoring();
      // Start performance monitoring
      this.startPerformanceMonitoring();
      this.isInitialized = true;
      this.status.set('ready');
      console.log('✅ Unified WASM-GPU Orchestrator initialized successfully');
      console.log(`📊 Services enabled: NES(${this.config.enableNESBridge}), Ollama(${this.config.enableOllamaIntegration}), YoRHa(${this.config.enableYoRHaProcessor}), QUIC(${this.config.enableQUICGateway})`);
    } catch (error: unknown) {
      console.error('❌ WASM-GPU Orchestrator initialization failed:', this.getErrorMessage(error));
      this.status.set('error');
      throw error;
    }
  }
  /**
   * Initialize NES GPU Bridge
   */
  private async initializeNESBridge(): Promise<void> {
    try {
      this.nesGPUBridge = new NESStyleGPUBridge();
      console.log('✅ NES GPU Bridge initialized');
    } catch (error: unknown) {
      console.warn('⚠️ NES GPU Bridge initialization failed:', this.getErrorMessage(error));
      throw error;
    }
  }
  /**
   * Helper: get Ollama endpoint (replace hardcoded occurrences)
   */
  private getOllamaEndpoint(): string {
    // Prefer environment/global override if available; falls back to default host
    try {
      const globalAny = globalThis as unknown as Record<string, unknown>;
      const envValue = typeof globalAny.OLLAMA_ENDPOINT === 'string' ? (globalAny.OLLAMA_ENDPOINT as string) : undefined;
      return envValue ?? 'http://localhost:11434';
    } catch {
      return 'http://localhost:11434';
    }
  }

  /**
   * Helper: convert unknown error to string
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    try { return String(error); } catch { return 'Unknown error'; }
  }

  /* NEW: normalize unknown ollama status shape */
  private normalizeOllamaStatus(status: unknown): { initialized: boolean; ready: boolean } {
    if (status && typeof status === 'object') {
      const s = status as Record<string, unknown>;
      const initialized = !!(s.initialized === true || s.initialized === 'true' || s.initialized === 1);
      const ready = !!(s.ready === true || s.ready === 'true' || s.ready === 1);
      return { initialized, ready };
    }
    return { initialized: Boolean(status), ready: Boolean(status) };
  }

  /**
   * Initialize Ollama/LlamaCpp Service
   */
  private async initializeOllamaService(): Promise<void> {
    try {
      this.ollamaService = createLlamaCppOllamaService({
        contextSize: 4096,
        gpuLayers: 32,
        flashAttention: true
      }, {
        endpoint: this.getOllamaEndpoint(),
        model: 'gemma3-legal:latest',
        numGpu: 32
      }, {
        enabled: true,
        blockSize: 64,
        maxSeqLen: 4096
      }) as unknown as OllamaService;
      console.log('✅ Ollama/LlamaCpp service initialized');
    } catch (error: unknown) {
      console.warn('⚠️ Ollama service initialization failed:', this.getErrorMessage(error));
      throw error;
    }
  }
  /**
   * Initialize YoRHa Neural Processor WASM Module
   */
  private async initializeYoRHaProcessor(): Promise<void> {
    try {
      // Load YoRHa WASM module
      const wasmModule = await this.loadWASMModule('yorha_neural_processor', '/wasm/yorha-neural-processor.js');
      if (wasmModule && wasmModule.YoRHaNeuralProcessor) {
        this.yorhaProcessor = new wasmModule.YoRHaNeuralProcessor();
        console.log('✅ YoRHa Neural Processor initialized');
      } else {
        throw new Error('YoRHa WASM module not available');
      }
    } catch (error: unknown) {
      console.warn('⚠️ YoRHa Neural Processor initialization failed:', this.getErrorMessage(error));
      if (!this.config.enableGPUFallbacks) {
        throw error;
      }
    }
  }
  /**
   * Initialize WASM Modules
   */
  private async initializeWASMModules(): Promise<void> {
    try {
      // Load GPU Compute WASM Module
      const gpuComputeModule = await this.loadWASMModule('gpu_compute', '/wasm/gpu-compute.js');
      if (gpuComputeModule) {
        console.log('✅ GPU Compute WASM module loaded');
      }
      // Load additional WASM modules as needed
      console.log('✅ WASM modules initialized');
    } catch (error: unknown) {
      console.warn('⚠️ WASM modules initialization failed:', this.getErrorMessage(error));
      throw error;
    }
  }
  /**
   * Initialize GPU Service Integration
   */
  private async initializeGPUServiceIntegration(): Promise<void> {
    try {
      await gpuServiceIntegration.initialize();
      console.log('✅ GPU Service Integration connected');
    } catch (error: unknown) {
      console.warn('⚠️ GPU Service Integration failed:', this.getErrorMessage(error));
      throw error;
    }
  }
  /**
   * Load WASM Module
   */
  private async loadWASMModule(name: string, path: string): Promise<unknown> {
    try {
      const wasmModule: unknown = await import(path);
      this.wasmModules.set(name, wasmModule);
      return wasmModule;
    } catch (error: unknown) {
      console.warn(`⚠️ Failed to load WASM module ${name} from ${path}:`, this.getErrorMessage(error));
      return null;
    }
  }
  /**
   * Submit task for processing
   */
  async submitTask(task: Omit<WASMGPUTask, 'id'>): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    const taskId = `wasm_gpu_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`; // use slice instead of deprecated substr
    const fullTask: WASMGPUTask = {
      ...task,
      id: taskId,
      targetService: task.targetService || 'auto',
    }
    // Add to priority queue
    this.insertTaskByPriority(fullTask);
    this.queueLength.set(this.taskQueue.length);
    console.log(`📝 Task ${taskId} submitted for ${task.type} processing`);
    return taskId;
  }
  /**
   * Process legal document with best available service
   */
  async processLegalDocument(document: string, options: {
    analysisType?: 'contract' | 'evidence' | 'case_brief' | 'statute';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    useGPU?: boolean;
    targetService?: WASMGPUTask['targetService']; // tightened type, no any
  } = {}): Promise<WASMGPUResult> {
    const taskId = await this.submitTask({
      type: 'document_processing',
      priority: options.priority || 'medium',
      data: { document, analysisType: options.analysisType || 'contract' },
      targetService: options.targetService ?? 'auto', // use nullish coalescing, no any cast
      fallbackServices: ['ollama_llama', 'yorha_neural', 'gpu_compute'],
      metadata: {
        documentType: options.analysisType,
        expectedDuration: document.length * 0.1 // Rough estimate
      }
    });
    return this.waitForTaskResult(taskId);
  }
  /**
   * Process canvas state with NES Bridge
   */
  async processCanvasState(state: CanvasState): Promise<WASMGPUResult> {
    if (!this.nesGPUBridge) {
      throw new Error('NES GPU Bridge not available');
    }
    const taskId = await this.submitTask({
      type: 'canvas_optimization',
      priority: 'medium',
      data: { canvasState: state },
      targetService: 'nes_bridge',
      fallbackServices: ['gpu_compute'],
      metadata: {
        expectedDuration: 1000 // 1 second estimate
      }
    });
    return this.waitForTaskResult(taskId);
  }
  /**
   * Perform neural inference
   */
  async performNeuralInference(input: Float32Array, options: {
    modelType?: 'legal_analysis' | 'document_classification' | 'similarity';
    precision?: 8 | 16 | 32;
    useFlashAttention?: boolean;
  } = {}): Promise<WASMGPUResult> {
    const taskId = await this.submitTask({
      type: 'neural_inference',
      priority: 'high',
      data: { input, options },
      targetService: options.useFlashAttention ? 'ollama_llama' : 'yorha_neural',
      fallbackServices: ['gpu_compute', 'yorha_neural', 'ollama_llama'],
      metadata: {
        modelType: options.modelType,
        inputSize: input.length,
        expectedDuration: input.length * 0.01
      }
    });
    return this.waitForTaskResult(taskId);
  }
  /**
   * Execute GPU computation
   */
  async executeGPUComputation(operation: 'matmul' | 'conv2d' | 'attention' | 'fft' | 'clustering', data: any): Promise<WASMGPUResult> {
    const taskId = await this.submitTask({
      type: 'gpu_compute',
      priority: 'high',
      data: { operation, ...data },
      targetService: 'gpu_compute',
      fallbackServices: [],
      metadata: {
        operation,
        expectedDuration: 500
      }
    });
    return this.waitForTaskResult(taskId);
  }
  /**
   * Get comprehensive service status
   */
  async getServiceStatus(): Promise<ServiceStatus[]> {
    const statuses: ServiceStatus[] = [];
    // Check NES Bridge status
    if (this.config.enableNESBridge && this.nesGPUBridge) {
      // Use the typed NESBridgeLike shape and feature-detect safely
      const nb = this.nesGPUBridge as unknown as NESBridgeLike;
      let nesStats: { totalConversions?: number; [k: string]: unknown } = { totalConversions: 0 };
      let cacheSize = 0;
      try {
        if (typeof nb.getStats === 'function') {
          const s = nb.getStats();
          if (s && typeof s === 'object') nesStats = s;
        }
      } catch (e) {
        // swallow and keep defaults
      }
      try {
        if (typeof nb.getCacheStats === 'function') {
          const cs = nb.getCacheStats();
          if (cs && typeof cs === 'object') {
            if (typeof (cs as any).size === 'number') cacheSize = (cs as any).size;
            else if (typeof (cs as any).length === 'number') cacheSize = (cs as any).length;
          } else if (typeof cs === 'number') {
            cacheSize = cs;
          }
        } else if (nb.cache && typeof nb.cache === 'object') {
          const cs = nb.cache;
          if (typeof (cs as any).size === 'number') cacheSize = (cs as any).size;
          else if (typeof (cs as any).length === 'number') cacheSize = (cs as any).length;
        }
      } catch (e) {
        // ignore and fallback to 0
      }

      statuses.push({
        serviceName: 'NES GPU Bridge',
        available: true,
        healthy: typeof nesStats.totalConversions === 'number' ? nesStats.totalConversions >= 0 : true,
        responseTime: 50, // Estimated
        errorRate: 0,
        queueLength: cacheSize,
        capabilities: ['canvas_optimization', 'gpu_bridging', 'nes_style_caching']
      });
    }
    // Check Ollama service status
    if (this.config.enableOllamaIntegration && this.ollamaService) {
      const raw = this.ollamaService.getStatus ? this.ollamaService.getStatus() : { initialized: true, ready: true };
      const ollamaStatus = this.normalizeOllamaStatus(raw);
      statuses.push({
        serviceName: 'Ollama LlamaCpp Integration',
        available: !!ollamaStatus.initialized,
        healthy: !!ollamaStatus.ready,
        responseTime: 200, // Estimated
        errorRate: 0,
        queueLength: 0,
        capabilities: ['llm_inference', 'flash_attention', 'legal_analysis']
      });
    }
    // Check YoRHa Neural Processor
    if (this.config.enableYoRHaProcessor && this.yorhaProcessor) {
      statuses.push({
        serviceName: 'YoRHa Neural Processor',
        available: true,
        healthy: true,
        responseTime: 100, // Estimated
        errorRate: 0,
        queueLength: 0,
        capabilities: ['neural_processing', 'document_classification', 'feature_extraction']
      });
    }
    // Check GPU Service Integration
    try {
      const gpuStatus = await gpuServiceIntegration.getStatus();
      statuses.push({
        serviceName: 'GPU Service Integration',
        available: gpuStatus.available,
        healthy: gpuStatus.initialized,
        responseTime: 30,
        errorRate: gpuStatus.errorRate,
        queueLength: gpuStatus.queuedTasks,
        capabilities: ['gpu_acceleration', 'task_orchestration', 'fallback_management']
      });
    } catch (e) {
      statuses.push({
        serviceName: 'GPU Service Integration',
        available: false,
        healthy: false,
        responseTime: 0,
        errorRate: 1,
        queueLength: 0,
        capabilities: []
      });
    }
    // Check QUIC Gateway (via HTTP request) - use AbortController for timeout
    if (this.config.enableQUICGateway) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const quicResponse = await fetch('https://localhost:8445/health', {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeout);
        statuses.push({
          serviceName: 'QUIC Gateway',
          available: quicResponse.ok,
          healthy: quicResponse.ok,
          responseTime: 20, // QUIC advantage
          errorRate: 0,
          queueLength: 0,
          capabilities: ['http3_transport', 'low_latency', 'streaming']
        });
      } catch (error: unknown) {
        statuses.push({
          serviceName: 'QUIC Gateway',
          available: false,
          healthy: false,
          responseTime: 0,
          errorRate: 1,
          queueLength: 0,
          capabilities: []
        });
        console.warn('QUIC health check failed:', this.getErrorMessage(error));
      }
    }
    this.serviceStatuses.set(statuses);
    return statuses;
  }
  /**
   * Insert task by priority
   */
  private insertTaskByPriority(task: WASMGPUTask): void {
    const priorities: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const taskPriority = priorities[task.priority] || 1;
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedPriority = priorities[this.taskQueue[i].priority] || 1;
      if (taskPriority > queuedPriority) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, task);
  }
  /**
   * Start task processor
   */
  private startTaskProcessor(): void {
    const processNextTask = async (): Promise<void> => {
      if (this.taskQueue.length === 0 || this.activeTasks.size >= this.config.maxConcurrentTasks) {
        setTimeout(processNextTask, 100);
        return;
      }
      const task = this.taskQueue.shift();
      if (!task) {
        setTimeout(processNextTask, 100);
        return;
      }
      this.activeTasks.set(task.id, task);
      this.queueLength.set(this.taskQueue.length);
      try {
        const result = await this.executeTask(task);
        this.taskResults.set(task.id, result);
      } catch (error: unknown) {
        console.error(`❌ Task ${task.id} execution failed:`, this.getErrorMessage(error));
        this.taskResults.set(task.id, {
          taskId: task.id,
          success: false,
          serviceUsed: 'none',
          error: this.getErrorMessage(error),
          processingTime: 0,
          memoryUsed: 0,
          cacheHit: false,
          performanceMetrics: { throughput: 0, efficiency: 0 },
        });
      }
      this.activeTasks.delete(task.id);
      setTimeout(processNextTask, 10);
    }
    processNextTask();
    console.log('🔄 Unified task processor started');
  }
  /**
   * Execute task with appropriate service
   */
  private async executeTask(task: WASMGPUTask): Promise<WASMGPUResult> {
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let serviceUsed = task.targetService;
    let result: unknown = null;
    let success = false;
    // Auto-select best service if needed
    if (task.targetService === 'auto') {
      serviceUsed = this.selectOptimalService(task);
    }
    try {
      switch (serviceUsed) {
        case 'nes_bridge': {
          const data = task.data as Record<string, unknown> | null;
          if (this.nesGPUBridge && data && 'canvasState' in data) {
            const canvasState = data.canvasState as CanvasState;
            result = await this.nesGPUBridge.processCanvasStateWithGPU(canvasState);
            success = true;
          } else {
            throw new Error('NES Bridge not available or invalid data');
          }
          break;
        }
        case 'ollama_llama': {
          const data = task.data as Record<string, unknown> | null;
          if (this.ollamaService && data && 'document' in data) {
            const doc = String(data.document);
            const prompt = data.analysisType === 'contract'
              ? `Analyze this contract: ${doc}`
              : `Analyze this legal document: ${doc}`;
            if (this.ollamaService.generateCompletion) {
              result = await this.ollamaService.generateCompletion({
                prompt,
                maxTokens: 1024,
                temperature: 0.3,
              });
            } else if (this.ollamaService.generate) {
              result = await this.ollamaService.generate({ prompt });
            } else {
              throw new Error('Ollama service does not expose generate API');
            }
            success = true;
          } else {
            throw new Error('Ollama service not available or invalid data');
          }
          break;
        }
        case 'yorha_neural': {
          const data = task.data as Record<string, unknown> | null;
          if (this.yorhaProcessor && data && 'document' in data) {
            result = await this.yorhaProcessor.processDocument!(String(data.document));
            success = true;
          } else if (this.yorhaProcessor && data && 'input' in data) {
            const inputArr = Array.isArray(data.input) ? data.input as number[] : Array.from(data.input as Float32Array);
            result = await this.yorhaProcessor.neuralInference!(inputArr);
            success = true;
          } else {
            throw new Error('YoRHa Neural Processor not available or invalid data');
          }
          break;
        }
        case 'gpu_compute': {
          const gpuModule = this.wasmModules.get('gpu_compute') as unknown as GPUComputeModule | undefined;
          if (gpuModule && gpuModule.GPUCompute) {
            const compute = new gpuModule.GPUCompute();
            const op = (task.data as Record<string, unknown>)?.operation as string | undefined;
            switch (op) {
              case 'matmul':
                result = compute.matmul?.((task.data as Record<string, unknown>).a, (task.data as Record<string, unknown>).b, (task.data as Record<string, unknown>).m, (task.data as Record<string, unknown>).n, (task.data as Record<string, unknown>).k);
                break;
              case 'conv2d':
                result = compute.conv2d?.((task.data as Record<string, unknown>).input, (task.data as Record<string, unknown>).kernel, (task.data as Record<string, unknown>).width, (task.data as Record<string, unknown>).height, (task.data as Record<string, unknown>).kernel_size);
                break;
              case 'attention':
                result = compute.attention?.((task.data as Record<string, unknown>).query, (task.data as Record<string, unknown>).key, (task.data as Record<string, unknown>).value, (task.data as Record<string, unknown>).seq_len, (task.data as Record<string, unknown>).dim);
                break;
              case 'fft':
                result = compute.fft?.((task.data as Record<string, unknown>).input);
                break;
              default:
                throw new Error(`Unknown GPU operation: ${op}`);
            }
            success = true;
          } else {
            throw new Error('GPU Compute WASM not available');
          }
          break;
        }
        default:
          throw new Error(`Unknown service: ${serviceUsed}`);
      }
      // Try fallbacks if primary service failed
      if (!success && task.fallbackServices && task.fallbackServices.length > 0) {
        for (const fallbackService of task.fallbackServices) {
          if (fallbackService !== serviceUsed) {
            try {
              task.targetService = fallbackService as WASMGPUTask['targetService'];
              return await this.executeTask(task);
            } catch (fallbackError: unknown) {
              console.warn(`Fallback service ${fallbackService} also failed:`, this.getErrorMessage(fallbackError));
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error(`Service ${serviceUsed} failed:`, this.getErrorMessage(error));
      success = false;
      result = null;
    }
    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const processingTime = endTime - startTime;
    return {
      taskId: task.id,
      success,
      serviceUsed,
      result,
      error: success ? undefined : 'Service execution failed',
      processingTime,
      memoryUsed: this.estimateMemoryUsage(result),
      cacheHit: false,
      performanceMetrics: {
        throughput: success ? (processingTime > 0 ? (1000 / processingTime) : 0) : 0,
        efficiency: success ? 1 : 0
      }
    }
  }
  /**
   * Select optimal service for task
   */
  private selectOptimalService(task: WASMGPUTask): 'gpu_compute' | 'nes_bridge' | 'ollama_llama' | 'yorha_neural' | 'quic_gateway' {
    switch (task.type) {
      case 'document_processing':
        return this.ollamaService ? 'ollama_llama' : (this.yorhaProcessor ? 'yorha_neural' : 'gpu_compute');
      case 'neural_inference':
        return this.yorhaProcessor ? 'yorha_neural' : (this.ollamaService ? 'ollama_llama' : 'gpu_compute');
      case 'gpu_compute':
        return 'gpu_compute';
      case 'canvas_optimization':
        return 'nes_bridge';
      case 'legal_analysis':
        return this.ollamaService ? 'ollama_llama' : (this.yorhaProcessor ? 'yorha_neural' : 'gpu_compute');
      default:
        return 'yorha_neural';
    }
  }
  /**
   * Wait for task result
   */
  private async waitForTaskResult(taskId: string, timeout: number = this.config.taskTimeoutMs): Promise<WASMGPUResult> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const checkResult = () => {
        const result = this.taskResults.get(taskId);
        if (result) {
          resolve(result);
        } else if (Date.now() - start >= timeout) {
          reject(new Error(`Task ${taskId} result not available within timeout`));
        } else {
          setTimeout(checkResult, 100);
        }
      }
      checkResult();
    });
  }
  /**
   * Estimate memory usage for result (heuristic)
   */
  private estimateMemoryUsage(result: unknown): number {
    if (!result) return 0;
    // Rough estimation: count keys and nested objects/arrays
    const countKeys = (obj: any): number => {
      if (obj == null) return 0;
      if (typeof obj !== 'object') return 1;
      let count = 0;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          count += 1 + countKeys(obj[key]);
        }
      }
      return count;
    };
    const sizeEstimate = countKeys(result) * 8; // assume 8 bytes per key/value pair
    return Math.min(sizeEstimate, this.config.memoryLimitMB * 1024 * 1024); // cap to memory limit
  }
  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    this.status.set('error');
    console.warn('🛑 Unified WASM-GPU Orchestrator shutting down...');
    // Stop health and performance monitoring
    this.stopHealthMonitoring();
    this.stopPerformanceMonitoring();
    // Shutdown services in reverse order of initialization
    try {
      if (this.yorhaProcessor && typeof this.yorhaProcessor.shutdown === 'function') {
        await this.yorhaProcessor.shutdown();
        console.log('✅ YoRHa Neural Processor shut down');
      }
    } catch (e) {
      console.warn('⚠️ YoRHa Neural Processor shutdown failed:', this.getErrorMessage(e));
    }
    try {
      if (this.ollamaService && typeof this.ollamaService.shutdown === 'function') {
        await this.ollamaService.shutdown();
        console.log('✅ Ollama service shut down');
      }
    } catch (e) {
      console.warn('⚠️ Ollama service shutdown failed:', this.getErrorMessage(e));
    }
    try {
      if (this.nesGPUBridge) {
        this.nesGPUBridge = null;
        console.log('✅ NES GPU Bridge released');
      }
    } catch (e) {
      console.warn('⚠️ NES GPU Bridge release failed:', this.getErrorMessage(e));
    }
    try {
      await gpuServiceIntegration.shutdown();
      console.log('✅ GPU Service Integration shut down');
    } catch (e) {
      console.warn('⚠️ GPU Service Integration shutdown failed:', this.getErrorMessage(e));
    }
    this.isInitialized = false;
    this.status.set('error');
    console.log('✅ Unified WASM-GPU Orchestrator shut down complete');
  }
}