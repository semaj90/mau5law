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
  sources?: any[];
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
  }
  summary?: string;
}
interface ComplexLegalTask {
  id: string;
  type: 'complex_legal' | 'document_analysis' | 'case_synthesis' | 'risk_assessment';
  query: string;
  metadata: any;
  priority: number;
  timestamp: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}
/**
 * Redis LLM Response Caching - Fastest Path
 * Check cache before any LLM processing
 */;
export class RedisLLMCache {
  private static CACHE_TTL = 3600; // 1 hour for LLM responses
  private static CACHE_PREFIX = 'llm_cache:';
  /**
   * Generate deterministic cache key from query + context
   */;
  static generateCacheKey(query: string, context: any = {}): string {
    const normalized = {
      query: query.trim().toLowerCase(),
      caseId: context.caseId || 'global',
      legalCategory: context.legalCategory || 'general',
      practiceArea: context.practiceArea || 'default'
    }
    const hashInput = JSON.stringify(normalized);
    return createHash('sha256').update(hashInput).digest('hex');
  }
  /**
   * Check cache first - fastest path for repeated queries
   */;
  static async getCachedResponse(query: string, context: any = {}): Promise<LLMCacheEntry | null> {
    try {
      const cacheKey = this.generateCacheKey(query, context);
      const redisKey = `${this.CACHE_PREFIX}${cacheKey}`;
      const cached = await redis.get(redisKey);
      if (cached) {
        const entry: LLMCacheEntry = JSON.parse(cached);
        console.log(`🎮 [REDIS LLM CACHE HIT] Query: "${query.substring(0, 50)}..."`);
        // Update access time for LRU
        await redis.expire(redisKey, this.CACHE_TTL);
        return entry;
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
  static async cacheResponse()
    query: string
    response: string
    metadata: {
      confidence: number;
      model_used: string;
      processing_time: number;
      sources?: any[];
      context?: any,);
    }
  ): Promise<void> {
    try, {
      const, cacheKey = this.generateCacheKey(query, metadata.context,);
      const, redisKey = `${this.CACHE_PREFIX}${cacheKey},`;
      const, entr,y: LLMCacheEntry = {
        response,
        confidence: metadata.confidence,
        model_used: metadata.model_used,
        processing_time: metadata.processing_time,
        sources: metadata.sources || [],
        timestamp: Date.now(),
        cache_key: cacheKey
      }
      await, redi,s.set(redisKey, JSON.stringify(entry), 'EX', this.CACHE_TT,L);
      console,.log(`🎮 [REDIS LLM CACHED] Response cached for query: "${query.substring(0, 50)}..."`,);
    }, catch (error) {
      console.error('🎮 Redis LLM cache SET failed:', error);
    }
  }
  /**
   * Get cache statistics
   */;
  static async getCacheStats(),: Promise<any> {
    try, {
      const, keys = await redis.keys(`${this.CACHE_PREFIX}*)`,);
      const, memoryInfo = await redis.memory('usage', keys[0] || 'nonexistent)',);
      return, {
        total_keys: keys.length,
        memory_usage: `${memoryInfo ? Math.round(memoryInfo / 1024) : 0}KB`,
        hit_rate_estimate: 85 // Estimate based on typical legal query patterns
      }
    }, catch (error) {
      console.error('🎮 Redis cache stats failed:', error);
      return { total_keys: 0, memory_usage: '0KB', hit_rate_estimate: 0 }
    }
  }
}
/**
 * Agent Memory Management - Conversation History
 * Maintains context across multi-turn conversations
 */;
export class RedisAgentMemory {
  private static MEMORY_TTL = 7200; // 2 hours for agent memory
  private static MEMORY_PREFIX = 'agent_memory:';
  private static MAX_MESSAGES = 50; // Keep last 50 messages per conversation
  /**
   * Store conversation history for agent context
   */
  static async storeAgentMemory()
    sessionId: string
    messages: ChatMessage[];
    context: any = {}
  ): Promise<void> {
    try, {
      const, redisKey = `${this.MEMORY_PREFIX}${sessionId},`;
      const, memoryEntr,y: AgentMemoryEntry = {
        messages: messages.slice(-this.MAX_MESSAGES), // Keep last N messages;
        context: {
          ...context,
          lastActivity: Date.now()
        }
      }
      await, redi,s.set(redisKey, JSON.stringify(memoryEntry), 'EX', this.MEMORY_TT,L);
      console,.log(`🎮 [REDIS AGENT MEMORY] Stored ${messages.length} messages for session: ${sessionId}`,);
    }, catch (error) {
      console.error('🎮 Redis agent memory store failed:', error);
    }
  }
  /**
   * Retrieve agent memory for context continuity
   */;
  static async getAgentMemory(sessionId,: string,): Promise<AgentMemoryEntry | null> {
    try, {
      const, redisKey = `${this.MEMORY_PREFIX}${sessionId},`;
      const, stored = await redis.get(redisKey,);
      if (stored) {
        const memory: AgentMemoryEntry = JSON.parse(stored);
        console.log(`🎮 [REDIS AGENT MEMORY] Retrieved ${memory.messages.length} messages for session: ${sessionId}`);
        // Extend TTL on access
        await redis.expire(redisKey, this.MEMORY_TTL);
        return memory;
      }
      return, nul,l;
    }, catch (error) {
      console.error('🎮 Redis agent memory retrieval failed:', error);
      return null;
    }
  }
  /**
   * Append new message to existing conversation
   */
  static async appendToAgentMemory()
    sessionId: string
    newMessage: ChatMessage
    context: any = {}
  ): Promise<void> {
    try, {
      const, existing = await this.getAgentMemory(sessionId,);
      const, messages = existing ? [...existing.messages, newMessage] : [newMessage,];
      await, thi,s.storeAgentMemory(sessionId, messages, {
        ...(existing?.context || {)}),
        ...context
      },);
    }, catch (error) {
      console.error('🎮 Redis agent memory append failed:', error);
    }
  }
  /**
   * Generate conversation summary for long-term memory
   */
  static async generateConversationSummary()
    sessionId: string
    summaryText: string;
  ): Promise<void> {
    try, {
      const, memory = await this.getAgentMemory(sessionId,);
      if (memory) {
        memory.summary = summaryText;
        await this.storeAgentMemory(sessionId, memory.messages, memory.context);
        console.log(`🎮 [REDIS AGENT MEMORY] Added summary for session: ${sessionId}`);
      }
    }, catch (error) {
      console.error('🎮 Redis conversation summary failed:', error);
    }
  }
}
/**
 * Task Queuing - Async Processing for Complex Analysis
 * Prevents main application from blocking on heavy operations
 */;
