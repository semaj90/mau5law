
// XState CrewAI Orchestration Machine
// Manages multi-agent workflows with self-prompting and auto-save

import { setup, assign, fromPromise, raise } from "xstate";
import {
  crewAIOrchestrator,
  type DocumentReviewTask,
  type AgentResponse
} from '$lib/ai/crewai-legal-agents';
import { documentUpdateLoop } from '$lib/services/documentUpdateLoop';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CrewAIContext {
  // Task management
  currentTask: DocumentReviewTask | null;
  taskQueue: DocumentReviewTask[];
  completedTasks: string[];
  
  // Agent coordination
  activeAgents: string[];
  agentResponses: AgentResponse[];
  failedAgents: string[];
  
  // Auto-save & self-prompting
  lastSaved: string | null;
  autoSaveInterval: number; // milliseconds
  idleTimeout: number; // milliseconds
  lastActivity: string;
  
  // User interaction
  userIntent: 'editing' | 'reviewing' | 'idle' | 'away';
  focusSchema: 'document_edit' | 'review_mode' | 'analysis_mode' | 'idle_mode';
  
  // Results & recommendations
  currentRecommendations: Array<{
    id: string;
    type: 'edit' | 'structure' | 'compliance' | 'risk';
    text: string;
    confidence: number;
    position?: number;
    accepted?: boolean;
  }>;
  
  // Error handling
  retryCount: number;
  lastError: string | null;
  
  // Performance metrics
  startTime: number;
  processingTime: number;
  qualityScore: number;
}

export type CrewAIEvents = 
  | { type: 'START_REVIEW'; task: DocumentReviewTask }
  | { type: 'AGENT_COMPLETED'; agentId: string; response: AgentResponse }
  | { type: 'AGENT_FAILED'; agentId: string; error: string }
  | { type: 'USER_ACTIVITY'; activity: string }
  | { type: 'USER_IDLE' }
  | { type: 'USER_AWAY' }
  | { type: 'FOCUS_CHANGED'; schema: CrewAIContext['focusSchema'] }
  | { type: 'ACCEPT_RECOMMENDATION'; recommendationId: string }
  | { type: 'REJECT_RECOMMENDATION'; recommendationId: string }
  | { type: 'AUTO_SAVE_TRIGGERED' }
  | { type: 'RETRY_FAILED_AGENTS' }
  | { type: 'CANCEL_REVIEW' }
  | { type: 'QUEUE_NEXT_TASK' };

// ============================================================================
// XSTATE MACHINE DEFINITION
// ============================================================================

