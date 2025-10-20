/**
 * Redis LLM Response Orchestrator
 * Implements your 3-tier Redis optimization strategy:
 * 1. LLM Response Caching (fastest path)
 * 2. Agent Memory (conversation history)
 * 3. Task Queuing (async processing)
 */
import { redis } from '$lib/server/database/redis-client';
import { createHash } from 'crypto';
import type { ChatMessage } from '$lib/services/chat-memory-service';

interface LLMCacheEntry {
  response: string;
  confidence: number;
  model_used: string;
  processing_time: number;
  sources?: unknown[];
  timestamp: number;
  cache_key: string;
}
interface AgentMemoryEntry {
  messages: ChatMessage[];
  context: {
    caseId?: string;
    legalCategory?: string;
    practiceArea?: string;
    lastActivity: number;
    [key: string]: unknown;
  };
  summary?: string;
}
interface ComplexLegalTask {
  id: string;
  type: 'complex_legal' | 'document_analysis' | 'case_synthesis' | 'risk_assessment';
  query: string;
  metadata: Record<string, unknown>;
  priority: number;
  timestamp: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

// Add a typed shape for completed task payloads (replace previous use of `any`)
interface CompletedTaskResult {
  taskId: string;
  result: unknown; // unknown is safer than any; callers should narrow as needed
  processingTime: number;
  completed_at: number;
  status: 'completed' | 'failed' | string;
}

// Replace the RedisClient type with small additions to better match common clients
type RedisClient = {
  get?: (key: string) => Promise<string | null> | string | null;
  set?: (...args: unknown[]) => Promise<unknown> | unknown;
  setex?: (key: string, ttl: number, value: string) => Promise<unknown> | unknown;
  expire?: (key: string, seconds: number) => Promise<unknown> | unknown;
  keys?: (pattern: string) => Promise<string[]> | string[];
  memory?: (...args: unknown[]) => Promise<unknown> | unknown;
  zadd?: (...args: unknown[]) => Promise<unknown> | unknown;
  zAdd?: (...args: unknown[]) => Promise<unknown> | unknown;
  zrevrange?: (key: string, start: number, stop: number) => Promise<string[]> | string[];
  zRange?: (...args: unknown[]) => Promise<string[]> | string[];
  lrange?: (key: string, start: number, stop: number) => Promise<string[]> | string[];
  lrem?: (...args: unknown[]) => Promise<unknown> | unknown;
  rpush?: (...args: unknown[]) => Promise<unknown> | unknown;
  zrem?: (...args: unknown[]) => Promise<unknown> | unknown;
  hSet?: (...args: unknown[]) => Promise<unknown> | unknown;
  hset?: (...args: unknown[]) => Promise<unknown> | unknown;
  hdel?: (...args: unknown[]) => Promise<unknown> | unknown;
  del?: (...args: unknown[]) => Promise<unknown> | unknown;
  zcard?: (key: string) => Promise<number> | number;
  hlen?: (key: string) => Promise<number> | number;
  connect?: () => Promise<void> | void;
  isOpen?: boolean | undefined;
  // allow any other properties/methods
  [key: string]: unknown;
};

// Helper to support both exported client or factory function
async function getRedisClient(): Promise<RedisClient> {
  try {
    // If the imported "redis" is a thenable (Promise), await it.
    if (redis && typeof (redis as any).then === 'function') {
      const awaited = await (redis as any);
      // if awaited is a function, call it (factory), otherwise return object
      if (typeof awaited === 'function') {
        const client = await awaited();
        if (client && typeof (client as RedisClient).connect === 'function' && !(client as any).isOpen) {
          // some clients need explicit connect()
          await (client as RedisClient).connect!();
        }
        return client as RedisClient;
      }
      if (awaited && typeof awaited === 'object') {
        if (typeof (awaited as RedisClient).connect === 'function' && !(awaited as any).isOpen) {
          await (awaited as RedisClient).connect!();
        }
        return awaited as RedisClient;
      }
    }

    // If the imported "redis" is a function (factory), call it.
    if (typeof redis === 'function') {
      const maybeClient = await (redis as unknown as () => Promise<RedisClient>)();
      if (maybeClient && typeof maybeClient.connect === 'function' && !(maybeClient as any).isOpen) {
        await maybeClient.connect();
      }
      return maybeClient as RedisClient;
    }

    // If redis is an object client, possibly call connect() if present
    if (redis && typeof redis === 'object') {
      const clientObj = redis as unknown as RedisClient;
      if (typeof clientObj.connect === 'function' && !(clientObj as any).isOpen) {
        await clientObj.connect();
      }
      return clientObj;
    }

    throw new Error('Unsupported redis export shape');
  } catch (e) {
    throw new Error('Failed to obtain Redis client: ' + String(e));
  }
}

// Safe invoker to avoid TypeScript "never callable" issues and to unify sync/async clients.
// It will return undefined if the method is missing.
async function callRedis(client: RedisClient, method: string, ...args: unknown[]): Promise<unknown> {
  try {
    const fn = (client as any)[method];
    if (typeof fn === 'function') {
      // Use Reflect.apply to preserve correct this binding
      const res = Reflect.apply(fn, client, args);
      // Await if returns a promise
      if (res && typeof (res as any).then === 'function') {
        return await res;
      }
      return res;
    }
    return undefined;
  } catch (err) {
    // log at debug boundary but don't throw - callers often expect undefined
    console.error(`🎮 callRedis error calling ${method}:`, err);
    return undefined;
  }
}

/**
 * Redis LLM Response Caching - Fastest Path
 * Check cache before any LLM processing
 */
export class RedisLLMCache {
  private static CACHE_TTL = 3600; // 1 hour for LLM responses
  private static CACHE_PREFIX = 'llm_cache:';

