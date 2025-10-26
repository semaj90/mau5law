import { createMachine, assign, fromPromise } from 'xstate';
import { caseMemoryEngine } from '../services/case-memory-engine.js';
import { UnifiedLegalOrchestrator } from '../services/unified-legal-orchestrator.js';
// import { rabbitmq } from '../server/queue/rabbitmq-manager.js'

const orchestrator = new UnifiedLegalOrchestrator();

// --- Type Definitions for Clarity ---
export type CaseData = Record<string, unknown>;
export type Metadata = Record<string, unknown>;
export type MemoryContext = Record<string, unknown>;

export interface Document {
  id: string;
  content: string;
  type: string;
  [key: string]: unknown;
}

export interface AnalysisResult {
  id: string;
  [key: string]: unknown;
}

export interface Recommendation {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  type: string;
  timing_suggestion: 'immediate' | 'normal' | 'long_term';
  [key: string]: unknown;
}

// XState machine for case workflow management with contextual memory
// Handles: case creation → document upload → analysis → recommendations → action

export interface CaseWorkflowContext {
  case_id?: string;
  user_id: string;
  current_step: string;
  case_data?: CaseData;
  documents: Document[];
  analysis_results: AnalysisResult[];
  recommendations: Recommendation[];
  memory_context?: MemoryContext;
  error_message?: string;
  progress: {
    total_steps: number;
    completed_steps: number;
    current_action: string;
  };
  settings: {
    auto_analyze: boolean;
    notification_level: 'minimal' | 'normal' | 'detailed';
    ai_assistance_level: 'basic' | 'enhanced' | 'proactive';
  };
}
export const caseWorkflowMachine = createMachine({
  id: 'caseWorkflow',
  types: {
    context: {} as CaseWorkflowContext,
    events: {} as
      | { type: 'CREATE_CASE'; case_data: CaseData }
      | { type: 'UPLOAD_DOCUMENT'; file: File; metadata?: Metadata }
      | { type: 'START_ANALYSIS' }
      | { type: 'ACCEPT_RECOMMENDATION'; recommendation_id: string }
      | { type: 'REJECT_RECOMMENDATION'; recommendation_id: string }
      | { type: 'REQUEST_AI_ASSISTANCE'; query: string }
      | { type: 'UPDATE_SETTINGS'; settings: Partial<CaseWorkflowContext['settings']> }
      | { type: 'RETRY' }
      | { type: 'RESET' }
      | { type: 'NEXT_STEP' }
      | { type: 'PREVIOUS_STEP' },
  },
  context: {
    user_id: '',
    current_step: 'initial',
    documents: [],
    analysis_results: [],
    recommendations: [],
    progress: {
      total_steps: 6,
      completed_steps: 0,
      current_action: 'Ready to start',
    },
    settings: {
      auto_analyze: true,
      notification_level: 'normal',
      ai_assistance_level: 'enhanced',
    },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        CREATE_CASE: {
          target: 'creatingCase',
          actions: assign({
            case_data: ({ event }) => event.case_data,
            current_step: 'creating_case',
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Creating case...',
            }),
          }),
        },
      },
    },
    creatingCase: {
      invoke: {
        src: fromPromise(async ({ input: context }) => {
          const { case_data, user_id } = context;
          // Create case through orchestrator
          const result = await orchestrator.handle({
            type: 'process',
            payload: {
              action: 'create_case',
              case_data,
            },
            context: {
              user_id,
              priority: 'normal',
            },
          });
          // Initialize memory context
          const caseId = (result as { case_id?: string }).case_id;
          if (!caseId) {
            throw new Error('Case creation failed: No case_id returned.');
          }
          const memoryContext = await caseMemoryEngine.getCaseMemoryContext(caseId, user_id);
          return { ...result, memory_context: memoryContext };
        }),
        onDone: {
          target: 'caseReady',
          actions: assign({
            case_id: ({ event }) => event.output.case_id,
            memory_context: ({ event }) => event.output.memory_context,
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: 1,
              current_action: 'Case created successfully',
            }),
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Failed to create case: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    caseReady: {
      entry: assign({
        current_step: 'case_ready',
      }),
      on: {
        UPLOAD_DOCUMENT: {
          target: 'uploadingDocument',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Uploading document...',
            }),
          }),
        },
        START_ANALYSIS: {
          target: 'analyzingCase',
          guard: ({ context }) => context.documents.length > 0,
        },
        REQUEST_AI_ASSISTANCE: {
          target: 'providingAssistance',
        },
      },
    },
    uploadingDocument: {
      invoke: {
        input: ({ context, event }) => ({ context, event }),
        src: fromPromise(async ({ input }) => {
          const { context, event } = input;
          const { case_id, user_id } = context;
          if (!case_id) {
            throw new Error('Case ID not found for document upload');
          }
          const { file, metadata } = event as { type: 'UPLOAD_DOCUMENT'; file: File; metadata?: Metadata };
          // Upload through orchestrator
          const result = await orchestrator.handle({
            type: 'process',
            payload: {
              action: 'upload_document',
              case_id,
              file,
              metadata,
            },
            context: {
              user_id,
              case_id,
              priority: 'normal',
            },
          });
          // Record interaction in memory
          await caseMemoryEngine.recordInteraction({
            case_id,
            user_id,
            interaction_type: 'document_view',
            content: `Uploaded: ${file.name}`,
            metadata: {
              file_size: file.size,
              file_type: file.type,
              ...metadata,
            },
          });
          return result;
        }),
        onDone: {
          target: 'documentProcessing',
          actions: assign({
            documents: ({ context, event }) => [...context.documents, event.output.document],
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: Math.min(context.progress.completed_steps + 1, context.progress.total_steps),
              current_action: 'Document uploaded, processing...',
            }),
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Upload failed: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    documentProcessing: {
      invoke: {
        src: fromPromise(async ({ input: context }) => {
          const { case_id, user_id, documents } = context;
          const latestDoc = documents[documents.length - 1];
          // Queue document for background processing
          // TODO: Re-enable when rabbitmq is properly configured
          // await rabbitmq.publishDocumentProcessing({
          //   document_id: latestDoc.id,
          //   content: latestDoc.content,
          //   document_type: latestDoc.type,
          //   case_id
          // })
          // Auto-analyze if enabled
          if (context.settings.auto_analyze) {
            return await orchestrator.handle({
              type: 'analyze',
              payload: {
                action: 'analyze_document',
                document_id: latestDoc.id,
                case_id,
              },
              context: {
                user_id,
                case_id,
                priority: 'normal',
              },
            });
          }
          return { processed: true, auto_analysis: false };
        }),
        onDone: [
          {
            target: 'caseReady',
            guard: ({ event }) => !event.output.analysis,
            actions: assign({
              progress: ({ context }) => ({
                ...context.progress,
                current_action: 'Document processed',
              }),
            }),
          },
          {
            target: 'analyzingCase',
            guard: ({ event }) => !!event.output.analysis,
            actions: assign({
              analysis_results: ({ context, event }) => [...context.analysis_results, event.output.analysis],
            }),
          },
        ],
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Processing failed: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    analyzingCase: {
      entry: assign({
        current_step: 'analyzing',
        progress: ({ context }) => ({
          ...context.progress,
          current_action: 'Analyzing case and documents...',
        }),
      }),
      invoke: {
        src: fromPromise(async ({ input: context }) => {
          const { case_id, user_id, documents } = context;
          if (!case_id) {
            throw new Error('Case ID not found for analysis');
          }
          // Comprehensive case analysis
          const analysis = await orchestrator.handle({
            type: 'analyze',
            payload: {
              action: 'comprehensive_analysis',
              case_id,
              documents: documents.map((d: Document) => d.id),
              analysis_type: 'full',
            },
            context: {
              user_id,
              case_id,
              priority: 'high',
            },
          });
          // Generate recommendations based on analysis
          const recommendations = await caseMemoryEngine.generateSelfPromptRecommendations(case_id, user_id, analysis);
          await caseMemoryEngine.recordInteraction({
            case_id,
            user_id,
            interaction_type: 'analysis',
            content: 'Comprehensive case analysis completed',
            metadata: { analysis_id: (analysis as AnalysisResult).id },
          });
          return { analysis, recommendations };
        }),
        onDone: {
          target: 'reviewingRecommendations',
          actions: assign({
            analysis_results: ({ context, event }) => [...context.analysis_results, event.output.analysis],
            recommendations: ({ event }) => event.output.recommendations,
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: Math.min(context.progress.completed_steps + 1, context.progress.total_steps),
              current_action: 'Analysis complete, reviewing recommendations...',
            }),
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Analysis failed: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    reviewingRecommendations: {
      entry: assign({
        current_step: 'reviewing_recommendations',
      }),
      on: {
        ACCEPT_RECOMMENDATION: {
          target: 'executingRecommendation',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Executing recommendation...',
            }),
          }),
        },
        REJECT_RECOMMENDATION: {
          actions: assign({
            recommendations: ({ context, event }) =>
              context.recommendations.filter(r => r.id !== event.recommendation_id),
          }),
        },
        REQUEST_AI_ASSISTANCE: {
          target: 'providingAssistance',
        },
        NEXT_STEP: {
          target: 'workflowComplete',
          guard: ({ context }) => context.recommendations.every(r => r.status === 'completed'),
        },
      },
    },
    executingRecommendation: {
      invoke: {
        input: ({ context, event }) => ({
          context,
          recommendation_id: (event as { type: 'ACCEPT_RECOMMENDATION'; recommendation_id: string }).recommendation_id,
        }),
        src: fromPromise(async ({ input }) => {
          const { context, recommendation_id } = input;
          const { case_id, user_id } = context;
          if (!case_id) {
            throw new Error('Case ID not found for executing recommendation');
          }
          const result = await orchestrator.handle({
            type: 'process',
            payload: {
              action: 'execute_recommendation',
              recommendation_id,
              case_id,
            },
            context: {
              user_id,
              case_id,
              priority: 'high',
            },
          });
          return result;
        }),
        onDone: {
          target: 'reviewingRecommendations',
          actions: assign({
            recommendations: ({ context, event }) =>
              context.recommendations.map(r =>
                r.id === event.output.recommendation.id ? event.output.recommendation : r
              ),
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Recommendation executed',
            }),
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Recommendation execution failed: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    providingAssistance: {
      invoke: {
        input: ({ context, event }) => ({
          context,
          query: (event as { type: 'REQUEST_AI_ASSISTANCE'; query: string }).query,
        }),
        src: fromPromise(async ({ input }) => {
          const { context, query } = input;
          const { case_id, user_id, memory_context } = context;
          if (!case_id) {
            throw new Error('Case ID not found for AI assistance');
          }
          const assistance = await orchestrator.handle({
            type: 'chat',
            payload: {
              message: query,
              context_needed: true,
              use_memory: true,
              memory_context,
            },
            context: {
              user_id,
              case_id,
              priority: 'normal',
            },
          });
          return assistance;
        }),
        onDone: {
          target: 'caseReady',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'AI assistance provided',
            }),
          }),
        },
        onError: {
          target: 'caseReady',
          actions: assign({
            error_message: ({ event }) => `AI assistance failed: ${(event.error as Error).message}`,
          }),
        },
      },
    },
    workflowComplete: {
      type: 'final',
      entry: assign({
        current_step: 'complete',
        progress: ({ context }) => ({
          ...context.progress,
          completed_steps: context.progress.total_steps,
          current_action: 'Workflow completed successfully',
        }),
      }),
    },
    error: {
      on: {
        RETRY: {
          target: 'idle',
          actions: assign({
            error_message: undefined,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            case_id: undefined,
            case_data: undefined,
            documents: [],
            analysis_results: [],
            recommendations: [],
            memory_context: undefined,
            error_message: undefined,
            progress: {
              total_steps: 6,
              completed_steps: 0,
              current_action: 'Ready to start',
            },
          }),
        },
      },
    },
  },
  // Global transitions
  on: {
    UPDATE_SETTINGS: {
      actions: assign({
        settings: ({ context, event }) => ({
          ...context.settings,
          ...event.settings,
        }),
      }),
    },
  },
});
// Export machine types for use in components
export type CaseWorkflowMachine = typeof caseWorkflowMachine;
export type CaseWorkflowState = ReturnType<CaseWorkflowMachine['transition']>;
export type CaseWorkflowEvent = Parameters<CaseWorkflowMachine['transition']>[1];