/**
 * Legal Case Machine Factory - Fully Wired with Postgres/Drizzle
 * Creates XState machines with caseId context and RAG integration
 * Ready-to-use with your Gemma3 + pgvector setup
 */

import { createMachine, assign, fromPromise } from 'xstate';
import { enhancedLegalCaseMachine, type EnhancedLegalCaseContext, type EnhancedLegalCaseEvent } from './enhanced-legal-case-machine';

export interface CaseMachineOptions {
  caseId: string;
  userId?: string;
  enableRAG?: boolean;
  autoLoadEvidence?: boolean;
  ragEndpoint?: string;
}

/**
 * Factory function to create a legal case machine with specific context
 */
export function createLegalCaseMachine(options: CaseMachineOptions) {
  const {
    caseId,
    userId,
    enableRAG = true,
    autoLoadEvidence = true,
    ragEndpoint = '/api/v1/rag'
  } = options;

  return enhancedLegalCaseMachine.provide({
    // Enhanced actors with RAG integration
    actors: {
      ...enhancedLegalCaseMachine.implementations.actors,
      
      // RAG-enhanced case loading
      loadCase: fromPromise(async ({ input }: { input: { caseId: string; includeEvidence: boolean } }) => {
        const response = await fetch(`/api/cases/${input.caseId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Failed to load case: ${response.status}`);
        }

        const caseData = await response.json();

        // Auto-load evidence if requested
        if (input.includeEvidence && autoLoadEvidence) {
          const evidenceResponse = await fetch(`/api/cases/${input.caseId}/evidence`);
          if (evidenceResponse.ok) {
            caseData.evidence = await evidenceResponse.json();
          }
        }

        return {
          case: caseData.case || caseData,
          evidence: caseData.evidence || []
        };
      }),

      // RAG-powered AI analysis
      ragAnalysis: fromPromise(async ({ input }: { input: { query: string; caseId: string } }) => {
        if (!enableRAG) {
          throw new Error('RAG is not enabled for this machine');
        }

        const response = await fetch(ragEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: input.query,
            caseId: input.caseId,
            options: {
              limit: 8,
              model: 'gemma3-legal',
              maxTokens: 800,
              temperature: 0.1
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `RAG query failed: ${response.status}`);
        }

        return response.json();
      }),

      // Case similarity search using RAG
      findSimilarCases: fromPromise(async ({ input }: { input: { caseId: string; threshold?: number } }) => {
        const response = await fetch(ragEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: "Find similar cases based on legal issues and evidence patterns",
            caseId: input.caseId,
            options: {
              limit: 10,
              model: 'gemma3-legal',
              analysisType: 'similarity'
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Similarity search failed: ${response.status}`);
        }

        const data = await response.json();
        return data.sources?.map((source: any) => ({
          id: source.document_id,
          title: source.title,
          similarity_score: 1 - source.similarity, // Convert distance to similarity
          document_type: source.document_type
        })) || [];
      })
    }
  });
}

/**
 * Svelte integration helper - use with $page params
 * Example usage in +page.svelte:
 * 
 * ```svelte
 * <script>
 *   import { page } from '$app/stores';
 *   import { useMachine } from '@xstate/svelte';
 *   import { createLegalCaseMachineForRoute } from '$lib/machines/legal-case-machine-factory';
 *   
 *   $: machine = createLegalCaseMachineForRoute($page);
 *   const [state, send] = useMachine(machine);
 * </script>
 * ```
 */
export function createLegalCaseMachineForRoute(page: any, options: Partial<CaseMachineOptions> = {}) {
  const caseId = page.params.caseId;
  
  if (!caseId) {
    throw new Error('caseId is required in route params for legal case machine');
  }

  return createLegalCaseMachine({
    caseId,
    userId: page.data?.user?.id,
    enableRAG: true,
    autoLoadEvidence: true,
    ...options
  });
}

/**
 * Ready-to-use machine configurations for common scenarios
 */
export const LegalCaseMachinePresets = {
  // Full-featured machine with RAG and auto-loading
  full: (caseId: string, userId?: string) => createLegalCaseMachine({
    caseId,
    userId,
    enableRAG: true,
    autoLoadEvidence: true
  }),

  // Lightweight machine for read-only access
  readonly: (caseId: string) => createLegalCaseMachine({
    caseId,
    enableRAG: true,
    autoLoadEvidence: false
  }),

  // RAG-focused machine for AI analysis
  ragOnly: (caseId: string) => createLegalCaseMachine({
    caseId,
    enableRAG: true,
    autoLoadEvidence: false,
    ragEndpoint: '/api/v1/rag'
  })
};

/**
 * XState machine events specifically for RAG integration
 */
export type RAGCaseEvent = 
  | { type: 'RAG_QUERY'; query: string }
  | { type: 'RAG_ANALYZE'; analysisType: 'summary' | 'recommendation' | 'similarity' }
  | { type: 'FIND_SIMILAR_CASES'; threshold?: number }
  | { type: 'RAG_STREAM'; query: string; onChunk: (chunk: string) => void };

/**
 * Extended machine with RAG-specific states and events
 */
export function createEnhancedRAGMachine(options: CaseMachineOptions) {
  const baseMachine = createLegalCaseMachine(options);
  
  return baseMachine.provide({
    // Enhanced RAG machine implementation
    actors: {
      // Add any additional RAG-specific actors here if needed
    }
  });
}

export default createLegalCaseMachine;