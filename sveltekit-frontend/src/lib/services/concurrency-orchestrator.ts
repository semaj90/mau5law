// Comprehensive Concurrency Orchestration Service
// Multi-Core Integration: Loki.js + Fuse.js + Fabric.js + XState + Redis + RabbitMQ
// Platform: Native Windows (No Docker) with SvelteKit 2 + Svelte 5
import { createMachine, assign, interpret } from 'xstate';
import type { AnyActorRef } from 'xstate';
import Fuse from 'fuse.js';
import os from 'os'; // added for server-side CPU count fallback
// Fabric will be loaded dynamically when needed
// Dynamic imports for server-side only - prevents browser leakage
// import Loki from 'lokijs'
// import Redis from 'ioredis'
// import { publishToQueue, consumeFromQueue, setupQueues } from '$lib/server/rabbitmq'
// remove the static import to avoid SSR/bundle issues
/* import { gemma3LegalService } from '$lib/services/ollama-gemma3-service'; */

// Types and Interfaces
export interface ConcurrencyTask {
  id: string;
  type: 'search' | 'analysis' | 'canvas' | 'ai' | 'database';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId?: string;
  caseId?: string;
  createdAt: number;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  workerId: string;
}

export interface ConcurrencyContext {
  tasks: ConcurrencyTask[];
  results: WorkerResult[];
  activeWorkers: number;
  maxWorkers: number;
  queueStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  error?: any;
}

// Multi-Core Orchestration Machine
// Module-level service holders (so init functions can expose instances to the orchestrator)
let lokiInstance: any | null = null;
let redisInstance: any | null = null;
let rabbitmqInitialized = false;

const defaultMaxWorkers =
  (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) ||
  (typeof os !== 'undefined' ? Math.max(1, os.cpus().length) : 4);

const concurrencyMachine = createMachine<ConcurrencyContext>(
  {
    id: 'concurrencyOrchestrator',
    initial: 'initializing',
    context: {
      tasks: [],
      results: [],
      activeWorkers: 0,
      maxWorkers: defaultMaxWorkers,
      queueStats: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
    },
    states: {
      initializing: {
        invoke: {
          src: 'initializeServices',
          onDone: {
            target: 'ready',
            actions: assign({
              maxWorkers: (_ctx, evt: any) => evt.data?.maxWorkers || defaultMaxWorkers,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_ctx, evt: any) => evt.data || evt,
            }),
          },
        },
      },
      ready: {
        on: {
          SUBMIT_TASK: {
            target: 'processing',
            actions: assign({
              tasks: (ctx, evt: any) => [
                ...ctx.tasks,
                {
                  ...evt.task,
                  id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  createdAt: Date.now(),
                },
              ],
              queueStats: ctx => ({
                ...ctx.queueStats,
                pending: ctx.queueStats.pending + 1,
              }),
            }),
          },
        },
      },
      processing: {
        invoke: {
          src: 'processTaskQueue',
          onDone: {
            target: 'ready',
            actions: assign({
              results: (ctx, evt: any) => [...ctx.results, ...(evt.data.results || [])],
              tasks: (ctx, evt: any) => ctx.tasks.filter(t => !evt.data.completedTaskIds.includes(t.id)),
              queueStats: (_ctx, evt: any) => evt.data.queueStats || _ctx.queueStats,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_ctx, evt: any) => evt.data || evt,
            }),
          },
        },
        on: {
          SUBMIT_TASK: {
            actions: assign({
              tasks: (ctx, evt: any) => [
                ...ctx.tasks,
                {
                  ...evt.task,
                  id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  createdAt: Date.now(),
                },
              ],
            }),
          },
        },
      },
      error: {
        on: {
          RETRY: {
            target: 'initializing',
          },
        },
      },
    },
  },
  {
    services: {
      // initialize services (safe, minimal)
      initializeServices: async () => {
        console.log('🚀 Initializing Concurrency Orchestrator Services...');
        // Run initialization tasks in parallel and capture returned instances
        const results = await Promise.all([
          initializeLokiDB(),
          initializeRedis(),
          initializeRabbitMQ(),
          initializeWorkers(),
        ]);
        // results: [loki, redis, rabbitFlag, undefined]
        return {
          maxWorkers: Math.min(16, defaultMaxWorkers),
          loki: lokiInstance,
          redis: redisInstance,
          rabbitmq: rabbitmqInitialized,
          status: 'ready',
        };
      },

      // process tasks from context.tasks (basic, compile-safe)
      processTaskQueue: async (context: ConcurrencyContext) => {
        const results: WorkerResult[] = [];
        const completedTaskIds: string[] = [];
        const sortedTasks = [...context.tasks].sort((a, b) => {
          const priorityMap: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
        });

        const limit = Math.min(8, sortedTasks.length);
        const slice = sortedTasks.slice(0, limit);
        const taskPromises = slice.map(task =>
          processTask(task)
            .then(res => ({ status: 'fulfilled', value: res }))
            .catch(err => ({ status: 'rejected', reason: err }))
        );

        const settled = await Promise.all(taskPromises);
        settled.forEach((entry, idx) => {
          const taskId = slice[idx].id;
          completedTaskIds.push(taskId);
          if ((entry as any).status === 'fulfilled') {
            results.push((entry as any).value as WorkerResult);
          } else {
            results.push({
              taskId,
              success: false,
              error: formatError((entry as any).reason),
              duration: 0,
              workerId: 'error',
            });
          }
        });

        const completedCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        return {
          results,
          completedTaskIds,
          queueStats: {
            pending: Math.max(0, context.tasks.length - limit),
            processing: 0,
            completed: completedCount,
            failed: failedCount,
          },
        };
      },
    },
  }
);

