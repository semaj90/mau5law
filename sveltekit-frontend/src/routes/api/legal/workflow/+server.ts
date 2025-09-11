// Legal Document Workflow API - RabbitMQ + XState Integration
// Demonstrates enterprise-grade message queuing with state machines

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rabbitmqService, type LegalDocumentMessage } from '$lib/server/messaging/rabbitmq-service';
import { logger } from '$lib/server/ai/logger';

let isInitialized = false;

// Initialize RabbitMQ on first request
async function ensureRabbitMQInitialized() {
  if (!isInitialized && !rabbitmqService.connected) {
    try {
      await rabbitmqService.initialize();
      isInitialized = true;
      logger.info('[Legal Workflow API] RabbitMQ initialized successfully');
    } catch (error) {
      logger.error('[Legal Workflow API] Failed to initialize RabbitMQ:', error);
      throw error;
    }
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const startTime = Date.now();
    
    // Parse request body
    const body = await request.json();
    const { content, documentType, caseId, priority = 'normal' } = body;
    
    // Validate required fields
    if (!content || !documentType || !caseId) {
      return json({
        success: false,
        error: 'Missing required fields: content, documentType, caseId',
      }, { status: 400 });
    }
    
    // Ensure RabbitMQ is initialized
    await ensureRabbitMQInitialized();
    
    // Create legal document message
    const documentMessage: LegalDocumentMessage = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      documentId: `${caseId}_${Date.now()}`,
      caseId,
      documentType: documentType as LegalDocumentMessage['documentType'],
      content,
      metadata: {
        submittedAt: new Date().toISOString(),
        source: 'api',
        contentLength: content.length,
        ...body.metadata,
      },
      priority: priority as LegalDocumentMessage['priority'],
      retryCount: 0,
      timestamp: Date.now(),
    };
    
    // Publish to RabbitMQ for processing
    const published = await rabbitmqService.publishDocumentForAnalysis(documentMessage);
    
    if (!published) {
      return json({
        success: false,
        error: 'Failed to queue document for processing',
      }, { status: 500 });
    }
    
    const responseTime = Date.now() - startTime;
    
    logger.info(`[Legal Workflow API] Document ${documentMessage.id} queued for processing (${responseTime}ms)`);
    
    return json({
      success: true,
      documentId: documentMessage.id,
      caseId: documentMessage.caseId,
      queuedAt: new Date().toISOString(),
      expectedProcessingTime: priority === 'urgent' ? '2-5 minutes' : '5-15 minutes',
      responseTime: `${responseTime}ms`,
      message: 'Document queued for legal analysis workflow',
    });
    
  } catch (error) {
    logger.error('[Legal Workflow API] Error processing request:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Ensure RabbitMQ is initialized
    await ensureRabbitMQInitialized();
    
    // Get queue statistics
    const queueStats = await rabbitmqService.getQueueStats();
    
    // Calculate total messages across all queues
    const totalMessages = Object.values(queueStats).reduce((total, stat: any) => {
      return total + (typeof stat.messageCount === 'number' ? stat.messageCount : 0);
    }, 0);
    
    return json({
      status: 'operational',
      services: {
        rabbitmq: {
          connected: rabbitmqService.connected,
          queues: queueStats,
          totalMessages,
        },
        xstate: {
          status: 'ready',
          machineTypes: ['legalDocumentWorkflow', 'contractAnalysis', 'evidenceProcessing'],
        },
      },
      endpoints: {
        submit: 'POST /api/legal/workflow',
        status: 'GET /api/legal/workflow',
        managementUI: 'http://localhost:15672 (legal_admin:123456)',
      },
      usage: {
        submitDocument: {
          method: 'POST',
          url: '/api/legal/workflow',
          body: {
            content: 'Document content here...',
            documentType: 'contract | evidence | brief | citation | discovery',
            caseId: 'CASE-2025-001',
            priority: 'low | normal | high | urgent',
            metadata: {
              fileName: 'optional-file-name.pdf',
              tags: ['contract', 'employment'],
            },
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[Legal Workflow API] Error getting status:', error);
    
    return json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
};