/**
 * Comprehensive RAG Ingestion Pipeline
 * Handles: File Upload → OCR → Chunking → Embedding (512-dim embeddinggemma) → Vector Storage (PostgreSQL + Qdrant)
 * Uses: XState, RabbitMQ, Redis, QUIC/gRPC
 */

import { setup, assign, fromPromise } from 'xstate';
import { hybridVectorSearch } from './hybrid-vector-search';
import { gemmaEmbeddingsService } from './gemma-embeddings-service';
import type { EmbeddingRequest } from './gemma-embeddings-service';

// RAG Ingestion Types
export interface RAGDocument {
  id: string;
  filename: string;
  content: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'image' | 'html';
  file_size: number;
  uploaded_at: Date;
  user_id?: string;
  case_id?: string;
  metadata?: Record<string, any>;
}

export interface RAGChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  chunk_size: number;
  overlap_size: number;
  metadata?: Record<string, any>;
}

export interface RAGEmbedding {
  chunk_id: string;
  embedding: number[];
  dimensions: number;
  model: string;
  created_at: Date;
}

export interface OCRResult {
  text: string;
  confidence: number;
  pages: number;
  processing_time_ms: number;
}

export interface IngestionContext {
  document?: RAGDocument;
  ocrResult?: OCRResult;
  chunks?: RAGChunk[];
  embeddings?: RAGEmbedding[];
  error?: string;
  progress: number;
  stage: string;
  stats?: {
    total_chunks: number;
    total_embeddings: number;
    processing_time_ms: number;
    storage_engines: string[];
  };
}

export interface IngestionInput {
  file: File | Buffer;
  filename: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'image' | 'html';
  user_id?: string;
  case_id?: string;
  metadata?: Record<string, any>;
  options?: {
    enable_ocr?: boolean;
    chunk_size?: number;
    chunk_overlap?: number;
    sync_to_qdrant?: boolean;
  };
}

/**
 * XState Machine for RAG Ingestion Workflow
 */
