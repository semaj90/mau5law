/**
 * Phase 11: CrewAI Orchestration Machine (Minimal)
 * States: idle → reviewing → synthesizing → completed
 * Powers: Multi-agent AI workflow orchestration
 */
import { assign, fromPromise, setup } from 'xstate';

export interface AgentResponse {
  agentId: string;
  analysis: {
    confidence: number;
    findings: string[];
    recommendations: string[];
  };
  completedAt: number;
}

export interface DocumentReviewTask {
  taskId: string;
  documentId: string;
  assignedAgents: string[];
  priority: number;
}

export interface CrewAIContext {
  currentTask: DocumentReviewTask | null;
  taskQueue: DocumentReviewTask[];
  completedTasks: string[];
  activeAgents: string[];
  agentResponses: AgentResponse[];
  failedAgents: string[];
  currentRecommendations: Array<{
    id: string;
    type: string;
    text: string;
    confidence: number;
    accepted: boolean;
  }>;
  lastSaved: string | null;
  autoSaveInterval: number;
  lastActivity: string;
  userIntent: 'editing' | 'reviewing' | 'idle' | 'away';
  retryCount: number;
  lastError: string | null;
  startTime: number;
  processingTime: number;
  qualityScore: number;
}

export type CrewAIEvent =
  | { type: 'START_REVIEW'; task: DocumentReviewTask }
  | { type: 'AGENT_COMPLETED'; agentId: string; response: AgentResponse }
  | { type: 'AGENT_FAILED'; agentId: string; error: string }
  | { type: 'USER_ACTIVITY'; activity: string }
  | { type: 'USER_IDLE' }
  | { type: 'ACCEPT_RECOMMENDATION'; recommendationId: string }
  | { type: 'AUTO_SAVE_TRIGGERED' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// Start multi-agent review
async function startAgentReview(input: { task: DocumentReviewTask }) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { taskId: input.task.taskId, agents: input.task.assignedAgents };
}

// Auto-save document changes
async function autoSaveDocument(input: { documentId: string; content: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { saved: true, timestamp: new Date().toISOString() };
}

// Generate self-prompting recommendations
async function generateSelfPrompt(input: { context: CrewAIContext }) {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const recommendations = [];

  if (input.context.userIntent === 'idle') {
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'edit',
      text: 'Auto-save your progress and summarize changes?',
      confidence: 0.8,
      accepted: false,
    });
  }

  if (input.context.agentResponses.length > 0) {
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'review',
      text: 'Review agent suggestions and apply recommended changes',
      confidence: 0.9,
      accepted: false,
    });
  }

  return { recommendations };
}

