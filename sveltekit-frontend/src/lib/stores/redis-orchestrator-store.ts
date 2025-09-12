/**
 * Client-Side Redis Orchestrator Store
 * Provides reactive state management for Redis-optimized AI operations
 * Integrates with SvelteKit and provides real-time Redis statistics
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface RedisStats {
  llm_cache: {
    total_keys: number;
    memory_usage: string;
    hit_rate_estimate: number;
  };
  agent_memory: {
    active_sessions: number;
  };
  task_queue: {
    queued_tasks: number;
    processing_tasks: number;
    completed_tasks_count: number;
  };
  redis_memory: string;
  last_updated: string;
}

export interface RedisOptimizationResult {
  response: any;
  source: 'cache' | 'fresh' | 'queued';
  processing_time: number;
  cached: boolean;
  task_id?: string;
  _redis_optimization?: {
    endpoint: string;
    cache_strategy: string;
    memory_bank: string;
    session_id: string;
    timestamp: string;
  };
}

export interface QueuedTask {
  taskId: string;
  taskType: string;
  query: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime: string;
  submittedAt: string;
  result?: any;
}

// Core stores
export const redisStats = writable<RedisStats | null>(null);
export const isRedisHealthy = writable<boolean>(true);
export const queuedTasks = writable<Map<string, QueuedTask>>(new Map());
export const cacheHitRate = writable<number>(0);
export const processingTimes = writable<Array<{ endpoint: string; time: number; timestamp: string }>>([]);

// Derived stores for computed values
export const averageProcessingTime = derived(
  processingTimes,
  ($times) => {
    if ($times.length === 0) return 0;
    const sum = $times.reduce((acc, t) => acc + t.time, 0);
    return Math.round(sum / $times.length);
  }
);

export const totalQueuedTasks = derived(
  redisStats,
  ($stats) => $stats?.task_queue?.queued_tasks || 0
);

export const memoryPressure = derived(
  redisStats,
  ($stats) => {
    if (!$stats?.redis_memory) return 'low';
    const memoryStr = $stats.redis_memory;
    
    if (memoryStr.includes('GB')) {
      const gb = parseInt(memoryStr);
      if (gb > 4) return 'critical';
      if (gb > 2) return 'high';
      if (gb > 1) return 'medium';
    }
    
    return 'low';
  }
);

/**
 * Redis Orchestrator Client API
 */
export class RedisOrchestratorClient {
  private static instance: RedisOrchestratorClient;
  private pollInterval: number | null = null;
  private baseUrl = '/api/redis-orchestrator';

  static getInstance(): RedisOrchestratorClient {
    if (!this.instance) {
      this.instance = new RedisOrchestratorClient();
    }
    return this.instance;
  }

