/**
 * Centralized utility functions for retrieving API endpoints.
 * Prioritizes Docker service hostnames from environment variables,
 * with localhost fallbacks for local development.
 */

/**
 * Returns the Ollama API endpoint.
 * Prefers the OLLAMA_URL environment variable, falls back to http://localhost:11434.
 * @returns {string} The Ollama API endpoint URL.
 */
export function getOllamaEndpoint(): string {
  // Use process.env.OLLAMA_URL if available (e.g., in a Docker Compose environment),
  // otherwise default to the local development endpoint.
  return process.env.OLLAMA_URL || 'http://localhost:11434';
}

/**
 * Retrieves the PostgreSQL database URL.
 * (Note: This is typically used on the server-side, not directly in frontend Svelte components)
 * @returns {string} The PostgreSQL database URL.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db';
}

/**
 * Retrieves the Redis URL.
 * (Note: This is typically used on the server-side, not directly in frontend Svelte components)
 * @returns {string} The Redis URL.
 */
export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://:redis@localhost:6379/0';
}

/**
 * Retrieves the Qdrant vector database URL.
 * (Note: This is typically used on the server-side, not directly in frontend Svelte components)
 * @returns {string} The Qdrant URL.
 */
export function getQdrantUrl(): string {
  return process.env.QDRANT_URL || 'http://localhost:6333';
}

/**
 * Retrieves the MinIO endpoint.
 * (Note: This is typically used on the server-side, not directly in frontend Svelte components)
 * @returns {string} The MinIO endpoint.
 */
export function getMinioEndpoint(): string {
  return process.env.MINIO_ENDPOINT || 'http://localhost:9000';
}

/**
 * Retrieves the Neo4j URI.
 * (Note: This is typically used on the server-side, not directly in frontend Svelte components)
 * @returns {string} The Neo4j URI.
 */
export function getNeo4jUri(): string {
  return process.env.NEO4J_URI || 'bolt://localhost:7687';
}

/**
 * Returns the base URL for the backend API.
 * Prefers process.env.VITE_BACKEND_API_URL, falls back to /api.
 */
export function getBackendApiUrl(path: string = ''): string {
  const baseUrl = import.meta.env.VITE_BACKEND_API_URL || '/api';
  return `${baseUrl}${path}`;
}
export function getBackendApiUrl(path: string = ''): string {
  const baseUrl = import.meta.env.VITE_BACKEND_API_URL || '/api';
  return `${baseUrl}${path}`;
}
