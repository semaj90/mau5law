/**
 * Ollama Health Check Endpoint
 *
 * GET /api/embeddings/ollama/health
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });

    return json({
      status: response.ok ? 'healthy' : 'unhealthy',
      available: response.ok
    });
  } catch {
    return json({
      status: 'unhealthy',
      available: false
    });
  }
};