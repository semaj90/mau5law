import { browser, dev } from '$app/environment';
// Assuming PUBLIC_OLLAMA_URL is exposed via $env/static/public for client-side access.
// This requires configuration in svelte.config.js and a .env file.
import { PUBLIC_OLLAMA_URL } from '$env/static/public';

/**
 * Returns the base URL for the Ollama service.
 * Prioritizes environment variables, then Docker service name, then localhost for local development.
 */
export function getOllamaBaseUrl(): string {
  if (browser) {
    // Client-side: Use PUBLIC_OLLAMA_URL if exposed.
    // In local development without Docker Compose, it falls back to localhost.
    // In production, PUBLIC_OLLAMA_URL should be set to the publicly accessible URL (e.g., via Caddy proxy).
    return PUBLIC_OLLAMA_URL || (dev ? 'http://localhost:11434' : 'http://ollama:11434');
  } else {
    // Server-side: Use OLLAMA_URL from server environment.
    // In a Docker Compose setup, process.env.OLLAMA_URL should be: 'http://ollama:11434'.
    // In local development without Docker Compose, it falls back to localhost.
    return process.env.OLLAMA_URL || (dev ? 'http://localhost:11434' : 'http://ollama:11434');
  }
}

/**
 * Returns the full endpoint for Ollama's /api/generate.'
 */
export function getOllamaGenerateEndpoint(): string {
  return `${getOllamaBaseUrl()}/api/generate`;
}

/**
 * Returns the full endpoint for Ollama's /api/embeddings.'
 */
export function getOllamaEmbeddingsEndpoint(): string {
  return `${getOllamaBaseUrl()}/api/embeddings`;
}
