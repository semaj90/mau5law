
/**
 * XState v5 Actor for Embedding Generation
 * Uses fromPromise for async embedding operations with legal AI context
 */

import { fromPromise, createActor } from 'xstate';
import type { EmbeddingResponse } from "$lib/types/api";
import { ollamaService } from "$lib/services/ollamaService";

export interface EmbeddingInput {
  text: string;
  context?: {
    caseId?: string;
    evidenceId?: string;
    documentType?: 'contract' | 'evidence' | 'legal_brief' | 'correspondence';
    priority?: 'high' | 'medium' | 'low';
  };
}

export interface EmbeddingOutput {
  embedding: number[];
  dimension: number;
  model: string;
  metadata: {
    textLength: number;
    processingTime: number;
    caseId?: string;
    evidenceId?: string;
    documentType?: string;
    priority?: string;
    timestamp: Date;
  };
}

export interface EmbeddingError {
  message: string;
  code: 'OLLAMA_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_INPUT' | 'MODEL_ERROR';
  details?: unknown;
}

/**
 * XState v5 actor for generating embeddings with legal context
 */
export const embeddingActor = fromPromise<EmbeddingOutput, EmbeddingInput>(
  async ({ input }): Promise<EmbeddingOutput> => {
    const startTime = Date.now();

    try {
      // Validate input
      if (!input.text || input.text.trim().length === 0) {
        throw {
          message: 'Text input cannot be empty',
          code: 'INVALID_INPUT'
        } as EmbeddingError;
      }

      // Enhanced context for legal documents
      const contextualText = input.context?.documentType
        ? `[Legal Document: ${input.context.documentType}] ${input.text}`
        : input.text;

      // Generate embedding using Ollama service
      const embedding = await ollamaService.generateEmbedding(contextualText);

      if (!embedding || embedding.length === 0) {
        throw {
          message: 'Failed to generate embedding - empty result',
          code: 'MODEL_ERROR'
        } as EmbeddingError;
      }

      const processingTime = Date.now() - startTime;

      return {
        embedding,
        dimension: embedding.length,
        model: 'nomic-embed-text', // Default embedding model
        metadata: {
          textLength: input.text.length,
          processingTime,
          caseId: input.context?.caseId,
          evidenceId: input.context?.evidenceId,
          documentType: input.context?.documentType,
          priority: input.context?.priority,
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      // Map different error types to structured errors
      if (error.code) {
        throw error; // Already a structured error
      }

      if (error.message?.includes('fetch')) {
        throw {
          message: 'Ollama service unavailable',
          code: 'OLLAMA_UNAVAILABLE',
          details: error
        } as EmbeddingError;
      }

      if (error.message?.includes('timeout')) {
        throw {
          message: 'Embedding generation timed out',
          code: 'TIMEOUT',
          details: error
        } as EmbeddingError;
      }

      throw {
        message: `Embedding generation failed: ${error.message || 'Unknown error'}`,
        code: 'MODEL_ERROR',
        details: error
      } as EmbeddingError;
    }
  }
);

/**
 * Batch embedding actor for multiple texts
 */
export const batchEmbeddingActor = fromPromise<EmbeddingOutput[], EmbeddingInput[]>(
  async ({ input }): Promise<EmbeddingOutput[]> => {
    try {
      // Process embeddings in parallel with concurrency limit
      const batchSize = 5; // Prevent overwhelming Ollama
      const results: EmbeddingOutput[] = [];

      for (let i = 0; i < input.length; i += batchSize) {
        const batch = input.slice(i, i + batchSize);

        const batchPromises = batch.map(async (item, index) => {
          const actor = createActor(embeddingActor, { input: item });
          actor.start();
          const snapshot = actor.getSnapshot();
          return (snapshot as any).output || (snapshot as any).context || null;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean) as EmbeddingOutput[]);
      }

      return results;
    } catch (error: any) {
      throw {
        message: `Batch embedding failed: ${error.message || 'Unknown error'}`,
        code: 'MODEL_ERROR',
        details: error
      } as EmbeddingError;
    }
  }
);

/**
 * Helper function to create and run embedding actor
 */
export async function generateEmbedding(input: EmbeddingInput): Promise<EmbeddingOutput> {
  const actor = createActor(embeddingActor, { input });
  actor.start();
  const snapshot = actor.getSnapshot() as any;
  return (snapshot as any).output || (snapshot as any).context || null;
}

/**
 * Helper function for batch embeddings
 */
export async function generateBatchEmbeddings(inputs: EmbeddingInput[]): Promise<EmbeddingOutput[]> {
  const actor = createActor(batchEmbeddingActor, { input: inputs });
  actor.start();
  const snapshot = actor.getSnapshot() as any;
  return (snapshot as any).output || (snapshot as any).context || null;
}

/**
 * Legal document specific embedding helper
 */
export async function generateLegalDocumentEmbedding(
  text: string,
  caseId: string,
  documentType: 'contract' | 'evidence' | 'legal_brief' | 'correspondence',
  evidenceId?: string
): Promise<EmbeddingOutput> {
  return generateEmbedding({
    text,
    context: {
      caseId,
      evidenceId,
      documentType,
      priority: 'high' // Legal documents are high priority
    }
  });
}