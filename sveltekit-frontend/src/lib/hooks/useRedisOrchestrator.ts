/**
 * Redis Orchestrator Svelte Hooks
 * Provides easy-to-use hooks for Redis-optimized AI operations in Svelte components
 */

import { onMount, onDestroy } from 'svelte';
import { get } from 'svelte/store';
import { 
  redisOrchestratorClient, 
  redisStats, 
  isRedisHealthy, 
  queuedTasks,
  type RedisOptimizationResult,
  type QueuedTask 
} from '$lib/stores/redis-orchestrator-store';

/**
 * Hook for Redis-optimized AI queries
 */
export function useRedisAI() {
  let isProcessing = $state(false);
  let lastResult: RedisOptimizationResult | null = $state(null);
  let error: string | null = $state(null);

  const query = async (
    query: string,
    context: {
      endpoint?: string;
      caseId?: string;
      userId?: string;
      useOrchestrator?: boolean;
    } = {}
  ): Promise<RedisOptimizationResult> => {
    isProcessing = true;
    error = null;

    try {
      const result = await redisOrchestratorClient.processQuery(query, context);
      lastResult = result;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isProcessing = false;
    }
  };

  const queueTask = async (
    taskType: 'complex_legal' | 'document_analysis' | 'case_synthesis' | 'risk_assessment',
    query: string,
    metadata: any = {},
    priority = 100
  ): Promise<string> => {
    isProcessing = true;
    error = null;

    try {
      const taskId = await redisOrchestratorClient.queueTask(taskType, query, metadata, priority);
      return taskId;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isProcessing = false;
    }
  };

  const getTaskResult = async (taskId: string) => {
    return await redisOrchestratorClient.getTaskResult(taskId);
  };

  return {
    get isProcessing() { return isProcessing; },
    get lastResult() { return lastResult; },
    get error() { return error; },
    query,
    queueTask,
    getTaskResult,
    clearError: () => { error = null; }
  };
}

/**
 * Hook for Redis system monitoring
 */
export function useRedisMonitoring() {
  let healthData: any = $state(null);
  let isLoading = $state(false);

  const refresh = async () => {
    isLoading = true;
    try {
      healthData = await redisOrchestratorClient.getSystemHealth();
    } catch (error) {
      console.error('Failed to refresh Redis health:', error);
    } finally {
      isLoading = false;
    }
  };

  const clearCache = async (confirm = false) => {
    if (!confirm) {
      throw new Error('Cache clear requires confirmation');
    }
    return await redisOrchestratorClient.clearCache(true);
  };

  onMount(() => {
    refresh();
  });

  return {
    get healthData() { return healthData; },
    get isLoading() { return isLoading; },
    get stats() { return get(redisStats); },
    get isHealthy() { return get(isRedisHealthy); },
    refresh,
    clearCache
  };
}

/**
 * Hook for managing queued tasks
 */
export function useRedisTaskQueue() {
  let tasks: Map<string, QueuedTask> = $state(new Map());
  let isPolling = $state(false);

  // Subscribe to task updates
  const unsubscribe = queuedTasks.subscribe(value => {
    tasks = value;
  });

  const getTask = (taskId: string): QueuedTask | undefined => {
    return tasks.get(taskId);
  };

  const getAllTasks = (): QueuedTask[] => {
    return Array.from(tasks.values()).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  };

  const getTasksByStatus = (status: QueuedTask['status']): QueuedTask[] => {
    return getAllTasks().filter(task => task.status === status);
  };

  const removeTask = (taskId: string) => {
    queuedTasks.update(tasks => {
      tasks.delete(taskId);
      return tasks;
    });
  };

  const clearCompletedTasks = () => {
    queuedTasks.update(tasks => {
      for (const [taskId, task] of tasks.entries()) {
        if (task.status === 'completed' || task.status === 'failed') {
          tasks.delete(taskId);
        }
      }
      return tasks;
    });
  };

  onDestroy(() => {
    unsubscribe();
  });

  return {
    get tasks() { return tasks; },
    get isPolling() { return isPolling; },
    getTask,
    getAllTasks,
    getTasksByStatus,
    removeTask,
    clearCompletedTasks
  };
}

/**
 * Hook for auto-initializing Redis orchestrator
 */
