/**
 * XState State Machine for Evidence Processing Workflow
 * Handles the complete lifecycle of evidence from upload to AI analysis
 */

import { createMachine, assign, fromPromise } from "xstate";
import { bullmqService } from "../services/bullmqService";
import { langChainService } from "../ai/langchain-ollama-service";
import { ollamaService } from "../services/ollama-service";
import { multiLayerCache } from "../services/multiLayerCache";

export interface DocumentProcessingJob {
  documentId: string;
  content: string;
  options: any;
  metadata: any;
}

export interface EmbeddingGenerationJob {
  documentId: string;
  chunks: any[];
}

export interface AIAnalysisJob {
  documentId: string;
  content: string;
  type: string;
}

// Types for the state machine
export interface EvidenceProcessingContext {
  evidenceId: string;
  caseId: string;
  userId: string;
  filename: string;
  content: string;
  metadata: Record<string, any>;

  // Processing results
  extractedText?: string;
  chunks?: Array<{ content: string; embedding: number[]; metadata: any }>;
  embeddings?: number[][];
  analysis?: {
    summary: string;
    entities: any[];
    sentiment: string;
    classification: string;
    riskAssessment?: string;
    recommendations?: string[];
  };

  // Job tracking
  documentProcessingJobId?: string;
  embeddingJobId?: string;
  analysisJobId?: string;

  // Progress tracking
  progress: number;
  stage: string;

  // Error handling
  error?: string;
  retryCount: number;
  maxRetries: number;

  // Performance metrics
  startTime: number;
  stageStartTime: number;
  processingTimes: Record<string, number>;
}

export type EvidenceProcessingEvent =
  | {
      type: "START_PROCESSING";
      evidenceId: string;
      caseId: string;
      userId: string;
      filename: string;
      content: string;
      metadata?: Record<string, any>;
    }
  | { type: "RETRY" }
  | { type: "CANCEL" }
  | { type: "FORCE_COMPLETE" }
  | { type: "UPDATE_PROGRESS"; progress: number; stage: string }
  | { type: "PROCESSING_COMPLETE" }
  | { type: "PROCESSING_FAILED"; error: string }
  | { type: "EMBEDDING_COMPLETE" }
  | { type: "EMBEDDING_FAILED"; error: string }
  | { type: "ANALYSIS_COMPLETE" }
  | { type: "ANALYSIS_FAILED"; error: string };

// Service implementations
const documentProcessingService = fromPromise(
  async ({ input }: { input: EvidenceProcessingContext }) => {
    console.log(
      `Starting document processing for evidence: ${input.evidenceId}`
    );

    // Submit to BullMQ for processing
    const job = await bullmqService.addDocumentProcessingJob({
      documentId: input.evidenceId,
      content: input.content,
      options: {
        extractText: true,
        generateEmbeddings: true,
        performAnalysis: true,
      },
      metadata: {
        userId: input.userId,
        caseId: input.caseId,
        filename: input.filename,
        ...input.metadata,
      },
    });

    // Poll for completion
    const maxWait = 300000; // 5 minutes
    const interval = 2000; // 2 seconds
    let waited = 0;

    while (waited < maxWait) {
      const jobStatus = await bullmqService.getJobStatus(
        "document-processing",
        job.id!
      );

      if (jobStatus?.failedReason) {
        throw new Error(
          `Document processing failed: ${jobStatus.failedReason}`
        );
      }

      if (jobStatus?.finishedOn) {
        return {
          jobId: job.id,
          result: jobStatus.returnvalue,
          processingTime: jobStatus.finishedOn - jobStatus.processedOn!,
        };
      }

      // Update progress if available
      if (jobStatus?.progress) {
        // This would be handled by the state machine's progress update
      }

      await new Promise((resolve: any) => setTimeout(resolve, interval));
      waited += interval;
    }

    throw new Error("Document processing timed out");
  }
);

const embeddingGenerationService = fromPromise(
  async ({ input }: { input: EvidenceProcessingContext }) => {
    console.log(`Generating embeddings for evidence: ${input.evidenceId}`);

    // Use Ollama service to generate embeddings with chunking
    const result = await ollamaService.embedDocument(input.content, {
      documentType: "evidence",
      caseId: input.caseId,
      evidenceId: input.evidenceId,
      ...input.metadata,
    });

    // Cache the embeddings
    await multiLayerCache.set(`embeddings:${input.evidenceId}`, result, {
      type: "embedding",
      userId: input.userId,
      persistent: true,
      ttl: 86400, // 24 hours
    });

    return result;
  }
);

