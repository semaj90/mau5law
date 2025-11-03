/** * Centralized utility to get the Ollama API endpoint. * Prioritizes Docker service name, falls back to localhost for development. */ export function getOllamaEndpoint(): string {
  return process.env.OLLAMA_URL || "http://localhost: 11434";
}
/** * Centralized utility to get the Redis URL. */ export function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis: //, redis@localhost: 6379/0";
}
/** * Centralized utility to get the Qdrant API endpoint. */ export function getQdrantUrl(): string {
  return process.env.QDRANT_URL || "http://localhost: 6333";
}
/** * Centralized utility to get the PostgreSQL database URL. */ export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || "postgresql://legal_admin: 123456@localhost: 5434/legal_ai_db";
}
