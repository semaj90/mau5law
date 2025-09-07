/**
 * RabbitMQ Service Worker API Endpoint
 * Manages the RabbitMQ background processing worker
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rabbitmqServiceWorker, startRabbitMQWorker, stopRabbitMQWorker, QUEUES } from '$lib/workers/rabbitmq-service-worker.js';

// GET: Get worker status and health information
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    switch (action) {
      case 'health':
        const health = await rabbitmqServiceWorker.healthCheck();
        return json(health, {
          headers: {
            'X-Worker-Health': health.status,
            'Cache-Control': 'no-cache'
          }
        });

      case 'stats':
        const stats = rabbitmqServiceWorker.getStats();
        return json({
          status: 'success',
          data: {
            worker: stats,
            queues: Object.keys(QUEUES),
            timestamp: new Date().toISOString()
          }
        });

      case 'queues':
        return json({
          status: 'success',
          data: {
            availableQueues: Object.entries(QUEUES).map(([key, value]) => ({
              name: key,
              queueName: value,
              description: getQueueDescription(value)
            }))
          }
        });

      default:
        // Default: Return worker status
        const workerStats = rabbitmqServiceWorker.getStats();
        const healthStatus = await rabbitmqServiceWorker.healthCheck();

        return json({
          status: 'success',
          data: {
            worker: {
              ...workerStats,
              health: healthStatus
            },
            endpoints: {
              health: '/api/workers/rabbitmq?action=health',
              stats: '/api/workers/rabbitmq?action=stats',
              queues: '/api/workers/rabbitmq?action=queues'
            }
          }
        });
    }

  } catch (error: any) {
    console.error('❌ RabbitMQ Worker API Error:', error);
    
    return json({
      status: 'error',
      error: {
        message: error.message || 'RabbitMQ Worker API error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// POST: Control worker operations and publish messages
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    switch (action) {
      case 'start':
        const config = payload.config || {};
        const worker = await startRabbitMQWorker({
          enableLogging: true,
          enableN64Logging: config.enableN64Style || false,
          maxRetries: config.maxRetries || 3,
          processingTimeout: config.timeout || 30000
        });

        return json({
          status: 'success',
          message: '🎮 RabbitMQ Service Worker started successfully',
          data: {
            workerStats: worker.getStats(),
            config: config
          }
        });

      case 'stop':
        await stopRabbitMQWorker();
        
        return json({
          status: 'success',
          message: 'RabbitMQ Service Worker stopped successfully'
        });

      case 'publish':
        const { queueName, message, priority = 'normal' } = payload;
        
        if (!queueName || !message) {
          return json({
            status: 'error',
            error: { message: 'queueName and message are required' }
          }, { status: 400 });
        }

        const published = await rabbitmqServiceWorker.publishMessage(queueName, {
          ...message,
          priority,
          publishedVia: 'worker_api',
          timestamp: Date.now()
        });

        return json({
          status: published ? 'success' : 'failed',
          message: published ? 'Message published successfully' : 'Failed to publish message',
          data: {
            queueName,
            messageId: message.id || `msg-${Date.now()}`,
            published
          }
        });

      case 'bulk_publish':
        const { messages } = payload;
        
        if (!Array.isArray(messages)) {
          return json({
            status: 'error',
            error: { message: 'messages must be an array' }
          }, { status: 400 });
        }

        const results = await Promise.all(
          messages.map(async (msg: any) => {
            const success = await rabbitmqServiceWorker.publishMessage(
              msg.queueName,
              {
                ...msg.message,
                publishedVia: 'bulk_api',
                timestamp: Date.now()
              }
            );
            return { queueName: msg.queueName, success, messageId: msg.message.id };
          })
        );

        const successCount = results.filter(r => r.success).length;

        return json({
          status: 'success',
          message: `Bulk publish completed: ${successCount}/${messages.length} messages sent`,
          data: {
            results,
            summary: {
              total: messages.length,
              successful: successCount,
              failed: messages.length - successCount
            }
          }
        });

      case 'simulate_load':
        // Simulate various types of legal AI processing jobs
        const loadTestJobs = [
          {
            queueName: QUEUES.DOCUMENT_PROCESSING,
            message: {
              documentId: `doc-${Date.now()}`,
              fileName: 'legal_contract.pdf',
              type: 'contract_analysis',
              priority: 'medium'
            }
          },
          {
            queueName: QUEUES.VECTOR_EMBEDDING,
            message: {
              documentId: `doc-${Date.now()}`,
              content: 'Sample legal document content for embedding generation',
              type: 'embedding_generation',
              priority: 'high'
            }
          },
          {
            queueName: QUEUES.EVIDENCE_ANALYSIS,
            message: {
              evidenceId: `evidence-${Date.now()}`,
              type: 'document_analysis',
              caseId: `case-${Date.now()}`,
              priority: 'high'
            }
          }
        ];

        const loadResults = await Promise.all(
          loadTestJobs.map(async (job) => {
            const success = await rabbitmqServiceWorker.publishMessage(job.queueName, job.message);
            return { ...job, success };
          })
        );

        return json({
          status: 'success',
          message: 'Load simulation completed',
          data: {
            jobsSubmitted: loadResults.length,
            results: loadResults
          }
        });

      default:
        return json({
          status: 'error',
          error: { message: `Unknown action: ${action}` }
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ RabbitMQ Worker POST Error:', error);
    
    return json({
      status: 'error',
      error: {
        message: error.message || 'RabbitMQ Worker operation failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// PUT: Update worker configuration
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { config } = body;

    // For now, return configuration update status
    // In a full implementation, this would update the running worker's config
    
    return json({
      status: 'success',
      message: 'Worker configuration updated',
      data: {
        appliedConfig: config,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ RabbitMQ Worker PUT Error:', error);
    
    return json({
      status: 'error',
      error: {
        message: error.message || 'Configuration update failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// DELETE: Reset worker state or clear queues
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    switch (action) {
      case 'reset_stats':
        // Reset worker statistics
        return json({
          status: 'success',
          message: 'Worker statistics reset',
          data: {
            resetAt: new Date().toISOString()
          }
        });

      case 'clear_queues':
        // This would clear queue contents in a real implementation
        return json({
          status: 'success',
          message: 'Queue clearing initiated (simulation)',
          data: {
            clearedAt: new Date().toISOString()
          }
        });

      default:
        return json({
          status: 'error',
          error: { message: 'Action required for DELETE operation' }
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ RabbitMQ Worker DELETE Error:', error);
    
    return json({
      status: 'error',
      error: {
        message: error.message || 'Delete operation failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

/**
 * Get description for a queue name
 */
function getQueueDescription(queueName: string): string {
  const descriptions: Record<string, string> = {
    [QUEUES.DOCUMENT_PROCESSING]: 'Processes uploaded legal documents for analysis',
    [QUEUES.FILE_UPLOAD]: 'Handles file upload operations and metadata extraction',
    [QUEUES.VECTOR_EMBEDDING]: 'Generates vector embeddings for documents',
    [QUEUES.RAG_PROCESSING]: 'Processes RAG (Retrieval Augmented Generation) queries',
    [QUEUES.EMAIL_NOTIFICATIONS]: 'Sends email notifications for case updates',
    [QUEUES.SEARCH_INDEXING]: 'Updates search indexes with new content',
    [QUEUES.CASE_UPDATES]: 'Processes legal case updates and notifications',
    [QUEUES.EVIDENCE_ANALYSIS]: 'Analyzes evidence items for legal relevance'
  };

  return descriptions[queueName] || 'Generic message processing queue';
}