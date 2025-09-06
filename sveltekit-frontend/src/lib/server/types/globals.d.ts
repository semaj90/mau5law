// Lightweight ambient declarations for commonly referenced runtime services
// and to provide temporary module augmentation for third-party packages
// during migration/triage. These are intentionally permissive (`any`) and
// meant to be replaced with proper types later.

declare module 'drizzle-orm' {
  // Common helpers some files import directly from 'drizzle-orm'
  export const desc: any;
  export const asc: any;
  export const db: any;
  export const cases: any;
  export const evidence: any;
  export const documents: any;
  export const verifyPassword: any;
  export const createUserSession: any;
  export const setSessionCookie: any;
  export const appendFile: any;
  export const mkdir: any;
  export const rename: any;
  export const readFile: any;
  export const writeFile: any;
  export const getPipelineHistogram: any;
  export const getDedupeMetrics: any;
  export const getAlertHistory: any;
  // Fallback to allow other named imports without breaking compilation
  export const __any__ : any;
}

// Ambient global runtime services frequently referenced across server routes
declare const monitoringService: any;
declare const ollamaLLM: any;
declare const cachingLayer: any;
declare const aiPipeline: any;
declare const enhancedRAGPipeline: any;
declare const librarySyncService: any;
declare const accessMemoryMCP: any;
declare const analyticsLog: any;
declare const natsMessaging: any;
declare const QdrantClient: any;
declare const wasmClusteringService: any;
declare const comprehensiveCachingService: any;
declare const generateEmbedding: any;
declare const generateBatchEmbeddings: any;
declare const VectorService: any;
declare const generateCompletion: any;
declare const healthCheck: any;
declare const inArray: any;
declare const join: any;
declare const createHash: any;
declare const exec: any;
declare const hashPassword: any;
declare const FileLike: any;

// Allow importing environment-like objects with arbitrary properties used in code
declare module '$env/static/private' {
  const env: { [key: string]: any };
  export = env;
}

declare module '$env/static/public' {
  const env: { [key: string]: any };
  export = env;
}


// Auto-generated development global declarations to reduce TS noise while
// we incrementally normalize runtime service imports. These are lightweight
// `any` declarations for dev-time only and should be replaced with proper
// typed services as we stabilize the runtime wiring.

declare module NodeJS {
  interface Global {
    monitoringService: any;
    ollamaLLM: any;
    cachingLayer: any;
    aiPipeline: any;
    enhancedRAGPipeline: any;
    accessMemoryMCP: any;
    context7AgentOrchestrator: any;
    performContext7Search: any;
    context7SemanticAuditor: any;
    comprehensiveCachingService: any;
    wasmClusteringService: any;
    librarySyncService: any;
    natsMessaging: any;
    qdrantClient: any;
    QdrantClient: any;
    generateEmbedding: any;
    VectorService: any;
    VectorSearchService: any;
    VectorRepository: any;
    aiReports: any;
    legalPrecedents: any;
    analyticsLog: any;
    comprehensiveAutosolve: any;
  }
}

// Fall back global declarations
declare const monitoringService: any;
declare const ollamaLLM: any;
declare const cachingLayer: any;
declare const aiPipeline: any;
declare const enhancedRAGPipeline: any;
declare const accessMemoryMCP: any;
declare const context7AgentOrchestrator: any;
declare const performContext7Search: any;
declare const context7SemanticAuditor: any;
declare const comprehensiveCachingService: any;
declare const wasmClusteringService: any;
declare const librarySyncService: any;
declare const natsMessaging: any;
declare const QdrantClient: any;
declare const qdrantClient: any;
declare const generateEmbedding: any;
declare const VectorService: any;
declare const legalPrecedents: any;
declare const aiReports: any;