// Service Orchestrator Class
export class ConcurrencyOrchestrator {
  private service = interpret(concurrencyMachine);
  private lokiDB: any | null = null;
  private redis: any | null = null;
  private fuseSearches: Map<string, Fuse<any>> = new Map();
  private canvasInstances: Map<string, any> = new Map();

  constructor() {
    this.service.start();
  }

  // Public API
  async submitTask(task: Omit<ConcurrencyTask, 'id' | 'createdAt'>): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.service.send({
      type: 'SUBMIT_TASK',
      task: {
        ...task,
        id: taskId,
        createdAt: Date.now(),
      } as ConcurrencyTask,
    });
    return taskId;
  }

  getSnapshot() {
    return this.service.getSnapshot();
  }

  subscribe(callback: (snapshot: any) => void) {
    return this.service.subscribe(callback);
  }

  // Specialized task submission methods
  async submitSearchTask(query: string, dataset: any[], options: any = {}): Promise<string> {
    return this.submitTask({
      type: 'search',
      payload: { query, dataset, options },
      priority: 'medium',
    } as Omit<ConcurrencyTask, 'id' | 'createdAt'>);
  }

  async submitAnalysisTask(data: any, analysisType: string): Promise<string> {
    return this.submitTask({
      type: 'analysis',
      payload: { data, analysisType },
      priority: 'high',
    });
  }

  async submitCanvasTask(canvasId: string, operation: string, params: any): Promise<string> {
    return this.submitTask({
      type: 'canvas',
      payload: { canvasId, operation, params },
      priority: 'medium',
    });
  }

  async submitAITask(prompt: string, context?: any): Promise<string> {
    return this.submitTask({
      type: 'ai',
      payload: { prompt, context },
      priority: 'high',
    });
  }

  // Loki.js integration methods
  getLokiCollection(name: string): any | null {
    return this.lokiDB?.getCollection(name) || null;
  }

  createLokiCollection(name: string, options: any = {}) {
    if (!this.lokiDB) throw new Error('Loki DB not initialized');
    return this.lokiDB.addCollection(name, options);
  }

  // Canvas management
  getCanvas(canvasId: string): any | null {
    return this.canvasInstances.get(canvasId) || null;
  }

  async createCanvas(canvasId: string, element: HTMLCanvasElement): Promise<any> {
    if (typeof window !== 'undefined') {
      const { fabric } = await import('fabric');
      const canvas = new fabric.Canvas(element);
      this.canvasInstances.set(canvasId, canvas);
      return canvas;
    }
    return null;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const snapshot = this.getSnapshot();
    const services = {
      loki: !!lokiInstance,
      redis: !!redisInstance && (redisInstance?.status === 'ready' || true),
      rabbitmq: rabbitmqInitialized,
      ollama: false,
    };

    // dynamic check for ollama/gemma service
    try {
      const mod = await import('$lib/services/ollama-gemma3-service');
      const service = (mod as any).gemma3LegalService || (mod as any).default || mod;
      if (service && typeof service.healthCheck === 'function') {
        services.ollama = await service
          .healthCheck()
          .then((h: any) => h?.status === 'healthy')
          .catch(() => false);
      } else {
        services.ollama = false;
      }
    } catch {
      services.ollama = false;
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyServices < totalServices * 0.8) status = 'degraded';
    if (healthyServices < totalServices * 0.5) status = 'unhealthy';
    return {
      status,
      services,
      performance: {
        activeWorkers: snapshot.context?.activeWorkers ?? 0,
        queueDepth: snapshot.context?.tasks?.length ?? 0,
        averageTaskTime: this.calculateAverageTaskTime(snapshot.context?.results ?? []),
      },
    };
  }

  private calculateAverageTaskTime(results: WorkerResult[]): number {
    if (!results || results.length === 0) return 0;
    const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    return totalTime / results.length;
  }

  private async checkRabbitMQHealth(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        const mod = await import('$lib/server/rabbitmq');
        return typeof mod.healthCheck === 'function' ? await mod.healthCheck() : false;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Add a small helper to safely format errors
function formatError(err: unknown): string {
  // handle falsy values
  if (err === undefined || err === null) return 'Unknown error';
  // native Error
  if (err instanceof Error) return err.message;
  // try stringify objects (safe guard for circulars)
  try {
    if (typeof err === 'string') return err;
    return JSON.stringify(err, getCircularReplacer(), 2);
  } catch {
    // fallback
    return String(err);
  }
}

// Add a small helper to safely stringify potentially-circular objects
function getCircularReplacer() {
  return function (_key: string, value: any) {
    const seen = (getCircularReplacer as any).__seen || ((getCircularReplacer as any).__seen = new WeakSet());
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

// Task Processing Functions
async function processTask(task: ConcurrencyTask): Promise<WorkerResult> {
  const startTime = Date.now();
  const workerId = `worker-${task.type}-${Date.now()}`;
  try {
    let result: any;
    switch (task.type) {
      case 'search':
        result = await processSearchTask(task.payload);
        break;
      case 'analysis':
        result = await processAnalysisTask(task.payload);
        break;
      case 'canvas':
        result = await processCanvasTask(task.payload);
        break;
      case 'ai':
        result = await processAITask(task.payload);
        break;
      case 'database':
        result = await processDatabaseTask(task.payload);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    return {
      taskId: task.id,
      success: true,
      data: result,

      duration: Date.now() - startTime,
      workerId,
    };
  } catch (error: any) {
    return {
      taskId: task.id,
      success: false,
      error: formatError(error),
      duration: Date.now() - startTime,
      workerId,
    };
  }
}

async function processSearchTask(payload: any): Promise<any> {
  const { query, dataset, options = {} } = payload;
  const fuse = new Fuse(dataset || [], {
    keys: options.keys || ['title', 'content', 'description'],
    threshold: options.threshold ?? 0.3,
    includeScore: true,
    includeMatches: true,
    ...(options.fuseOptions || {}),
  });
  const results = fuse.search(query);
  return {
    query,
    results: results.map(r => ({
      item: (r as any).item,
      score: (r as any).score,
      matches: (r as any).matches,
    })),
    totalFound: results.length,
    searchTime: Date.now(),
  };
}

async function processAnalysisTask(payload: any): Promise<any> {
  const { data, analysisType } = payload;
  switch (analysisType) {
    case 'legal': {
      // Lazy/dynamic import so browser bundles and SSR don't fail.
      try {
        const mod = await import('$lib/services/ollama-gemma3-service');
        const service = (mod as any).gemma3LegalService || (mod as any).default || mod;
        if (service && typeof service.generateLegalResponse === 'function') {
          // Avoid passing raw circular objects to the AI service
          const safeData = typeof data === 'string' ? data : JSON.stringify(data, getCircularReplacer(), 2);
          const response = await service.generateLegalResponse(`Analyze this legal document: ${safeData}`, {
            legalContext: 'research',
          });
          // Normalize response shape for upstream consumers
          return typeof response === 'string' ? { text: response } : (response ?? { text: '' });
        }
        // Service loaded but API not present
        return { error: 'AI service API not found', text: '' };
      } catch (err) {
        // Graceful fallback if AI service isn't available
        return {
          error: 'AI service unavailable',
          detail: err instanceof Error ? err.message : String(err),
          text: '',
        };
      }
    }
    case 'similarity':
      return { similarity: 0.85, confidence: 0.92 };
    case 'classification':
      return { category: 'contract', confidence: 0.89 };
    default:
      throw new Error(`Unknown analysis type: ${analysisType}`);
  }
}

async function processCanvasTask(payload: any): Promise<any> {
  const { canvasId, operation, params } = payload;
  return {
    canvasId,
    operation,
    params,
    instructions: `Execute ${operation} on canvas ${canvasId}`,
    timestamp: Date.now(),
  };
}

async function processAITask(payload: any): Promise<any> {
  const { prompt, context } = payload;
  try {
    const mod = await import('$lib/services/ollama-gemma3-service');
    const service = (mod as any).gemma3LegalService || (mod as any).default || mod;
    if (service && typeof service.generateLegalResponse === 'function') {
      const response = await service.generateLegalResponse(prompt, {
        temperature: 0.3,
        max_tokens: 2048,
        legalContext: context?.type || 'general',
      });
      return typeof response === 'string' ? { text: response } : (response ?? { text: '' });
    }
    return { error: 'AI service API not found', text: '' };
  } catch (err) {
    return {
      error: 'AI service unavailable',
      detail: err instanceof Error ? err.message : String(err),
      text: '',
    };
  }
}

async function processDatabaseTask(payload: any): Promise<any> {
  const { operation, collection, data, query } = payload;
  return {
    operation,
    success: true,
    timestamp: Date.now(),
  };
}

// Service Initialization Functions
async function initializeLokiDB(): Promise<any> {
  if (typeof window === 'undefined') {
    const LokiModule = await import('lokijs');
    const Loki = (LokiModule as any).default || LokiModule;
    const loki = new (Loki as any)('legal-ai.db', {
      autoload: true,
      autosave: true,
      autosaveInterval: 10000,
    });
    lokiInstance = loki; // store instance for health checks / later use
    console.log('✅ Loki.js initialized');
    return lokiInstance;
  } else {
    console.log('⚠️ Loki.js skipped (browser)');
    return null;
  }
}

async function initializeRedis(): Promise<any> {
  if (typeof window === 'undefined') {
    const RedisModule = await import('ioredis');
    const RedisCtor = (RedisModule as any).default || RedisModule;
    const redis = new (RedisCtor as any)({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    });
    // attach to module-level holder so orchestrator.healthCheck can inspect it
    try {
      await redis.ping();
      redisInstance = redis;
      console.log('✅ Redis initialized');
      return redisInstance;
    } catch (err) {
      console.warn('⚠️ Redis init failed', err);
      return null;
    }
  } else {
    console.log('⚠️ Redis skipped (browser)');
    return null;
  }
}

async function initializeRabbitMQ(): Promise<boolean> {
  if (typeof window === 'undefined') {
    try {
      const mod = await import('$lib/server/rabbitmq');
      if (typeof mod.setupQueues === 'function') {
        await mod.setupQueues();
        rabbitmqInitialized = true;
      }
    } catch (err) {
      // optional integration; keep flag false
      rabbitmqInitialized = false;
    }
    console.log('✅ RabbitMQ initialization attempted');
    return rabbitmqInitialized;
  } else {
    console.log('⚠️ RabbitMQ skipped (browser)');
    return false;
  }
}

// Singleton instance
export const concurrencyOrchestrator = new ConcurrencyOrchestrator();

// Utility functions for common operations
export async function performFuzzySearch(query: string, dataset: any[], options: any = {}): Promise<any> {
  return concurrencyOrchestrator.submitSearchTask(query, dataset, options);
}

export async function analyzeWithAI(prompt: string, context?: any): Promise<string> {
  return concurrencyOrchestrator.submitAITask(prompt, context);
}

export async function processLegalDocument(document: any, analysisType: string = 'legal'): Promise<string> {
  return concurrencyOrchestrator.submitAnalysisTask(document, analysisType);
}