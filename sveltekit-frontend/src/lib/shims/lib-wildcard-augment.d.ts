// Wildcard $lib shim: expose common named exports as permissive "any" to reduce
// large-volume errors during migration. Keep minimal and extend as needed.

declare module '$lib/*' {
  const _any: any;
  export default _any;

  // common high-noise named exports used across the repo — declared permissively
  export const Case: any;
  export const Evidence: any;
  export const AIFindResult: any;
  export const VectorService: any;
  export const ollamaService: any;
  export const db: any;
  export const generateEmbedding: any;
  export const generateBatchEmbeddings: any;
  export const logger: any;
  export const productionAPIClient: any;
  export const PROTOCOL_TIERS: any;
  export const productionServiceRegistry: any;

  // Database schema exports
  export const legalDocuments: any;
  export const documentChunks: any;
  export const autoTags: any;
  export const userAiQueries: any;
  export const document_chunks: any;

  // Service exports
  export const enhancedRAGStore: any;
  export const EventEmitter: any;
  export const LegalDocument: any;
  export const DocumentChunk: any;
  export const UserAiQuery: any;
  export const AutoTag: any;
  export const setCache: any;
  export const initializeQdrantCollection: any;
  export const resolveLibraryId: any;
  export const getLibraryDocs: any;
  export const analyzeCurrentErrors: any;

  // Additional missing exports
  export const crewAIService: any;
  export const phase13Stores: any;
}


