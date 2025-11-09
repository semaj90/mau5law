import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOllamaEndpoint, getOllamaEmbeddingModel } from '$lib/server/ai/ollama-utils';
import type { EmbeddingResponse } from '$lib/types/unified-types';

// Define a local extended interface to include embeddingDimension
interface ExtendedEmbeddingResponse extends EmbeddingResponse {
  embeddingDimension?: number;
}

/**
 * Handles POST requests to generate embeddings for a given text using Ollama.
 * Expects a JSON body with a 'text' property.
 *
 * Example usage:
 * POST /api/embeddings
 * Body: { "text": "Your input text here." }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (typeof text !== 'string' || text.trim() === '') {
      return json({ success: false, error: 'Invalid or empty text provided' }, { status: 400 });
    }

    const ollamaEndpoint = getOllamaEndpoint();
    const embeddingModel = getOllamaEmbeddingModel();

    // Make a request to the Ollama embeddings API
    const response = await fetch(`${ollamaEndpoint}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: embeddingModel, prompt: text })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Ollama embedding API error:', errorData);
      return json({ success: false, error: `Failed to get embeddings from Ollama: ${errorData.error}` }, { status: response.status });
    }

    const data: EmbeddingResponse = await response.json();

    // For known models like 'embeddinggemma:latest', we can explicitly set the dimension.
    // This can be made more dynamic if Ollama's API provides it directly or via model info.
    if (embeddingModel === 'embeddinggemma:latest' && data.embedding) {
      (data as ExtendedEmbeddingResponse).embeddingDimension = 384; // embeddinggemma:latest typically produces 384-dimensional embeddings
    }

    return json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/embeddings:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