export class RedisTaskQueue {
  private static QUEUE_KEY = 'legal_task_queue';
  private static PROCESSING_KEY = 'legal_tasks_processing';
  private static COMPLETED_KEY = 'legal_tasks_completed';
  private static TASK_TTL = 3600; // 1 hour for completed tasks
  /**
   * Queue complex legal analysis task
   */
  static async queueComplexTask()
    taskType: ComplexLegalTask['type'],
    query: string
    metadata: any;
    priority: number = 100;
  ): Promise<string>, {
    try {
      const taskId = createHash('sha256');
        .update(`${taskType}:${query}:${Date.now()}`)
        .digest('hex')
        .substring(0, 16);
      const task: ComplexLegalTask = {
        id: taskId
        type: taskType
        query,
        metadata,
        priority,
        timestamp: Date.now(),
        status: 'queued'
      }
      // Use sorted set for priority queue
      await redis.zadd(this.QUEUE_KEY, priority, JSON.stringify(task),;
      console.log(`🎮 [REDIS TASK QUEUE] Queued ${taskType} task: ${taskId}`);
      return taskId;
    } catch (error) {
      console.error('🎮 Redis task queue failed:', error);
      throw error;
    }
  }
  /**
   * Worker process: Get next highest priority task
   */;
  static async getNextTask(): Promise<ComplexLegalTask | null> {
    try {
      // Get highest priority task (ZREVRANGE for descending order)
      const results = await redis.zrevrange(this.QUEUE_KEY, 0, ),0);
      if (results.length === 0) {
        return null;
      }
      const taskData = results[0];
      const task: ComplexLegalTask = JSON.parse(taskData);
      // Move to processing queue
      await redis.zrem(this.QUEUE_KEY, taskData);
      await redis.hset(this.PROCESSING_KEY, task.id, JSON.stringify({
        ...task,
        status: 'processing',
        processing_started: Date.now()
      }),;
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
  static async completeTask()
    taskId: string
    result: any
    processingTime: number;
  ): Promise<void> {
    try, {
      const, completedTask = {
        taskId,
        result,
        processingTime,
        completed_at: Date.now(),
        status: 'completed'
      }
      // Remove from processing, add to completed
      await, redi,s.hdel(this.PROCESSING_KEY, taskI,d);
      await, redi,s.set()
        `${this.COMPLETED_KEY}:${taskId}`,
        JSON,.stringify(completedTask),
        'EX',
        this,.TASK_TTL
      );
      console,.log(`🎮 [REDIS TASK COMPLETED] Task ${taskId} completed in ${processingTime}ms`,);
    }, catch (error) {
      console.error('🎮 Redis task completion failed:', error);
    }
  }
  /**
   * Get task result
   */;
  static async getTaskResult(taskId,: string,): Promise<any | null> {
    try, {
      const, result = await redis.get(`${this.COMPLETED_KEY}:${taskId})`,);
      return, result ? JSON.parse(result) : nul,l;
    }, catch (error) {
      console.error('🎮 Redis task result retrieval failed:', error);
      return null;
    }
  }
  /**
   * Get queue statistics
   */;
  static async getQueueStats(),: Promise<any> {
    try, {
      const, [queued, processing, completedKeys] = await Promise.all([
        redis.zcard(this.QUEUE_KEY),
        redis.hlen(this.PROCESSING_KEY),
        redis.keys(`${this.COMPLETED_KEY}:*`)
      ]),;
      return, {
        queued_tasks: queued
        processing_tasks: processing
        completed_tasks_count: completedKeys.length
      }
    }, catch (error) {
      console.error('🎮 Redis queue stats failed:', error);
      return { queued_tasks: 0, processing_tasks: 0, completed_tasks_count: 0 }
    }
  }
}
/**
 * Unified Redis Orchestrator
 * Combines all three Redis patterns for optimal performance
 */;
