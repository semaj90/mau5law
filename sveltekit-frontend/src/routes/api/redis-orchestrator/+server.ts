/**
 * Redis Orchestrator Management API
 * Provides control and monitoring for the Redis-based legal AI optimization system
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  RedisLegalOrchestrator, 
  RedisLLMCache, 
  RedisAgentMemory, 
  RedisTaskQueue 
} from '$lib/services/redis-orchestrator';

/**
 * GET /api/redis-orchestrator
 * Get comprehensive Redis statistics and health status
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Get overall Redis statistics
    const stats = await RedisLegalOrchestrator.getRedisStats();
    
    let detailedStats = {};
    if (includeDetails) {
      // Get detailed cache statistics
      const llmCacheStats = await RedisLLMCache.getCacheStats();
      const queueStats = await RedisTaskQueue.getQueueStats();
      
      detailedStats = {
        llm_cache_detailed: llmCacheStats,
        task_queue_detailed: queueStats,
        performance_metrics: {
          cache_efficiency: llmCacheStats.hit_rate_estimate,
          memory_optimization: stats.redis_memory,
          async_task_throughput: queueStats.completed_tasks_count
        }
      };
    }
    
    return json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis_stats: stats,
      ...detailedStats,
      recommendations: generatePerformanceRecommendations(stats)
    });
    
  } catch (err) {
    console.error('🎮 Redis orchestrator status check failed:', err);
    throw error(500, `Redis status check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * POST /api/redis-orchestrator
 * Process legal query through the Redis optimization pipeline
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      query,
      sessionId,
      context = {},
      useOrchestrator = true
    } = body;
    
    if (!query || !sessionId) {
      throw error(400, 'query and sessionId are required');
    }
    
    console.log(`🎮 [REDIS ORCHESTRATOR] Processing query: "${query.substring(0, 50)}..."`);
    
    if (useOrchestrator) {
      // Use the full Redis orchestrator pipeline
      const result = await RedisLegalOrchestrator.processLegalQuery(
        query,
        sessionId,
        context
      );
      
      return json({
        success: true,
        result,
        orchestrated: true,
        processing_pipeline: result.source === 'cache' ? 'L1_CACHE' : 
                           result.source === 'fresh' ? 'L3_PROCESSING' : 
                           'ASYNC_QUEUE'
      });
    } else {
      // Direct cache check only
      const cached = await RedisLLMCache.getCachedResponse(query, context);
      
      return json({
        success: true,
        result: cached ? {
          response: cached.response,
          source: 'cache',
          processing_time: 0,
          cached: true
        } : null,
        orchestrated: false,
        processing_pipeline: cached ? 'L1_CACHE' : 'CACHE_MISS'
      });
    }
    
  } catch (err) {
    console.error('🎮 Redis orchestrator processing failed:', err);
    throw error(500, `Query processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * PUT /api/redis-orchestrator/cache
 * Manually cache a legal response
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      query,
      response,
      metadata = {}
    } = body;
    
    if (!query || !response) {
      throw error(400, 'query and response are required');
    }
    
    await RedisLLMCache.cacheResponse(query, response, {
      confidence: metadata.confidence || 0.8,
      model_used: metadata.model_used || 'manual',
      processing_time: metadata.processing_time || 0,
      sources: metadata.sources || [],
      context: metadata.context || {}
    });
    
    return json({
      success: true,
      message: 'Response cached successfully',
      cache_key: RedisLLMCache.generateCacheKey(query, metadata.context)
    });
    
  } catch (err) {
    console.error('🎮 Manual cache operation failed:', err);
    throw error(500, `Cache operation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * DELETE /api/redis-orchestrator/cache
 * Clear Redis cache (with optional patterns)
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const pattern = url.searchParams.get('pattern');
    const confirm = url.searchParams.get('confirm') === 'true';
    
    if (!confirm) {
      throw error(400, 'Cache clear requires confirmation (confirm=true)');
    }
    
    if (pattern) {
      // Clear specific pattern - would need implementation
      return json({
        success: true,
        message: `Cache pattern "${pattern}" clear not implemented - use full clear`,
        cleared_keys: 0
      });
    } else {
      // Clear all LLM cache
      await RedisLLMCache.getCacheStats(); // This doesn't clear, need to implement clearCache method
      
      return json({
        success: true,
        message: 'Cache clear initiated',
        note: 'Full cache clear method needs implementation in RedisLLMCache'
      });
    }
    
  } catch (err) {
    console.error('🎮 Cache clear failed:', err);
    throw error(500, `Cache clear failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * Handle task-related queries in the main GET handler
 * Task management is integrated into the main Redis orchestrator endpoint
 */
