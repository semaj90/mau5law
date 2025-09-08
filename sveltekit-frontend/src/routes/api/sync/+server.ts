/**
 * API Sync & Wire-up Endpoints
 * RESTful endpoints for neural topology mock data synchronization
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncOrchestrator, databaseSync, vectorSearch, mockDataGenerators } from '$lib/server/sync/mock-api-sync.js';

// GET /api/sync - Health check and status
export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
      case 'health':
        const healthCheck = await syncOrchestrator.performHealthCheck();
        return json({
          status: 'ok',
          system: 'Neural Topology Mock API Sync',
          version: '1.0.0',
          health: healthCheck,
          endpoints: {
            sync: '/api/sync?action=full',
            search: '/api/sync/search',
            generate: '/api/sync/generate',
            qloraSamples: '/api/sync/qlora-samples'
          },
          timestamp: new Date().toISOString()
        });

      case 'full':
        const fullSync = await syncOrchestrator.performFullSync();
        return json({
          action: 'full_sync',
          result: fullSync,
          message: 'Neural topology mock data synchronized successfully',
          timestamp: new Date().toISOString()
        });

      case 'legal-docs':
        const docSync = await databaseSync.syncMockLegalDocuments();
        return json({
          action: 'legal_documents_sync',
          result: docSync,
          timestamp: new Date().toISOString()
        });

      case 'qlora':
        const qloraSync = await databaseSync.syncQLoRATrainingData();
        return json({
          action: 'qlora_sync',
          result: qloraSync,
          timestamp: new Date().toISOString()
        });

      case 'cache':
        const cacheSync = await databaseSync.syncPredictiveAssetCache();
        return json({
          action: 'predictive_cache_sync',
          result: cacheSync,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: 'Unknown action',
          availableActions: ['status', 'health', 'full', 'legal-docs', 'qlora', 'cache'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Sync API error:', error);
    return json({
      error: 'Sync operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// POST /api/sync - Manual sync operations
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, params = {} } = body;

    switch (action) {
      case 'vector_search':
        const { queryEmbedding, limit = 5, threshold = 0.7 } = params;
        if (!queryEmbedding) {
          return json({ error: 'queryEmbedding required for vector search' }, { status: 400 });
        }

        const searchResults = await vectorSearch.performSimilaritySearch(
          queryEmbedding,
          limit,
          threshold
        );

        return json({
          action: 'vector_search',
          results: searchResults,
          count: searchResults.length,
          params: { limit, threshold },
          timestamp: new Date().toISOString()
        });

      case 'generate_mock_data':
        const { type, count = 10 } = params;
        let mockData;

        switch (type) {
          case 'legal_documents':
            mockData = await mockDataGenerators.generateMockLegalDocuments(count);
            break;
          case 'qlora_states':
            mockData = mockDataGenerators.generateMockQLoRAStates(count);
            break;
          case 'asset_predictions':
            mockData = mockDataGenerators.generateMockAssetPredictions(count);
            break;
          case 'embedding_shards':
            mockData = mockDataGenerators.generateMockEmbeddingShards(count);
            break;
          case 'chr_manifests':
            mockData = mockDataGenerators.generateMockCHRManifests(count);
            break;
          default:
            return json({ error: 'Unknown mock data type' }, { status: 400 });
        }

        return json({
          action: 'generate_mock_data',
          type,
          data: mockData,
          count: mockData.length,
          timestamp: new Date().toISOString()
        });

      case 'bulk_sync':
        const { types = ['legal_documents', 'qlora', 'cache'] } = params;
        const bulkResults = {};

        for (const syncType of types) {
          switch (syncType) {
            case 'legal_documents':
              bulkResults[syncType] = await databaseSync.syncMockLegalDocuments();
              break;
            case 'qlora':
              bulkResults[syncType] = await databaseSync.syncQLoRATrainingData();
              break;
            case 'cache':
              bulkResults[syncType] = await databaseSync.syncPredictiveAssetCache();
              break;
          }
        }

        return json({
          action: 'bulk_sync',
          results: bulkResults,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: 'Unknown POST action',
          availableActions: ['vector_search', 'generate_mock_data', 'bulk_sync'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Sync POST API error:', error);
    return json({
      error: 'POST operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
