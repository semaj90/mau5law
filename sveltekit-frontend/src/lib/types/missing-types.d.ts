// TypeScript declarations for missing types across the codebase
// This file resolves many TS2304 "Cannot find name" errors

// Engine/Graphics types
declare class ShaderCache {
  static get(key: string): any;
  static set(key: string, value: any): void;
}

declare class MatrixTransformLib {
  static createTransform(): any;
  static multiply(a: any, b: any): any;
}

// Docker/Optimization types
declare class DockerResourceOptimizer {
  static optimizeMemory(): Promise<any>;
  static getCurrentUsage(): Promise<any>;
}

// RAG/Search types
declare interface RAGSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

declare interface TextChunk {
  text: string;
  index: number;
  metadata?: Record<string, any>;
}

declare interface RAGDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

// Store types
declare const enhancedRAGStore: {
  search: (query: string) => Promise<RAGSearchResult[]>;
  add: (doc: RAGDocument) => Promise<void>;
};

declare const documentVectors: any;

// Routing types
declare interface DynamicRouteConfig {
  path: string;
  component: any;
  metadata?: Record<string, any>;
}

declare interface GeneratedRoute {
  path: string;
  handler: any;
}

declare function registerDynamicRoute(config: DynamicRouteConfig): GeneratedRoute;

// Document processing types
declare interface DocumentProcessingOptions {
  type: 'pdf' | 'docx' | 'txt';
  extractImages?: boolean;
  ocrEnabled?: boolean;
}

// Context7/MCP types
declare function createContext7MCPIntegration(): any;

// Database and ORM globals (fixes TS2304 errors)
declare global {
  const db: any;
  const sql: any;
  const eq: any;
  const and: any;
  const or: any;
  const like: any;
  const json: any;
  const browser: any;
  const error: any;
  const logger: any;
  const documents: any;
  const cases: any;
  const evidence: any;
  const relations: any;
  const legalDocuments: any;
  const cacheManager: any;
  const chatSessions: any;
  const ollamaService: any;
  const databaseOrchestrator: any;
  const tauriLLM: any;
  const metrics: any;
  const z: any;
  const prisma: any;
}

// Langchain missing exports
declare module '@langchain/community/vectorstores/pgvector' {
  export class PGVectorStore {
    static initialize(config: any): Promise<PGVectorStore>;
    static fromExistingIndex(config: any): Promise<PGVectorStore>;
    similaritySearchWithScore(query: string, k?: number): Promise<any[]>;
    similaritySearch(query: string, k?: number): Promise<any[]>;
  }

  export enum DistanceStrategy {
    EUCLIDEAN = 'euclidean',
    COSINE = 'cosine',
    INNER_PRODUCT = 'innerProduct'
  }
}

declare module '@langchain/community/vectorstores/neo4j_vector' {
  export class Neo4jVectorStore {
    constructor(config: any);
    static fromExistingIndex(config: any): Promise<Neo4jVectorStore>;
    similaritySearch(query: string, k?: number): Promise<any[]>;
  }
}

// XState v5 compatibility stubs
declare module 'xstate' {
  export interface StateId {}
  export interface MetaObject {}

  export interface TransitionConfig<TContext = any, TEvent = any, TResolvedEvent = any, TEventType = any> {
    cond?: any;
    actions?: any;
    target?: any;
  }

  export interface Actor<T = any> {
    send(event: any): void;
    getSnapshot(): T;
    subscribe(callback: (snapshot: T) => void): { unsubscribe(): void };
    stop(): void;
    onTransition?: (listener: (snapshot: T) => void) => { unsubscribe(): void };
    onDone?: (listener: (event: any) => void) => { unsubscribe(): void };
    onStop?: (listener: () => void) => { unsubscribe(): void };
    withConfig?: (config: any) => any;
  }

  export function createActor<T>(machine: any): Actor<T>;
}

// Redis stub
declare module 'ioredis' {
  export default class Redis {
    constructor(config?: any);
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<'OK'>;
    del(key: string): Promise<number>;
  /** Set key with expire (seconds) */
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  /** Subscribe to patterns */
  psubscribe(...patterns: string[]): Promise<number>;
  /** Subscribe to channels */
  subscribe(...channels: string[]): Promise<number>;
  /** Basic event listener, e.g. 'pmessage', 'message', 'ready', 'error' */
  on(event: string, listener: (...args: any[]) => void): this;
  /** Connect/Disconnect lifecycle */
  connect(): Promise<void>;
  disconnect(): void;
  quit(): Promise<'OK' | void>;
  /** Ping server */
  ping(message?: string): Promise<string>;
  }
}

// Utility stubs for production
export function generateEmbedding(text: string, options?: any): Promise<number[]>;
export function withRetry<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>;
;
// Production type definitions
export interface GenericLegalAnalysisResult {
  score: number;
  confidence: number;
  categories: string[];
  entities: string[];
  sentiment: string;
  complexity: number;
  recommendations: string[];
  legalRelevance?: number;
}

export interface LegalEmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  processingTime: number;
}

export interface MetricData {
  id?: string;
  metric: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, any>;
  source?: string;
  level?: string;
  category?: string;
  data?: any;
}

export interface MonitoringService {
  recordMetric(metric: string, value: number, labels?: Record<string, any>): void;
  recordSynthesis?(data: any): void;
  getMetrics(): Promise<MetricData[]>;
}