
/**
 * XState v5 Actor Wrapper - Fixes UnknownActorLogic issues
 * Proper fromPromise usage with typed context and error handling
 */

import { fromPromise, createActor, type ActorRefFrom } from "xstate";
import { fetchWithTimeout } from "$lib/utils";

// ===== EMBEDDING ACTOR =====

export interface EmbeddingActorInput {
  text: string;
  documentId?: string;
  caseId?: string;
  chunkIndex?: number;
}

export interface EmbeddingActorOutput {
  embedding: number[];
  dimensions: number;
  model: string;
  processingTime: number;
  tokenCount?: number;
}

export const embeddingActor = fromPromise(async ({ input }: { input: EmbeddingActorInput }) => {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithTimeout('/api/ai/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text,
        documentId: input.documentId,
        caseId: input.caseId
      }),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      embedding: data.embedding,
      dimensions: data.dimensions || 768,
      model: data.model || 'nomic-embed-text',
      processingTime: Date.now() - startTime,
      tokenCount: data.tokenCount
    } as EmbeddingActorOutput;
  } catch (error: any) {
    throw new Error(`Embedding actor failed: ${error.message}`);
  }
});

// ===== DOCUMENT PROCESSING ACTOR =====

export interface DocumentProcessingInput {
  documentId: string;
  generateSummary?: boolean;
  extractEntities?: boolean;
  generateEmbeddings?: boolean;
}

export interface DocumentProcessingOutput {
  documentId: string;
  summary?: string;
  entities?: Array<{ text: string; type: string; confidence: number }>;
  embeddings?: { chunks: number; dimensions: number };
  processingTime: number;
  success: boolean;
}

export const documentProcessingActor = fromPromise(async ({ input }: { input: DocumentProcessingInput }) => {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithTimeout('/api/ai/process-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      timeout: 60000 // 60s timeout for document processing
    });

    if (!response.ok) {
      throw new Error(`Document processing failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      documentId: input.documentId,
      summary: data.summary,
      entities: data.entities,
      embeddings: data.embeddings,
      processingTime: Date.now() - startTime,
      success: data.success || true
    } as DocumentProcessingOutput;
  } catch (error: any) {
    throw new Error(`Document processing actor failed: ${error.message}`);
  }
});

// ===== LEGAL ANALYSIS ACTOR =====

export interface LegalAnalysisInput {
  content: string;
  caseType?: 'contract' | 'litigation' | 'compliance' | 'regulatory';
  jurisdiction?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface LegalAnalysisOutput {
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
  precedents: Array<{ case: string; relevance: number; summary: string }>;
  confidence: number;
  processingTime: number;
}

export const legalAnalysisActor = fromPromise(async ({ input }: { input: LegalAnalysisInput }) => {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithTimeout('/api/ai/legal-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      timeout: 45000
    });

    if (!response.ok) {
      throw new Error(`Legal analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      riskScore: data.riskScore || 0,
      riskFactors: data.riskFactors || [],
      recommendations: data.recommendations || [],
      precedents: data.precedents || [],
      confidence: data.confidence || 0.5,
      processingTime: Date.now() - startTime
    } as LegalAnalysisOutput;
  } catch (error: any) {
    throw new Error(`Legal analysis actor failed: ${error.message}`);
  }
});

// ===== RAG SEARCH ACTOR =====

export interface RAGSearchInput {
  query: string;
  caseId?: string;
  documentTypes?: string[];
  limit?: number;
  threshold?: number;
}

export interface RAGSearchOutput {
  results: Array<{
    id: string;
    content: string;
    title: string;
    score: number;
    metadata: Record<string, any>;
  }>;
  totalResults: number;
  processingTime: number;
  model: string;
}

export const ragSearchActor = fromPromise(async ({ input }: { input: RAGSearchInput }) => {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithTimeout('/api/ai/rag-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`RAG search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      results: data.results || [],
      totalResults: data.totalResults || 0,
      processingTime: Date.now() - startTime,
      model: data.model || 'unknown'
    } as RAGSearchOutput;
  } catch (error: any) {
    throw new Error(`RAG search actor failed: ${error.message}`);
  }
});

// ===== ACTOR FACTORY FUNCTIONS =====

export function createEmbeddingActor(input: EmbeddingActorInput): ActorRefFrom<typeof embeddingActor> {
  return createActor(embeddingActor, { input });
}

