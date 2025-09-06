// XState Machine for AI Agent Shell with Production Go Services Integration
import { createMachine, assign } from "xstate";
import { goServiceClient, type RAGResponse, type UploadResponse } from '../services/goServiceClient';
import { productionServiceClient, services } from '../services/productionServiceClient';

// Define context and event types
export interface AgentShellContext {
  input: string;
  response: string;
  jobId?: string;
  rating?: number;
  searchQuery?: string;
  searchResults?: RAGResponse;
  uploadResults?: UploadResponse;
  userId?: string;
  caseId?: string;
  serviceHealth?: {
    enhancedRAG: boolean;
    uploadService: boolean;
    kratosServer: boolean;
  };
}

type AgentShellEvent =
  | { type: "PROMPT"; input: string; userId?: string; caseId?: string }
  | { type: "xstate.done.actor.callAgent"; data: string }
  | { type: "ACCEPT_PATCH"; jobId: string; userId: string; patchContent: string }
  | { type: "RATE_SUGGESTION"; jobId: string; rating: number; userId: string; feedback?: string }
  | { type: "SEMANTIC_SEARCH"; query: string; userId: string; caseId?: string }
  | { type: "FILE_UPLOAD"; file: File; userId: string; caseId?: string }
  | { type: "CHECK_HEALTH" };

export const agentShellMachine = createMachine({
  id: "agentShell",
  initial: "idle",
  context: { input: "", response: "" },
  types: {} as {
    context: AgentShellContext;
    events: AgentShellEvent;
  },
  states: {
    idle: {
      on: {
        PROMPT: {
          target: "processing",
          actions: assign({
            input: ({ event }) => (event as any).input || "",
            userId: ({ event }) => (event as any).userId,
            caseId: ({ event }) => (event as any).caseId,
          }),
        },
        SEMANTIC_SEARCH: {
          target: "searching",
          actions: assign({
            searchQuery: ({ event }) => (event as any).query,
            userId: ({ event }) => (event as any).userId,
            caseId: ({ event }) => (event as any).caseId,
          }),
        },
        FILE_UPLOAD: {
          target: "uploading",
          actions: assign({
            userId: ({ event }) => (event as any).userId,
            caseId: ({ event }) => (event as any).caseId,
          }),
        },
        CHECK_HEALTH: {
          target: "checkingHealth",
        },
      },
    },
    processing: {
      invoke: {
        src: "callAgent",
        input: ({ context }) => ({
          input: context.input,
          userId: context.userId,
          caseId: context.caseId,
        }),
        onDone: {
          target: "idle",
          actions: assign({
            response: (_, e) => (e && "data" in e ? (e as any).data : ""),
          }),
        },
        onError: "idle",
      },
      on: {
        ACCEPT_PATCH: {
          actions: "acceptPatchAction",
        },
        RATE_SUGGESTION: {
          actions: "rateSuggestionAction",
        },
      },
    },
    searching: {
      invoke: {
        src: "performSemanticSearch",
        input: ({ context }) => ({
          query: context.searchQuery,
          userId: context.userId,
          caseId: context.caseId,
        }),
        onDone: {
          target: "idle",
          actions: assign({
            searchResults: (_, e) => (e && "data" in e ? (e as any).data : null),
          }),
        },
        onError: "idle",
      },
    },
    uploading: {
      invoke: {
        src: "performFileUpload",
        input: ({ context, event }) => ({
          file: (event as any).file,
          userId: context.userId,
          caseId: context.caseId,
        }),
        onDone: {
          target: "idle",
          actions: assign({
            uploadResults: (_, e) => (e && "data" in e ? (e as any).data : null),
          }),
        },
        onError: "idle",
      },
    },
    checkingHealth: {
      invoke: {
        src: "checkServiceHealth",
        onDone: {
          target: "idle",
          actions: assign({
            serviceHealth: (_, e) => (e && "data" in e ? (e as any).data : null),
          }),
        },
        onError: "idle",
      },
    },
  },
});

// Service implementations for XState with Production Services
export const agentShellServices = {
  callAgent: async ({ input, userId, caseId }: { input: string; userId?: string; caseId?: string }) => {
    try {
      // Use production service client with automatic protocol selection
      const response = await services.queryRAG(input, { userId, caseId });
      return response.response || response.data?.response || 'No response';
    } catch (error: any) {
      console.error("Production agent call failed, falling back to legacy:", error);
      // Fallback to legacy service
      try {
        const fallbackResponse = await goServiceClient.queryRAG({
          query: input,
          userId,
          caseId,
        });
        return fallbackResponse.response;
      } catch (fallbackError) {
        console.error("All agent services failed:", fallbackError);
        throw error;
      }
    }
  },

  performSemanticSearch: async ({ query, userId, caseId }: { query: string; userId: string; caseId?: string }) => {
    try {
      // Use production RAG service for semantic search
      const response = await services.queryRAG(`semantic_search: ${query}`, { userId, caseId });
      return response;
    } catch (error: any) {
      console.error("Production semantic search failed, falling back:", error);
      try {
        return await goServiceClient.semanticSearch(query, userId, { caseId });
      } catch (fallbackError) {
        console.error("All semantic search services failed:", fallbackError);
        throw error;
      }
    }
  },

  performFileUpload: async ({ file, userId, caseId }: { file: File; userId: string; caseId?: string }) => {
    try {
      // Use production upload service
      const response = await services.uploadFile(file, { userId, caseId });
      return response;
    } catch (error: any) {
      console.error("Production upload failed, falling back:", error);
      try {
        return await goServiceClient.uploadFile({
          file,
          userId,
          caseId,
        });
      } catch (fallbackError) {
        console.error("All upload services failed:", fallbackError);
        throw error;
      }
    }
  },

  checkServiceHealth: async () => {
    try {
      // Check production service health
      const productionHealth = await productionServiceClient.checkAllServicesHealth();
      return {
        production: productionHealth,
        legacy: await goServiceClient.checkServiceHealth()
      };
    } catch (error: any) {
      console.error("Production health check failed:", error);
      // Fallback to legacy health check
      try {
        return { legacy: await goServiceClient.checkServiceHealth() };
      } catch (fallbackError) {
        console.error("All health checks failed:", fallbackError);
        throw error;
      }
    }
  },
};

// Action implementations
export const agentShellActions = {
  acceptPatchAction: async ({ event }: any) => {
    try {
      const result = await goServiceClient.acceptPatch({
        jobId: event.jobId,
        userId: event.userId,
        patchContent: event.patchContent,
        targetFile: event.targetFile,
      });
      console.log("Patch accepted:", result);
    } catch (error: any) {
      console.error("Patch acceptance failed:", error);
    }
  },

  rateSuggestionAction: async ({ event }: any) => {
    try {
      const result = await goServiceClient.rateSuggestion({
        jobId: event.jobId,
        rating: event.rating,
        userId: event.userId,
        feedback: event.feedback,
      });
      console.log("Rating submitted:", result);
    } catch (error: any) {
      console.error("Rating submission failed:", error);
    }
  },
};
