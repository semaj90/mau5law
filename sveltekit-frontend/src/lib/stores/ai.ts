// lib/stores/ai.ts
// Global AI Summary Store using XState v5, with memoization and streaming support
import { setup, createActor, assign, fromPromise } from "$lib/utils/xstate";
import { writable } from "svelte/store";

// Memoization cache (in-memory, can be replaced with Redis for persistence)
const summaryCache = new Map<string, { summary: string; sources: any[] }>();

// Define context and events interfaces
export interface AIContext {
  summary: string;
  error: string;
  loading: boolean;
  saving: boolean;
  caseId: string;
  evidence: any[];
  userId: string;
  model: string;
  stream: string;
  cacheKey: string;
  sources: any[];
}
type AIEvent =
  | {
    type: "SUMMARIZE";
    caseId: string;
    evidence: any[];
    userId: string;
    model: string;
  }
  | { type: "SAVE_SUMMARY" }
  | { type: "RETRY" }
  | { type: "RESET" };

export const aiGlobalMachine = setup({
  types: {
    context: {} as AIContext,
    events: {} as AIEvent,
  },
  actions: {
    setContext: assign(({ event }) => {
      if (event.type !== "SUMMARIZE") return {};
      const cacheKey = `${event.caseId}:${hashEvidence(event.evidence)}:${event.model}`;
      return {
        caseId: event.caseId,
        evidence: event.evidence,
        userId: event.userId,
        model: event.model,
        cacheKey,
        loading: true,
        error: "",
        stream: "",
      };
    }),
    setSuccess: assign(({ event }) => {
      if ((event as any).type === "xstate.done.actor.summarizeEvidence") {
        const data = (event as any).output;
        return {
          summary: data?.summary || "",
          sources: data?.sources || [],
          loading: false,
          stream: "",
          error: "",
        };
      }
      return {};
    }),
    setError: assign(({ event }) => {
      if ((event as any).type === "xstate.error.actor.summarizeEvidence") {
        return {
          error: ((event as any).error as Error)?.message || "Error generating summary.",
          loading: false,
        };
      }
      return {};
    }),
    setSaving: assign({ saving: true, error: "" }),
    setSaveSuccess: assign({ saving: false }),
    setSaveError: assign(({ event }) => ({
      saving: false,
      error: ((event as any).error as Error)?.message || "Failed to save summary.",
    })),
  },
  actors: {
    summarizeEvidence: fromPromise(async ({ input }: { input: AIContext }) => {
      // Memoization: check cache first
      if (summaryCache.has(input.cacheKey)) {
        return summaryCache.get(input.cacheKey)!;
      }

      // Backend endpoint from component documentation
      const res = await fetch("/api/ai/process-evidence", {
        method: "POST",
        body: JSON.stringify({
          caseId: input.caseId,
          evidence: input.evidence,
          userId: input.userId,
          model: input.model,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API request failed: ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      if (!data.summary) throw new Error("No summary returned from API");

      // Cache the result
      const result = {
        summary: data.summary,
        sources: data.sources || [],
      };
      summaryCache.set(input.cacheKey, result);

      return result;
    }),
    saveSummary: fromPromise(async ({ input }: { input: AIContext }) => {
      if (!input.summary || !input.caseId) {
        throw new Error("No summary or caseId to save.");
      }
      const res = await fetch("/api/summary/save", {
        method: "POST",
        body: JSON.stringify({ caseId: input.caseId, summary: input.summary }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API request failed: ${res.statusText} - ${errorText}`);
      }
      return await res.json();
    }),
  },
}).createMachine({
  id: "aiGlobalSummary",
  initial: "idle",
  context: {
    summary: "",
    error: "",
    loading: false,
    saving: false,
    caseId: "",
    evidence: [],
    userId: "",
    model: "gemma3-legal:latest",
    stream: "",
    cacheKey: "",
    sources: [],
  },
  states: {
    idle: {
      on: {
        SUMMARIZE: {
          target: "summarizing",
          actions: "setContext",
        },
      },
    },
    summarizing: {
      invoke: {
        src: "summarizeEvidence",
        input: ({ context }) => context,
        onDone: {
          target: "success",
          actions: "setSuccess",
        },
        onError: {
          target: "failure",
          actions: "setError",
        },
      },
    },
    success: {
      on: {
        SUMMARIZE: {
          target: "summarizing",
          actions: "setContext",
        },
        RESET: "idle",
        SAVE_SUMMARY: {
          target: "saving",
          actions: "setSaving",
        },
      },
    },
    failure: {
      on: {
        SUMMARIZE: {
          target: "summarizing",
          actions: "setContext",
        },
        RETRY: "summarizing",
        RESET: "idle",
      },
    },
    saving: {
      invoke: {
        src: "saveSummary",
        input: ({ context }) => context,
        onDone: {
          target: "success",
          actions: "setSaveSuccess",
        },
        onError: {
          target: "success",
          actions: "setSaveError",
        },
      },
    },
  },
});

// Utility: hash evidence array for cache key
function hashEvidence(evidence: any[]): string {
  // Simple hash, replace with a better hash for production
  try {
    // Use crypto for a more robust hash if available (Node.js/modern browsers)
    // This is a placeholder for a real implementation.
    const jsonString = JSON.stringify(evidence);
    // A simple non-crypto hash function
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return "h" + hash.toString(16);
  } catch {
    // Fallback for environments without btoa or robust crypto
    return "e" + Date.now();
  }
}

// Create and export the actor
export const aiGlobalActor = createActor(aiGlobalMachine);
;
// Svelte store wrapper for reactivity
export const aiGlobalStore = writable(aiGlobalActor.getSnapshot());
;
// Subscribe to actor state changes
aiGlobalActor.subscribe((snapshot) => {
  aiGlobalStore.set(snapshot);
});

// Start the actor
aiGlobalActor.start();

// Export convenience functions
export const aiGlobalActions = {
  summarize: (
    caseId: string,
    evidence: any[],
    userId: string,
    model: string = "gemma3-legal:latest"
  ) => {
    aiGlobalActor.send({
      type: "SUMMARIZE",
      caseId,
      evidence,
      userId,
      model,
    });
  },
  saveSummary: () => {
    aiGlobalActor.send({ type: "SAVE_SUMMARY" });
  },
  retry: () => {
    aiGlobalActor.send({ type: "RETRY" });
  },
  reset: () => {
    aiGlobalActor.send({ type: "RESET" });
  },
};

export default aiGlobalStore;
