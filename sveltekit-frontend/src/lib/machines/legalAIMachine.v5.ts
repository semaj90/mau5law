import {
  setup,
  assign,
  fromPromise,
  type DoneActorEvent,
  type ErrorActorEvent,
  createActor, // Add createActor import
} from "xstate";
import { writable } from "svelte/store"; // Add writable import
import { productionServiceClient } from "$lib/api/production-service-client.js"; // Changed import path as per instructions

// Legal AI Application State Machine - XState v5
export interface Case {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  assignedTo?: string;
  [key: string]: unknown;
}
export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description?: string;
  fileUrl?: string;
  metadata?: { [key: string]: unknown }; // Changed 'any' to 'unknown'
  [key: string]: unknown;
}
export interface Source {
  id: string;
  title: string;
  type: "document" | "case" | "statute" | "web_url";
  relevance: number;
  snippet?: string;
  url?: string;
}
export interface AIResponse {
  response: string;
  confidence: number;
  sources: Source[];
  timestamp: string;
  model: string;
  metadata: Record<string, unknown>;
}
export interface AuthResponse {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}
export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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
    filters: { search: string; status: string; priority: string; category: string };
    pagination: { page: number; limit: number; total: number };
    loading: boolean;
    error: string | null;
  };
  ai: {
    isProcessing: boolean;
    currentQuery: string;
    lastResponse: AIResponse | null;
    error: string | null;
    models: { primary: string; embedding: string; available: string[] };
  };
  system: {
    connected: boolean;
    services: {
      database: boolean;
      redis: boolean;
      ollama: boolean;
      gpu: boolean;
      pgvector: boolean;
      qdrant: boolean;
      neo4j: boolean;
    };
    metrics: { errorCount: number; performanceScore: number; uptime: number };
  };
}
export type LegalAIEvent =
  | { type: "AUTH.LOGIN"; credentials: { email: string; password: string } }
  | { type: "AUTH.LOGOUT" }
  | { type: "AUTH.REGISTER"; userData: RegistrationData }
  | { type: "CASES.LOAD"; filters?: Partial<LegalAIContext["cases"]["filters"]> }
  | { type: "CASES.SELECT"; case: Case }
  | { type: "CASES.CREATE"; caseData: Partial<Case> }
  | { type: "CASES.SEARCH"; query: string }
  | { type: "AI.QUERY"; prompt: string; context?: Record<string, unknown> }
  | { type: "SYSTEM.CHECK_STATUS" };

const initialContext: LegalAIContext = {
  user: { id: null, email: null, role: null, permissions: [], isAuthenticated: false },
  cases: {
    items: [],
    currentCase: null,
    filters: { search: "", status: "all", priority: "all", category: "all" },
    pagination: { page: 1, limit: 10, total: 0 },
    loading: false,
    error: null,
  },
  ai: {
    isProcessing: false,
    currentQuery: "",
    lastResponse: null,
    error: null,
    models: {
      primary: "gemma3-legal",
      embedding: "nomic-embed-text",
      available: ["gemma3-legal", "gpt4-legal", "llama2-legal"],
    },
  },
  system: {
    connected: false,
    services: {
      database: false,
      redis: false,
      ollama: false,
      gpu: false,
      pgvector: false,
      qdrant: false,
      neo4j: false,
    },
    metrics: { errorCount: 0, performanceScore: 0, uptime: 0 },
  },
};

// New interface for backend case data to handle potential snake_case and optional fields
interface BackendCase {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  category?: string;
  created_at?: string; // Backend snake_case
  createdAt?: string; // Backend camelCase (if present)
  updated_at?: string; // Backend snake_case
  updatedAt?: string; // Backend camelCase (if present)
  description?: string;
  assigned_to?: string; // Backend snake_case
  assignedTo?: string; // Backend camelCase (if present)
  [key: string]: unknown;
}

// New interface for service health items to replace 'any'
interface ServiceHealthItem {
  service: string;
  status: string;
  errorCount?: number;
  [key: string]: unknown; // Allow other properties
}

