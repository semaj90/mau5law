declare module '$lib/wasm/wasm-llm-service.js' {
  import type { WASMLLMConfig, WASMLLMResponse } from '$lib/types/vector-jobs.js';
  export const wasmLLMService: {
    initialize(): Promise<boolean>;
    loadModel(config?: Partial<WASMLLMConfig>): Promise<void>;
    generateText(prompt: string, config?: Partial<WASMLLMConfig>): Promise<WASMLLMResponse>;
    dispose?(): void;
    getStats?(): any | Promise<any>;
  };
}

declare module '$lib/ai/langchain-ollama-service.js' {
  import type { LangChainConfig, QueryResult, ProcessingResult } from '$lib/ai/langchain-ollama-service.js';
  export const langChainOllamaService: {
    testConnection(): Promise<boolean>;
    queryDocuments(query: string, options: { maxResults: number; relevanceThreshold: number }): Promise<QueryResult>;
    processDocument(text: string, meta: any): Promise<ProcessingResult>;
    reset?(): void;
    getStats?(): any | Promise<any>;
  };
}

declare module '$lib/gpu/nes-gpu-integration.js' {
  import type { LegalDocument } from '$lib/gpu/nes-gpu-integration.js';
  export const nesGPUIntegration: {
    searchLegalDocumentsGPU(query: string, options?: { limit?: number; threshold?: number; useNESCache?: boolean; enableGPUAcceleration?: boolean }): Promise<LegalDocument[]>;
    ingestLegalDocumentsBinary(docs: LegalDocument[]): Promise<void>;
    dispose?(): void;
    getPerformanceStats?(): any | Promise<any>;
  };
}

declare module '$lib/server/db/enhanced-vector-operations.js' {
  export const vectorOps: {
    searchDocuments(embedding: Float32Array, threshold: number): Promise<any>;
  };
}
