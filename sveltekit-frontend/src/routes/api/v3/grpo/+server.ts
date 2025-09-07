// GRPO (Guided Reasoning and Policy Optimization) Thinking Response API v3
// Advanced search and recommendation engine for legal reasoning chains with timestamp analysis

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  storeGrpoThinkingResponse,
  searchGrpoThinkingResponses,
  processBatchGrpoResponses,
  getTrendingGrpoPatterns,
  initializeGrpoThinkingTable,
  generateGrpoEmbedding,
  getGrpoCacheStats,
  type GrpoThinkingResponse,
  type ThinkingRecommendation,
  type GrpoBatchJob
} from '$lib/server/services/grpoThinkingService';
import { generateEmbedding } from '$lib/server/services/vectorDBService';
import { grpoRateLimiter } from '$lib/server/middleware/rate-limiter';
import { createHash } from 'node:crypto';

// Enhanced logger for GRPO API
const grpoApiLogger = {
  info: (message: string, requestId: string, metadata?: any) =>
    console.log(`[${new Date().toISOString()}] GRPO-API-INFO [${requestId}] ${message}`, metadata ? JSON.stringify(metadata) : ''),
  warn: (message: string, requestId: string, metadata?: any) =>
    console.warn(`[${new Date().toISOString()}] GRPO-API-WARN [${requestId}] ${message}`, metadata ? JSON.stringify(metadata) : ''),
  error: (message: string, requestId: string, error?: Error, metadata?: any) =>
    console.error(`[${new Date().toISOString()}] GRPO-API-ERROR [${requestId}] ${message}`, error?.message || '', metadata ? JSON.stringify(metadata) : ''),
};

// Generate unique request ID for tracking
function generateRequestId(): string {
  return `grpo_${Date.now()}_${createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 8)}`;
}

// Initialize GRPO database on startup
let grpoInitialized = false;
async function ensureGrpoInitialized() {
  if (!grpoInitialized) {
    try {
      await initializeGrpoThinkingTable();
      grpoInitialized = true;
    } catch (error: any) {
      console.warn('GRPO database initialization failed, continuing without DB features:', error.message);
      grpoInitialized = true; // Don't block API
    }
  }
}

// Rate limiting for GRPO operations
async function withGrpoRateLimit(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const result = grpoRateLimiter.check(request);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime! - Date.now()) / 1000);

    return json({
      success: false,
      error: 'GRPO rate limit exceeded. Please wait before making more requests.',
      retryAfter,
      resetTime: new Date(result.resetTime!).toISOString()
    }, {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime!.toString()
      }
    });
  }

  const response = await handler();
  response.headers.set('X-RateLimit-Remaining', result.remaining!.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime!.toString());

  return response;
}

// Validate GRPO thinking response data
function validateGrpoThinkingResponse(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  if (!data.conversationId || typeof data.conversationId !== 'string') {
    return { valid: false, error: 'conversationId is required' };
  }

  if (!data.messageId || typeof data.messageId !== 'string') {
    return { valid: false, error: 'messageId is required' };
  }

  if (!data.originalQuery || typeof data.originalQuery !== 'string') {
    return { valid: false, error: 'originalQuery is required' };
  }

  if (!data.thinkingChain || typeof data.thinkingChain !== 'string') {
    return { valid: false, error: 'thinkingChain is required' };
  }

  if (data.thinkingChain.length < 50) {
    return { valid: false, error: 'thinkingChain must be at least 50 characters' };
  }

  if (data.thinkingChain.length > 50000) {
    return { valid: false, error: 'thinkingChain too long (max 50000 characters)' };
  }

  if (typeof data.confidenceLevel !== 'undefined' &&
      (typeof data.confidenceLevel !== 'number' || data.confidenceLevel < 0 || data.confidenceLevel > 1)) {
    return { valid: false, error: 'confidenceLevel must be a number between 0 and 1' };
  }

  return { valid: true };
}