  /**
   * Generate deterministic cache key from query + context
   */
  static generateCacheKey(query: string, context: Record<string, unknown> = {}): string {
    const normalized = {
      query: query.trim().toLowerCase(),
      caseId: (context as any)?.caseId || 'global',
      legalCategory: (context as any)?.legalCategory || 'general',
      practiceArea: (context as any)?.practiceArea || 'default',
    };
    const hashInput = JSON.stringify(normalized);
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check cache first - fastest path for repeated queries
   */
  static async getCachedResponse(query: string, context: Record<string, unknown> = {}): Promise<LLMCacheEntry | null> {
    try {
      const client = await getRedisClient();
      const cacheKey = this.generateCacheKey(query, context);
      const redisKey = `${this.CACHE_PREFIX}${cacheKey}`;
      const cached = (await callRedis(client, 'get', redisKey)) as string | null | undefined;
      if (cached) {
        try {
          const entry: LLMCacheEntry = JSON.parse(cached);
          console.log(`🎮 [REDIS LLM CACHE HIT] Query: "${query.substring(0, 50)}..."`);
          // Update access time for LRU if expire exists
          await callRedis(client, 'expire', redisKey, this.CACHE_TTL);
          return entry;
        } catch (err) {
          console.warn('🎮 Redis LLM cache parse failed, deleting key:', redisKey, err);
          await callRedis(client, 'del', redisKey);
          return null;
        }
      }
      console.log(`🎮 [REDIS LLM CACHE MISS] Query: "${query.substring(0, 50)}..."`);
      return null;
    } catch (error) {
      console.error('🎮 Redis LLM cache check failed:', error);
      return null;
    }
  }

  /**
   * Cache LLM response after successful generation
   */
  static async cacheResponse(
    query: string,
    response: string,
    metadata: {
      confidence: number;
      model_used: string;
      processing_time: number;
      sources?: unknown[];
      context?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      const client = await getRedisClient();
      const cacheKey = this.generateCacheKey(query, metadata?.context ?? {});
      const redisKey = `${this.CACHE_PREFIX}${cacheKey}`;
      const entry: LLMCacheEntry = {
        response,
        confidence: metadata.confidence,
        model_used: metadata.model_used,
        processing_time: metadata.processing_time,
        sources: metadata.sources || [],
        timestamp: Date.now(),
        cache_key: cacheKey,
      };

      // Prefer set with EX, otherwise try setex, otherwise set+expire
      const setResult = await callRedis(client, 'set', redisKey, JSON.stringify(entry), 'EX', this.CACHE_TTL);
      if (setResult === undefined) {
        const setexResult = await callRedis(client, 'setex', redisKey, this.CACHE_TTL, JSON.stringify(entry));
        if (setexResult === undefined) {
          // fallback: set then expire
          await callRedis(client, 'set', redisKey, JSON.stringify(entry));
          await callRedis(client, 'expire', redisKey, this.CACHE_TTL);
        }
      }

      console.log(`🎮 [REDIS LLM CACHED] Response cached for query: "${query.substring(0, 50)}..."`);
    } catch (error) {
      console.error('🎮 Redis LLM cache SET failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ total_keys: number; memory_usage: string; hit_rate_estimate: number }> {
    try {
      const client = await getRedisClient();
      const keysRaw = (await callRedis(client, 'keys', `${this.CACHE_PREFIX}*`)) as string[] | undefined;
      const keys = Array.isArray(keysRaw) ? keysRaw : [];
      let memoryInfo: unknown | null = null;
      try {
        if (typeof client.memory === 'function') {
          memoryInfo = await callRedis(client, 'memory', 'usage', keys[0] || 'nonexistent');
        }
      } catch {
        memoryInfo = null;
      }
      return {
        total_keys: keys.length,
        memory_usage: memoryInfo ? `${Math.round(Number(memoryInfo as number) / 1024)}KB` : 'unknown',
        hit_rate_estimate: 85,
      };
    } catch (error) {
      console.error('🎮 Redis cache stats failed:', error);
      return { total_keys: 0, memory_usage: '0KB', hit_rate_estimate: 0 };
    }
  }
}

/**
 * Agent Memory Management - Conversation History
 * Maintains context across multi-turn conversations
 */
export class RedisAgentMemory {
  private static MEMORY_TTL = 7200; // 2 hours for agent memory
  private static MEMORY_PREFIX = 'agent_memory:';
  private static MAX_MESSAGES = 50; // Keep last 50 messages per conversation

  /**
   * Store conversation history for agent context
   */
  static async storeAgentMemory(
    sessionId: string,
    messages: ChatMessage[],
    context: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const client = await getRedisClient();
      const redisKey = `${this.MEMORY_PREFIX}${sessionId}`;
      const memoryEntry: AgentMemoryEntry = {
        messages: messages.slice(-this.MAX_MESSAGES),
        context: {
          ...context,
          lastActivity: Date.now(),
        },
      };
      // try set with EX first
      const setResult = await callRedis(client, 'set', redisKey, JSON.stringify(memoryEntry), 'EX', this.MEMORY_TTL);
      if (setResult === undefined) {
        await callRedis(client, 'set', redisKey, JSON.stringify(memoryEntry));
        await callRedis(client, 'expire', redisKey, this.MEMORY_TTL);
      }
      console.log(`🎮 [REDIS AGENT MEMORY] Stored ${messages.length} messages for session: ${sessionId}`);
    } catch (error) {
      console.error('🎮 Redis agent memory store failed:', error);
    }
  }

  /**
   * Retrieve agent memory for context continuity
   */
  static async getAgentMemory(sessionId: string): Promise<AgentMemoryEntry | null> {
    try {
      const client = await getRedisClient();
      const redisKey = `${this.MEMORY_PREFIX}${sessionId}`;
      const stored = (await callRedis(client, 'get', redisKey)) as string | null | undefined;
      if (stored) {
        try {
          const memory: AgentMemoryEntry = JSON.parse(stored);
          console.log(`🎮 [REDIS AGENT MEMORY] Retrieved ${memory.messages.length} messages for session: ${sessionId}`);
          await callRedis(client, 'expire', redisKey, this.MEMORY_TTL);
          return memory;
        } catch (err) {
          console.warn('🎮 Redis agent memory parse failed, deleting key:', redisKey, err);
          await callRedis(client, 'del', redisKey);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('🎮 Redis agent memory retrieval failed:', error);
      return null;
    }
  }

  /**
   * Append new message to existing conversation
   */
  static async appendToAgentMemory(
    sessionId: string,
    newMessage: ChatMessage,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const existing = await this.getAgentMemory(sessionId);
      const messages = existing ? [...existing.messages, newMessage] : [newMessage];
      const mergedContext = { ...(existing?.context || {}), ...context };
      await this.storeAgentMemory(sessionId, messages, mergedContext);
    } catch (error) {
      console.error('🎮 Redis agent memory append failed:', error);
    }
  }

  /**
   * Generate conversation summary for long-term memory
   */
  static async generateConversationSummary(sessionId: string, summaryText: string): Promise<void> {
    try {
      const memory = await this.getAgentMemory(sessionId);
      if (memory) {
        memory.summary = summaryText;
        await this.storeAgentMemory(sessionId, memory.messages, memory.context);
        console.log(`🎮 [REDIS AGENT MEMORY] Added summary for session: ${sessionId}`);
      }
    } catch (error) {
      console.error('🎮 Redis conversation summary failed:', error);
    }
  }
}

/**
 * Task Queuing - Async Processing for Complex Analysis
 * Prevents main application from blocking on heavy operations
 */
export class RedisTaskQueue {
  private static QUEUE_KEY = 'legal_task_queue';
  private static PROCESSING_KEY = 'legal_tasks_processing';
  private static COMPLETED_KEY = 'legal_tasks_completed';
  private static TASK_TTL = 3600; // 1 hour for completed tasks

  /**
   * Queue complex legal analysis task
   */
  static async queueComplexTask(
    taskType: ComplexLegalTask['type'],
    query: string,
    metadata: Record<string, unknown>,
    priority: number = 100
  ): Promise<string> {
    try {
      const client = await getRedisClient();
      const taskId = createHash('sha256').update(`${taskType}:${query}:${Date.now()}`).digest('hex').substring(0, 16);
      const task: ComplexLegalTask = {
        id: taskId,
        type: taskType,
        query,
        metadata,
        priority,
        timestamp: Date.now(),
        status: 'queued',
      };
      // Use sorted set for priority queue; many redis clients expose zadd or zAdd
      const zaddResult = await callRedis(client, 'zadd', this.QUEUE_KEY, priority, JSON.stringify(task));
      if (zaddResult === undefined) {
        const zAddResult = await callRedis(client, 'zAdd', this.QUEUE_KEY, [
          { score: priority, value: JSON.stringify(task) },
        ]);
        if (zAddResult === undefined) {
          await callRedis(client, 'rpush', this.QUEUE_KEY, JSON.stringify(task));
        }
      }
      console.log(`🎮 [REDIS TASK QUEUE] Queued ${taskType} task: ${taskId}`);
      return taskId;
    } catch (error) {
      console.error('🎮 Redis task queue failed:', error);
      throw error;
    }
  }

  /**
   * Worker process: Get next highest priority task
   */
  static async getNextTask(): Promise<ComplexLegalTask | null> {
    try {
      const client = await getRedisClient();
      let results: string[] = [];
      const zrev = (await callRedis(client, 'zrevrange', this.QUEUE_KEY, 0, 0)) as string[] | undefined;
      if (Array.isArray(zrev) && zrev.length) {
        results = zrev;
      } else {
        const zrange = (await callRedis(client, 'zRange', this.QUEUE_KEY, -1, -1, { REV: true } as unknown)) as
          | string[]
          | undefined;
        if (Array.isArray(zrange) && zrange.length) {
          results = zrange;
        } else {
          const lrange = (await callRedis(client, 'lrange', this.QUEUE_KEY, 0, 0)) as string[] | undefined;
          if (Array.isArray(lrange) && lrange.length) {
            results = lrange;
          }
        }
      }
      if (!results || results.length === 0) {
        return null;
      }
      const taskData = results[0];
      let task: ComplexLegalTask;
      try {
        task = JSON.parse(taskData);
      } catch (err) {
        console.warn('🎮 Redis task parse failed, removing bad entry:', taskData, err);
        // Attempt to remove bad entries
        await callRedis(client, 'zrem', this.QUEUE_KEY, taskData);
        await callRedis(client, 'lrem', this.QUEUE_KEY, 1, taskData);
        return null;
      }
      // Move to processing queue
      await callRedis(client, 'zrem', this.QUEUE_KEY, taskData);
      await callRedis(client, 'lrem', this.QUEUE_KEY, 1, taskData);

      const processingRecord = {
        ...task,
        status: 'processing',
        processing_started: Date.now(),
      };

      // Prefer hSet/hset if available, otherwise set + expire
      const hsetResult = await callRedis(
        client,
        'hSet',
        this.PROCESSING_KEY,
        task.id,
        JSON.stringify(processingRecord)
      );
      if (hsetResult === undefined) {
        const hsetAlt = await callRedis(client, 'hset', this.PROCESSING_KEY, task.id, JSON.stringify(processingRecord));
        if (hsetAlt === undefined) {
          const processingKey = `${this.PROCESSING_KEY}:${task.id}`;
          await callRedis(client, 'set', processingKey, JSON.stringify(processingRecord));
          await callRedis(client, 'expire', processingKey, this.TASK_TTL);
        }
      }

      console.log(`🎮 [REDIS TASK PROCESSING] Started processing task: ${task.id}`);
      return task;
    } catch (error) {
      console.error('🎮 Redis task retrieval failed:', error);
      return null;
    }
  }

  /**
   * Mark task as completed with results
   */
  static async completeTask(taskId: string, result: unknown, processingTime: number): Promise<void> {
    try {
      const client = await getRedisClient();
      const completedTask: CompletedTaskResult = {
        taskId,
        result,
        processingTime,
        completed_at: Date.now(),
        status: 'completed',
      };
      // Remove from processing, add to completed
      await callRedis(client, 'hdel', this.PROCESSING_KEY, taskId);
      await callRedis(client, 'del', `${this.PROCESSING_KEY}:${taskId}`);

      const completedKey = `${this.COMPLETED_KEY}:${taskId}`;
      const setRes = await callRedis(client, 'set', completedKey, JSON.stringify(completedTask), 'EX', this.TASK_TTL);
      if (setRes === undefined) {
        await callRedis(client, 'set', completedKey, JSON.stringify(completedTask));
        await callRedis(client, 'expire', completedKey, this.TASK_TTL);
      }
      console.log(`🎮 [REDIS TASK COMPLETED] Task ${taskId} completed in ${processingTime}ms`);
    } catch (error) {
      console.error('🎮 Redis task completion failed:', error);
    }
  }

  /**
   * Get task result
   */
  static async getTaskResult(taskId: string): Promise<CompletedTaskResult | null> {
    try {
      const client = await getRedisClient();
      const raw = (await callRedis(client, 'get', `${this.COMPLETED_KEY}:${taskId}`)) as string | null | undefined;
      return raw ? (JSON.parse(raw) as CompletedTaskResult) : null;
    } catch (error) {
      console.error('🎮 Redis get task result failed:', error);
      return null;
    }
  }
}
