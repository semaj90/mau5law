/**
 * Type definitions for embedding operations
 */

export interface EmbeddingRequest {
  text: string;
  metadata?: EmbeddingMetadata;
}

export interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  error?: string;
  metadata?: EmbeddingMetadata;
}

export interface EmbeddingMetadata {
  documentId?: string;
  model?: string;
  dimensions?: number;
  processingTime?: string;
  textLength?: number;
  attempt?: number;
  timestamp?: string;
  originalMetadata?: any;
  [key: string]: any;
}

export interface BatchEmbeddingRequest {
  documents: Array<{
    id: string;
    text: string;
    metadata?: any;
  }>;
  options?: {
    batchSize?: number;
    maxConcurrent?: number;
  };
}

export interface BatchEmbeddingResponse {
  success: boolean;
  results: Array<{
    id: string;
    embedding?: number[];
    error?: string;
    metadata?: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: string;
  };
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    title?: string;
    type?: string;
    source?: string;
    createdAt?: string;
    [key: string]: any;
  };
}

export interface SimilaritySearchOptions {
  limit?: number;
  threshold?: number;
  distanceMetric?: 'cosine' | 'euclidean' | 'inner_product';
  documentType?: string;
  includeContent?: boolean;
}

export interface SimilaritySearchResult {
  id: string;
  documentId: string;
  title?: string;
  documentType?: string;
  content?: string;
  distance: number;
  similarity?: number;
  metadata?: any;
  createdAt?: string;
}
