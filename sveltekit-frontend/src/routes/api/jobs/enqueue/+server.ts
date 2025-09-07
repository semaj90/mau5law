/**
 * Job Enqueueing API
 * 
 * Allows enqueueing embedding and other processing jobs
 * Integrates with enhanced embedding worker system
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enhancedEmbeddingWorker } from '$lib/workers/embedding-worker-enhanced.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { jobType, ...jobData } = body;

    if (!jobType) {
      return json({ 
        success: false, 
        error: 'jobType is required' 
      }, { status: 400 });
    }

    switch (jobType) {
      case 'embedding': {
        const { text, model = 'nomic-embed-text', meta = {}, priority = 1 } = jobData;
        
        if (!text) {
          return json({ 
            success: false, 
            error: 'text is required for embedding jobs' 
          }, { status: 400 });
        }

        const jobId = await enhancedEmbeddingWorker.enqueueJob({
          text,
          model,
          meta,
          priority
        });

        return json({
          success: true,
          jobId,
          jobType: 'embedding',
          statusEndpoint: `/api/jobs/stream?jobIds=${jobId}`,
          estimatedDuration: Math.ceil(text.length * 0.1) + 1000 // rough estimate
        });
      }

      case 'batch-embedding': {
        const { texts, model = 'nomic-embed-text', meta = {}, priority = 1 } = jobData;
        
        if (!Array.isArray(texts) || texts.length === 0) {
          return json({ 
            success: false, 
            error: 'texts array is required for batch embedding jobs' 
          }, { status: 400 });
        }

        const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const jobIds: string[] = [];

        // Enqueue all texts as separate jobs with shared batch ID
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          const jobId = await enhancedEmbeddingWorker.enqueueJob({
            text,
            model,
            meta: {
              ...meta,
              batchId,
              batchIndex: i,
              batchSize: texts.length
            },
            priority
          });
          jobIds.push(jobId);
        }

        return json({
          success: true,
          batchId,
          jobIds,
          jobType: 'batch-embedding',
          batchSize: texts.length,
          statusEndpoint: `/api/jobs/stream?jobIds=${jobIds.join(',')}`,
          estimatedDuration: Math.ceil(texts.reduce((sum, text) => sum + text.length, 0) * 0.1 / 10) + 2000
        });
      }

      default:
        return json({ 
          success: false, 
          error: `Unknown job type: ${jobType}` 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Job enqueueing error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Get queue status
    const queueStatus = await enhancedEmbeddingWorker.getQueueStatus();
    const workerStats = enhancedEmbeddingWorker.getStats();

    return json({
      success: true,
      queueStatus,
      workerStats,
      availableJobTypes: [
        {
          type: 'embedding',
          description: 'Generate embedding for a single text',
          requiredFields: ['text'],
          optionalFields: ['model', 'meta', 'priority']
        },
        {
          type: 'batch-embedding',
          description: 'Generate embeddings for multiple texts',
          requiredFields: ['texts'],
          optionalFields: ['model', 'meta', 'priority']
        }
      ]
    });
  } catch (error) {
    console.error('Queue status error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};