export const ragIngestionMachine = setup({
  types: {
    context: {} as IngestionContext,
    input: {} as IngestionInput,
    events: {} as
      | { type: 'START_INGESTION' }
      | { type: 'OCR_COMPLETE'; ocrResult: OCRResult }
      | { type: 'CHUNKING_COMPLETE'; chunks: RAGChunk[] }
      | { type: 'EMBEDDING_COMPLETE'; embeddings: RAGEmbedding[] }
      | { type: 'STORAGE_COMPLETE' }
      | { type: 'ERROR'; error: string }
      | { type: 'RETRY' },
  },

  actors: {
    uploadDocument: fromPromise(async ({ input }: { input: IngestionInput }) => {
      // Upload document logic
      const document: RAGDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: input.filename,
        content: '', // Will be filled after OCR
        file_type: input.file_type,
        file_size: input.file instanceof File ? input.file.size : input.file.length,
        uploaded_at: new Date(),
        user_id: input.user_id,
        case_id: input.case_id,
        metadata: input.metadata,
      };

      return document;
    }),

    performOCR: fromPromise(
      async ({ input }: { input: { document: RAGDocument; file: File | Buffer; options?: any } }) => {
        const startTime = Date.now();

        // Check if OCR is needed
        if (input.document.file_type === 'txt') {
          // No OCR needed for text files
          const text = input.file instanceof File ? await input.file.text() : input.file.toString('utf-8');

          return {
            text,
            confidence: 1.0,
            pages: 1,
            processing_time_ms: Date.now() - startTime,
          } as OCRResult;
        }

        // Call CUDA OCR service for images/PDFs
        const formData = new FormData();
        if (input.file instanceof File) {
          formData.append('file', input.file);
        } else {
          formData.append('file', new Blob([input.file]), input.document.filename);
        }
        formData.append('enable_gpu', 'true');

        const response = await fetch('/api/ocr/process', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`OCR failed: ${response.status}`);
        }

        const result = await response.json();
        return {
          text: result.text,
          confidence: result.confidence,
          pages: result.pages,
          processing_time_ms: Date.now() - startTime,
        } as OCRResult;
      }
    ),

    chunkDocument: fromPromise(
      async ({ input }: { input: { document: RAGDocument; content: string; options?: any } }) => {
        const chunkSize = input.options?.chunk_size || 600;
        const chunkOverlap = input.options?.chunk_overlap || 100;

        const chunks: RAGChunk[] = [];
        const text = input.content;
        let startIndex = 0;
        let chunkIndex = 0;

        while (startIndex < text.length) {
          const endIndex = Math.min(startIndex + chunkSize, text.length);
          const chunkText = text.slice(startIndex, endIndex);

          chunks.push({
            id: `chunk_${input.document.id}_${chunkIndex}`,
            document_id: input.document.id,
            content: chunkText,
            chunk_index: chunkIndex,
            chunk_size: chunkText.length,
            overlap_size: chunkOverlap,
            metadata: {
              start_index: startIndex,
              end_index: endIndex,
              ...input.document.metadata,
            },
          });

          chunkIndex++;
          startIndex = endIndex - chunkOverlap;

          // Prevent infinite loop
          if (endIndex >= text.length) break;
        }

        return chunks;
      }
    ),

    generateEmbeddings: fromPromise(
      async ({ input }: { input: { chunks: RAGChunk[]; document: RAGDocument; options?: any } }) => {
        const texts = input.chunks.map(chunk => chunk.content);

        // Batch generate embeddings using embeddinggemma:latest (512-dim)
        const results = await hybridVectorSearch.batchGenerateAndStore(texts, {
          document_type: 'legal_document',
          metadata: {
            document_id: input.document.id,
            filename: input.document.filename,
            case_id: input.document.case_id,
            user_id: input.document.user_id,
            ...input.document.metadata,
          },
        });

        // Map to RAGEmbedding format
        const embeddings: RAGEmbedding[] = input.chunks.map((chunk, index) => ({
          chunk_id: chunk.id,
          embedding: [], // Embeddings are stored in DB, not returned
          dimensions: 512,
          model: 'embeddinggemma:latest',
          created_at: new Date(),
        }));

        return { embeddings, results };
      }
    ),
  },
}).createMachine({
  id: 'ragIngestion',
  initial: 'idle',
  context: {
    progress: 0,
    stage: 'idle',
  },
  states: {
    idle: {
      on: {
        START_INGESTION: 'uploading',
      },
    },

    uploading: {
      entry: assign({
        progress: 10,
        stage: 'Uploading document...',
      }),
      invoke: {
        src: 'uploadDocument',
        input: ({ event }) => event as unknown as IngestionInput,
        onDone: {
          target: 'ocr',
          actions: assign({
            document: ({ event }) => event.output,
            progress: 20,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    ocr: {
      entry: assign({
        progress: 30,
        stage: 'Performing OCR...',
      }),
      invoke: {
        src: 'performOCR',
        input: ({ context, event }) => ({
          document: context.document!,
          file: (event as any).file,
          options: (event as any).options,
        }),
        onDone: {
          target: 'chunking',
          actions: assign({
            ocrResult: ({ event }) => event.output,
            progress: 40,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    chunking: {
      entry: assign({
        progress: 50,
        stage: 'Chunking document...',
      }),
      invoke: {
        src: 'chunkDocument',
        input: ({ context, event }) => ({
          document: context.document!,
          content: context.ocrResult!.text,
          options: (event as any).options,
        }),
        onDone: {
          target: 'embedding',
          actions: assign({
            chunks: ({ event }) => event.output,
            progress: 60,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    embedding: {
      entry: assign({
        progress: 70,
        stage: 'Generating embeddings (embeddinggemma:latest 512-dim)...',
      }),
      invoke: {
        src: 'generateEmbeddings',
        input: ({ context, event }) => ({
          chunks: context.chunks!,
          document: context.document!,
          options: (event as any).options,
        }),
        onDone: {
          target: 'complete',
          actions: assign({
            embeddings: ({ event }) => event.output.embeddings,
            progress: 100,
            stage: 'Complete',
            stats: ({ event, context }) => ({
              total_chunks: context.chunks?.length || 0,
              total_embeddings: event.output.embeddings.length,
              processing_time_ms: Date.now() - (context.document?.uploaded_at.getTime() || Date.now()),
              storage_engines: event.output.results.stored_in,
            }),
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    complete: {
      type: 'final',
    },

    error: {
      on: {
        RETRY: 'uploading',
      },
    },
  },
});

/**
 * RAG Ingestion Service
 */
export class RAGIngestionService {
  /**
   * Ingest a document through the full RAG pipeline
   */
  async ingestDocument(input: IngestionInput): Promise<{
    success: boolean;
    document_id?: string;
    stats?: any;
    error?: string;
  }> {
    try {
      // Initialize hybrid search if needed
      await hybridVectorSearch.initialize();

      // Create state machine actor
      const actor = ragIngestionMachine.provide({}).create();

      // Start ingestion
      actor.start();
      actor.send({ type: 'START_INGESTION', ...input } as any);

      // Wait for completion
      return new Promise(resolve => {
        actor.subscribe(state => {
          if (state.matches('complete')) {
            resolve({
              success: true,
              document_id: state.context.document?.id,
              stats: state.context.stats,
            });
          } else if (state.matches('error')) {
            resolve({
              success: false,
              error: state.context.error,
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ingestion failed',
      };
    }
  }

  /**
   * Batch ingest multiple documents
   */
  async batchIngest(inputs: IngestionInput[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ document_id?: string; error?: string }>;
  }> {
    const results = await Promise.all(inputs.map(input => this.ingestDocument(input)));

    return {
      total: inputs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results.map(r => ({
        document_id: r.document_id,
        error: r.error,
      })),
    };
  }
}

// Export singleton
export const ragIngestionService = new RAGIngestionService();
export default ragIngestionService;
