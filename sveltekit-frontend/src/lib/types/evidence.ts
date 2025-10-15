// Evidence Management Types for SvelteKit 2 AI Platform
// Optimized for PostgreSQL + PGVector + Qdrant + MinIO + Redis

import type { Actor } from 'xstate';

// ==================== Evidence File Types ====================

export type EvidenceFile = {
  id: string;
  userId: string;
  caseId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  path: string; // MinIO object path: userId/caseId/fileId-filename
  uploadedAt: Date;
  tags: string[];
  embedding?: number[]; // 768-dim vector for semantic search
  summary?: string;
  legalAnalysis?: string;
  extractedText?: string;
  metadata: Record<string, unknown>;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
};

export type EvidenceUploadInput = {
  file: File;
  userId: string;
  caseId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type EvidenceAnalysisResult = {
  success: boolean;
  fileId: string;
  summary?: string;
  autoTags?: string[];
  legalNotes?: string;
  embedding?: number[];
  extractedText?: string;
  processingTimeMs: number;
};

// ==================== AI Agent Types ====================

export type AIAgentTool = {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
};

export type AIToolInvocation = {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
  timestamp: number;
};

export type AIResponse = {
  text: string;
  source: 'ollama' | 'tensorrt';
  model: string;
  toolInvocations?: AIToolInvocation[];
  tokensUsed?: number;
  responseTimeMs: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  userId: string;
  caseId?: string;
  evidenceIds?: string[];
  aiMetadata?: {
    source: 'ollama' | 'tensorrt';
    model: string;
    toolsUsed?: string[];
  };
};

// ==================== Vector Search Types ====================

export type VectorEmbedding = number[]; // 768-dim for nomic-embed-text

export type VectorSearchQuery = {
  embedding: VectorEmbedding;
  limit?: number;
  threshold?: number;
  filter?: {
    userId?: string;
    caseId?: string;
    tags?: string[];
  };
};

export type VectorSearchResult = {
  id: string;
  score: number;
  evidence: EvidenceFile;
  distance: number;
};

// ==================== Workflow Types ====================

export type WorkflowContext = {
  currentFile?: EvidenceFile;
  result?: EvidenceAnalysisResult;
  error?: string;
  progress: number;
  stage: 'upload' | 'ocr' | 'embedding' | 'analysis' | 'storage' | 'complete';
  retryCount: number;
};

export type WorkflowEvent =
  | { type: 'PROCESS_EVIDENCE'; data: EvidenceFile }
  | { type: 'OCR_COMPLETE'; text: string }
  | { type: 'EMBEDDING_COMPLETE'; embedding: number[] }
  | { type: 'ANALYSIS_COMPLETE'; result: EvidenceAnalysisResult }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' };

// ==================== Cache Types ====================

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  userId?: string;
};

export type EmbeddingCache = CacheEntry<{
  fileId: string;
  embedding: VectorEmbedding;
  model: string;
}>;

export type AnalysisCache = CacheEntry<{
  fileId: string;
  summary: string;
  tags: string[];
  legalNotes?: string;
}>;

// ==================== API Response Types ====================

export type APIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

export type UploadResponse = APIResponse<{
  fileId: string;
  path: string;
  processingStarted: boolean;
}>;

export type SearchResponse = APIResponse<{
  results: VectorSearchResult[];
  totalFound: number;
  queryTimeMs: number;
}>;

// ==================== WebSocket Message Types ====================

export type WSMessage =
  | { type: 'PROCESSING_UPDATE'; fileId: string; stage: string; progress: number }
  | { type: 'ANALYSIS_COMPLETE'; fileId: string; result: EvidenceAnalysisResult }
  | { type: 'ERROR'; fileId: string; error: string }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'VECTOR_SEARCH_RESULT'; results: VectorSearchResult[] };

// ==================== Export Actor Types ====================

// Keep the actor type tied to the workflow context/events
export type EvidenceActor = Actor<WorkflowContext, WorkflowEvent>;

// Replace SnapshotFrom<> usage (causes TS issues) with an explicit lightweight snapshot shape
export type EvidenceSnapshot = {
  context: WorkflowContext;
  // current state value (string | object) depending on machine shape
  value?: unknown;
  // optional last event that produced this snapshot
  lastEvent?: WorkflowEvent;
  // simple metadata for UI/transport (timestamps, progress)
  timestamp?: number;
  children?: Record<string, unknown>;
};
