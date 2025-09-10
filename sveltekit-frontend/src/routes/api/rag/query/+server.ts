/**
 * Enhanced RAG Query API Endpoint
 * 
 * Provides RESTful access to the enhanced RAG pipeline with:
 * - Legal document retrieval with pgvector similarity search
 * - Custom legal reranking for improved relevance
 * - Contextual compression and advanced generation
 * - Comprehensive error handling and logging
 * 
 * @route POST /api/rag/query
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enhancedRAGPipeline } from '$lib/services/enhanced-rag-pipeline';
import type { RAGQuery, RAGResponse } from '$lib/services/enhanced-rag-pipeline';
import { rateLimiter } from '$lib/server/rate-limiter'; // Assuming rate limiting exists
import { authenticate } from '$lib/server/auth'; // Assuming auth helper exists

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const startTime = Date.now();
  
  try {
    // Rate limiting protection
    const clientIp = getClientAddress();
    const rateLimitResult = await rateLimiter.check(clientIp, 'rag-query', {
      window: 60000, // 1 minute window
      max: 20 // 20 requests per minute
    });

    if (!rateLimitResult.allowed) {
      return json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }, { status: 429 });
    }

    // Authentication (optional but recommended for production)
    const user = await authenticate(cookies);
    const userId = user?.id;

    // Parse and validate request body
    const requestData = await request.json();
    const {
      query,
      caseId,
      documentTypes,
      jurisdiction,
      practiceArea,
      maxResults = 5,
      useReranking = true,
      includeMetadata = true,
      contextWindow = 4000
    } = requestData;

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return json({
        success: false,
        error: 'Query is required and must be a non-empty string'
      }, { status: 400 });
    }

    if (query.length > 1000) {
      return json({
        success: false,
        error: 'Query too long. Maximum 1000 characters allowed.'
      }, { status: 400 });
    }

    // Validate documentTypes if provided
    const validDocumentTypes = ['contract', 'evidence', 'brief', 'citation', 'statute', 'precedent', 'regulation'];
    if (documentTypes && Array.isArray(documentTypes)) {
      const invalidTypes = documentTypes.filter(type => !validDocumentTypes.includes(type));
      if (invalidTypes.length > 0) {
        return json({
          success: false,
          error: `Invalid document types: ${invalidTypes.join(', ')}. Valid types: ${validDocumentTypes.join(', ')}`
        }, { status: 400 });
      }
    }

    // Build RAG query
    const ragQuery: RAGQuery = {
      query: query.trim(),
      userId,
      caseId: caseId || undefined,
      documentTypes: documentTypes && Array.isArray(documentTypes) ? documentTypes : undefined,
      jurisdiction: jurisdiction || undefined,
      practiceArea: practiceArea || undefined,
      maxResults: Math.min(maxResults, 20), // Cap at 20 results
      useReranking,
      includeMetadata,
      contextWindow: Math.min(contextWindow, 8000) // Cap context window
    };

    // Execute RAG query
    console.log(`🔍 Executing RAG query for user ${userId}: "${query.substring(0, 100)}..."`);
    const ragResponse: RAGResponse = await enhancedRAGPipeline.query(ragQuery);

    // Log successful query
    console.log(`✅ RAG query completed in ${ragResponse.metadata.totalTime}ms:`, {
      queryId: ragResponse.metadata.queryId,
      documentsRetrieved: ragResponse.metadata.documentsRetrieved,
      documentsUsed: ragResponse.metadata.documentsUsed,
      confidence: ragResponse.confidence,
      cacheHit: ragResponse.metadata.cacheHit,
      reranked: ragResponse.metadata.reranked
    });

    // Format response
    const response = {
      success: true,
      data: {
        answer: ragResponse.answer,
        sources: includeMetadata ? ragResponse.sources : ragResponse.sources.map(source => ({
          id: source.id,
          title: source.title,
          documentType: source.documentType,
          citation: source.citation,
          relevanceScore: source.relevanceScore,
          content: source.content.substring(0, 500) + (source.content.length > 500 ? '...' : '') // Truncate for API response
        })),
        confidence: ragResponse.confidence,
        metadata: {
          queryId: ragResponse.metadata.queryId,
          totalTime: ragResponse.metadata.totalTime,
          retrievalTime: ragResponse.metadata.retrievalTime,
          generationTime: ragResponse.metadata.generationTime,
          documentsRetrieved: ragResponse.metadata.documentsRetrieved,
          documentsUsed: ragResponse.metadata.documentsUsed,
          cacheHit: ragResponse.metadata.cacheHit,
          model: ragResponse.metadata.model,
          reranked: ragResponse.metadata.reranked,
          apiProcessingTime: Date.now() - startTime
        }
      }
    };

    // Add reasoning if available
    if (ragResponse.reasoning) {
      response.data.reasoning = ragResponse.reasoning;
    }

    return json(response);

  } catch (error: any) {
    console.error('RAG Query API Error:', error);
    
    // Determine error type and appropriate response
    let statusCode = 500;
    let errorMessage = 'Internal server error during RAG query processing';

    if (error.message?.includes('Database connection')) {
      statusCode = 503;
      errorMessage = 'Database service temporarily unavailable';
    } else if (error.message?.includes('Ollama') || error.message?.includes('embedding')) {
      statusCode = 503;
      errorMessage = 'AI service temporarily unavailable';
    } else if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Query processing timeout';
    }

    return json({
      success: false,
      error: errorMessage,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: statusCode });
  }
};

// Optional: Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    const stats = await enhancedRAGPipeline.getSystemStats();
    
    return json({
      success: true,
      status: 'healthy',
      stats: {
        documentsIndexed: stats.documentsIndexed,
        chunksIndexed: stats.chunksIndexed,
        averageRetrievalTime: stats.averageRetrievalTime,
        recentQueriesCount: stats.recentQueriesCount,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return json({
      success: false,
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
};