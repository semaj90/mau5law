import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { 
  cacheService, 
  getCachedEmbedding, 
  setCachedEmbedding, 
  getCachedSearchResults, 
  cacheSearchResults 
} from '$lib/api/services/cache-service';

/*
 * Cache Test API - Tests Redis compression and functionality
 * GET /api/cache/test - Get cache info and run basic tests
 * POST /api/cache/test - Test embedding and search caching
 */

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'info';
    
    if (action === 'info') {
      const cacheInfo = await cacheService.getCacheInfo();
      
      return json({
        success: true,
        action: 'cache_info',
        data: cacheInfo,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'test') {
      // Test basic cache functionality
      const testKey = 'test:basic';
      const testData = { 
        message: 'Hello Redis!', 
        numbers: [1, 2, 3, 4, 5],
        nested: { a: 1, b: 2, c: { deep: 'value' } }
      };
      
      // Set test data
      await cacheService.set(testKey, testData, { compress: true });
      
      // Get test data back
      const retrieved = await cacheService.get(testKey);
      
      const testPassed = JSON.stringify(retrieved) === JSON.stringify(testData);
      
      return json({
        success: true,
        action: 'basic_test',
        data: {
          testPassed,
          original: testData,
          retrieved,
          cacheInfo: await cacheService.getCacheInfo()
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return json({
      success: false,
      error: 'Unknown action. Use: info, test'
    });
    
  } catch (error: any) {
    console.error('Cache test error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, data } = body;
    
    if (action === 'embedding') {
      // Test embedding cache
      const { text, embedding } = data;
      
      if (!text || !embedding) {
        return json({
          success: false,
          error: 'Missing text or embedding data'
        }, { status: 400 });
      }
      
      // Cache the embedding
      await setCachedEmbedding(text, embedding, 'test-model');
      
      // Retrieve it back
      const cachedEmbedding = await getCachedEmbedding(text, 'test-model');
      
      const testPassed = JSON.stringify(cachedEmbedding) === JSON.stringify(embedding);
      
      return json({
        success: true,
        action: 'embedding_test',
        data: {
          testPassed,
          original: embedding,
          cached: cachedEmbedding,
          compressionInfo: 'Embedding cached with gzip compression'
        }
      });
    }
    
    if (action === 'search') {
      // Test search results cache
      const { query, results, filters } = data;
      
      if (!query || !results) {
        return json({
          success: false,
          error: 'Missing query or results data'
        }, { status: 400 });
      }
      
      // Cache search results
      await cacheSearchResults(query, 'test', results, filters);
      
      // Retrieve them back
      const cachedResults = await getCachedSearchResults(query, 'test', filters);
      
      const testPassed = JSON.stringify(cachedResults) === JSON.stringify(results);
      
      return json({
        success: true,
        action: 'search_test',
        data: {
          testPassed,
          original: results,
          cached: cachedResults,
          compressionInfo: 'Search results cached with gzip compression'
        }
      });
    }
    
    if (action === 'large_payload') {
      // Test compression with large payload
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `This is test data item ${i}`,
        metadata: { 
          created: new Date().toISOString(),
          tags: ['test', 'large', 'payload'],
          values: Array.from({ length: 10 }, (_, j) => Math.random())
        }
      }));
      
      const startTime = Date.now();
      
      // Test both compressed and uncompressed
      await cacheService.set('test:large:compressed', largeArray, { compress: true });
      await cacheService.set('test:large:uncompressed', largeArray, { compress: false });
      
      const compressed = await cacheService.get('test:large:compressed');
      const uncompressed = await cacheService.get('test:large:uncompressed');
      
      const endTime = Date.now();
      
      const compressedPassed = JSON.stringify(compressed) === JSON.stringify(largeArray);
      const uncompressedPassed = JSON.stringify(uncompressed) === JSON.stringify(largeArray);
      
      return json({
        success: true,
        action: 'large_payload_test',
        data: {
          arraySize: largeArray.length,
          compressedTest: compressedPassed,
          uncompressedTest: uncompressedPassed,
          processingTime: endTime - startTime,
          compressionBenefit: 'Large arrays benefit significantly from gzip compression'
        }
      });
    }
    
    return json({
      success: false,
      error: 'Unknown action. Use: embedding, search, large_payload'
    });
    
  } catch (error: any) {
    console.error('Cache POST test error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};