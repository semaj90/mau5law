import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { glyphDiffusionService } from '$lib/services/glyph-diffusion-service.js';
import { embeddingService } from '$lib/services/embedding-service.js';

/**
 * Glyph Tensor Search API
 * 
 * GET /api/glyph/search - Search for similar tensor artifacts
 * POST /api/glyph/search - Search with custom embedding vector
 */

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const style = url.searchParams.get('style');

    if (!query) {
      return json({
        success: false,
        error: 'Query parameter "q" is required'
      }, { status: 400 });
    }

    // Generate embedding for search query
    const queryEmbedding = await embeddingService.embed(query, {
      model: 'mock',
      dimensions: 768
    });

    if (!queryEmbedding?.embedding) {
      return json({
        success: false,
        error: 'Failed to generate query embedding'
      }, { status: 500 });
    }

    // Search for similar tensors
    const results = await glyphDiffusionService.searchSimilarTensors(
      queryEmbedding.embedding,
      limit
    );

    // Filter by style if specified
    const filteredResults = style
      ? results.filter(r => r.manifest?.metadata?.style === style)
      : results;

    return json({
      success: true,
      data: {
        query: query,
        results: filteredResults.map(result => ({
          id: result.id,
          manifest: result.manifest,
          created_at: result.created_at,
          access_count: result.access_count,
          style: result.manifest?.metadata?.style,
          prompt: result.manifest?.metadata?.prompt
        })),
        count: filteredResults.length,
        search_stats: {
          total_candidates: results.length,
          filtered_by_style: !!style,
          embedding_dimensions: queryEmbedding.embedding.length
        }
      }
    });

  } catch (error) {
    console.error('Tensor search error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { embedding, limit = 10, style } = body;

    if (!embedding || !Array.isArray(embedding)) {
      return json({
        success: false,
        error: 'embedding array is required'
      }, { status: 400 });
    }

    // Search using provided embedding
    const results = await glyphDiffusionService.searchSimilarTensors(embedding, limit);

    // Filter by style if specified
    const filteredResults = style
      ? results.filter(r => r.manifest?.metadata?.style === style)
      : results;

    return json({
      success: true,
      data: {
        results: filteredResults.map(result => ({
          id: result.id,
          manifest: result.manifest,
          created_at: result.created_at,
          access_count: result.access_count,
          style: result.manifest?.metadata?.style,
          prompt: result.manifest?.metadata?.prompt
        })),
        count: filteredResults.length,
        search_stats: {
          total_candidates: results.length,
          filtered_by_style: !!style,
          embedding_dimensions: embedding.length
        }
      }
    });

  } catch (error) {
    console.error('Tensor vector search error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Vector search failed'
    }, { status: 500 });
  }
};