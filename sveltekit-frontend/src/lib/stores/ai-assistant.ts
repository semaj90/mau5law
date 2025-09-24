import { writable } from 'svelte/store';
}
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  evidenceIds?: string[];
  metadata?: {
    confidence?: number;
    source?: string;
    reasoning?: string;
    suggestions?: string[];
  };
}
export interface AIResponse {
  text: string;
  timestamp: number;
  evidenceConnections?: string[];
  suggestedActions?: Array<{
    type: 'annotate' | 'connect' | 'investigate';
    description: string;
    evidenceId?: string;
  }>;
  confidence?: number;
}
export interface CaseAIContext {
  caseId: string;
  title?: string;
  messages: AIMessage[];
  evidenceMap: Record<string, {
    id: string;
    title: string;
    annotations: string[];
    connections: string[];
    aiSummary?: string;
  }>;
  currentSession: {
    isActive: boolean;
    lastActivity: number;
    activeEvidenceId?: string;
  };
  insights: Array<{,
    id: string;
    type: 'pattern' | 'connection' | 'anomaly' | 'recommendation';
    description: string;
    confidence: number;
    evidenceIds: string[];
    timestamp: number;
  }>;
}
export interface AIAssistantState {
  cases: Record<string, CaseAIContext>;
  currentCaseId?: string;
  isLoading: boolean;
  error?: string;
  globalInsights: Array<{,
    id: string;
    type: 'trend' | 'pattern' | 'recommendation';
    description: string;
    affectedCases: string[];
    timestamp: number;
  }>;
}
const initialState: AIAssistantState = {
  cases: {},
  isLoading: false
  globalInsights: []
};
function createAIAssistantStore() {
  const { subscribe, set, update } = writable<AIAssistantState>(initialState);
  return {
    subscribe,
    set,
    update,
    // Initialize a new case context
    initializeCase: (caseId: string, title?: string) => {
      update(state => {
        if (!state.cases[caseId]) {
          state.cases[caseId] = {
            caseId,
            title,
            messages: [],
            evidenceMap: {},
            currentSession: {
              isActive: false
              lastActivity: Date.now()
            },
            insights: []
          };
        }
        return state;
      });
    },
    // Set the current active case
    setCurrentCase: (caseId: string) => {
      update(state => {
        state.currentCaseId = caseId;
        if (state.cases[caseId]) {
          state.cases[caseId].currentSession.isActive = true;
          state.cases[caseId].currentSession.lastActivity = Date.now();
        }
        return state;
      });
    },
    // Add a message to a case
    addMessage: (caseId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => {
      update(state => {
        if (!state.cases[caseId]) {
          // Auto-initialize case if it doesn't exist
          state.cases[caseId] = {
            caseId,
            messages: [],
            evidenceMap: {},
            currentSession: {
              isActive: true
              lastActivity: Date.now()
            },
            insights: []
          };
        }
        const newMessage: AIMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };
        state.cases[caseId].messages.push(newMessage);
        state.cases[caseId].currentSession.lastActivity = Date.now();
        return state;
      });
    },
    // Add evidence to case context
    addEvidence: (caseId: string, evidence: {
      id: string;
      title: string;
      annotations?: string[];
      connections?: string[];
      aiSummary?: string;
    }) => {
      update(state => {
        if (!state.cases[caseId]) return state;
        state.cases[caseId].evidenceMap[evidence.id] = {
          ...evidence,
          annotations: evidence.annotations || [],
          connections: evidence.connections || []
        };
        return state;
      });
    },
    // Add AI insight to a case
    addInsight: (caseId: string, insight: Omit<CaseAIContext['insights'][0], 'id' | 'timestamp'>) => {
      update(state => {
        if (!state.cases[caseId]) return state;
        const newInsight = {
          ...insight,
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };
        state.cases[caseId].insights.push(newInsight);
        return state;
      });
    },
    // Set loading state
    setLoading: (loading: boolean) => {
      update(state => {
        state.isLoading = loading;
        return state;
      });
    },
    // Set error state
    setError: (error?: string) => {
      update(state => {
        state.error = error;
        return state;
      });
    },
    // Clear case data
    clearCase: (caseId: string) => {
      update(state => {
        delete state.cases[caseId];
        if (state.currentCaseId === caseId) {
          state.currentCaseId = undefined;
        }
        return state;
      });
    },
    // Get case context (helper function)
    getCaseContext: (caseId: string, state: AIAssistantState): CaseAIContext | undefined => {
      return state.cases[caseId];
    }
  };
}
export const aiAssistant = createAIAssistantStore();
// Derived stores for easier access
export const currentCase = writable<CaseAIContext | undefined>(undefined);
export const currentCaseMessages = writable<AIMessage[]>([]);
// Subscribe to changes and update derived stores
aiAssistant.subscribe(state => {
  const current = state.currentCaseId ? state.cases[state.currentCaseId] : undefined;
  currentCase.set(current);
  currentCaseMessages.set(current?.messages || []);
});