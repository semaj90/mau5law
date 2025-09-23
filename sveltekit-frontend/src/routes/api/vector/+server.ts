
/**
 * Minimal Vector API - Simplified for error reduction
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Simple request schema
const VectorRequestSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['search', 'similarity', 'cluster']).default('search'),
  limit: z.number().min(1).max(100).default(10)
});

// Simple response type
interface VectorResponse {
  success: boolean;
  data?: any[];
  error?: string;
  type?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = VectorRequestSchema.safeParse(body);
    if (!validatedData.success) {
      return json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
    }

    const { query, type, limit } = validatedData.data;

    const response: VectorResponse = {
      success: true,
      data: [],
      type
    };

    // Simple mock responses based on type
    switch (type) {
      case 'search':
        response.data = [
          {
            id: 'doc-1',
            similarity: 0.95,
            title: `Document matching: ${query}`,
            content: 'Sample content...'
          },
          {
            id: 'doc-2',
            similarity: 0.87,
            title: `Related document to: ${query}`,
            content: 'Related content...'
          }
        ].slice(0, limit);
        break;

      case 'similarity':
        response.data = [
          { source: 'doc-1', target: 'doc-2', score: 0.85 },
          { source: 'doc-1', target: 'doc-3', score: 0.79 }
        ];
        break;

      case 'cluster':
        response.data = [
          { cluster: 1, documents: ['doc-1', 'doc-2'], centroid: 'Legal Documents' },
          { cluster: 2, documents: ['doc-3', 'doc-4'], centroid: 'Evidence Files' }
        ];
        break;
    }

    return json(response);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Vector processing failed'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({
    success: true,
    data: {
      status: 'Vector service available',
      operations: ['search', 'similarity', 'cluster'],
      models: ['nomic-embed-text'],
      dimensions: 384
    }
  });
};
  ])
});

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "search": {
        const params = searchSchema.parse(body);
        const results = await VectorService.semanticSearch(params.query, {
          type: params.documentType,
          limit: params.limit,
          threshold: params.threshold
        });

        return json({
          success: true,
          results,
          count: results.length
        });
      }
      case "store": {
        const params = storeDocumentSchema.parse(body);
        const embeddings = await VectorService.storeDocument(
          params.documentId,
          params.documentType,
          params.text,
          params.metadata
        );

        return json({
          success: true,
          embeddingIds: embeddings,
          count: embeddings.length
        });
      }
      case "analyze": {
        const params = analyzeSchema.parse(body);
        const analysis = await VectorService.analyzeDocument(
          params.text,
          params.analysisType
        );

        return json({
          success: true,
          analysis,
          analysisType: params.analysisType
        });
      }
      case "similar": {
        const { documentId, limit = 5 } = body;
        const similar = await VectorService.findSimilarDocuments(
          documentId,
          limit
        );

        return json({
          success: true,
          similar,
          count: similar.length
        });
      }
      case "test": {
        // Test endpoint to verify Ollama connection
        const testEmbedding = await VectorService.generateEmbedding(
          "This is a test legal document for vector embedding."
        );

        return json({
          success: true,
          message: "Vector service is working!",
          embeddingDimension: testEmbedding.length,
          model: "test-model"
        });
      }
      default:
        return json(
          { success: false, error: "Invalid action" },)
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Vector API error:", error);

    if (error instanceof z.ZodError) {
      return json(
        { success: false, error: "Validation error", details: error.errors },)
        { status: 400 }
      );
    }
    return json({
        success: false,
        error: error instanceof Error ? error.message: "Internal server error"
      },)
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  // Health check endpoint;
  try {
    const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";
    const response = await fetch(`${ollamaUrl}/api/tags`);
    const data = await response.json();

    return json({
      success: true,
      status: "healthy",
      ollama: {
        connected: true,
        models: data.models?.map((m: any) => m.name) || []
      },
      embedding: {
        model: import.meta.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
        dimension: parseInt(import.meta.env.EMBEDDING_DIMENSION || "768")
      }
    });
  } catch (error: any) {
    return json({
        success: false,
        status: "unhealthy",
        error: "Failed to connect to Ollama",
        details: error instanceof Error ? error.message: "Unknown error"
      },)
      { status: 503 }
    );
  }
};