const aiAnalysisService = fromPromise(
  async ({ input }: { input: EvidenceProcessingContext }) => {
    console.log(`Performing AI analysis for evidence: ${input.evidenceId}`);

    // Parallel analysis using different techniques
    const [summary, entities, sentiment, classification] = await Promise.all([
      ollamaService.analyzeDocument(input.content, "summary"),
      ollamaService.analyzeDocument(input.content, "entities"),
      ollamaService.analyzeDocument(input.content, "sentiment"),
      ollamaService.analyzeDocument(input.content, "classification"),
    ]);

    // Advanced analysis using LangChain
    let riskAssessment, recommendations;
    try {
      const langchainResult = await langChainService.summarizeDocument(
        input.evidenceId,
        input.content,
        {
          extractEntities: true,
          riskAssessment: true,
          generateRecommendations: true,
        }
      );

      riskAssessment = langchainResult.riskAssessment;
      recommendations = langchainResult.recommendations;
    } catch (error: any) {
      console.warn(
        "LangChain analysis failed, using basic analysis only:",
        error
      );
    }

    const analysis = {
      summary,
      entities,
      sentiment,
      classification,
      riskAssessment,
      recommendations,
    };

    // Cache the analysis
    await multiLayerCache.set(`analysis:${input.evidenceId}`, analysis, {
      type: "document",
      userId: input.userId,
      persistent: true,
      ttl: 43200, // 12 hours
    });

    return analysis;
  }
);

const cacheResultsService = fromPromise(
  async ({ input }: { input: EvidenceProcessingContext }) => {
    console.log(`Caching final results for evidence: ${input.evidenceId}`);

    const finalResult = {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      filename: input.filename,
      extractedText: input.extractedText,
      chunks: input.chunks,
      embeddings: input.embeddings,
      analysis: input.analysis,
      processingTimes: input.processingTimes,
      completedAt: new Date().toISOString(),
    };

    // Store in multiple cache layers
    await Promise.all([
      multiLayerCache.set(
        `evidence:complete:${input.evidenceId}`,
        finalResult,
        {
          type: "document",
          userId: input.userId,
          persistent: true,
          ttl: 604800, // 7 days
        }
      ),
      multiLayerCache.set(
        `case:evidence:${input.caseId}:${input.evidenceId}`,
        finalResult,
        {
          type: "document",
          userId: input.userId,
          persistent: true,
          ttl: 604800,
        }
      ),
    ]);

    // Invalidate related cache entries
    await bullmqService.addCacheInvalidationJob({
      pattern: `case:${input.caseId}`,
      userId: input.userId,
      type: "document",
    });

    return finalResult;
  }
);

