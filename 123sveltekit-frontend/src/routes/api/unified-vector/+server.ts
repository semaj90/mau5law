/**
 * Unified Vector API Endpoint
 * Single endpoint to access all vector systems: WebGPU SOM, WebAssembly RAG, 
 * PageRank, Glyph Diffusion, Neo4j, MinIO, Redis, PostgreSQL
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedVectorOrchestrator } from '$lib/services/unified-vector-orchestrator';
import type { UnifiedVectorRequest } from '$lib/services/unified-vector-orchestrator';

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'health':
        const health = await unifiedVectorOrchestrator.healthCheck();
        return json({
          success: true,
          health,
          allSystemsOperational: Object.values(health).every(status => status),
          timestamp: new Date().toISOString()
        });

      case 'analytics':
        const analytics = unifiedVectorOrchestrator.getPerformanceAnalytics();
        return json({
          success: true,
          analytics,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          success: false,
          error: 'Unknown action. Available: health, analytics',
          availableActions: ['health', 'analytics']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Unified Vector API error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as UnifiedVectorRequest;

    // Validate request
    if (!body.type || !body.payload) {
      return json({
        success: false,
        error: 'Request must include type and payload',
        example: {
          type: 'analyze',
          payload: {
            text: 'Your text to analyze',
            userId: 'user123',
            options: {
              useWebGPU: true,
              useWebAssembly: true,
              usePageRank: true,
              generateGlyphs: true
            }
          }
        }
      }, { status: 400 });
    }

    // Process through unified orchestrator
    const result = await unifiedVectorOrchestrator.process(body);

    return json(result);

  } catch (error: any) {
    console.error('❌ Unified Vector processing error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'feedback':
        // Submit user feedback to RAG PageRank system
        const feedbackRequest: UnifiedVectorRequest = {
          type: 'recommend',
          payload: {
            userId: data.userId,
            sessionId: data.sessionId,
            documents: [{
              type: 'feedback',
              vote: data.vote,
              documentId: data.documentId,
              relevanceScore: data.relevanceScore
            }]
          }
        };

        const feedbackResult = await unifiedVectorOrchestrator.process(feedbackRequest);
        return json(feedbackResult);

      case 'retrain':
        // Trigger model retraining
        return json({
          success: false,
          error: 'Model retraining not yet implemented',
          plannedFeature: true
        }, { status: 501 });

      default:
        return json({
          success: false,
          error: 'Unknown action. Available: feedback, retrain',
          availableActions: ['feedback', 'retrain']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Unified Vector update error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const documentId = url.searchParams.get('documentId');
    const cacheKey = url.searchParams.get('cacheKey');

    if (documentId) {
      // Delete document from vector systems
      const deleteRequest: UnifiedVectorRequest = {
        type: 'ingest', // Use ingest type with delete operation
        payload: {
          documents: [{ id: documentId, operation: 'delete' }]
        }
      };

      const deleteResult = await unifiedVectorOrchestrator.process(deleteRequest);
      return json(deleteResult);
    }

    if (cacheKey) {
      // Clear specific cache
      return json({
        success: false,
        error: 'Cache clearing not yet implemented',
        plannedFeature: true
      }, { status: 501 });
    }

    return json({
      success: false,
      error: 'Must specify documentId or cacheKey',
      examples: [
        '?documentId=doc123',
        '?cacheKey=cache_key'
      ]
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Unified Vector delete error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};