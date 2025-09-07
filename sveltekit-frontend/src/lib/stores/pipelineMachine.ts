import { createMachine, assign, type ActorRefFrom } from 'xstate';
import { chunkTextByBytes } from '$lib/utils/chunk';
import type { PipelineRequest, EmbedResult } from '$lib/types/pipeline';

interface Ctx {
  docId: string;
  model: string;
  total: number;
  completed: number;
  results: EmbedResult[];
  error?: string;
}

type Ev =
  | { type: 'START'; req: PipelineRequest }
  | { type: 'CHUNK_EMBED_DONE'; result: EmbedResult }
  | { type: 'FAIL'; error: string };

export const pipelineMachine = createMachine<Ctx, Ev>({
  id: 'pipeline',
  initial: 'idle',
  context: {
    docId: '',
    model: 'nomic-embed-text',
    total: 0,
    completed: 0,
    results: []
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'chunking',
          actions: assign((_, e) => ({ docId: (e as any).req.docId, model: (e as any).req.model || 'nomic-embed-text' }))
        }
      }
    },
    chunking: {
      invoke: {
        src: (_ctx, e) => async (send) => {
          const req = (e as any).req as PipelineRequest;
          const chunks = chunkTextByBytes(req.text, req.maxChunkBytes || 4096);
          const total = chunks.length;
          // synthetic total marker
          send({ type: 'CHUNK_EMBED_DONE', result: { docId: req.docId, chunkId: 'meta:total', embedding: [], model: req.model || 'nomic-embed-text', backend: 'unknown', cached: true } as any });
          for (let i = 0; i < chunks.length; i++) {
            const chunkId = `${req.docId}#${i+1}/${total}`;
            const resp = await fetch('/api/vector/pipeline', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ docId: req.docId, chunkId, text: chunks[i], model: req.model, tags: req.tags || [] })
            });
            if (resp.ok) {
              const data = await resp.json();
              const result = data?.result as EmbedResult;
              send({ type: 'CHUNK_EMBED_DONE', result });
            } else {
              const err = await resp.text();
              throw new Error(err || 'embed failed');
            }
          }
        }
      },
      on: {
        CHUNK_EMBED_DONE: {
          actions: assign({
            results: (ctx, e) => (e as any).result.chunkId.startsWith('meta:') ? ctx.results : [...ctx.results, (e as any).result],
            completed: (ctx) => ctx.completed + 1
          })
        },
        FAIL: { target: 'failed', actions: assign({ error: (_ctx, e) => (e as any).error }) }
      },
      always: [
        { target: 'done', cond: (ctx) => ctx.total > 0 && ctx.completed >= ctx.total }
      ]
    },
    done: { type: 'final' },
    failed: { type: 'final' }
  }
});

export type PipelineActor = ActorRefFrom<typeof pipelineMachine>;