export const legalAIMachine = setup({
  types: {} as { context: LegalAIContext; events: LegalAIEvent },
  actions: {
    updateSystem: assign<LegalAIContext, DoneActorEvent<LegalAIContext["system"]>>({
      system: ({ event }) => {
        return event.output || initialContext.system;
      },
    }),
    setSystemError: assign<LegalAIContext, ErrorActorEvent>({
      system: ({ context }) => ({ ...context.system, connected: false }),
    }),
    setUser: assign<LegalAIContext, DoneActorEvent<AuthResponse>>({
      user: ({ event }) => {
        const authResponse = event.output;
        return {
          ...authResponse,
          isAuthenticated: true,
        };
      },
    }),
    clearUser: assign<LegalAIContext, LegalAIEvent>({
      user: () => ({ id: null, email: null, role: null, permissions: [], isAuthenticated: false }),
    }),
    setCases: assign<LegalAIContext, DoneActorEvent<Case[]>>({
      cases: ({ context, event }) => {
        const casesOutput = event.output || [];
        return {
          ...context.cases,
          items: casesOutput,
          loading: false,
        };
      },
    }),
    setCurrentCase: assign<LegalAIContext, Extract<LegalAIEvent, { type: "CASES.SELECT" }>>({
      cases: ({ context, event }) => {
        const selectEvent = event;
        return {
          ...context.cases,
          currentCase: selectEvent.case,
        };
      },
    }),
    setAIResponse: assign<LegalAIContext, DoneActorEvent<AIResponse>>({
      ai: ({ context, event }) => {
        const aiResponse = event.output;
        return {
          ...context.ai,
          lastResponse: aiResponse,
          isProcessing: false,
        };
      },
    }),
    setAIError: assign<LegalAIContext, ErrorActorEvent>({
      ai: ({ context, event }) => {
        const errorEvent = event;
        return {
          ...context.ai,
          error: (errorEvent.error as Error)?.message || "AI processing failed",
          isProcessing: false,
        };
      },
    }),
    startAIProcessing: assign<LegalAIContext, Extract<LegalAIEvent, { type: "AI.QUERY" }>>({
      ai: ({ context, event }) => {
        const queryEvent = event;
        return {
          ...context.ai,
          isProcessing: true,
          currentQuery: queryEvent.prompt || "",
          error: null,
        };
      },
    }),
  },
  actors: {
    checkSystemStatus: fromPromise(async () => {
      try {
        const [clusterStatusResponse, serviceHealthResponse] = await Promise.all([
          productionServiceClient.makeRequest("/api/system/cluster-status", {}, {}),
          productionServiceClient.makeRequest("/api/system/service-health", {}, {}),
        ]);

        if (!clusterStatusResponse.success || !serviceHealthResponse.success) {
          throw new Error("Failed to fetch system status");
        }

        const clusterStatus = clusterStatusResponse.data;
        const serviceHealth: ServiceHealthItem[] = serviceHealthResponse.data; // Cast to new interface

        // Calculate overall health metrics
        const totalServices = clusterStatus.totalServices;
        const healthyServices = clusterStatus.healthyServices;
        const performanceScore =
          totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;

        return {
          connected: healthyServices > 0,
          services: {
            database: serviceHealth.some(
              (s) => s.service.includes("postgres") && s.status === "healthy"
            ),
            redis: serviceHealth.some((s) => s.service.includes("redis") && s.status === "healthy"),
            ollama: serviceHealth.some(
              (s) => s.service.includes("ollama") && s.status === "healthy"
            ),
            gpu: serviceHealth.some((s) => s.service.includes("gpu") && s.status === "healthy"),
            pgvector: serviceHealth.some(
              (s) => s.service.includes("pgvector") && s.status === "healthy"
            ),
            qdrant: serviceHealth.some(
              (s) => s.service.includes("qdrant") && s.status === "healthy"
            ),
            neo4j: serviceHealth.some((s) => s.service.includes("neo4j") && s.status === "healthy"),
          },
          metrics: {
            errorCount: serviceHealth.reduce((acc: number, s) => acc + (s.errorCount || 0), 0),
            performanceScore: performanceScore,
            uptime: Date.now(), // Assuming uptime is current timestamp for simplicity
          },
        };
      } catch (error: Error | unknown) {
        console.error("System status check failed: ", error);
        return {
          connected: false,
          services: {
            database: false,
            redis: false,
            ollama: false,
            gpu: false,
            pgvector: false,
            qdrant: false,
            neo4j: false,
          },
          metrics: { errorCount: 1, performanceScore: 0, uptime: 0 },
        };
      }
    }),
    authenticateUser: fromPromise(
      async ({
        input,
      }: {
        input: { credentials: { email: string; password: string } };
      }): Promise<AuthResponse> => {
        try {
          const response = await productionServiceClient.makeRequest(
            "/api/auth/login",
            input.credentials,
            { timeout: 15000, priority: "reliability" }
          );
          if (response.success && response.data) {
            return {
              id: response.data.id || response.data.user?.id,
              email: response.data.email || input.credentials?.email,
              role: response.data.role || "legal_professional",
              permissions: response.data.permissions || [
                "read: cases",
                "write: cases",
                "ai: query",
              ],
            };
          } else {
            throw new Error(response.error || "Authentication failed");
          }
        } catch (error: Error | unknown) {
          console.error("Authentication error: ", error);
          throw new Error("Authentication service unavailable");
        }
      }
    ),
    loadCases: fromPromise(
      async ({
        input,
      }: {
        input: { filters?: Partial<LegalAIContext["cases"]["filters"]> };
      }): Promise<Case[]> => {
        try {
          const response = await productionServiceClient.makeRequest("/api/cases", input?.filters, {
            timeout: 10000,
            priority: "performance",
          });
          if (response.success && response.data) {
            // Ensure returned data is array of cases
            const cases = Array.isArray(response.data) ? response.data : response.data.cases || [];
            return cases.map((caseData: BackendCase) => ({
              // Use BackendCase for mapping
              id: caseData.id!,
              title: caseData.title!,
              status: caseData.status ?? "pending", // Use nullish coalescing for defaults
              priority: caseData.priority ?? "medium",
              category: caseData.category ?? "general",
              createdAt: caseData.createdAt ?? caseData.created_at, // Prioritize camelCase, then snake_case
              updatedAt: caseData.updatedAt ?? caseData.updated_at, // Prioritize camelCase, then snake_case
              description: caseData.description,
              assignedTo: caseData.assignedTo ?? caseData.assigned_to, // Prioritize camelCase, then snake_case
            }));
          } else {
            console.warn("Failed to load cases: ", response.error);
            return [];
          }
        } catch (error: Error | unknown) {
          console.error("Error loading cases: ", error);
          return [];
        }
      }
    ),
    processAIQuery: fromPromise(
      async ({ input }: { input: { prompt: string } }): Promise<AIResponse> => {
        try {
          // call production service for AI query
          const response = await productionServiceClient.makeRequest("/api/ai/query", input, {
            timeout: 20000,
            priority: "performance",
          });
          if (response.success && response.data) {
            return {
              response: response.data.response || response.data.answer,
              confidence: response.data.confidence || 0.85,
              sources: response.data.sources || response.data.references || [],
              timestamp: new Date().toISOString(),
              model: response.data?.model || "unknown",
              metadata: response.data.metadata || {},
            };
          } else {
            throw new Error(response.error || "AI query failed");
          }
        } catch (error: Error | unknown) {
          console.error("AI query error: ", error);
          throw new Error("AI service unavailable");
        }
      }
    ),
  },
}).createMachine({
  id: "legalAI",
  initial: "initializing",
  context: initialContext,
  states: {
    initializing: {
      invoke: {
        src: "checkSystemStatus",
        onDone: { target: "idle", actions: ["updateSystem"] },
        onError: { target: "error", actions: ["setSystemError"] },
      },
    },
    idle: {
      on: {
        "AUTH.LOGIN": "authenticating",
        "AUTH.REGISTER": "registering",
        "CASES.LOAD": "loadingCases",
        "CASES.CREATE": "creatingCase",
        "AI.QUERY": "processingAI",
        "SYSTEM.CHECK_STATUS": "checkingStatus",
      },
    },
    authenticating: {
      invoke: {
        src: "authenticateUser",
        input: ({ event }) => ({
          credentials: (event as Extract<LegalAIEvent, { type: "AUTH.LOGIN" }>).credentials,
        }),
        onDone: { target: "authenticated", actions: ["setUser"] },
        onError: { target: "idle", actions: ["clearUser"] },
      },
    },
    authenticated: {
      initial: "ready",
      states: {
        ready: {
          on: {
            "CASES.LOAD": "#legalAI.loadingCases",
            "AI.QUERY": "#legalAI.processingAI",
            "AUTH.LOGOUT": "#legalAI.idle",
          },
        },
      },
    },
    loadingCases: {
      invoke: {
        src: "loadCases",
        input: ({ event }) => ({
          filters: (event as Extract<LegalAIEvent, { type: "CASES.LOAD" }>).filters,
        }),
        onDone: { target: "authenticated", actions: "setCases" },
        onError: { target: "authenticated" },
      },
    },
    processingAI: {
      entry: "startAIProcessing",
      invoke: {
        src: "processAIQuery",
        input: ({ event }) => ({
          prompt: (event as Extract<LegalAIEvent, { type: "AI.QUERY" }>).prompt,
        }),
        onDone: { target: "authenticated", actions: "setAIResponse" },
        onError: { target: "authenticated", actions: "setAIError" },
      },
    },
    error: {
      on: {
        "SYSTEM.CHECK_STATUS": "initializing",
      },
    },
    // Placeholder states
    registering: {
      after: { 1000: "idle" },
    },
    creatingCase: {
      after: { 1000: "authenticated" },
    },
    checkingStatus: {
      after: { 500: "idle" },
    },
  },
}); // Correctly close the createMachine call

// Create the actor
export const legalAIActor = createActor(legalAIMachine);

// Create Svelte store for reactive state
export const legalAIState = writable(legalAIActor.getSnapshot());

// Update store when state changes
legalAIActor.subscribe((snapshot) => {
  legalAIState.set(snapshot);
});

// Start the actor
legalAIActor.start();

export default legalAIActor;
export default legalAIActor;
