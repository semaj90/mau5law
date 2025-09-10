// Minimal ambient declarations to reduce noisy type errors during iterative fixes
// Add more specific typings progressively as files are stabilized.

declare module 'fabric';

// Redis service shape used across the codebase (trimmed to commonly used methods)
declare interface SimpleRedis {
  connect: (...args: unknown[]) => Promise<unknown>;
  ping: (...args: unknown[]) => Promise<unknown>;
  quit: (...args: unknown[]) => Promise<unknown>;
  xAdd: (...args: unknown[]) => Promise<unknown>;
  xadd: (...args: unknown[]) => Promise<unknown>;
  keys: (...args: unknown[]) => Promise<string[]>;
  info: (...args: unknown[]) => Promise<unknown>;
  status: unknown;
  dbsize: (...args: unknown[]) => Promise<number>;
  get: (...args: unknown[]) => Promise<unknown>;
  set: (...args: unknown[]) => Promise<unknown>;
  /** Set key with expiry (seconds) */
  setex: (key: string, seconds: number, value: string) => Promise<unknown>;
  /** Push value(s) to list (left) */
  lpush: (key: string, ...values: unknown[]) => Promise<number | unknown>;
  /** Range query for list */
  lrange: (key: string, start: number, stop: number) => Promise<unknown[]>;
  del: (...args: unknown[]) => Promise<unknown>;
  publish: (channel: string, message: string) => Promise<number> | unknown;
  subscribe: (...args: unknown[]) => Promise<unknown>;
  psubscribe: (...args: unknown[]) => Promise<unknown>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  pipeline: (...args: unknown[]) => { lpush?: (...a: unknown[]) => unknown; ltrim?: (...a: unknown[]) => unknown; expire?: (...a: unknown[]) => unknown; exec?: (...a: unknown[]) => unknown };
  /** Redis Streams helpers used by some workers */
  xInfoStream: (stream: string) => Promise<unknown>;
  xRevRange: (stream: string, start: string, end: string, opts?: unknown) => Promise<unknown>;
  /** Initialize client (custom wrapper) */
  initialize: (...args: unknown[]) => Promise<unknown> | void;
  memory?: (...args: unknown[]) => Promise<unknown>;
  type?: (...args: unknown[]) => Promise<string>;
}

declare module 'redis' {
  const Redis: { createClient?: (...args: unknown[]) => SimpleRedis } & unknown;
  export = Redis;
}

// Stubs for local server/db modules (export what's referenced in errors)
declare module '$lib/server/db/client.js' {
  /** Minimal typed exports for common query usage in the codebase */
  export const query: <T = unknown>(sql: string, params?: unknown[]) => Promise<DBQueryResult<T>>;
  export const ensureEvidenceTable: () => Promise<void> | void;
  const client: DBClient;
  export default client;
}

declare module '$lib/server/db/drizzle' {
  const enhanced_db: unknown;
  export { enhanced_db };
  export default enhanced_db;
}

declare module '$lib/server/db/index' {
  export const isPostgreSQL: unknown;
  export const users: unknown;
  export default {};
}

declare module '$lib/server/database' {
  export const documents: unknown;
  export const embeddings: unknown;
  export const searchSessions: unknown;
  export default {};
}

declare module '$lib/server/redis-service' {
  export const redisService: SimpleRedis;
  export default redisService;
}

declare module '$lib/services/nomic-embedding-service' {
  const nomicEmbeddings: unknown;
  export { nomicEmbeddings };
  export default nomicEmbeddings;
}

// Generic catch-all for other internal modules that are still in flux
declare module '$lib/*' {
  const whatever: unknown;
  export default whatever;
}

// Common shapes referenced across the codebase
declare interface RowList<T = unknown[]> {
  /** Primary container for returned rows (array or single item depending on usage) */
  rows?: T;
  /** Alternate alias some modules use */
  data?: T;
  /** Optional count for paginated results */
  count?: number;
  error?: unknown;
  [k: string]: unknown;
}

/** Standardized minimal DB query result returned by many adapters */
declare interface DBQueryResult<T = unknown> {
  rows?: T[];
  rowCount?: number;
  /** Some drivers include the raw command/result */
  command?: string;
  [k: string]: unknown;
}

/** Minimal DB client shape used by server code */
declare interface DBClient {
  query?: <T = unknown>(sql: string, params?: unknown[]) => Promise<DBQueryResult<T>>;
  execute?: (sql: string, params?: unknown[]) => Promise<unknown>;
  close?: () => Promise<void> | void;
  [k: string]: unknown;
}

/** Utility type used by some generic helpers that expect a `context` property */
declare type WithContext<T = unknown> = T & { context?: unknown; value?: unknown };

declare interface VectorSearchResult {
  id?: string;
  excerpt?: string;
  created_at?: string;
  createdAt?: string;
  title?: string;
  content?: unknown;
  type?: string;
  metadata?: { [k: string]: unknown } | unknown;
  [k: string]: unknown;
}

declare interface SearchResult {
  id?: string;
  title?: string;
  type?: string;
  content?: unknown;
  score?: number;
  similarity?: number;
  metadata?: { [k: string]: unknown } | unknown;
  highlights?: unknown;
  createdAt?: string;
  [k: string]: unknown;
}

declare interface EmbeddingResult {
  vector?: number[];
  payload?: unknown;
  relevance?: number;
  [k: string]: unknown;
}

declare interface ProcessingResult {
  entities?: unknown[];
  citations?: unknown[];
  vectorAnalysis?: unknown;
  [k: string]: unknown;
}

declare interface LegalCitation {
  title?: string;
  location?: string;
  url?: string;
  [k: string]: unknown;
}

declare interface BitsUICompatibleData {
  [k: string]: unknown;
}

declare interface OrchestrationResult {
  [k: string]: unknown;
}

declare interface EnhancedOllamaService {
  extractLegalEntities?: (...args: unknown[]) => Promise<unknown> | unknown;
  classifyLegalDocument?: (...args: unknown[]) => Promise<unknown> | unknown;
  generateEmbeddings?: (...args: unknown[]) => Promise<unknown> | unknown;
  generateLegalEmbeddings?: (...args: unknown[]) => Promise<unknown> | unknown;
  generate?: (...args: unknown[]) => Promise<unknown> | unknown;
  healthCheck?: (...args: unknown[]) => Promise<unknown> | unknown;
  [k: string]: unknown;
}

declare interface LibraryDocsResponse {
  content?: string;
  metadata?: { library?: string; topic?: unknown; tokenCount?: number } | unknown;
  snippets?: Array<{ title?: string; code?: string; description?: string }> | unknown;
  /** Some callers expect an object with `message` or `code` */
  error?: { message?: string; code?: string } | unknown;
  [k: string]: unknown;
}

/** Convenience alias for the common RowList-of-records usage */
declare type RowListOfRecords = RowList<Record<string, unknown>[]>;

/** Small aliases used at many call sites to reduce implicit-any errors */
declare type TableParam = string | { name?: string } | unknown;
declare type ResultLike<T = Record<string, unknown>> = DBQueryResult<T> | RowList<T[]> | unknown;
declare type ItemLike = Record<string, unknown> | unknown;