// Main state machine
export const evidenceProcessingMachine = createMachine(
  {
    id: "evidenceProcessing",
    types: {
      context: {} as EvidenceProcessingContext,
      events: {} as EvidenceProcessingEvent,
    },
    initial: "idle",
    context: {
      evidenceId: "",
      caseId: "",
      userId: "",
      filename: "",
      content: "",
      metadata: {},
      progress: 0,
      stage: "idle",
      retryCount: 0,
      maxRetries: 3,
      startTime: 0,
      stageStartTime: 0,
      processingTimes: {},
    },
    states: {
      idle: {
        on: {
          START_PROCESSING: {
            target: "initializing",
            actions: assign({
              evidenceId: ({ event }) => event.evidenceId,
              caseId: ({ event }) => event.caseId,
              userId: ({ event }) => event.userId,
              filename: ({ event }) => event.filename,
              content: ({ event }) => event.content,
              metadata: ({ event }) => event.metadata || {},
              progress: 0,
              stage: "initializing",
              retryCount: 0,
              startTime: Date.now(),
              stageStartTime: Date.now(),
              processingTimes: {},
            }),
          },
        },
      },

      initializing: {
        always: {
          target: "documentProcessing",
          actions: assign({
            stage: "document-processing",
            stageStartTime: Date.now(),
            progress: 10,
          }),
        },
      },

      documentProcessing: {
        invoke: {
          src: documentProcessingService,
          input: ({ context }) => context,
          onDone: {
            target: "embeddingGeneration",
            actions: assign({
              extractedText: ({ event, context }) =>
                event.output.result?.extractedText || context.content,
              documentProcessingJobId: ({ event }) => event.output.jobId,
              processingTimes: ({ context, event }) => ({
                ...context.processingTimes,
                documentProcessing: Date.now() - context.stageStartTime,
              }),
              progress: 30,
              stage: "embedding-generation",
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) =>
                `Document processing failed: ${event.error}`,
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                documentProcessing: Date.now() - context.stageStartTime,
              }),
            }),
          },
        },
        on: {
          CANCEL: "cancelled",
        },
      },

      embeddingGeneration: {
        invoke: {
          src: embeddingGenerationService,
          input: ({ context }) => context,
          onDone: {
            target: "aiAnalysis",
            actions: assign({
              chunks: ({ event }) => event.output.chunks,
              embeddings: ({ event }) =>
                event.output.chunks?.map((chunk: any) => chunk.embedding) || [],
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                embeddingGeneration: Date.now() - context.stageStartTime,
              }),
              progress: 60,
              stage: "ai-analysis",
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) =>
                `Embedding generation failed: ${event.error}`,
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                embeddingGeneration: Date.now() - context.stageStartTime,
              }),
            }),
          },
        },
        on: {
          CANCEL: "cancelled",
        },
      },

      aiAnalysis: {
        invoke: {
          src: aiAnalysisService,
          input: ({ context }) => context,
          onDone: {
            target: "cachingResults",
            actions: assign({
              analysis: ({ event }) => event.output,
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                aiAnalysis: Date.now() - context.stageStartTime,
              }),
              progress: 90,
              stage: "caching-results",
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `AI analysis failed: ${event.error}`,
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                aiAnalysis: Date.now() - context.stageStartTime,
              }),
            }),
          },
        },
        on: {
          CANCEL: "cancelled",
        },
      },

      cachingResults: {
        invoke: {
          src: cacheResultsService,
          input: ({ context }) => context,
          onDone: {
            target: "completed",
            actions: assign({
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                cachingResults: Date.now() - context.stageStartTime,
                total: Date.now() - context.startTime,
              }),
              progress: 100,
              stage: "completed",
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `Caching results failed: ${event.error}`,
              processingTimes: ({ context }) => ({
                ...context.processingTimes,
                cachingResults: Date.now() - context.stageStartTime,
                total: Date.now() - context.startTime,
              }),
            }),
          },
        },
      },

      completed: {
        type: "final",
        entry: () => {
          console.log("Evidence processing completed successfully");
        },
      },

      error: {
        on: {
          RETRY: [
            {
              target: "documentProcessing",
              guard: ({ context }) => context.retryCount < context.maxRetries,
              actions: assign({
                retryCount: ({ context }) => context.retryCount + 1,
                error: undefined,
                progress: 10,
                stage: "retrying",
                stageStartTime: Date.now(),
              }),
            },
            {
              target: "failed",
            },
          ],
          FORCE_COMPLETE: "completed",
        },
      },

      failed: {
        type: "final",
        entry: ({ context }) => {
          console.error(
            `Evidence processing failed after ${context.retryCount} retries: ${context.error}`
          );
        },
      },

      cancelled: {
        type: "final",
        entry: () => {
          console.log("Evidence processing cancelled by user");
        },
      },
    },
  },
  {
    // Guards
    guards: {
      canRetry: ({ context }) => context.retryCount < context.maxRetries,
    },

    // Actions
    actions: {
      updateProgress: assign({
        progress: ({ event }) => (event as any).progress,
        stage: ({ event }) => (event as any).stage,
      }),
    },
  }
);

// Helper factory – optional context override placeholder (currently unused)
export const createEvidenceProcessingActor = (
  context?: Partial<EvidenceProcessingContext>
) => {
  // NOTE: context overrides can be applied by extending the machine before actor creation if needed
  return evidenceProcessingMachine.provide({
    actions: {
      // Custom actions can be injected here
    },
    guards: {
      // Custom guards can be injected here
    },
  });
};

// Export state machine types
export type EvidenceProcessingMachine = typeof evidenceProcessingMachine;
export type EvidenceProcessingState = Parameters<
  typeof evidenceProcessingMachine.transition
>[0];

// Export convenience functions
export const isProcessing = (state: EvidenceProcessingState): boolean => {
  return [
    "documentProcessing",
    "embeddingGeneration",
    "aiAnalysis",
    "cachingResults",
  ].includes(state.value as string);
};

export const isCompleted = (state: EvidenceProcessingState): boolean => {
  return state.value === "completed";
};

export const isFailed = (state: EvidenceProcessingState): boolean => {
  return ["error", "failed"].includes(state.value as string);
};

export const canRetry = (state: EvidenceProcessingState): boolean => {
  return (
    state.value === "error" &&
    state.context.retryCount < state.context.maxRetries
  );
};

export const getProgressPercentage = (
  state: EvidenceProcessingState
): number => {
  return state.context.progress;
};

export const getCurrentStage = (state: EvidenceProcessingState): string => {
  return state.context.stage;
};

export const getProcessingTimes = (
  state: EvidenceProcessingState
): Record<string, number> => {
  return state.context.processingTimes;
};

export const getError = (
  state: EvidenceProcessingState
): string | undefined => {
  return state.context.error;
};
