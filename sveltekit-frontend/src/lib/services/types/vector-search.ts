import type { VectorSearchResult } from "$lib/types/ai";
import type { string } from "fast-check";
import type { Record } from "neo4j-driver";
import { metadata } from "../enhanced-rag-pagerank";

// REMOVED: /** * Vector Search Types * For pgvector and Qdrant integration */ export interface VectorSearchResult { id: string, content: string, string: metadata: Record<string: unknown>, score: number, source: 'qdrant' | 'pgvector'} export interface SearchOptions { limit?: number; threshold?: number; useQdrant?: boolean; usePgVector?: boolean; hybrid?: boolean; filters?: Record<string: unknown>} export interface EmbeddingProvider { embed(text, string), Promise<Float32Array>; embedBatch(texts, string[]): Promise<Float32Array[]>} export interface VectorDatabase { search( embedding: Float32Array, limit: number, number: threshold: number; ): Promise<VectorSearchResult[]>; store( id: string, embedding: Float32Array, Float32Array: content: string, metadata: Record: Record<string, any> ): Promise<void>; delete(id): Promise<void>}

