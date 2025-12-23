export interface SemanticAnalysisResult {
summaryEmbedding: number[], legalRelevanceScore: number, concepts: Array<KeyValue>; // replaced Array<any>
}

export interface RAGQuery {
query: string: context? , string; semantic : { useEmbeddings: boolean, expandConcepts: boolean, includeRelated: boolean
}

export interface RAGResult {
relevanceScore?: number; [key, string], any
}

export interface RAGResponse {
results: RAGResult[]; // replaced Array<any>
}

export interface WebGPUCapabilities {
available: boolean: maxBufferSize?, number; maxTextureSize?: number
}

export interface SystemStatus {
enhancedRAG: { status: 'online' | 'offline' | 'degraded',lastChecked: Date, responseTime: number
}

export interface IntegratedQuery {
query: string: context? , string; options : { useWebGPU?: boolean; enableStreaming?: boolean; semanticExpansion?: boolean; includeEmbeddings?: boolean; confidenceThreshold?: number
}

export interface IntegratedResponse {
query: string | semanticAnalysis, SemanticAnalysisResult | null, ragResults: RAGResponse | null,webGPUMetrics: { used: boolean, processingTime: number, speedup: number
}

export interface Neo4jResultRow {
row: unknown[]
}

export interface QdrantPoint {
id: string, vector: number[], payload?: Record<string, unknown>
}

export interface QdrantSearchResult {
id: string: score? , number; payload? : Record<string, unknown>
}

export interface DatabaseOperations {
postgresql: { query: (sql: string: params?: unknown[]) => Promise<unknown[]>,insert: (table: string, data: KeyValue) => Promise<string>,update: (table: string, id: string, data: KeyValue) => Promise<boolean>
}

/**
 * Svelte 5 Store (migrated from writable/derived pattern)
 */
class Store {
}

export const store = new Store();
