// Temporary runtime globals shim to reduce TS "Cannot find name" noise.
// These are intentionally typed as `any` and will be replaced with proper
// interfaces as we stabilize the runtime wiring.

declare const cachingLayer: any;
declare const monitoringService: any;
declare const ollamaLLM: any;
declare const ollamaService: any;
declare const aiPipeline: any;
declare const enhancedRAGPipeline: any;
declare const enhancedRAGPipelineService: any;
declare const enhancedRAG: any;
declare const generateEmbedding: any;
declare const generateBatchEmbeddings: any;
declare const VectorService: any;
declare const QdrantClient: any;
declare const qdrantClient: any;
declare const wasmClusteringService: any;
declare const FileLike: any;
declare const accessMemoryMCP: any;
declare const context7AgentOrchestrator: any;
declare const context7SemanticAuditor: any;
declare const performContext7Search: any;
declare const librarySyncService: any;
declare const analyticsLog: any;
declare const nomicEmbeddings: any;
declare const comprehensiveCachingService: any;
declare const comprehensiveCaching: any;
declare const natsMessaging: any;
declare const join: any;
declare const exec: any;
declare const hashPassword: any;
declare const hashPasswords: any;
declare const createHash: any;
declare const randomUUID: any;
declare const inArray: any;
declare const reports: any;
declare const legalAnalysisSessions: any;
declare const legalPrecedents: any;
declare const chatMessages: any;
declare const librarySyncServiceEnabled: any;
declare const enhanced_db: any;
declare const db: any;

// Helpers commonly used from drizzle/orm modules
declare const desc: any;
declare const asc: any;

// Allow access to $env/static/private keys referenced in files
declare module '$env/static/private' {
  const env: { [k: string]: string | undefined };
  export = env;
}

declare module '$env/static/public' {
  const env: { [k: string]: string | undefined };
  export = env;
}
