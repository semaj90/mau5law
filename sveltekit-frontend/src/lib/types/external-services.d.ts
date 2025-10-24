export interface IOllamaEmbeddingService {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface IOllamaChatService {
  chat(messages: { role: 'user' | 'system' | 'assistant'; content: string }[]): Promise<string>;
}

export interface IRedisCacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

export interface IQdrantVectorService {
  upsertVector(id: string, vector: number[], metadata?: Record<string, any>): Promise<void>;
  searchVector(query: number[], topK: number): Promise<{ id: string; score: number }[]>;
}

export interface IUltraJSONParser {
  parse<T = any>(data: string): T;
  stringify(data: any): string;
}

export interface IWasmClusteringService {
  cluster(vectors: number[][], n: number): Promise<number[]>;
}

export interface INesGPUBridge {
  runShaderTask(taskName: string, payload: unknown): Promise<unknown>;
}