// Minimal SvelteKit env shims for $env/static/private and $env/static/public keys used in this repo.
declare module '$env/static/private' {
  export const DATABASE_URL: string | undefined;
  export const QDRANT_URL: string | undefined;
  export const OPENAI_API_KEY: string | undefined;
  export const GEMINI_API_KEY: string | undefined;
  export const OLLAMA_URL: string | undefined;
  export const LLM_SERVICE_URL: string | undefined;
  export const INGEST_SERVICE_URL: string | undefined;
  export const REDIS_URL: string | undefined;
  export const MINIO_ENDPOINT: string | undefined;
  export const SENTRY_DSN: string | undefined;
  export const NODE_ENV: string | undefined;
  // Generic map for any other keys; use __ENV__ programmatically if needed.
  export const __ENV__: Record<string, string | undefined>;
}

declare module '$env/static/public' {
  export const PUBLIC_BASE_URL: string | undefined;
  export const PUBLIC_ASSET_PATH: string | undefined;
  // Duplicate removed: // Duplicate removed: export const __ENV__: Record<string, string | undefined>;
}
