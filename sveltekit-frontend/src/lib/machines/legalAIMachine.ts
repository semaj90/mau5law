import { setup, assign, createActor, fromPromise } from 'xstate';
import { writable } from 'svelte/store';

// Legal AI Application State Machine - XState v5
export interface Case {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  [key: string]: unknown;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description?: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
  [key: string]: unknown;
}

export interface LegalAIContext {
  user: {
    id: string | null;
    email: string | null;
    role: string | null;
    permissions: string[];
    isAuthenticated: boolean;
  };
  cases: {
    items: Case[];
    currentCase: Case | null;
    filters: {
      search: string;
      status: string;
      priority: string;
      category: string;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
    loading: boolean;
    error: string | null;
  };
  ai: {
    isProcessing: boolean;
    currentQuery: string;
    lastResponse: any;
    error: string | null;
    models: {
      primary: string;
      embedding: string;
      available: string[];
    };
  };
  system: {
    connected: boolean;
    services: {
      database: boolean;
      redis: boolean;
      ollama: boolean;
      gpu: boolean;
    };
    metrics: {
      errorCount: number;
      performanceScore: number;
      uptime: number;
    };
  };
}

export type LegalAIEvent =
  | { type: 'AUTH.LOGIN'; credentials: { email: string; password: string } }
  | { type: 'AUTH.LOGOUT' }
  | { type: 'AUTH.REGISTER'; userData: any }
  | { type: 'CASES.LOAD'; filters?: any }
  | { type: 'CASES.SELECT'; case: Case }
  | { type: 'CASES.CREATE'; caseData: any }
  | { type: 'CASES.SEARCH'; query: string }
  | { type: 'AI.QUERY'; prompt: string; context?: any }
  | { type: 'SYSTEM.CHECK_STATUS' };

const initialContext: LegalAIContext = {
  user: {
    id: null,
    email: null,
    role: null,
    permissions: [],
    isAuthenticated: false,
  },
  cases: {
    items: [],
    currentCase: null,
    filters: {
      search: '',
      status: 'all',
      priority: 'all',
      category: 'all',
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
    },
    loading: false,
    error: null,
  },
  ai: {
    isProcessing: false,
    currentQuery: '',
    lastResponse: null,
    error: null,
    models: {
      primary: 'gemma3-legal',
      embedding: 'nomic-embed-text',
      available: ['gemma3-legal', 'gpt4-legal', 'llama2-legal']
    }
  },
  system: {
    connected: false,
    services: {
      database: false,
      redis: false,
      ollama: false,
      gpu: false
    },
    metrics: {
      errorCount: 0,
      performanceScore: 0,
      uptime: 0
    }
  }
};

export const legalAIMachine = setup({
  types: {} as {
    context: LegalAIContext;
    events: LegalAIEvent;
  },
  actions: {
    updateSystem: assign({
      system: ({ event }) => (event as any).output || {}
    }),
    setSystemError: assign({
      system: ({ context }) => ({
        ...context.system,
        connected: false
      })
    }),
    setUser: assign({
      user: ({ event }) => ({
        ...(event as any).output,
        isAuthenticated: true
      })
    }),
    clearUser: assign({
      user: () => ({
        id: null,
        email: null,
        role: null,
        permissions: [],
        isAuthenticated: false
      })
    }),
    setCases: assign({
      cases: ({ context, event }) => ({
        ...context.cases,
        items: (event as any).output || [],
        loading: false
      })
    }),
    setCurrentCase: assign({
      cases: ({ context, event }) => ({
        ...context.cases,
        currentCase: (event as any).case
      })
    }),
    setAIResponse: assign({
      ai: ({ context, event }) => ({
        ...context.ai,
        lastResponse: (event as any).output,
        isProcessing: false
      })
    }),
    setAIError: assign({
      ai: ({ context, event }) => ({
        ...context.ai,
        error: (event as any).error || 'AI processing failed',
        isProcessing: false
      })
    }),
    startAIProcessing: assign({
      ai: ({ context, event }) => ({
        ...context.ai,
        isProcessing: true,
        currentQuery: (event as any).prompt || '',
        error: null
      })
    })
  },
  actors: {
    checkSystemStatus: fromPromise(async () => {
      // Mock system status check
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        connected: true,
        services: { database: true, redis: true, ollama: true, gpu: true },
        metrics: { errorCount: 0, performanceScore: 95, uptime: Date.now() }
      };
    }),
    authenticateUser: fromPromise(async ({ input }: { input: any }) => {
      // Mock authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        id: '1',
        email: input.credentials?.email || 'user@example.com',
        role: 'legal_professional',
        permissions: ['read:cases', 'write:cases', 'ai:query']
      };
    }),
    loadCases: fromPromise(async ({ input }: { input: any }) => {
      // Mock case loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        { id: '1', title: 'Corporate Fraud Case', status: 'active', priority: 'high', category: 'criminal' },
        { id: '2', title: 'Contract Dispute', status: 'pending', priority: 'medium', category: 'civil' }
      ];
    }),
    processAIQuery: fromPromise(async ({ input }: { input: any }) => {
      // Mock AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        response: `AI analysis for: "${input.prompt}"`,
        confidence: 0.95,
        sources: ['case_law_1', 'statute_2'],
        timestamp: new Date().toISOString()
      };
    })
  }
}).createMachine({
  id: 'legalAI',
  initial: 'initializing',
  context: initialContext,
  states: {
    initializing: {
      invoke: {
        src: 'checkSystemStatus',
        onDone: {
          target: 'idle',
          actions: 'updateSystem'
        },
        onError: {
          target: 'error',
          actions: 'setSystemError'
        }
      }
    },
    idle: {
      on: {
        'AUTH.LOGIN': 'authenticating',
        'AUTH.REGISTER': 'registering',
        'CASES.LOAD': 'loadingCases',
        'CASES.CREATE': 'creatingCase',
        'AI.QUERY': 'processingAI',
        'SYSTEM.CHECK_STATUS': 'checkingStatus'
      }
    },
    authenticating: {
      invoke: {
        src: 'authenticateUser',
        input: ({ event }) => ({ credentials: (event as any).credentials }),
        onDone: {
          target: 'authenticated',
          actions: 'setUser'
        },
        onError: {
          target: 'idle',
          actions: 'clearUser'
        }
      }
    },
    authenticated: {
      initial: 'ready',
      states: {
        ready: {
          on: {
            'CASES.LOAD': '#legalAI.loadingCases',
            'AI.QUERY': '#legalAI.processingAI',
            'AUTH.LOGOUT': '#legalAI.idle'
          }
        }
      }
    },
    loadingCases: {
      invoke: {
        src: 'loadCases',
        onDone: {
          target: 'authenticated',
          actions: 'setCases'
        },
        onError: {
          target: 'authenticated'
        }
      }
    },
    processingAI: {
      entry: 'startAIProcessing',
      invoke: {
        src: 'processAIQuery',
        input: ({ event }) => ({ prompt: (event as any).prompt }),
        onDone: {
          target: 'authenticated',
          actions: 'setAIResponse'
        },
        onError: {
          target: 'authenticated',
          actions: 'setAIError'
        }
      }
    },
    error: {
      on: {
        'SYSTEM.CHECK_STATUS': 'initializing'
      }
    },
    // Placeholder states
    registering: {
      after: {
        1000: 'idle'
      }
    },
    creatingCase: {
      after: {
        1000: 'authenticated'
      }
    },
    checkingStatus: {
      after: {
        500: 'idle'
      }
    }
  }
});

// Create the actor
export const legalAIActor = createActor(legalAIMachine);
;
// Create Svelte store for reactive state
export const legalAIState = writable(legalAIActor.getSnapshot());
;
// Update store when state changes
legalAIActor.subscribe((snapshot) => {
  legalAIState.set(snapshot);
});

// Start the actor
legalAIActor.start();

export default legalAIActor;