// GET method for GRPO health check, search, trends, and recommendations
export const GET: RequestHandler = async ({ url, request }) => {
  return await withGrpoRateLimit(request, async () => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      await ensureGrpoInitialized();

      const action = url.searchParams.get('action') || 'health';
      grpoApiLogger.info(`GRPO ${action} request received`, requestId);

      switch (action) {
        case 'health': {
          const cacheStats = getGrpoCacheStats();

          return json({
            success: true,
            status: 'healthy',
            service: 'grpo-thinking-v3',
            requestId,
            features: {
              reasoningChainIndexing: true,
              timestampRecommendations: true,
              batchProcessing: true,
              trendAnalysis: true,
              patternExtraction: true,
              legalCitationDetection: true,
              complexityAnalysis: true,
              serviceWorker: true
            },
            cache: cacheStats,
            performance: {
              responseTimeMs: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
          });
        }

        case 'search': {
          const query = url.searchParams.get('q');
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
          const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
          const thinkingType = url.searchParams.get('type');
          const includeRecentBias = url.searchParams.get('recentBias') !== 'false';
          const confidenceThreshold = parseFloat(url.searchParams.get('confidence') || '0.5');

          if (!query || query.length < 3) {
            grpoApiLogger.warn('Invalid search query', requestId, { query });
            return json({
              success: false,
              error: 'Query parameter "q" is required and must be at least 3 characters long',
              requestId
            }, { status: 400 });
          }

          // Parse time range if provided
          let timeRange;
          const fromTime = url.searchParams.get('from');
          const toTime = url.searchParams.get('to');
          if (fromTime && toTime) {
            timeRange = {
              from: new Date(fromTime),
              to: new Date(toTime)
            };
          }

          // Parse practice areas
          const practiceArea = url.searchParams.get('practiceArea')?.split(',').filter(Boolean);

          const results = await searchGrpoThinkingResponses(query, {
            limit,
            threshold,
            thinkingType: thinkingType || undefined,
            timeRange,
            includeRecentBias,
            confidenceThreshold,
            practiceArea
          });

          grpoApiLogger.info(`GRPO search completed: ${results.length} results`, requestId, {
            query: query.slice(0, 50),
            resultCount: results.length,
            duration: Date.now() - startTime
          });

          return json({
            success: true,
            requestId,
            query,
            results,
            count: results.length,
            filters: {
              threshold,
              thinkingType,
              timeRange,
              includeRecentBias,
              confidenceThreshold,
              practiceArea
            },
            performance: {
              searchTimeMs: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
          });
        }

        case 'trends': {
          const timeWindow = (url.searchParams.get('timeWindow') as 'hour' | 'day' | 'week' | 'month') || 'day';
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

          const patterns = await getTrendingGrpoPatterns(timeWindow, limit);

          grpoApiLogger.info(`GRPO trends analyzed: ${patterns.length} patterns`, requestId, {
            timeWindow,
            patternCount: patterns.length,
            duration: Date.now() - startTime
          });

          return json({
            success: true,
            requestId,
            timeWindow,
            patterns,
            count: patterns.length,
            performance: {
              analysisTimeMs: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
          });
        }

        case 'recommendations': {
          const query = url.searchParams.get('q');
          const conversationId = url.searchParams.get('conversationId');
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);

          if (!query) {
            return json({
              success: false,
              error: 'Query parameter "q" is required for recommendations',
              requestId
            }, { status: 400 });
          }

          // Get recent high-confidence thinking responses as recommendations
          const timeRange = {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            to: new Date()
          };

          const recommendations = await searchGrpoThinkingResponses(query, {
            limit,
            threshold: 0.6, // Lower threshold for recommendations
            timeRange,
            includeRecentBias: true,
            confidenceThreshold: 0.7 // Higher confidence for recommendations
          });

          grpoApiLogger.info(`GRPO recommendations generated: ${recommendations.length} items`, requestId, {
            query: query.slice(0, 50),
            conversationId,
            recommendationCount: recommendations.length
          });

          return json({
            success: true,
            requestId,
            query,
            conversationId,
            recommendations,
            count: recommendations.length,
            criteria: {
              timeWindow: '7 days',
              confidenceThreshold: 0.7,
              similarityThreshold: 0.6,
              recentBiasEnabled: true
            },
            performance: {
              recommendationTimeMs: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
          });
        }

        case 'stats': {
          const cacheStats = getGrpoCacheStats();

          // Get basic database stats (if available)
          let dbStats = {};
          try {
            // This would require actual database queries - simplified for now
            dbStats = {
              totalResponses: 'unknown',
              avgConfidence: 'unknown',
              commonThinkingTypes: 'unknown'
            };
          } catch {
            // DB not available
          }

          return json({
            success: true,
            requestId,
            cache: cacheStats,
            database: dbStats,
            performance: {
              responseTimeMs: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
          });
        }

        default: {
          grpoApiLogger.warn('Invalid GRPO action requested', requestId, { action });
          return json({
            success: false,
            error: 'Invalid action. Available actions: health, search, trends, recommendations, stats',
            requestId,
            availableActions: ['health', 'search', 'trends', 'recommendations', 'stats']
          }, { status: 400 });
        }
      }

    } catch (error: any) {
      grpoApiLogger.error('GRPO GET request failed', requestId, error, {
        duration: Date.now() - startTime,
        url: url.toString()
      });

      return json({
        success: false,
        error: 'Internal GRPO server error',
        requestId,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  });
};

// POST method for storing GRPO thinking responses and batch processing
export const POST: RequestHandler = async ({ request, url }) => {
  return await withGrpoRateLimit(request, async () => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      await ensureGrpoInitialized();

      const action = url.searchParams.get('action') || 'store';

      let body: any;
      try {
        body = await request.json();
      } catch (parseError) {
        grpoApiLogger.warn('Invalid JSON in GRPO request body', requestId);
        return json({
          success: false,
          error: 'Invalid JSON in request body',
          requestId
        }, { status: 400 });
      }

      switch (action) {
        case 'store': {
          const validation = validateGrpoThinkingResponse(body);
          if (!validation.valid) {
            grpoApiLogger.warn('GRPO thinking response validation failed', requestId, { error: validation.error });
            return json({
              success: false,
              error: validation.error,
              requestId
            }, { status: 400 });
          }

          // Enhance with default values
          const thinkingResponse: GrpoThinkingResponse = {
            ...body,
            confidenceLevel: body.confidenceLevel || 0.75,
            reasoningSteps: body.reasoningSteps || [],
            evidenceCited: body.evidenceCited || [],
            legalPrinciples: body.legalPrinciples || [],
            thinkingType: body.thinkingType || 'analysis',
            metadata: {
              ...body.metadata,
              timestamp: new Date().toISOString(),
              requestId,
              apiVersion: 'v3'
            }
          };

          await storeGrpoThinkingResponse(thinkingResponse);

          const processingTime = Date.now() - startTime;
          grpoApiLogger.info('GRPO thinking response stored', requestId, {
            messageId: thinkingResponse.messageId,
            thinkingType: thinkingResponse.thinkingType,
            processingTime
          });

          return json({
            success: true,
            requestId,
            messageId: thinkingResponse.messageId,
            stored: true,
            metadata: {
              processingTimeMs: processingTime,
              timestamp: new Date().toISOString()
            }
          });
        }

        case 'batch': {
          if (!Array.isArray(body.responses)) {
            return json({
              success: false,
              error: 'responses array is required for batch processing',
              requestId
            }, { status: 400 });
          }

          if (body.responses.length === 0) {
            return json({
              success: false,
              error: 'responses array cannot be empty',
              requestId
            }, { status: 400 });
          }

          if (body.responses.length > 50) {
            return json({
              success: false,
              error: 'batch size too large (max 50 responses)',
              requestId
            }, { status: 400 });
          }

          // Validate each response
          for (let i = 0; i < body.responses.length; i++) {
            const validation = validateGrpoThinkingResponse(body.responses[i]);
            if (!validation.valid) {
              return json({
                success: false,
                error: `Response ${i + 1}: ${validation.error}`,
                requestId
              }, { status: 400 });
            }
          }

          const batchJob: GrpoBatchJob = {
            jobId: requestId,
            responses: body.responses.map((r: any) => ({
              ...r,
              metadata: {
                ...r.metadata,
                batchId: requestId,
                timestamp: new Date().toISOString()
              }
            })),
            priority: body.priority || 'normal',
            status: 'pending',
            createdAt: new Date()
          };

          await processBatchGrpoResponses(batchJob);

          const processingTime = Date.now() - startTime;
          grpoApiLogger.info('GRPO batch processing completed', requestId, {
            responseCount: body.responses.length,
            processingTime,
            status: batchJob.status
          });

          return json({
            success: true,
            requestId,
            jobId: batchJob.jobId,
            batchSize: body.responses.length,
            status: batchJob.status,
            metadata: {
              processingTimeMs: processingTime,
              completedAt: batchJob.completedAt?.toISOString(),
              timestamp: new Date().toISOString()
            }
          });
        }

        case 'embed': {
          if (!body.text || typeof body.text !== 'string') {
            return json({
              success: false,
              error: 'text field is required',
              requestId
            }, { status: 400 });
          }

          if (body.text.length > 10000) {
            return json({
              success: false,
              error: 'text too long (max 10000 characters)',
              requestId
            }, { status: 400 });
          }

          const useCache = body.useCache !== false;
          const embedding = body.type === 'grpo_thinking'
            ? await generateGrpoEmbedding(body.text, useCache)
            : await generateEmbedding(body.text, useCache);

          if (!embedding) {
            grpoApiLogger.error('Failed to generate embedding', requestId);
            return json({
              success: false,
              error: 'Failed to generate embedding',
              requestId
            }, { status: 500 });
          }

          const processingTime = Date.now() - startTime;
          grpoApiLogger.info('GRPO embedding generated', requestId, {
            textLength: body.text.length,
            embeddingLength: embedding.length,
            useCache,
            processingTime
          });

          return json({
            success: true,
            requestId,
            embedding,
            dimensions: embedding.length,
            metadata: {
              textLength: body.text.length,
              useCache,
              processingTimeMs: processingTime,
              timestamp: new Date().toISOString()
            }
          });
        }

        default: {
          return json({
            success: false,
            error: 'Invalid action. Available actions: store, batch, embed',
            requestId,
            availableActions: ['store', 'batch', 'embed']
          }, { status: 400 });
        }
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      grpoApiLogger.error('GRPO POST request failed', requestId, error, {
        duration: processingTime
      });

      return json({
        success: false,
        error: 'Internal GRPO server error occurred while processing your request',
        requestId,
        metadata: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }
  });
};