export function createDocumentProcessingActor(input: DocumentProcessingInput): ActorRefFrom<typeof documentProcessingActor> {
  return createActor(documentProcessingActor, { input });
}

export function createLegalAnalysisActor(input: LegalAnalysisInput): ActorRefFrom<typeof legalAnalysisActor> {
  return createActor(legalAnalysisActor, { input });
}

export function createRAGSearchActor(input: RAGSearchInput): ActorRefFrom<typeof ragSearchActor> {
  return createActor(ragSearchActor, { input });
}

// ===== WORKFLOW ORCHESTRATION ACTOR =====

export interface WorkflowInput {
  steps: Array<{
    type: 'embedding' | 'document_processing' | 'legal_analysis' | 'rag_search';
    input: any;
    dependencies?: string[];
  }>;
  parallel?: boolean;
}

export interface WorkflowOutput {
  results: Record<string, any>;
  totalTime: number;
  success: boolean;
  errors: Array<{ step: string; error: string }>;
}

export const workflowActor = fromPromise(async ({ input }: { input: WorkflowInput }) => {
  const startTime = Date.now();
  const results: Record<string, any> = {};
  const errors: Array<{ step: string; error: string }> = [];

  try {
    if (input.parallel) {
      // Execute steps in parallel
      const promises = input.steps.map(async (step, index) => {
        try {
          let actor;
          const stepId = `step_${index}`;
          
          switch (step.type) {
            case 'embedding':
              actor = createEmbeddingActor(step.input);
              break;
            case 'document_processing':
              actor = createDocumentProcessingActor(step.input);
              break;
            case 'legal_analysis':
              actor = createLegalAnalysisActor(step.input);
              break;
            case 'rag_search':
              actor = createRAGSearchActor(step.input);
              break;
            default:
              throw new Error(`Unknown step type: ${step.type}`);
          }
          
          actor.start();
          const result = await new Promise((resolve, reject) => {
            actor.subscribe({
              complete: () => {
                resolve(actor.getSnapshot().output);
              },
              error: (error) => {
                reject(error);
              }
            });
          });
          
          results[stepId] = result;
        } catch (error: any) {
          errors.push({ step: `step_${index}`, error: error.message });
        }
      });
      
      await Promise.allSettled(promises);
    } else {
      // Execute steps sequentially
      for (let i = 0; i < input.steps.length; i++) {
        const step = input.steps[i];
        const stepId = `step_${i}`;
        
        try {
          let actor;
          
          switch (step.type) {
            case 'embedding':
              actor = createEmbeddingActor(step.input);
              break;
            case 'document_processing':
              actor = createDocumentProcessingActor(step.input);
              break;
            case 'legal_analysis':
              actor = createLegalAnalysisActor(step.input);
              break;
            case 'rag_search':
              actor = createRAGSearchActor(step.input);
              break;
            default:
              throw new Error(`Unknown step type: ${step.type}`);
          }
          
          actor.start();
          const result = await new Promise((resolve, reject) => {
            actor.subscribe({
              complete: () => {
                resolve(actor.getSnapshot().output);
              },
              error: (error) => {
                reject(error);
              }
            });
          });
          
          results[stepId] = result;
        } catch (error: any) {
          errors.push({ step: stepId, error: error.message });
        }
      }
    }
    
    return {
      results,
      totalTime: Date.now() - startTime,
      success: errors.length === 0,
      errors
    } as WorkflowOutput;
  } catch (error: any) {
    throw new Error(`Workflow actor failed: ${error.message}`);
  }
});

export function createWorkflowActor(input: WorkflowInput): ActorRefFrom<typeof workflowActor> {
  return createActor(workflowActor, { input });
}

// ===== UTILITY FUNCTIONS =====

export async function runActor<T>(actor: ActorRefFrom<any>): Promise<T> {
  return new Promise((resolve, reject) => {
    actor.subscribe({
      complete: () => {
        const snapshot = actor.getSnapshot();
        resolve(snapshot.output as T);
      },
      error: (error) => {
        reject(error);
      }
    });
    actor.start();
  });
}

export function getActorOutput<T>(actor: ActorRefFrom<any>): T | undefined {
  const snapshot = actor.getSnapshot();
  return snapshot.output as T;
}

export function isActorDone(actor: ActorRefFrom<any>): boolean {
  const snapshot = actor.getSnapshot();
  return snapshot.status === 'done';
}

export function hasActorError(actor: ActorRefFrom<any>): boolean {
  const snapshot = actor.getSnapshot();
  return snapshot.status === 'error';
}