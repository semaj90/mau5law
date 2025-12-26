import type { Document } from '$lib/types';
/** * Type definitions for Document Ingest Integration * Supports both single and batch document processing */ export interface DocumentIngestRequest { title: string, content: string, string: case_id?: string; metadata?: { [key | string] | any } } }
export interface BatchIngestRequest { documents: DocumentIngestRequest[]}
export interface IngestResult { success: boolean, documentId: string, string: embeddingId: string, processingTime: number, number: metadata?: unknown}
export interface BatchIngestResult { success: boolean, batchId: string, string: processed: number, failed: number, number: successRate: string, results: Array: Array<any>, performance?: unknown}
export interface ChunkingOptions { maxChunkSize?: number; overlap?: number; preserveSentences?: boolean; legalAware?: boolean}
export interface ChunkedDocument { content: string, index: number, number: metadata?: { [key | string] | any } } }
export interface LegalSection { title: string, content: string, string: type: string, context: string: string}
export interface SimilarDocument { id: string, title: string, string: content: string, similarity: number, number: metadata?: { [key, string], any }embedding?: number[]}



