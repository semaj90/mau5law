/**
 * Environment Configuration with Docker Desktop Auto-Mapping
 * Automatically detects Docker environment and maps container URLs
 */
import { env } from '$env/dynamic/private';

// Detect if running in Docker environment
const isDocker = env.DOCKER_ENV === 'true' ||
                 process.env.HOSTNAME?.includes('docker') ||
                 process.env.DOCKER_CONTAINER === 'true';

// Use host.docker.internal for Docker Desktop, localhost for bare metal
const host = isDocker ? 'host.docker.internal' : 'localhost';

// Core AI + Vector services with Docker auto-mapping
export const CONFIG = {
  // AI Services
  OLLAMA_URL: env.OLLAMA_URL ?? `http://${host}:11434`,
  TRITON_URL: env.TRITON_URL ?? `http://${host}:8001`,

  // Vector & Search Services
  QDRANT_URL: env.QDRANT_URL ?? `http://${host}:6333`,
  REDIS_URL: env.REDIS_URL ?? `redis://${host}:6380`, // Using port 6380 for test Redis
  REDIS_PASSWORD: env.REDIS_PASSWORD ?? '', // No password for test Redis

  // Graph Database
  NEO4J_URL: env.NEO4J_URL ?? `bolt://${host}:7687`,
  NEO4J_USER: env.NEO4J_USER ?? 'neo4j',
  NEO4J_PASSWORD: env.NEO4J_PASSWORD ?? 'password',

  // Primary Database
  POSTGRES_URL: env.POSTGRES_URL ?? `postgres://postgres:postgres@${host}:5432/deeds`,
  POSTGRES_HOST: env.POSTGRES_HOST ?? host,
  POSTGRES_PORT: Number(env.POSTGRES_PORT ?? 5432),
  POSTGRES_DB: env.POSTGRES_DB ?? 'deeds',
  POSTGRES_USER: env.POSTGRES_USER ?? 'postgres',
  POSTGRES_PASSWORD: env.POSTGRES_PASSWORD ?? 'postgres',

  // Object Storage
  MINIO_URL: env.MINIO_URL ?? `http://${host}:9000`,
  MINIO_ACCESS_KEY: env.MINIO_ACCESS_KEY ?? 'minioadmin',
  MINIO_SECRET_KEY: env.MINIO_SECRET_KEY ?? 'minioadmin',
  MINIO_BUCKET: env.MINIO_BUCKET ?? 'deeds-storage',

  // Feature Flags
  OCR_MODE: env.OCR_MODE ?? 'hybrid', // 'tesseract', 'paddle', 'hybrid'
  WORKER_PERSIST_DB: env.WORKER_PERSIST_DB === 'true',
  NEO4J_CREATE_SIMILARITY_LINKS: env.NEO4J_CREATE_SIMILARITY_LINKS === 'true',
  NEO4J_INIT_ON_START: env.NEO4J_INIT_ON_START === 'true',
  ENABLE_WEBGPU: env.ENABLE_WEBGPU === 'true',
  ENABLE_CUDA: env.ENABLE_CUDA === 'true',

  // QUIC Runtime
  DEV_QUIC_PORT: Number(env.DEV_QUIC_PORT ?? 5173),
  QUIC_ENABLED: env.QUIC_ENABLED === 'true',

  // Development
  DEV_BYPASS_AUTH: env.DEV_BYPASS_AUTH === 'true',
  NODE_ENV: env.NODE_ENV ?? 'development',

  // Performance
  ENABLE_GPU: env.ENABLE_GPU === 'true',
  RTX_3060_OPTIMIZATION: env.RTX_3060_OPTIMIZATION === 'true',
  CONTEXT7_MULTICORE: env.CONTEXT7_MULTICORE === 'true',
  OLLAMA_GPU_LAYERS: Number(env.OLLAMA_GPU_LAYERS ?? 30),

  // Memory & Cache
  MEMORY_CACHE_TTL: Number(env.MEMORY_CACHE_TTL ?? 3600), // 1 hour
  VECTOR_CACHE_SIZE: Number(env.VECTOR_CACHE_SIZE ?? 10000),
  ENABLE_SIMD_JSON: env.ENABLE_SIMD_JSON === 'true',

  // Security
  JWT_SECRET: env.JWT_SECRET ?? 'your-secret-key',
  API_KEY: env.API_KEY ?? 'your-api-key',

  // Logging
  LOG_LEVEL: env.LOG_LEVEL ?? 'info',
  ENABLE_STRUCTURED_LOGGING: env.ENABLE_STRUCTURED_LOGGING === 'true',
} as const;

// Type-safe configuration
export type Config = typeof CONFIG;

// Helper function to get service health check URLs
export const getHealthCheckUrls = () => ({
  ollama: `${CONFIG.OLLAMA_URL}/api/tags`,
  redis: `${CONFIG.REDIS_URL.replace('redis://', 'http://')}/ping`,
  postgres: `postgres://${CONFIG.POSTGRES_USER}:${CONFIG.POSTGRES_PASSWORD}@${CONFIG.POSTGRES_HOST}:${CONFIG.POSTGRES_PORT}/${CONFIG.POSTGRES_DB}`,
  neo4j: `${CONFIG.NEO4J_URL.replace('bolt://', 'http://')}/db/data/`,
  minio: `${CONFIG.MINIO_URL}/minio/health/live`,
  qdrant: `${CONFIG.QDRANT_URL}/collections`,
});

// Docker detection helper
export const isDockerEnvironment = () => isDocker;

// Service availability checker
export const checkServiceAvailability = async () => {
  const urls = getHealthCheckUrls();
  const results: Record<string, boolean | string> = {};

  // Helper for HTTP health checks
  const checkHttpService = async (name: string, url: string) => {
    try {
      // Using AbortSignal.timeout for a 5-second timeout
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      results[name] = response.ok;
    } catch (error: unknown) {
      console.error(`Health check for ${name} failed:`, (error as Error).message);
      results[name] = false;
    }
  };

  // Perform checks for HTTP-based services
  // Note: The Redis and Neo4j URLs are transformed to HTTP in getHealthCheckUrls.
  // If these transformations don't point to actual HTTP health endpoints,
  // these checks will likely fail. A more robust solution for these
  // would involve specific client libraries (e.g., 'ioredis', 'neo4j-driver').
  await Promise.all([
    checkHttpService('ollama', urls.ollama),
    checkHttpService('redis', urls.redis),
    checkHttpService('neo4j', urls.neo4j),
    checkHttpService('minio', urls.minio),
    checkHttpService('qdrant', urls.qdrant),
  ]);

  // Special handling for PostgreSQL:
  // The URL provided in getHealthCheckUrls is a connection string, not an HTTP endpoint.
  // A direct HTTP fetch is not possible. A proper health check would require
  // a PostgreSQL client to connect and run a simple query (e.g., SELECT 1).
  results.postgres = 'requires_db_client_check';

  return results;
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  isDocker,
  host,
  nodeEnv: CONFIG.NODE_ENV,
  quicEnabled: CONFIG.QUIC_ENABLED,
  gpuEnabled: CONFIG.ENABLE_GPU,
  cudaEnabled: CONFIG.ENABLE_CUDA,
  simdJsonEnabled: CONFIG.ENABLE_SIMD_JSON,
});