export const crewAIOrchestrationMachine = setup({
  types: {
    context: {} as CrewAIContext,
    events: {} as CrewAIEvents,
  },
  
  actors: {
    // Start multi-agent review
    startAgentReview: fromPromise(async ({ input }: { input: { task: DocumentReviewTask } }) => {
      const taskId = await crewAIOrchestrator.startDocumentReview(input.task);
      return { taskId, task: input.task };
    }),
    
    // Auto-save document changes
    autoSaveDocument: fromPromise(async ({ input }: { input: { documentId: string; content: string } }) => {
      await documentUpdateLoop.queueDocumentUpdate(input.documentId, input.content);
      return { saved: true, timestamp: new Date().toISOString() };
    }),
    
    // Generate self-prompting recommendations
    generateSelfPrompt: fromPromise(async ({ input }: { input: { context: CrewAIContext } }) => {
      // This would integrate with your self-prompting system
      const recommendations = await generateContextualRecommendations(input.context);
      return { recommendations };
    }),
    
    // Apply schema focus change
    applySchemaFocus: fromPromise(async ({ input }: { input: { schema: string; context: CrewAIContext } }) => {
      const focusConfig = await generateSchemaFocusConfig(input.schema, input.context);
      return { focusConfig };
    })
  },
  
  guards: {
    // Check if all agents completed
    allAgentsCompleted: ({ context }) => {
      return context.currentTask 
        ? context.agentResponses.length === context.currentTask.assignedAgents.length
        : false;
    },
    
    // Check if user has been idle too long
    userIdleTooLong: ({ context }) => {
      const now = Date.now();
      const lastActivity = new Date(context.lastActivity).getTime();
      return (now - lastActivity) > context.idleTimeout;
    },
    
    // Check if auto-save is needed
    needsAutoSave: ({ context }) => {
      if (!context.lastSaved) return true;
      const now = Date.now();
      const lastSaved = new Date(context.lastSaved).getTime();
      return (now - lastSaved) > context.autoSaveInterval;
    },
    
    // Check if should retry failed agents
    shouldRetryAgents: ({ context }) => {
      return context.failedAgents.length > 0 && context.retryCount < 3;
    }
  },
  
  actions: {
    // Initialize context
    initializeContext: assign({
      startTime: () => Date.now(),
      lastActivity: () => new Date().toISOString(),
      userIntent: 'editing',
      focusSchema: 'document_edit',
      autoSaveInterval: 30000, // 30 seconds
      idleTimeout: 300000, // 5 minutes
      retryCount: 0,
      currentRecommendations: [],
      agentResponses: [],
      failedAgents: [],
      completedTasks: [],
      taskQueue: []
    }),
    
    // Set current task
    setCurrentTask: assign({
      currentTask: ({ event }) => {
        if (event.type === 'START_REVIEW') {
          return event.task;
        }
        return null;
      },
      activeAgents: ({ event }) => {
        if (event.type === 'START_REVIEW') {
          return event.task.assignedAgents;
        }
        return [];
      }
    }),
    
    // Record agent completion
    recordAgentCompletion: assign({
      agentResponses: ({ context, event }) => {
        if (event.type === 'AGENT_COMPLETED') {
          return [...context.agentResponses, event.response];
        }
        return context.agentResponses;
      },
      activeAgents: ({ context, event }) => {
        if (event.type === 'AGENT_COMPLETED') {
          return context.activeAgents.filter((id: any) => id !== event.agentId);
        }
        return context.activeAgents;
      }
    }),
    
    // Record agent failure
    recordAgentFailure: assign({
      failedAgents: ({ context, event }) => {
        if (event.type === 'AGENT_FAILED') {
          return [...context.failedAgents, event.agentId];
        }
        return context.failedAgents;
      },
      activeAgents: ({ context, event }) => {
        if (event.type === 'AGENT_FAILED') {
          return context.activeAgents.filter((id: any) => id !== event.agentId);
        }
        return context.activeAgents;
      },
      lastError: ({ event }) => {
        if (event.type === 'AGENT_FAILED') {
          return event.error;
        }
        return null;
      }
    }),
    
    // Update user activity
    updateActivity: assign({
      lastActivity: () => new Date().toISOString(),
      userIntent: ({ event }) => {
        if (event.type === 'USER_ACTIVITY') {
          // Infer intent from activity
          if (event.activity.includes('edit') || event.activity.includes('type')) {
            return 'editing';
          } else if (event.activity.includes('review') || event.activity.includes('analyze')) {
            return 'reviewing';
          }
        }
        return 'editing';
      }
    }),
    
    // Set user to idle
    setUserIdle: assign({
      userIntent: 'idle',
      focusSchema: 'idle_mode'
    }),
    
    // Set user to away
    setUserAway: assign({
      userIntent: 'away'
    }),
    
    // Change focus schema
    changeFocusSchema: assign({
      focusSchema: ({ event }) => {
        if (event.type === 'FOCUS_CHANGED') {
          return event.schema;
        }
        return 'document_edit';
      }
    }),
    
    // Accept recommendation
    acceptRecommendation: assign({
      currentRecommendations: ({ context, event }) => {
        if (event.type === 'ACCEPT_RECOMMENDATION') {
          return context.currentRecommendations.map((rec: any) => rec.id === event.recommendationId 
              ? { ...rec, accepted: true }
              : rec
          );
        }
        return context.currentRecommendations;
      }
    }),
    
    // Update last saved timestamp
    updateLastSaved: assign({
      lastSaved: () => new Date().toISOString()
    }),
    
    // Increment retry count
    incrementRetryCount: assign({
      retryCount: ({ context }) => context.retryCount + 1
    }),
    
    // Reset for new task
    resetForNewTask: assign({
      currentTask: null,
      agentResponses: [],
      failedAgents: [],
      activeAgents: [],
      retryCount: 0,
      lastError: null,
      processingTime: ({ context }) => Date.now() - context.startTime
    }),
    
    // Complete task
    completeTask: assign({
      completedTasks: ({ context }) => {
        if (context.currentTask) {
          return [...context.completedTasks, context.currentTask.taskId];
        }
        return context.completedTasks;
      },
      qualityScore: ({ context }) => {
        // Calculate quality score based on agent responses
        const avgConfidence = context.agentResponses.reduce((sum, r) => sum + r.analysis.confidence, 0) / context.agentResponses.length;
        return Math.round(avgConfidence * 100);
      }
    })
  }
}).createMachine({
  id: 'crewAIOrchestration',
  
  initial: 'idle',
  
  context: {
    currentTask: null,
    taskQueue: [],
    completedTasks: [],
    activeAgents: [],
    agentResponses: [],
    failedAgents: [],
    lastSaved: null,
    autoSaveInterval: 30000,
    idleTimeout: 300000,
    lastActivity: new Date().toISOString(),
    userIntent: 'editing',
    focusSchema: 'document_edit',
    currentRecommendations: [],
    retryCount: 0,
    lastError: null,
    startTime: Date.now(),
    processingTime: 0,
    qualityScore: 0
  },
  
  states: {
    idle: {
      entry: 'initializeContext',
      
      on: {
        START_REVIEW: {
          target: 'orchestrating',
          actions: 'setCurrentTask'
        },
        
        USER_ACTIVITY: {
          actions: 'updateActivity'
        }
      },
      
      // Auto-save timer when idle
      after: {
        30000: {
          target: 'idle',
          guard: 'needsAutoSave',
          actions: raise({ type: 'AUTO_SAVE_TRIGGERED' })
        }
      }
    },
    
    orchestrating: {
      initial: 'starting_agents',
      
      // Monitor user activity during orchestration
      on: {
        USER_ACTIVITY: {
          actions: 'updateActivity'
        },
        
        USER_IDLE: {
          actions: 'setUserIdle'
        },
        
        USER_AWAY: {
          actions: 'setUserAway'
        },
        
        FOCUS_CHANGED: {
          actions: 'changeFocusSchema'
        },
        
        ACCEPT_RECOMMENDATION: {
          actions: 'acceptRecommendation'
        },
        
        CANCEL_REVIEW: {
          target: 'idle',
          actions: 'resetForNewTask'
        }
      },
      
      states: {
        starting_agents: {
          invoke: {
            src: 'startAgentReview',
            input: ({ context }) => ({ task: context.currentTask! }),
            
            onDone: {
              target: 'agents_running'
            },
            
            onError: {
              target: 'failed',
              actions: assign({
                lastError: ({ event }) => `Failed to start agents: ${event.error}`
              })
            }
          }
        },
        
        agents_running: {
          on: {
            AGENT_COMPLETED: {
              actions: 'recordAgentCompletion',
              target: 'checking_completion'
            },
            
            AGENT_FAILED: {
              actions: 'recordAgentFailure',
              target: 'checking_completion'
            }
          },
          
          // Periodic user activity check
          after: {
            60000: [
              {
                guard: 'userIdleTooLong',
                actions: raise({ type: 'USER_IDLE' })
              }
            ]
          }
        },
        
        checking_completion: {
          always: [
            {
              guard: 'allAgentsCompleted',
              target: 'synthesizing_results'
            },
            {
              guard: 'shouldRetryAgents',
              target: 'retrying_failed'
            },
            {
              target: 'agents_running'
            }
          ]
        },
        
        retrying_failed: {
          entry: 'incrementRetryCount',
          
          // Retry failed agents
          after: {
            2000: {
              target: 'agents_running'
            }
          }
        },
        
        synthesizing_results: {
          invoke: {
            src: 'generateSelfPrompt',
            input: ({ context }) => ({ context }),
            
            onDone: {
              target: 'applying_recommendations',
              actions: assign({
                currentRecommendations: ({ event }) => event.output.recommendations
              })
            },
            
            onError: {
              target: 'completed' // Continue even if self-prompting fails
            }
          }
        },
        
        applying_recommendations: {
          // Apply schema focus based on recommendations
          invoke: {
            src: 'applySchemaFocus',
            input: ({ context }) => ({ 
              schema: context.focusSchema,
              context 
            }),
            
            onDone: {
              target: 'completed'
            },
            
            onError: {
              target: 'completed'
            }
          }
        },
        
        completed: {
          entry: 'completeTask',
          
          // Auto-save results
          invoke: {
            src: 'autoSaveDocument',
            input: ({ context }) => ({
              documentId: context.currentTask?.documentId || '',
              content: 'updated_content' // This would come from the recommendations
            }),
            
            onDone: {
              actions: 'updateLastSaved'
            }
          },
          
          on: {
            QUEUE_NEXT_TASK: {
              target: '#crewAIOrchestration.idle',
              actions: 'resetForNewTask'
            }
          },
          
          // Auto-transition to idle after completion
          after: {
            5000: {
              target: '#crewAIOrchestration.idle',
              actions: 'resetForNewTask'
            }
          }
        },
        
        failed: {
          on: {
            RETRY_FAILED_AGENTS: {
              target: 'starting_agents',
              guard: 'shouldRetryAgents'
            },
            
            CANCEL_REVIEW: {
              target: '#crewAIOrchestration.idle',
              actions: 'resetForNewTask'
            }
          },
          
          // Auto-retry after delay
          after: {
            10000: {
              target: 'starting_agents',
              guard: 'shouldRetryAgents',
              actions: 'incrementRetryCount'
            }
          }
        }
      }
    }
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateContextualRecommendations(context: CrewAIContext): Promise<any[]> {
  // This would implement your self-prompting logic
  const recommendations = [];
  
  // Based on user intent and focus schema, generate recommendations
  if (context.userIntent === 'idle' && context.focusSchema === 'idle_mode') {
    recommendations.push({
      id: 'auto_save_suggest',
      type: 'edit',
      text: 'Auto-save your progress and summarize changes?',
      confidence: 0.8
    });
  }
  
  if (context.agentResponses.length > 0) {
    recommendations.push({
      id: 'review_suggestions',
      type: 'review',
      text: 'Review agent suggestions and apply recommended changes',
      confidence: 0.9
    });
  }
  
  return recommendations;
}

async function generateSchemaFocusConfig(schema: string, context: CrewAIContext): Promise<any> {
  // Generate UI focus configuration based on schema
  const configs = {
    document_edit: {
      showInlineEdits: true,
      highlightRecommendations: true,
      autoComplete: true
    },
    review_mode: {
      showAnalysis: true,
      highlightRisks: true,
      compactView: false
    },
    analysis_mode: {
      showMetrics: true,
      showAgentBreakdown: true,
      detailedView: true
    },
    idle_mode: {
      showSummary: true,
      autoSavePrompt: true,
      minimizeUI: true
    }
  };
  
  return configs[schema as keyof typeof configs] || configs.document_edit;
}