/**
 * Embedding Worker Management API
 * Controls RabbitMQ embedding workers and job queuing
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { rabbitmqEmbeddingWorker } from '$lib/workers/rabbitmq-embedding-worker';
import { rabbitMQService } from '$lib/services/rabbitmq-connection';
import { QUEUES } from '$lib/config/rabbitmq-config';
import type { EmbeddingJobPayload, BulkEmbeddingJobPayload } from '$lib/workers/rabbitmq-embedding-worker';

// Worker status and control endpoints
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'status':
        return await getWorkerStatus();
      case 'health':
        return await getWorkerHealth();
      case 'stats':
        return await getWorkerStats();
      case 'queues':
        return await getQueueInfo();
      default:
        return await getWorkerStatus();
    }
  } catch (error) {
    console.error('Error in embedding worker API:', error);
    return json(
      { error: 'Failed to get worker information', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'start':
        return await startWorker();
      case 'stop':
        return await stopWorker();
      case 'restart':
        return await restartWorker();
      case 'reset-stats':
        return await resetWorkerStats();
      case 'queue-job':
        return await queueEmbeddingJob(request);
      case 'queue-bulk':
        return await queueBulkEmbeddingJob(request);
      case 'test':
        return await testWorker(request);
      default:
        return json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in embedding worker API:', error);
    return json(
      { error: 'Worker operation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

// Get worker status
async function getWorkerStatus(): Promise<Response> {
  const stats = rabbitmqEmbeddingWorker.getStats();
  const rabbitHealth = await rabbitMQService.healthCheck();
  
  return json({
    worker: {
      running: stats.isRunning,
      uptime: stats.uptime,
      start_time: stats.startTime
    },
    jobs: {
      processed: stats.processedJobs,
      failed: stats.failedJobs,
      success_rate: stats.successRate
    },
    rabbitmq: {
      connected: rabbitHealth.connected,
      channels: rabbitHealth.channels,
      consumers: rabbitHealth.consumers
    }
  });
}

// Get worker health check
async function getWorkerHealth(): Promise<Response> {
  const health = await rabbitmqEmbeddingWorker.healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return json(health, { status: statusCode });
}

// Get detailed worker statistics
async function getWorkerStats(): Promise<Response> {
  const stats = rabbitmqEmbeddingWorker.getStats();
  const rabbitHealth = await rabbitMQService.healthCheck();
  
  return json({
    ...stats,
    rabbitmq_health: rabbitHealth,
    uptime_formatted: stats.uptime ? formatUptime(stats.uptime) : null
  });
}

// Get queue information
async function getQueueInfo(): Promise<Response> {
  try {
    const queueNames = [QUEUES.DOCUMENT_EMBEDDING, QUEUES.CASE_EMBEDDING];
    const queueInfo: Record<string, any> = {};
    
    for (const queueName of queueNames) {
      try {
        const info = await rabbitMQService.getQueueInfo(queueName);
        queueInfo[queueName] = {
          name: queueName,
          message_count: info.messageCount,
          consumer_count: info.consumerCount,
          status: info.consumerCount > 0 ? 'active' : 'idle'
        };
      } catch (error) {
        queueInfo[queueName] = {
          name: queueName,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    return json({
      queues: queueInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return json(
      { error: 'Failed to get queue information', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Start worker
async function startWorker(): Promise<Response> {
  try {
    await rabbitmqEmbeddingWorker.start();
    return json({ 
      message: 'Worker started successfully', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return json(
      { error: 'Failed to start worker', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Stop worker
async function stopWorker(): Promise<Response> {
  try {
    await rabbitmqEmbeddingWorker.stop();
    return json({ 
      message: 'Worker stopped successfully', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return json(
      { error: 'Failed to stop worker', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Restart worker
async function restartWorker(): Promise<Response> {
  try {
    await rabbitmqEmbeddingWorker.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await rabbitmqEmbeddingWorker.start();
    return json({ 
      message: 'Worker restarted successfully', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return json(
      { error: 'Failed to restart worker', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Reset worker statistics
async function resetWorkerStats(): Promise<Response> {
  rabbitmqEmbeddingWorker.resetStats();
  return json({ 
    message: 'Worker statistics reset', 
    timestamp: new Date().toISOString() 
  });
}

// Queue single embedding job
async function queueEmbeddingJob(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as EmbeddingJobPayload & {
      priority?: number;
      correlationId?: string;
      maxRetries?: number;
    };
    
    // Validate payload
    if (!payload.entity_type || !payload.entity_id) {
      return json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }
    
    // Determine job type based on entity type and embedding type
    const jobType = `generate_${payload.entity_type}_${payload.embedding_type || 'content'}_embedding`;
    
    // Queue job
    const jobId = await rabbitMQService.publishJob(
      payload.entity_type === 'case' ? QUEUES.CASE_EMBEDDING : QUEUES.DOCUMENT_EMBEDDING,
      jobType,
      payload,
      {
        priority: payload.priority || 5,
        correlationId: payload.correlationId,
        maxRetries: payload.maxRetries || 3
      }
    );
    
    return json({
      job_id: jobId,
      job_type: jobType,
      queue: payload.entity_type === 'case' ? QUEUES.CASE_EMBEDDING : QUEUES.DOCUMENT_EMBEDDING,
      message: 'Embedding job queued successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });
    
  } catch (error) {
    return json(
      { error: 'Failed to queue embedding job', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Queue bulk embedding job
async function queueBulkEmbeddingJob(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as BulkEmbeddingJobPayload & {
      priority?: number;
      correlationId?: string;
      maxRetries?: number;
    };
    
    // Validate payload
    if (!payload.entities || !Array.isArray(payload.entities) || payload.entities.length === 0) {
      return json(
        { error: 'entities array is required and cannot be empty' },
        { status: 400 }
      );
    }
    
    // Validate entities
    for (const entity of payload.entities) {
      if (!entity.entity_type || !entity.entity_id || !entity.text_content) {
        return json(
          { error: 'Each entity must have entity_type, entity_id, and text_content' },
          { status: 400 }
        );
      }
    }
    
    const jobType = 'bulk_embedding_generation';
    
    // Queue bulk job
    const jobId = await rabbitMQService.publishJob(
      'legal_ai.embedding.bulk', // Use dedicated bulk queue
      jobType,
      payload,
      {
        priority: payload.priority || 7, // Higher priority for bulk jobs
        correlationId: payload.correlationId,
        maxRetries: payload.maxRetries || 2
      }
    );
    
    return json({
      job_id: jobId,
      job_type: jobType,
      queue: 'legal_ai.embedding.bulk',
      entity_count: payload.entities.length,
      batch_size: payload.batch_size || 10,
      message: 'Bulk embedding job queued successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });
    
  } catch (error) {
    return json(
      { error: 'Failed to queue bulk embedding job', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Test worker with sample data
async function testWorker(request: Request): Promise<Response> {
  try {
    const { test_type = 'basic' } = await request.json().catch(() => ({}));
    
    let testPayload: EmbeddingJobPayload;
    
    switch (test_type) {
      case 'document':
        testPayload = {
          entity_type: 'document',
          entity_id: 'test-doc-' + Date.now(),
          text_content: 'This is a test document for embedding generation. It contains legal content about contracts and agreements.',
          embedding_type: 'content'
        };
        break;
        
      case 'case':
        testPayload = {
          entity_type: 'case',
          entity_id: 'test-case-' + Date.now(),
          text_content: 'Smith vs. Jones - A contract dispute case involving breach of agreement terms and damages.'
        };
        break;
        
      default:
        testPayload = {
          entity_type: 'document',
          entity_id: 'test-basic-' + Date.now(),
          text_content: 'Basic test text for embedding generation.',
          embedding_type: 'content'
        };
    }
    
    // Queue test job
    const jobId = await rabbitMQService.publishJob(
      testPayload.entity_type === 'case' ? QUEUES.CASE_EMBEDDING : QUEUES.DOCUMENT_EMBEDDING,
      `test_${testPayload.entity_type}_embedding`,
      testPayload,
      {
        priority: 8, // High priority for test jobs
        correlationId: `test-${Date.now()}`,
        maxRetries: 1
      }
    );
    
    return json({
      job_id: jobId,
      test_type,
      test_payload: testPayload,
      message: 'Test embedding job queued successfully',
      note: 'This test job uses fake entity IDs and will not update database records',
      timestamp: new Date().toISOString()
    }, { status: 201 });
    
  } catch (error) {
    return json(
      { error: 'Failed to queue test job', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Utility function to format uptime
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}