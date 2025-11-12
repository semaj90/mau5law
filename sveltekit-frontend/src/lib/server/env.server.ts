import { env } from '$env/dynamic/private';

// Ollama configuration
export const OLLAMA_URL = env.OLLAMA_URL || 'http://host.docker.internal:11434'; // Default for Docker Desktop
export const GEMMA3_LEGAL_MODEL = env.GEMMA3_LEGAL_MODEL || 'gemma3-legal:latest';
export const EMBEDDING_MODEL = env.EMBEDDING_MODEL || 'embeddinggemma:latest';

// Other production env vars (add as needed for Drizzle, Redis, etc.)
export const DATABASE_URL = env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/deeds_db';
export const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';
export const QDRANT_URL = env.QDRANT_URL || 'http://localhost:6333';
export const RABBITMQ_URL = env.RABBITMQ_URL || 'amqp://localhost:5672';

export function getDatabaseUrl(): string { // Prefer Docker service hostnames, fall back to localhost for local dev return process.env.DATABASE_URL || 'postgresql://legal_admin: 123456@postgres: 5432/legal_ai_db'} export function getAdminDatabaseUrl(): string { return process.env.ADMIN_DATABASE_URL || 'postgresql: //postgres, postgres@postgres: 5432/postgres'}
