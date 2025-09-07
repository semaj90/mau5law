export type BackendId = 'fastapi' | 'vllm' | 'ollama' | 'go' | 'cache' | 'unknown';

export interface ChunkJob {
  docId: string;
  chunkId: string;
  text: string;
  model?: string;
  tags?: string[];
}

export interface EmbedResult {
  docId: string;
  chunkId: string;
  embedding: number[];
  model: string;
  backend: BackendId;
  cached?: boolean;
}

export interface PipelineRequest {
  docId: string;
  text: string;
  model?: string;
  tags?: string[];
  maxChunkBytes?: number;
}

export interface PipelineResponse {
  ok: boolean;
  docId: string;
  count: number;
  model: string;
  backend?: BackendId;
}
