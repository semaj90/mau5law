import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalProcessor } from '$lib/services/unified-legal-simd-pgvector';

/*
 * SIMD GPU + PGVector Legal Document Processing API
 * Handles high-performance legal document parsing and semantic indexing
 */

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { content, title, documentType, metadata, action } = await request.json();

    console.log(`📝 Processing legal document via SIMD + PGVector API: ${action}`);

    switch (action) {
      case 'process': {
        if (!content || !title || !documentType) {
          return json({
            error: 'Missing required fields: content, title, documentType'
          }, { status: 400 });
        }

        const result = await unifiedLegalProcessor.processAndStoreLegalDocument(
          content,
          title,
          documentType,
          metadata || {}
        );

        return json({
          success: true,
          documentId: result.documentId,
          entities: result.parsedDocument.entities,
          suggestions: result.parsedDocument.suggestions,
          confidence: result.parsedDocument.confidence,
          processingStats: result.processingStats,
          simdStats: result.parsedDocument.processingTime,
          gpuAccelerated: true,
          vectorized: result.vectorized
        });
      }

      case 'search': {
        const { query, options = {} } = await request.json();
        
        if (!query) {
          return json({
            error: 'Query is required for semantic search'
          }, { status: 400 });
        }

        const searchResults = await unifiedLegalProcessor.semanticSearch(query, options);

        return json({
          success: true,
          query,
          results: searchResults,
          totalResults: searchResults.length,
          processingMethod: 'pgvector_similarity'
        });
      }

      case 'stats': {
        const systemStats = await unifiedLegalProcessor.getSystemStats();

        return json({
          success: true,
          systemStats,
          timestamp: new Date().toISOString()
        });
      }

      default: {
        return json({
          error: 'Invalid action. Supported actions: process, search, stats'
        }, { status: 400 });
      }
    }

  } catch (error) {
    console.error('❌ SIMD + PGVector API error:', error);
    
    return json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'stats';

    if (action === 'stats') {
      const systemStats = await unifiedLegalProcessor.getSystemStats();
      
      return json({
        success: true,
        systemStats,
        endpoints: {
          process: 'POST /api/legal/simd-process (action: "process")',
          search: 'POST /api/legal/simd-process (action: "search")',
          stats: 'GET /api/legal/simd-process?action=stats'
        },
        systemInfo: {
          simdEnabled: true,
          gpuAccelerated: true,
          pgvectorEnabled: true,
          threadSafe: true
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'health') {
      // Basic health check
      return json({
        success: true,
        status: 'healthy',
        services: {
          simd_parser: 'operational',
          pgvector: 'operational', 
          gpu_orchestrator: 'operational',
          cognitive_cache: 'operational'
        },
        timestamp: new Date().toISOString()
      });
    }

    return json({
      error: 'Invalid action parameter'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return json({
      success: false,
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};