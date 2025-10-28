/**
 * 🌍 Environment Loader (Zod-Validated)
 * Auto-maps Docker ⇄ Local URLs and validates critical fields.
 */

// Use SvelteKit's runtime env when available; fall back to process.env for type-checking
// and non-SvelteKit environments. Avoid importing the virtual `$env/*` module here
// to keep this file type-checkable by plain `tsc` in CI or tooling.
const env = (typeof process !== 'undefined' && process.env) as Record<string, string | undefined>;
import { z } from 'zod';

const isDocker =
  env.DOCKER_ENV === 'true' || process.env.DOCKER_CONTAINER === 'true' || process.env.HOSTNAME?.includes('docker');

const host = isDocker ? 'host.docker.internal' : 'localhost';

/** 🔐 Zod schema for validation */
const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),

  POSTGRES_URL: z.string().url(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number(),

  REDIS_URL: z.string(),
  REDIS_PASSWORD: z.string().optional(),

  OLLAMA_URL: z.string().url(),
  TRITON_URL: z.string().url(),

  QDRANT_URL: z.string().url(),

  NEO4J_URL: z.string(),
  NEO4J_USER: z.string(),
  NEO4J_PASSWORD: z.string(),

  MINIO_URL: z.string().url(),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string(),

  ENABLE_GPU: z.coerce.boolean().default(false),
  ENABLE_CUDA: z.coerce.boolean().default(false),
  ENABLE_WEBGPU: z.coerce.boolean().default(false),
  ENABLE_SIMD_JSON: z.coerce.boolean().default(false),
  RTX_3060_OPTIMIZATION: z.coerce.boolean().default(false),

  OCR_MODE: z.enum(['tesseract', 'paddle', 'hybrid']).default('hybrid'),

  DEV_QUIC_PORT: z.coerce.number().default(5173),
  QUIC_ENABLED: z.coerce.boolean().default(false),
  DEV_BYPASS_AUTH: z.coerce.boolean().default(false),

  MEMORY_CACHE_TTL: z.coerce.number().default(3600),
  VECTOR_CACHE_SIZE: z.coerce.number().default(10_000),

  JWT_SECRET: z.string(),
  API_KEY: z.string(),

  LOG_LEVEL: z.string().default('info'),
  ENABLE_STRUCTURED_LOGGING: z.coerce.boolean().default(false),
  // Backward-compatible (legacy) aliases - optional
  DATABASE_URL: z.string().url().optional(),
  MINIO_ENDPOINT: z.string().url().optional(),
  MINIO_REGION: z.string().optional(),
});

const parsed = ConfigSchema.safeParse({
  NODE_ENV: env.NODE_ENV ?? 'development',

  POSTGRES_URL: env.POSTGRES_URL ?? `postgres://postgres:postgres@${host}:5432/deeds`,
  POSTGRES_USER: env.POSTGRES_USER ?? 'postgres',
  POSTGRES_PASSWORD: env.POSTGRES_PASSWORD ?? 'postgres',
  POSTGRES_DB: env.POSTGRES_DB ?? 'deeds',
  POSTGRES_HOST: env.POSTGRES_HOST ?? host,
  POSTGRES_PORT: env.POSTGRES_PORT ?? 5432,

  REDIS_URL: env.REDIS_URL ?? `redis://${host}:6379`,
  REDIS_PASSWORD: env.REDIS_PASSWORD,

  OLLAMA_URL: env.OLLAMA_URL ?? `http://${host}:11434`,
  TRITON_URL: env.TRITON_URL ?? `http://${host}:8001`,
  QDRANT_URL: env.QDRANT_URL ?? `http://${host}:6333`,

  NEO4J_URL: env.NEO4J_URL ?? `bolt://${host}:7687`,
  NEO4J_USER: env.NEO4J_USER ?? 'neo4j',
  NEO4J_PASSWORD: env.NEO4J_PASSWORD ?? 'password',

  MINIO_URL: env.MINIO_URL ?? `http://${host}:9000`,
  MINIO_ACCESS_KEY: env.MINIO_ACCESS_KEY ?? 'minioadmin',
  MINIO_SECRET_KEY: env.MINIO_SECRET_KEY ?? 'minioadmin',
  MINIO_BUCKET: env.MINIO_BUCKET ?? 'deeds-storage',

  // Legacy aliases support (if provided via env)
  DATABASE_URL: env.DATABASE_URL,
  MINIO_ENDPOINT: env.MINIO_ENDPOINT,
  MINIO_REGION: env.MINIO_REGION,

  ENABLE_GPU: env.ENABLE_GPU,
  ENABLE_CUDA: env.ENABLE_CUDA,
  ENABLE_WEBGPU: env.ENABLE_WEBGPU,
  ENABLE_SIMD_JSON: env.ENABLE_SIMD_JSON,
  RTX_3060_OPTIMIZATION: env.RTX_3060_OPTIMIZATION,

  OCR_MODE: env.OCR_MODE,
  DEV_QUIC_PORT: env.DEV_QUIC_PORT,
  QUIC_ENABLED: env.QUIC_ENABLED,
  DEV_BYPASS_AUTH: env.DEV_BYPASS_AUTH,
  MEMORY_CACHE_TTL: env.MEMORY_CACHE_TTL,
  VECTOR_CACHE_SIZE: env.VECTOR_CACHE_SIZE,
  JWT_SECRET: env.JWT_SECRET ?? 'dev-secret',
  API_KEY: env.API_KEY ?? 'dev-api-key',
  LOG_LEVEL: env.LOG_LEVEL,
  ENABLE_STRUCTURED_LOGGING: env.ENABLE_STRUCTURED_LOGGING,
});

if (!parsed.success) {
  console.error('❌ CONFIG validation failed:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const CONFIG = parsed.data;
export type Config = typeof CONFIG;

/** Convenience helpers */
export const isDockerEnvironment = () => isDocker;
export const getEnvironmentInfo = () => ({
  isDocker,
  host,
  nodeEnv: CONFIG.NODE_ENV,
  gpuEnabled: CONFIG.ENABLE_GPU,
  cudaEnabled: CONFIG.ENABLE_CUDA,
  quicEnabled: CONFIG.QUIC_ENABLED,
});

// Provide backward-compatible alias helpers for legacy call sites.
// These mirror old env names to the canonical keys in CONFIG.
export const LEGACY = {
  DATABASE_URL: CONFIG.DATABASE_URL ?? CONFIG.POSTGRES_URL,
  POSTGRES_URL: CONFIG.POSTGRES_URL,
  MINIO_ENDPOINT: CONFIG.MINIO_ENDPOINT ?? CONFIG.MINIO_URL,
  MINIO_URL: CONFIG.MINIO_URL,
  MINIO_REGION: CONFIG.MINIO_REGION ?? env.MINIO_REGION ?? undefined,
};

