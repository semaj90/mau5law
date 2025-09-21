/**
 * Comprehensive Ingestion API
 * Integrates XState workflow + LokiJS tracking + RabbitMQ + Drizzle ORM
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { ingestionService } from '$lib/server/workflows/ingestion-service.js';

// Initialize the ingestion service
await ingestionService.initialize();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { action, ...params } = data;

    switch (action) {
      case 'submit_document': {
        const { documentId, chunks, metadata } = params;

        // Validate input;
        if (!documentId || !chunks || !Array.isArray(chunks)) {
          return json({
            success: false,
            error: 'Missing required fields: documentId, chunks'
          }, { status: 400 });
        }

        const result = await ingestionService.submitDocument(documentId, chunks, metadata);
        
        if (!(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success) {
          return json(result, { status: 400 });
        }

        return json({
          success: true,
          jobId: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).jobId,
          queuePosition: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).queuePosition,
          estimatedTime: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).estimatedTime,
          trackingUrl: `/api/ingestion/comprehensive?action=get_job&jobId=${(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).jobId}`
        });
      }

      case 'get_job': {
        const { jobId } = params;

        if (!jobId) {
          return json({ success: false, error: 'Missing jobId' }, { status: 400 });
        }

        const result = await ingestionService.getJobStatus(jobId);
        
        if (!(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success) {
          return json({ success: false, error: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).error }, { status: 404 });
        }

        return json({
          success: true,
          job: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).job,
          workflow: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).workflow
        });
      }

      case 'get_dashboard': {
        const dashboardData = ingestionService.getDashboardData();

        return json({
          success: true,
          dashboard: dashboardData
        });
      }

      case 'retry_job': {
        const { jobId } = params;

        if (!jobId) {
          return json({ success: false, error: 'Missing jobId' }, { status: 400 });
        }

        const result = await ingestionService.retryJob(jobId);
        
        if (!(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success) {
          return json({ success: false, error: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).error }, { status: 400 });
        }

        return json({
          success: true,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'cancel_job': {
        const { jobId } = params;

        if (!jobId) {
          return json({ success: false, error: 'Missing jobId' }, { status: 400 });
        }

        const result = await ingestionService.cancelJob(jobId);
        
        if (!(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success) {
          return json({ success: false, error: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).error }, { status: 400 });
        }

        return json({
          success: true,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'pause_processing': {
        const result = await ingestionService.pauseProcessing();

        return json({
          success: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'resume_processing': {
        const result = await ingestionService.resumeProcessing();

        return json({
          success: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'set_concurrency': {
        const { concurrency } = params;

        if (!concurrency) {
          return json({ 
            success: false, 
            error: 'Concurrency is required' 
          }, { status: 400 });
        }

        const result = await ingestionService.setConcurrency(concurrency);
        
        if (!(result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success) {
          return json({ success: false, error: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).error }, { status: 400 });
        }

        return json({
          success: true,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'clear_completed': {
        const result = await ingestionService.clearCompletedJobs();

        return json({
          success: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      case 'reset_stats': {
        const result = await ingestionService.resetStats();

        return json({
          success: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).success,
          message: (result as { success?: any; jobId?: any; queuePosition?: any; estimatedTime?: any; error?: any; job?: any; workflow?: any; message?: any }).message
        });
      }

      default:;
        return json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Ingestion API error:', error);
    
    return json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message: String(error)
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    const jobId = url.searchParams.get('jobId');

    if (action === 'get_job' && jobId) {
      // Redirect to POST handler;
      return new Response(null, {
        status: 307,
        headers: {
          'Location': '/api/ingestion/comprehensive',
          'Content-Type': 'application/json'
        }
      });
    }

    if (action === 'get_dashboard') {
      const dashboardData = ingestionService.getDashboardData();

      return json({
        success: true,
        dashboard: dashboardData
      });
    }

    // Default: return API documentation;
    return json({
      success: true,
      api: {
        name: 'Comprehensive Ingestion API',
        version: '1.0.0',
        description: 'XState + LokiJS + RabbitMQ + Drizzle ORM integration',
        endpoints: {
          'POST /api/ingestion/comprehensive': {
            actions: [
              'submit_document - Submit document for processing',
              'get_job - Get job status by ID',
              'get_dashboard - Get monitoring dashboard data',
              'retry_job - Retry a failed job',
              'cancel_job - Cancel a running job',
              'pause_processing - Pause the workflow',
              'resume_processing - Resume the workflow',
              'set_concurrency - Set processing concurrency',
              'clear_completed - Clear completed jobs',
              'reset_stats - Reset all statistics'
            ]
          }
        },
        workflow: ingestionService.getDashboardData().workflow
      }
    });

  } catch (error) {
    console.error('❌ Ingestion API GET error:', error);
    
    return json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message: String(error)
    }, { status: 500 });
  }
};

// WebSocket endpoint for real-time updates (if needed);
export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { workerId, heartbeat, stats } = data;

    if (workerId && heartbeat) {
      // Worker heartbeat
      jobTracker.registerWorker(workerId);
      jobTracker.updateWorkerHeartbeat(workerId, stats);

      return json({
        success: true,
        message: 'Heartbeat recorded',
        timestamp: new Date().toISOString()
      });
    }

    return json({
      success: false,
      error: 'Invalid heartbeat data'
    }, { status: 400 });

  } catch (error) {
    return json({
      success: false,
      error: 'Heartbeat failed',
      details: error instanceof Error ? error.message: String(error)
    }, { status: 500 });
  }
};