export function useRedisInit(options: { pollInterval?: number; autoStart?: boolean } = {}) {
  let isInitialized = $state(false);
  let initError: string | null = $state(null);

  const initialize = async () => {
    try {
      await redisOrchestratorClient.initialize(options.pollInterval || 5000);
      isInitialized = true;
      initError = null;
    } catch (error) {
      initError = error instanceof Error ? error.message : 'Initialization failed';
      console.error('Redis orchestrator initialization failed:', error);
    }
  };

  onMount(async () => {
    if (options.autoStart !== false) {
      await initialize();
    }
  });

  onDestroy(() => {
    redisOrchestratorClient.destroy();
  });

  return {
    get isInitialized() { return isInitialized; },
    get initError() { return initError; },
    initialize
  };
}

/**
 * Hook for Redis-aware component state
 */
export function useRedisComponent(
  componentName: string,
  config: {
    cacheStrategy?: 'aggressive' | 'conservative' | 'minimal';
    memoryBank?: 'INTERNAL_RAM' | 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM';
    autoCache?: boolean;
  } = {}
) {
  let componentCache: Map<string, any> = $state(new Map());
  let lastQuery: string | null = $state(null);
  let cacheHits = $state(0);
  let cacheMisses = $state(0);

  const queryWithCache = async (query: string, context: any = {}) => {
    const cacheKey = `${componentName}:${JSON.stringify({ query, ...context })}`;
    
    // Check local component cache first
    if (config.autoCache !== false && componentCache.has(cacheKey)) {
      cacheHits++;
      return componentCache.get(cacheKey);
    }

    // Use Redis orchestrator
    const result = await redisOrchestratorClient.processQuery(query, {
      endpoint: componentName,
      ...context
    });

    // Cache result locally
    if (config.autoCache !== false && result.cached) {
      componentCache.set(cacheKey, result);
      
      // Limit cache size
      if (componentCache.size > 50) {
        const firstKey = componentCache.keys().next().value;
        componentCache.delete(firstKey);
      }
    }

    if (result.cached) {
      cacheHits++;
    } else {
      cacheMisses++;
    }

    lastQuery = query;
    return result;
  };

  const clearComponentCache = () => {
    componentCache.clear();
    cacheHits = 0;
    cacheMisses = 0;
  };

  const getCacheStats = () => ({
    size: componentCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0
  });

  return {
    get lastQuery() { return lastQuery; },
    get cacheStats() { return getCacheStats(); },
    queryWithCache,
    clearComponentCache
  };
}

/**
 * Hook for Redis-optimized form submissions
 */
export function useRedisForm() {
  let isSubmitting = $state(false);
  let submitError: string | null = $state(null);
  let lastSubmission: any = $state(null);

  const submitForm = async (
    formData: any,
    endpoint: string,
    options: {
      useCache?: boolean;
      priority?: number;
      queueIfComplex?: boolean;
    } = {}
  ) => {
    isSubmitting = true;
    submitError = null;

    try {
      // Extract query from form data
      const query = extractQueryFromForm(formData);
      
      if (options.queueIfComplex && isComplexQuery(query)) {
        // Queue complex form submissions
        const taskId = await redisOrchestratorClient.queueTask(
          'complex_legal',
          query,
          { formData, endpoint },
          options.priority || 150
        );
        
        lastSubmission = {
          type: 'queued',
          taskId,
          estimatedTime: '30-45 seconds'
        };
      } else {
        // Process immediately with Redis optimization
        const result = await redisOrchestratorClient.processQuery(query, {
          endpoint,
          useOrchestrator: options.useCache !== false
        });
        
        lastSubmission = {
          type: 'immediate',
          result
        };
      }

      return lastSubmission;

    } catch (error) {
      submitError = error instanceof Error ? error.message : 'Submission failed';
      throw error;
    } finally {
      isSubmitting = false;
    }
  };

  return {
    get isSubmitting() { return isSubmitting; },
    get submitError() { return submitError; },
    get lastSubmission() { return lastSubmission; },
    submitForm,
    clearError: () => { submitError = null; }
  };
}

// Helper functions

function extractQueryFromForm(formData: any): string {
  // Try to extract meaningful query from form data
  const queryFields = ['query', 'message', 'content', 'text', 'description', 'analysis'];
  
  for (const field of queryFields) {
    if (formData[field] && typeof formData[field] === 'string') {
      return formData[field];
    }
  }
  
  // Fallback: stringify first 500 chars of form data
  return JSON.stringify(formData).substring(0, 500);
}

function isComplexQuery(query: string): boolean {
  return query.length > 500 || 
         query.includes('analyze') ||
         query.includes('comprehensive') ||
         query.includes('detailed');
}