export const crewAIOrchestrationMachine = setup({
  types: {
    context: {} as CrewAIContext,
    events: {} as CrewAIEvent,
  },
  actors: {
    startAgentReview: fromPromise(startAgentReview),
    autoSaveDocument: fromPromise(autoSaveDocument),
    generateSelfPrompt: fromPromise(generateSelfPrompt),
  },
  guards: {
    allAgentsCompleted: ({ context }) =>
      context.currentTask
        ? context.agentResponses.length === context.currentTask.assignedAgents.length
        : false,
    shouldRetryAgents: ({ context }) =>
      context.failedAgents.length > 0 && context.retryCount < 3,
    needsAutoSave: ({ context }) => {
      if (!context.lastSaved) return true;
      const now = Date.now();
      const lastSaved = new Date(context.lastSaved).getTime();
      return now - lastSaved > context.autoSaveInterval;
    },
  },
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
    currentRecommendations: [],
    lastSaved: null,
    autoSaveInterval: 30000,
    lastActivity: new Date().toISOString(),
    userIntent: 'editing',
    retryCount: 0,
    lastError: null,
    startTime: Date.now(),
    processingTime: 0,
    qualityScore: 0,
  },
  states: {
    idle: {
      on: {
        START_REVIEW: {
          target: 'orchestrating',
          actions: assign({
            currentTask: ({ event }) => event.task,
            activeAgents: ({ event }) => event.task.assignedAgents,
            startTime: () => Date.now(),
            lastActivity: () => new Date().toISOString(),
          }),
        },
        USER_ACTIVITY: {
          actions: assign({
            lastActivity: () => new Date().toISOString(),
          }),
        },
      },
    },

    orchestrating: {
      initial: 'starting_agents',
      on: {
        USER_ACTIVITY: {
          actions: assign({
            lastActivity: () => new Date().toISOString(),
            userIntent: ({ event }) => {
              if (event.activity.includes('edit') || event.activity.includes('type')) {
                return 'editing';
              } else if (event.activity.includes('review')) {
                return 'reviewing';
              }
              return 'editing';
            },
          }),
        },
        USER_IDLE: {
          actions: assign({
            userIntent: () => 'idle',
          }),
        },
        ACCEPT_RECOMMENDATION: {
          actions: assign({
            currentRecommendations: ({ context, event }) =>
              context.currentRecommendations.map((rec) =>
                rec.id === event.recommendationId ? { ...rec, accepted: true } : rec
              ),
          }),
        },
        CANCEL: {
          target: 'idle',
          actions: assign({
            currentTask: () => null,
            agentResponses: () => [],
            activeAgents: () => [],
          }),
        },
      },
      states: {
        starting_agents: {
          invoke: {
            src: 'startAgentReview',
            input: ({ context }) => ({ task: context.currentTask! }),
            onDone: {
              target: 'agents_running',
            },
            onError: {
              target: '#crewAIOrchestration.failed',
              actions: assign({
                lastError: ({ event }) => `Failed to start agents: ${event.error}`,
              }),
            },
          },
        },

        agents_running: {
          on: {
            AGENT_COMPLETED: {
              actions: assign({
                agentResponses: ({ context, event }) => [
                  ...context.agentResponses,
                  event.response,
                ],
                activeAgents: ({ context, event }) =>
                  context.activeAgents.filter((id) => id !== event.agentId),
              }),
              target: 'checking_completion',
            },
            AGENT_FAILED: {
              actions: assign({
                failedAgents: ({ context, event }) => [
                  ...context.failedAgents,
                  event.agentId,
                ],
                activeAgents: ({ context, event }) =>
                  context.activeAgents.filter((id) => id !== event.agentId),
                lastError: ({ event }) => event.error,
              }),
              target: 'checking_completion',
            },
          },
        },

        checking_completion: {
          always: [
            {
              guard: 'allAgentsCompleted',
              target: 'synthesizing_results',
            },
            {
              guard: 'shouldRetryAgents',
              target: 'retrying_failed',
            },
            {
              target: 'agents_running',
            },
          ],
        },

        retrying_failed: {
          entry: assign({
            retryCount: ({ context }) => context.retryCount + 1,
          }),
          after: {
            2000: {
              target: 'agents_running',
            },
          },
        },

        synthesizing_results: {
          invoke: {
            src: 'generateSelfPrompt',
            input: ({ context }) => ({ context }),
            onDone: {
              target: '#crewAIOrchestration.completed',
              actions: assign({
                currentRecommendations: ({ event }) => event.output.recommendations,
              }),
            },
            onError: {
              target: '#crewAIOrchestration.completed',
            },
          },
        },
      },
    },

    completed: {
      entry: assign({
        completedTasks: ({ context }) =>
          context.currentTask
            ? [...context.completedTasks, context.currentTask.taskId]
            : context.completedTasks,
        qualityScore: ({ context }) => {
          if (context.agentResponses.length === 0) return 0;
          const avgConfidence =
            context.agentResponses.reduce((sum, r) => sum + r.analysis.confidence, 0) /
            context.agentResponses.length;
          return Math.round(avgConfidence * 100);
        },
        processingTime: ({ context }) => Date.now() - context.startTime,
      }),
      invoke: {
        src: 'autoSaveDocument',
        input: ({ context }) => ({
          documentId: context.currentTask?.documentId || '',
          content: 'updated_content',
        }),
        onDone: {
          actions: assign({
            lastSaved: () => new Date().toISOString(),
          }),
        },
      },
      after: {
        5000: {
          target: 'idle',
          actions: assign({
            currentTask: () => null,
            agentResponses: () => [],
            activeAgents: () => [],
            retryCount: () => 0,
          }),
        },
      },
    },

    failed: {
      on: {
        RETRY: [
          {
            target: 'orchestrating.starting_agents',
            guard: 'shouldRetryAgents',
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              lastError: () => null,
            }),
          },
        ],
        RESET: {
          target: 'idle',
          actions: assign({
            currentTask: () => null,
            agentResponses: () => [],
            activeAgents: () => [],
            failedAgents: () => [],
            retryCount: () => 0,
            lastError: () => null,
          }),
        },
      },
      after: {
        10000: {
          target: 'orchestrating.starting_agents',
          guard: 'shouldRetryAgents',
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
          }),
        },
      },
    },
  },
});

// Helper selectors
export function isProcessing(state: { value: string }): boolean {
  return typeof state.value === 'object'
    ? 'orchestrating' in state.value
    : state.value === 'orchestrating';
}

export function getQualityScore(state: { context: CrewAIContext }): number {
  return state.context.qualityScore;
}