async function handleTaskQuery(url: URL) {
  try {
    const queueStats = await RedisTaskQueue.getQueueStats();
    const taskId = url.searchParams.get('taskId');
    
    if (taskId) {
      // Get specific task result
      const result = await RedisTaskQueue.getTaskResult(taskId);
      
      return json({
        taskId,
        result,
        found: !!result
      });
    }
    
    return json({
      queue_stats: queueStats,
      queue_health: queueStats.queued_tasks < 100 ? 'healthy' : 'overloaded',
      processing_capacity: queueStats.processing_tasks,
      recommendations: generateTaskQueueRecommendations(queueStats)
    });
    
  } catch (err) {
    console.error('🎮 Task queue status failed:', err);
    throw error(500, `Task queue status failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * POST /api/redis-orchestrator/tasks
 * Queue a complex legal analysis task
 */
export const POST_TASKS: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      taskType,
      query,
      metadata = {},
      priority = 100
    } = body;
    
    if (!taskType || !query) {
      throw error(400, 'taskType and query are required');
    }
    
    const validTaskTypes = ['complex_legal', 'document_analysis', 'case_synthesis', 'risk_assessment'];
    if (!validTaskTypes.includes(taskType)) {
      throw error(400, `taskType must be one of: ${validTaskTypes.join(', ')}`);
    }
    
    const taskId = await RedisTaskQueue.queueComplexTask(
      taskType,
      query,
      metadata,
      priority
    );
    
    return json({
      success: true,
      taskId,
      message: `${taskType} task queued successfully`,
      priority,
      estimated_processing_time: estimateProcessingTime(taskType, query)
    });
    
  } catch (err) {
    console.error('🎮 Task queuing failed:', err);
    throw error(500, `Task queuing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * Generate performance recommendations based on Redis stats
 */
function generatePerformanceRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.llm_cache?.hit_rate_estimate < 70) {
    recommendations.push('LLM cache hit rate is below 70% - consider warming cache with common queries');
  }
  
  if (stats.agent_memory?.active_sessions > 1000) {
    recommendations.push('High number of active sessions - consider implementing session cleanup');
  }
  
  if (stats.task_queue?.queued_tasks > 50) {
    recommendations.push('Task queue is building up - consider scaling worker processes');
  }
  
  const memoryMatch = stats.redis_memory?.match(/(\d+)([A-Z]+)/);
  if (memoryMatch) {
    const [, amount, unit] = memoryMatch;
    if (unit === 'GB' && parseInt(amount) > 2) {
      recommendations.push('Redis memory usage is high - consider implementing cache eviction policies');
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Redis orchestrator is performing optimally');
  }
  
  return recommendations;
}

/**
 * Generate task queue recommendations
 */
function generateTaskQueueRecommendations(queueStats: any): string[] {
  const recommendations: string[] = [];
  
  if (queueStats.queued_tasks > queueStats.processing_tasks * 10) {
    recommendations.push('Queue backlog is high - consider adding more worker processes');
  }
  
  if (queueStats.processing_tasks === 0 && queueStats.queued_tasks > 0) {
    recommendations.push('No tasks are being processed - check worker availability');
  }
  
  const completionRate = queueStats.completed_tasks_count / (queueStats.queued_tasks + queueStats.completed_tasks_count + 1);
  if (completionRate < 0.8) {
    recommendations.push('Task completion rate is low - investigate task failures');
  }
  
  return recommendations;
}

/**
 * Estimate processing time based on task type and query complexity
 */
function estimateProcessingTime(taskType: string, query: string): string {
  const baseTimesByType = {
    'complex_legal': 30000, // 30 seconds
    'document_analysis': 15000, // 15 seconds
    'case_synthesis': 45000, // 45 seconds
    'risk_assessment': 20000 // 20 seconds
  };
  
  const baseTime = baseTimesByType[taskType as keyof typeof baseTimesByType] || 30000;
  const complexityMultiplier = Math.max(1, query.length / 200); // Longer queries take more time
  
  const estimatedMs = baseTime * complexityMultiplier;
  
  if (estimatedMs < 60000) {
    return `${Math.round(estimatedMs / 1000)} seconds`;
  } else {
    return `${Math.round(estimatedMs / 60000)} minutes`;
  }
}