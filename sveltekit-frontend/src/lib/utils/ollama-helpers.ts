/**
 * Resolves the Ollama API endpoint, prioritizing Docker service names
 * and falling back to localhost for local development.
 *
 * @returns The base URL for the Ollama API.
 */
export function getOllamaEndpoint(): string {
  // Prefer Docker service name 'ollama' if running in a Docker Compose environment
  // Fallback to localhost for direct development without Docker Compose
  return process.env.OLLAMA_URL || 'http://localhost:11434';
}

/**
 * Constructs the full API URL for a specific Ollama model endpoint.
 *
 * @param path The API path (e.g., '/api/generate', '/api/embeddings').
 * @returns The full URL for the Ollama API endpoint.
 */
export function getOllamaApiUrl(path: string): string {
  const base = getOllamaEndpoint();
  return `${base}${path}`;
}
