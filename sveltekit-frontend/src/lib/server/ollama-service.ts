/**
 * Ollama Service Helper
 * Centralized endpoint management for all Ollama models
 */

export interface OllamaEndpoint {
  url: string;
  model: string;
  timeout: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

export interface GenerationResponse {
  response: string;
  model: string;
  done: boolean;
  context?: number[];
}

export interface VisionAnalysisResponse {
  analysis: string;
  model: string;
  confidence?: number;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';

/**
 * Get Ollama endpoint configuration for a specific model
 */
export function getOllamaEndpoint(model: 'embeddinggemma' | 'gemma3-legal' | 'gemma3-vision'): OllamaEndpoint {
  const endpoints: Record<string, OllamaEndpoint> = {
    'embeddinggemma': {
      url: `${OLLAMA_BASE_URL}/api/embeddings`,
      model: 'embeddinggemma:latest',
      timeout: 30000,
    },
    'gemma3-legal': {
      url: `${OLLAMA_BASE_URL}/api/generate`,
      model: 'gemma3-legal:latest',
      timeout: 60000,
    },
    'gemma3-vision': {
      url: `${OLLAMA_BASE_URL}/api/generate`,
      model: 'gemma3-vision:latest',
      timeout: 60000,
    },
  };

  return endpoints[model] || endpoints['gemma3-legal'];
}

/**
 * Embed text using embeddinggemma
 */
export async function embedText(text: string): Promise<number[]> {
  const endpoint = getOllamaEndpoint('embeddinggemma');

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: endpoint.model,
        prompt: text,
      }),
      signal: AbortSignal.timeout(endpoint.timeout),
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding;
  } catch (err) {
    console.error('❌ Embedding error:', err);
    throw err;
  }
}

/**
 * Generate text using gemma3-legal
 */
export async function generateText(
  prompt: string,
  system?: string,
  options?: { temperature?: number; top_k?: number; top_p?: number }
): Promise<string> {
  const endpoint = getOllamaEndpoint('gemma3-legal');

  try {
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: endpoint.model,
        prompt: fullPrompt,
        stream: false,
        temperature: options?.temperature ?? 0.7,
        top_k: options?.top_k ?? 40,
        top_p: options?.top_p ?? 0.9,
      }),
      signal: AbortSignal.timeout(endpoint.timeout),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const data = (await response.json()) as GenerationResponse;
    return data.response;
  } catch (err) {
    console.error('❌ Generation error:', err);
    throw err;
  }
}

/**
 * Analyze image/document using gemma3-vision
 * Supports base64 encoded images or image URLs
 */
export async function analyzeImageWithVision(
  imageData: string,
  query: string,
  _isBase64: boolean = true
): Promise<VisionAnalysisResponse> {
  const endpoint = getOllamaEndpoint('gemma3-vision');

  try {
    const prompt = `Analyze this legal document/image and answer: ${query}`;

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: endpoint.model,
        prompt,
        images: [imageData],
        stream: false,
      }),
      signal: AbortSignal.timeout(endpoint.timeout),
    });

    if (!response.ok) {
      throw new Error(`Vision analysis failed: ${response.statusText}`);
    }

    const data = (await response.json()) as GenerationResponse;
    return {
      analysis: data.response,
      model: endpoint.model,
      confidence: 0.85, // Placeholder
    };
  } catch (err) {
    console.error('❌ Vision analysis error:', err);
    throw err;
  }
}

/**
 * Stream text generation (for real-time responses)
 */
export async function* generateTextStream(
  prompt: string,
  system?: string
): AsyncGenerator<string, void, unknown> {
  const endpoint = getOllamaEndpoint('gemma3-legal');
  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: endpoint.model,
        prompt: fullPrompt,
        stream: true,
      }),
      signal: AbortSignal.timeout(endpoint.timeout),
    });

    if (!response.ok) {
      throw new Error(`Stream generation failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const data = JSON.parse(line) as GenerationResponse;
            if (data.response) {
              yield data.response;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      buffer = lines[lines.length - 1];
    }

    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer) as GenerationResponse;
        if (data.response) {
          yield data.response;
        }
      } catch {
        // Skip invalid JSON
      }
    }
  } catch (err) {
    console.error('❌ Stream generation error:', err);
    throw err;
  }
}

/**
 * Check if Ollama is available and models are loaded
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        available: false,
        models: [],
        error: `Ollama returned ${response.status}`,
      };
    }

    const data = (await response.json()) as { models: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];

    return {
      available: true,
      models,
    };
  } catch (err) {
    return {
      available: false,
      models: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
