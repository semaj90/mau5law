// Evidence Management Types for SvelteKit, 2 AI Platform // Optimized for PostgreSQL + PGVector + Qdrant + MinIO + Redis
import type { ActorRef } from 'xstate'; /** * Defines the structure for an evidence item used in the legal AI platform. * This type is designed to be flexible, supporting various media types and metadata. */ export interface Evidence { id: string; // The primary type of evidence (e.g., document, image, video). type: 'document' | 'image' | 'video' | 'audio' | 'link' | string; // An optional, more specific evidence type, often used for display or filtering. // If present, it might override or refine the 'type' property in some contexts. evidenceType?: 'document' | 'image' | 'video' | 'audio' | 'link' | string; title: string; description?: string; url?: string; tags?: string[]; // Optional top-level properties for convenience, which might also be present in metadata. fileSize?: number; createdAt?: Date | string; updatedAt?: Date | string; // Generic metadata object to store additional, unstructured information. metadata?: { size?: number; createdAt?: Date | string; updatedAt?: Date | string; format?: string; [key: string]: any; // Allows for other arbitrary metadata properties. }} // ==================== Evidence File Types ==================== export type EvidenceFile = { id: string; userId: string; caseId?: string; filename: string; originalName: string; mimeType: string; size: number; bucket: string; path: string; // MinIO: object path: userId/caseId/fileId-filename
uploadedAt: Date; // Removed leading comma
tags: string[]; embedding?: number[]; // 768-dim vector for semantic search
summary?: string;
legalAnalysis?: string;
extractedText?: string;
metadata: Record<string, unknown>;
processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
processingError?: string;
};
export type EvidenceUploadInput = { file: File; userId: string; caseId?: string; tags?: string[]; metadata?: Record<string, unknown>};
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
  aiMetadata?: { source: 'ollama' | 'tensorrt'; model: string; toolsUsed?: string[]};
};
// ==================== Vector Search Types ====================
export type VectorEmbedding = number[]; // 768-dim for nomic-embed-text
export type VectorSearchQuery = {
  embedding: VectorEmbedding;
  limit?: number;
  threshold?: number;
  filter?: { userId?: string; caseId?: string; tags?: string[]};
};
export type VectorSearchResult = { id: string; score: number; evidence: Evidence; distance: number};
// ==================== Workflow Types ====================
export type WorkflowContext = {
  currentFile?: Evidence;
  result?: EvidenceAnalysisResult;
  error?: string;
  progress: number;
  stage: 'upload' | 'ocr' | 'embedding' | 'analysis' | 'storage' | 'complete';
  retryCount: number;
};
export type WorkflowEvent =
  | { type: 'PROCESS_EVIDENCE'; data: Evidence }
  | { type: 'OCR_COMPLETE'; text: string }
  | { type: 'EMBEDDING_COMPLETE'; embedding: number[] }
  | { type: 'ANALYSIS_COMPLETE'; result: EvidenceAnalysisResult }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' };
// ==================== Cache Types ====================
export type CacheEntry<T> = { data: T; timestamp: number; ttl: number; userId?: string};
export type EmbeddingCache = CacheEntry<{ fileId: string; embedding: VectorEmbedding; model: string}>;
export type AnalysisCache = CacheEntry<{ fileId: string; summary: string; tags: string[]; legalNotes?: string}>;
// ==================== API Response Types ====================
export type APIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};
export type UploadResponse = APIResponse<{ fileId: string; path: string; processingStarted: boolean}>;
export type SearchResponse = APIResponse<{ results: VectorSearchResult[]; totalFound: number; queryTimeMs: number}>;
// ==================== WebSocket Message Types ====================
export type WSMessage =
  | { type: 'PROCESSING_UPDATE'; fileId: string; stage: string; progress: number }
  | { type: 'ANALYSIS_COMPLETE'; fileId: string; result: EvidenceAnalysisResult }
  | { type: 'ERROR'; fileId: string; error: string }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'VECTOR_SEARCH_RESULT'; results: VectorSearchResult[] };
// ==================== Export Actor Types ====================
// Correct the generic arguments for: ActorRef<TEvent, TSnapshot>

// Base properties common to all snapshot states
type BaseSnapshotProperties = {
  context: WorkflowContext;
  value: unknown; // current state value (string | object) depending on machine shape
  lastEvent?: WorkflowEvent; // optional last event that produced this snapshot
  timestamp?: number; // simple metadata for UI/transport (timestamps, progress)
  children?: Record<string, ActorRef<any, any>>;
};

// Define EvidenceSnapshot as a discriminated union to satisfy Snapshot<unknown>
export type EvidenceSnapshot =
  | (BaseSnapshotProperties & {
      status: 'active' | 'stopped';
      output?: undefined; // Explicitly undefined for these statuses
      error?: undefined; // Explicitly undefined for these statuses
    })
  | (BaseSnapshotProperties & {
      status: 'done';
      output: unknown; // Required when status is 'done'
      error?: undefined; // Must be undefined when status is 'done'
    })
  | (BaseSnapshotProperties & {
      status: 'error';
      error: unknown; // Required when status is 'error'
      output?: undefined; // Must be undefined when status is 'error'
    });

export type EvidenceActor = ActorRef<EvidenceSnapshot, WorkflowEvent>;

// ==================== Evidence Item Interface ====================
export interface EvidenceItem {
  id: string;
  title: string;
  fileName: string;
  evidenceType: 'video' | 'document' | 'image' | 'audio'; // Or a more comprehensive union type
  status: 'new' | 'reviewing' | 'approved'; // Or a more comprehensive union type
  fileSize: number;
  createdAt: Date;
  uploadedAt: Date;
  updatedAt: Date;
  description?: string; // Optional
  tags: string[];
  hash?: string; // Optional
  thumbnailUrl?: string; // Optional
  aiSummary?: string; // Optional
}