  /**
   * Initialize Redis orchestrator client with real-time updates
   */
  async initialize(pollIntervalMs = 5000) {
    if (!browser) return;

    // Initial stats fetch
    await this.updateStats();

    // Start polling for real-time updates
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      await this.updateStats();
    }, pollIntervalMs) as any;

    console.log('🎮 Redis orchestrator client initialized');
  }

  /**
   * Process AI query through Redis orchestrator
   */
  async processQuery(
    query: string,
    context: {
      endpoint?: string;
      caseId?: string;
      userId?: string;
      useOrchestrator?: boolean;
    } = {}
  ): Promise<RedisOptimizationResult> {
    const startTime = performance.now();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sessionId: this.generateSessionId(context),
          context: {
            endpoint: context.endpoint || 'client-query',
            ...context
          },
          useOrchestrator: context.useOrchestrator !== false
        })
      });

      if (!response.ok) {
        throw new Error(`Redis orchestrator request failed: ${response.statusText}`);
      }

      const result: RedisOptimizationResult = await response.json();
      
      // Update client-side metrics
      this.recordProcessingTime(
        context.endpoint || 'client-query',
        performance.now() - startTime
      );

      // If task was queued, track it
      if (result.task_id) {
        this.trackQueuedTask({
          taskId: result.task_id,
          taskType: 'complex_legal',
          query,
          status: 'queued',
          estimatedTime: '30-45 seconds',
          submittedAt: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      console.error('🎮 Redis orchestrator query failed:', error);
      throw error;
    }
  }

  /**
   * Check task status and retrieve result
   */
  async getTaskResult(taskId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks?taskId=${taskId}`);
      
      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      
      // Update task status
      if (result.found) {
        queuedTasks.update(tasks => {
          const task = tasks.get(taskId);
          if (task) {
            task.status = 'completed';
            task.result = result.result;
            tasks.set(taskId, task);
          }
          return tasks;
        });
      }

      return result.result;

    } catch (error) {
      console.error('🎮 Task result retrieval failed:', error);
      return null;
    }
  }

  /**
   * Queue complex analysis task
   */
  async queueTask(
    taskType: 'complex_legal' | 'document_analysis' | 'case_synthesis' | 'risk_assessment',
    query: string,
    metadata: any = {},
    priority = 100
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType,
          query,
          metadata,
          priority
        })
      });

      if (!response.ok) {
        throw new Error(`Task queuing failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Track the task
      this.trackQueuedTask({
        taskId: result.taskId,
        taskType,
        query,
        status: 'queued',
        estimatedTime: result.estimated_processing_time,
        submittedAt: new Date().toISOString()
      });

      return result.taskId;

    } catch (error) {
      console.error('🎮 Task queuing failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive Redis system health
   */
  async getSystemHealth() {
    try {
      const response = await fetch(`${this.baseUrl}?details=true`);
      
      if (!response.ok) {
        isRedisHealthy.set(false);
        return null;
      }

      const health = await response.json();
      isRedisHealthy.set(health.status === 'healthy');
      
      return health;

    } catch (error) {
      console.error('🎮 System health check failed:', error);
      isRedisHealthy.set(false);
      return null;
    }
  }

  /**
   * Clear Redis cache
   */
  async clearCache(confirm = false): Promise<boolean> {
    if (!confirm) {
      throw new Error('Cache clear requires explicit confirmation');
    }

    try {
      const response = await fetch(`${this.baseUrl}/cache?confirm=true`, {
        method: 'DELETE'
      });

      return response.ok;

    } catch (error) {
      console.error('🎮 Cache clear failed:', error);
      return false;
    }
  }

  /**
   * Update Redis statistics
   */
  private async updateStats() {
    try {
      const response = await fetch(this.baseUrl);
      
      if (!response.ok) {
        isRedisHealthy.set(false);
        return;
      }

      const data = await response.json();
      
      const stats: RedisStats = {
        ...data.redis_stats,
        last_updated: new Date().toISOString()
      };

      redisStats.set(stats);
      cacheHitRate.set(stats.llm_cache?.hit_rate_estimate || 0);
      isRedisHealthy.set(data.status === 'healthy');

    } catch (error) {
      console.error('🎮 Stats update failed:', error);
      isRedisHealthy.set(false);
    }
  }

  /**
   * Record processing time for metrics
   */
  private recordProcessingTime(endpoint: string, time: number) {
    processingTimes.update(times => {
      const newEntry = {
        endpoint,
        time: Math.round(time),
        timestamp: new Date().toISOString()
      };
      
      const updated = [...times, newEntry].slice(-50); // Keep last 50 entries
      return updated;
    });
  }

  /**
   * Track queued task
   */
  private trackQueuedTask(task: QueuedTask) {
    queuedTasks.update(tasks => {
      tasks.set(task.taskId, task);
      return tasks;
    });

    // Auto-poll for task completion
    this.pollTaskCompletion(task.taskId);
  }

  /**
   * Poll task completion
   */
  private async pollTaskCompletion(taskId: string) {
    const maxAttempts = 20; // 10 minutes with 30s intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts++ >= maxAttempts) {
        queuedTasks.update(tasks => {
          const task = tasks.get(taskId);
          if (task) {
            task.status = 'failed';
            tasks.set(taskId, task);
          }
          return tasks;
        });
        return;
      }

      const result = await this.getTaskResult(taskId);
      
      if (!result) {
        setTimeout(poll, 30000); // Check again in 30 seconds
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(context: any): string {
    if (context.userId) {
      return `client_user_${context.userId}`;
    }
    
    // Generate anonymous session based on browser fingerprint
    const fingerprint = this.generateBrowserFingerprint();
    return `client_anon_${fingerprint}`;
  }

  /**
   * Generate simple browser fingerprint
   */
  private generateBrowserFingerprint(): string {
    if (!browser) return 'ssr';
    
    const factors = [
      navigator.userAgent,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ];
    
    return btoa(factors.join('|')).substring(0, 12);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

// Global client instance
export const redisOrchestratorClient = RedisOrchestratorClient.getInstance();