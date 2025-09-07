// Server-Sent Events endpoint for real-time workflow updates
import type { RequestHandler } from './$types';
import { workflowOrchestrator } from '$lib/server/workflows/orchestrator';

export const GET: RequestHandler = async ({ url, request }) => {
  console.log('📡 SSE client connected to workflow updates');
  
  const workflowId = url.searchParams.get('workflowId');
  const clientId = url.searchParams.get('clientId') || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log(`🔌 Starting SSE stream for client: ${clientId}`);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      const sendEvent = (type: string, data: any, id?: string) => {
        let message = '';
        if (id) message += `id: ${id}\n`;
        message += `event: ${type}\n`;
        message += `data: ${JSON.stringify(data)}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('❌ SSE send error:', error);
        }
      };
      
      // Send connection confirmation
      sendEvent('connected', {
        clientId,
        timestamp: Date.now(),
        server: 'legal-ai-sse',
        version: '1.0.0'
      });
      
      // If specific workflow requested, send current status
      if (workflowId) {
        const workflow = workflowOrchestrator.getWorkflowStatus(workflowId);
        if (workflow) {
          sendEvent('workflow-status', {
            workflowId,
            status: workflow.status,
            progress: workflow.progress,
            type: workflow.type,
            updatedAt: workflow.updatedAt,
            context: workflow.context
          }, `status-${workflowId}-${Date.now()}`);
        } else {
          sendEvent('error', {
            message: `Workflow ${workflowId} not found`,
            code: 'WORKFLOW_NOT_FOUND'
          });
        }
      } else {
        // Send overview of all workflows
        const stats = workflowOrchestrator.getStatistics();
        sendEvent('overview', stats, `overview-${Date.now()}`);
      }
      
      // Subscribe to workflow events
      const unsubscribeProgress = workflowOrchestrator.subscribe('WORKFLOW_PROGRESS', (event) => {
        if (!workflowId || event.workflowId === workflowId) {
          sendEvent('progress', {
            workflowId: event.workflowId,
            progress: event.payload.progress,
            stage: event.payload.stage,
            state: event.payload.state,
            timestamp: event.timestamp
          }, `progress-${event.workflowId}-${event.timestamp}`);
        }
      });
      
      const unsubscribeStarted = workflowOrchestrator.subscribe('WORKFLOW_STARTED', (event) => {
        if (!workflowId || event.workflowId === workflowId) {
          sendEvent('started', {
            workflowId: event.workflowId,
            type: event.payload.type,
            timestamp: event.timestamp,
            ...event.payload
          }, `started-${event.workflowId}-${event.timestamp}`);
        }
      });
      
      const unsubscribeCompleted = workflowOrchestrator.subscribe('WORKFLOW_COMPLETED', (event) => {
        if (!workflowId || event.workflowId === workflowId) {
          sendEvent('completed', {
            workflowId: event.workflowId,
            timestamp: event.timestamp,
            finalContext: event.payload.finalContext
          }, `completed-${event.workflowId}-${event.timestamp}`);
        }
      });
      
      const unsubscribeFailed = workflowOrchestrator.subscribe('WORKFLOW_FAILED', (event) => {
        if (!workflowId || event.workflowId === workflowId) {
          sendEvent('failed', {
            workflowId: event.workflowId,
            timestamp: event.timestamp,
            error: event.payload.error
          }, `failed-${event.workflowId}-${event.timestamp}`);
        }
      });
      
      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent('heartbeat', {
            timestamp: Date.now(),
            clientId
          });
        } catch (error) {
          console.log('📡 SSE client disconnected (heartbeat failed)');
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds
      
      // Send periodic stats update if no specific workflow
      let statsInterval: NodeJS.Timeout | null = null;
      if (!workflowId) {
        statsInterval = setInterval(() => {
          try {
            const stats = workflowOrchestrator.getStatistics();
            sendEvent('stats-update', stats, `stats-${Date.now()}`);
          } catch (error) {
            console.log('📡 SSE client disconnected (stats update failed)');
            clearInterval(statsInterval!);
          }
        }, 5000); // Every 5 seconds
      }
      
      // Handle client disconnect
      let disconnected = false;
      const cleanup = () => {
        if (disconnected) return;
        disconnected = true;
        
        console.log(`🔌 SSE client disconnected: ${clientId}`);
        
        unsubscribeProgress();
        unsubscribeStarted();
        unsubscribeCompleted();
        unsubscribeFailed();
        
        clearInterval(heartbeatInterval);
        if (statsInterval) clearInterval(statsInterval);
        
        try {
          controller.close();
        } catch (error) {
          // Controller already closed
        }
      };
      
      // Detect client disconnect via AbortSignal
      const abortController = new AbortController();
      request.signal?.addEventListener('abort', cleanup);
      
      // Store cleanup function for explicit disconnect handling
      (controller as any).cleanup = cleanup;
    },
    
    cancel() {
      console.log('📡 SSE stream cancelled');
      if ((this as any).cleanup) {
        (this as any).cleanup();
      }
    }
  });
  
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
};

// Handle preflight OPTIONS requests for CORS
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
};