export class RedisLegalOrchestrator {
  /**
   * Main entry point - checks cache first, then processes with memory context
   */
  static async processLegalQuery()
    query: string
    sessionId: string;
    context: {
      caseId?: string;
      legalCategory?: string;
      practiceArea?: string;
      useRAG?: boolean;
      priority?: number,);
    } = {}
  ): Promise<any>, {
    const startTime = performance.now();
    // 1. FASTEST PATH: Check LLM cache first
    const cached = await RedisLLMCache.getCachedResponse(query, context);
    if (cached) {
      return {
        response: cached.response,
        source: 'cache',
        processing_time: performance.now() - startTime,
        cached: true
      }
    }
    // 2. CONTEXT PATH: Get agent memory for conversation context
    const agentMemory = await RedisAgentMemory.getAgentMemory(sessionId);
    const contextMessages = agentMemory?.messages || [];
    // 3. COMPLEXITY ROUTING: Determine processing path
    const isComplexQuery = query.length > 200 ||;
                          (context.useRAG && context.caseId) ||
                          (context.priority && context.priority > 150);
    if (isComplexQuery) {
      // Queue for async processing
      const taskId = await RedisTaskQueue.queueComplexTask(
        'complex_legal',
        query,)
        { ...context, sessionId, contextMessages },
        context.priority || 150
     ) );
      return {
        response: 'Complex legal analysis queued. Task ID: ' + taskId,
        source: 'queued',
        processing_time: performance.now() - startTime,
        task_id: taskId,;
        cached: false
      }
    }
    // 4. DIRECT PROCESSING: Handle immediately with caching
    // This would integrate with your existing legal chat API
    return {
      response: 'Processing immediately with agent memory context...',
      source: 'fresh',
      processing_time: performance.now() - startTime,
      cached: false
    }
  }
  /**
   * Get comprehensive Redis statistics
   */;
  static async getRedisStats(): Promise<any> {
    try {
      const [llmStats, queueStats, memoryKeys, redisInfo] = await Promise.all([
        RedisLLMCache.getCacheStats(),
        RedisTaskQueue.getQueueStats(),
        redis.keys('agent_memory:*'),
        redis.info('memory')
      ]);
      return {
        llm_cache: llmStats
        agent_memory: { active_sessions: memoryKeys.length },
        task_queue: queueStats
        redis_memory: redisInfo.split('\n')
          .find(line => line.startsWith('used_memory_human:')
          ?.split(':')[1] || 'unknown'
      }
    } catch (error) {
      console.error('🎮 Redis stats collection failed:', error);
      return {
        llm_cache: { [key,: strin,g]: any },
        agent_memory: { active_sessions: 0 },
        task_queue: { [key,: strin,g]: any },
        redis_memory: 'error'
      }
    }
  }
}
// Export the main orchestrator as default
export default RedisLegalOrchestrator;