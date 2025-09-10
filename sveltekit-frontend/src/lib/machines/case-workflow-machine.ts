import { createMachine, assign, fromPromise } from 'xstate';
import { caseMemoryEngine } from '../services/case-memory-engine';
import { orchestrator } from '../services/unified-legal-orchestrator';
import { rabbitmq } from '../server/queue/rabbitmq-manager';

// XState machine for case workflow management with contextual memory
// Handles: case creation → document upload → analysis → recommendations → action

export interface CaseWorkflowContext {
  case_id?: string;
  user_id: string;
  current_step: string;
  case_data?: any;
  documents: any[];
  analysis_results: any[];
  recommendations: any[];
  memory_context?: any;
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
      | { type: 'CREATE_CASE'; case_data: any }
      | { type: 'UPLOAD_DOCUMENT'; file: File; metadata?: any }
      | { type: 'START_ANALYSIS' }
      | { type: 'ACCEPT_RECOMMENDATION'; recommendation_id: string }
      | { type: 'REJECT_RECOMMENDATION'; recommendation_id: string }
      | { type: 'REQUEST_AI_ASSISTANCE'; query: string }
      | { type: 'UPDATE_SETTINGS'; settings: Partial<CaseWorkflowContext['settings']> }
      | { type: 'RETRY' }
      | { type: 'RESET' }
      | { type: 'NEXT_STEP' }
      | { type: 'PREVIOUS_STEP' }
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
      current_action: 'Ready to start'
    },
    settings: {
      auto_analyze: true,
      notification_level: 'normal',
      ai_assistance_level: 'enhanced'
    }
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
              current_action: 'Creating case...'
            })
          })
        }
      }
    },

    creatingCase: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_data, user_id } = input.context;
          
          // Create case through orchestrator
          const result = await orchestrator.processRequest({
            type: 'process',
            payload: {
              action: 'create_case',
              case_data
            },
            context: {
              user_id,
              priority: 'normal'
            }
          });

          // Initialize memory context
          const memoryContext = await caseMemoryEngine.getCaseMemoryContext(
            result.case_id, 
            user_id
          );

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
              current_action: 'Case created successfully'
            })
          })
        },
        
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Failed to create case: ${event.error}`
          })
        }
      }
    },

    caseReady: {
      entry: assign({
        current_step: 'case_ready'
      }),
      
      on: {
        UPLOAD_DOCUMENT: {
          target: 'uploadingDocument',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Uploading document...'
            })
          })
        },
        
        START_ANALYSIS: {
          target: 'analyzingCase',
          guard: ({ context }) => context.documents.length > 0
        },
        
        REQUEST_AI_ASSISTANCE: {
          target: 'providingAssistance'
        }
      }
    },

    uploadingDocument: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_id, user_id } = input.context;
          const { file, metadata } = input.event;
          
          // Upload through orchestrator
          const result = await orchestrator.processRequest({
            type: 'process',
            payload: {
              action: 'upload_document',
              case_id,
              file,
              metadata
            },
            context: {
              user_id,
              case_id,
              priority: 'normal'
            }
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
              ...metadata
            }
          });

          return result;
        }),
        
        onDone: {
          target: 'documentProcessing',
          actions: assign({
            documents: ({ context, event }) => [
              ...context.documents,
              event.output.document
            ],
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: Math.min(context.progress.completed_steps + 1, context.progress.total_steps),
              current_action: 'Document uploaded, processing...'
            })
          })
        },
        
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Upload failed: ${event.error}`
          })
        }
      }
    },

    documentProcessing: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_id, user_id, documents } = input.context;
          const latestDoc = documents[documents.length - 1];
          
          // Queue document for background processing
          await rabbitmq.publishDocumentProcessing({
            document_id: latestDoc.id,
            content: latestDoc.content,
            document_type: latestDoc.type,
            case_id
          });

          // Auto-analyze if enabled
          if (input.context.settings.auto_analyze) {
            return await orchestrator.processRequest({
              type: 'analyze',
              payload: {
                action: 'analyze_document',
                document_id: latestDoc.id,
                case_id
              },
              context: {
                user_id,
                case_id,
                priority: 'normal'
              }
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
                current_action: 'Document processed'
              })
            })
          },
          {
            target: 'analyzingCase',
            guard: ({ event }) => !!event.output.analysis,
            actions: assign({
              analysis_results: ({ context, event }) => [
                ...context.analysis_results,
                event.output.analysis
              ]
            })
          }
        ],
        
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Processing failed: ${event.error}`
          })
        }
      }
    },

    analyzingCase: {
      entry: assign({
        current_step: 'analyzing',
        progress: ({ context }) => ({
          ...context.progress,
          current_action: 'Analyzing case and documents...'
        })
      }),
      
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_id, user_id, documents } = input.context;
          
          // Comprehensive case analysis
          const analysis = await orchestrator.processRequest({
            type: 'analyze',
            payload: {
              action: 'comprehensive_analysis',
              case_id,
              documents: documents.map(d => d.id),
              analysis_type: 'full'
            },
            context: {
              user_id,
              case_id,
              priority: 'high'
            }
          });

          // Generate recommendations based on analysis
          const recommendations = await caseMemoryEngine.generateSelfPromptRecommendations(
            case_id,
            user_id,
            {
              type: 'analysis',
              content: 'Comprehensive case analysis completed',
              metadata: { analysis_id: analysis.id }
            }
          );

          return { analysis, recommendations };
        }),
        
        onDone: {
          target: 'reviewingRecommendations',
          actions: assign({
            analysis_results: ({ context, event }) => [
              ...context.analysis_results,
              event.output.analysis
            ],
            recommendations: ({ event }) => event.output.recommendations,
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: Math.min(context.progress.completed_steps + 1, context.progress.total_steps),
              current_action: 'Analysis complete, reviewing recommendations...'
            })
          })
        },
        
        onError: {
          target: 'error',
          actions: assign({
            error_message: ({ event }) => `Analysis failed: ${event.error}`
          })
        }
      }
    },

    reviewingRecommendations: {
      entry: assign({
        current_step: 'reviewing_recommendations'
      }),
      
      on: {
        ACCEPT_RECOMMENDATION: {
          target: 'executingRecommendation',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'Executing recommendation...'
            })
          })
        },
        
        REJECT_RECOMMENDATION: {
          actions: assign({
            recommendations: ({ context, event }) => 
              context.recommendations.filter(r => r.id !== event.recommendation_id)
          })
        },
        
        REQUEST_AI_ASSISTANCE: {
          target: 'providingAssistance'
        },
        
        NEXT_STEP: {
          target: 'workflowComplete',
          guard: ({ context }) => context.recommendations.every(r => r.status === 'completed')
        }
      }
    },

    executingRecommendation: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_id, user_id, recommendations } = input.context;
          const { recommendation_id } = input.event;
          
          const recommendation = recommendations.find(r => r.id === recommendation_id);
          if (!recommendation) {
            throw new Error('Recommendation not found');
          }

          // Execute recommendation through orchestrator
          const result = await orchestrator.processRequest({
            type: recommendation.type === 'next_action' ? 'process' : 'analyze',
            payload: {
              action: 'execute_recommendation',
              recommendation_id,
              recommendation_data: recommendation,
              case_id
            },
            context: {
              user_id,
              case_id,
              priority: recommendation.timing_suggestion === 'immediate' ? 'high' : 'normal'
            }
          });

          // Record execution in memory
          await caseMemoryEngine.recordInteraction({
            case_id,
            user_id,
            interaction_type: 'analysis',
            content: `Executed recommendation: ${recommendation.type}`,
            response: JSON.stringify(result),
            metadata: {
              recommendation_id,
              execution_result: result
            }
          });

          return { recommendation_id, result };
        }),
        
        onDone: {
          target: 'reviewingRecommendations',
          actions: assign({
            recommendations: ({ context, event }) => 
              context.recommendations.map(r => 
                r.id === event.output.recommendation_id 
                  ? { ...r, status: 'completed', result: event.output.result }
                  : r
              ),
            progress: ({ context }) => ({
              ...context.progress,
              completed_steps: Math.min(context.progress.completed_steps + 1, context.progress.total_steps),
              current_action: 'Recommendation executed successfully'
            })
          })
        },
        
        onError: {
          target: 'reviewingRecommendations',
          actions: assign({
            recommendations: ({ context, event }) => 
              context.recommendations.map(r => 
                r.id === (event as any).recommendation_id 
                  ? { ...r, status: 'failed', error: event.error }
                  : r
              )
          })
        }
      }
    },

    providingAssistance: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const { case_id, user_id, memory_context } = input.context;
          const { query } = input.event;
          
          // Get AI assistance using contextual memory
          const assistance = await orchestrator.processRequest({
            type: 'chat',
            payload: {
              message: query,
              context_needed: true,
              use_memory: true,
              memory_context
            },
            context: {
              user_id,
              case_id,
              priority: 'normal'
            }
          });

          return assistance;
        }),
        
        onDone: {
          target: 'caseReady',
          actions: assign({
            progress: ({ context }) => ({
              ...context.progress,
              current_action: 'AI assistance provided'
            })
          })
        },
        
        onError: {
          target: 'caseReady',
          actions: assign({
            error_message: ({ event }) => `AI assistance failed: ${event.error}`
          })
        }
      }
    },

    workflowComplete: {
      type: 'final',
      entry: assign({
        current_step: 'complete',
        progress: ({ context }) => ({
          ...context.progress,
          completed_steps: context.progress.total_steps,
          current_action: 'Workflow completed successfully'
        })
      })
    },

    error: {
      on: {
        RETRY: {
          target: 'idle',
          actions: assign({
            error_message: undefined
          })
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
              current_action: 'Ready to start'
            }
          })
        }
      }
    }
  },

  // Global transitions
  on: {
    UPDATE_SETTINGS: {
      actions: assign({
        settings: ({ context, event }) => ({
          ...context.settings,
          ...event.settings
        })
      })
    }
  }
});

// Export machine types for use in components
export type CaseWorkflowMachine = typeof caseWorkflowMachine;
export type CaseWorkflowState = ReturnType<CaseWorkflowMachine['transition']>;
export type CaseWorkflowEvent = Parameters<CaseWorkflowMachine['transition']>[1];