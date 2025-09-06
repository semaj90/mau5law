
import { createMachine, fromPromise, assign } from 'xstate';
import { writable } from 'svelte/store';

export interface RagContext {
  query: string;
  results: any[];
  error: string | null;
  loading: boolean;
}

type RagEvent =
  | { type: 'EXECUTE'; query: string }
  | { type: 'RESET' }
  | { type: 'RETRY' };

export const enhancedRagMachine = createMachine({
  id: 'enhancedRag',
  types: {} as {
    context: RagContext;
    events: RagEvent;
  },
  initial: 'idle',
  context: {
    query: '',
    results: [] as any[],
    error: null as string | null,
    loading: false
  },
  states: {
    idle: {
      on: {
        EXECUTE: {
          target: 'retrieving',
          actions: assign(({ context, event }) => ({
            query: event.type === 'EXECUTE' ? event.query : context.query
          }))
        },
        RESET: { actions: assign(() => ({ query: '', results: [], error: null, loading: false })) }
      }
    },
    retrieving: {
      entry: assign(() => ({ loading: true, error: null })),
      invoke: {
        // Pass context via input to satisfy fromPromise param typing
        input: ({ context }) => ({ query: context.query }),
        src: fromPromise(({ input }) => fetch('/api/rag/enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: (input as any).query, k: 8 })
        }).then(r => r.json())),
        onDone: {
          target: 'ready',
          actions: assign(({ event, context }) => ({
            results: (event.output && event.output.results) ? event.output.results : context.results,
            loading: false
          }))
        },
        onError: {
          target: 'failure',
          actions: assign(({ event }) => {
            const err = (event as any)?.error;
            const msg = err?.message || err?.data?.message || 'RAG failed';
            return { error: msg, loading: false };
          })
        }
      }
    },
    ready: {
      on: {
        EXECUTE: 'retrieving',
        RESET: { target: 'idle', actions: assign(() => ({ query: '', results: [], error: null, loading: false })) }
      }
    },
    failure: {
      on: {
        RETRY: 'retrieving',
        RESET: { target: 'idle', actions: assign(() => ({ query: '', results: [], error: null, loading: false })) }
      }
    }
  }
});

export const enhancedRagStore = writable({
  state: 'idle',
  results: [],
  loading: false,
  error: null,
});

