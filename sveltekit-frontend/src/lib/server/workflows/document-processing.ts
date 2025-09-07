// XState v5 Document Processing Workflow State Machine
import { createMachine, assign, sendTo, raise, fromPromise, fromCallback } from 'xstate';
import { cache } from '$lib/server/cache/redis';
import { db, embeddings as embeddingsTable } from '$lib/server/db/client';
import { embedText } from '$lib/server/embedding-gateway';

// Types for document processing workflow
export interface DocumentProcessingContext {
  documentId: string;
  content: string;
  filename?: string;
  metadata: Record<string, any>;
  chunks: string[];
  embeddings: number[][];
  progress: number;
  errors: string[];
  startTime: number;
  endTime?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  processingStage: 'chunking' | 'embedding' | 'storing' | 'indexing' | 'finalizing';
}

export type DocumentProcessingEvent =
  | { type: 'START_PROCESSING'; documentId: string; content: string; metadata?: Record<string, any> }
  | { type: 'CHUNKING_COMPLETE'; chunks: string[] }
  | { type: 'CHUNKING_FAILED'; error: string }
  | { type: 'EMBEDDING_COMPLETE'; embeddings: number[][] }
  | { type: 'EMBEDDING_FAILED'; error: string }
  | { type: 'STORAGE_COMPLETE' }
  | { type: 'STORAGE_FAILED'; error: string }
  | { type: 'INDEXING_COMPLETE' }
  | { type: 'INDEXING_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// Text chunking logic
const chunkText = (text: string, chunkSize: number = 512): string[] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if ((currentChunk + ' ' + trimmedSentence).length <= chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}. ${trimmedSentence}` : trimmedSentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(chunk => chunk.trim().length > 0);
};

// Document processing actors
const chunkingActor = fromPromise(async ({ input }: { input: { content: string; chunkSize?: number } }) => {
  const { content, chunkSize = 512 } = input;
  console.log(`📝 Starting text chunking (target size: ${chunkSize})`);
  
  if (!content || content.trim().length === 0) {
    throw new Error('Content is empty or undefined');
  }
  
  const chunks = chunkText(content, chunkSize);
  console.log(`✅ Text chunking complete: ${chunks.length} chunks created`);
  
  return { chunks };
});

const embeddingActor = fromPromise(async ({ input }: { input: { chunks: string[]; model?: string } }) => {
  const { chunks, model = 'nomic-embed-text:latest' } = input;
  console.log(`🧠 Starting embedding generation for ${chunks.length} chunks`);
  
  if (chunks.length === 0) {
    throw new Error('No chunks provided for embedding');
  }
  
  const { embeddings, backend } = await embedText(fetch, chunks, model);
  console.log(`✅ Embedding generation complete: ${embeddings.length} vectors (backend: ${backend})`);
  
  return { embeddings, backend, model };
});

const storageActor = fromPromise(async ({ input }: { 
  input: { 
    documentId: string; 
    chunks: string[]; 
    embeddings: number[][]; 
    metadata: Record<string, any>;
    model: string;
    backend: string;
  } 
}) => {
  const { documentId, chunks, embeddings, metadata, model, backend } = input;
  console.log(`💾 Starting database storage for document: ${documentId}`);
  
  if (chunks.length !== embeddings.length) {
    throw new Error(`Chunk count (${chunks.length}) doesn't match embedding count (${embeddings.length})`);
  }
  
  const rows = embeddings.map((vec, i) => ({
    sourceId: documentId,
    jobId: documentId,
    chunkIndex: i,
    content: chunks[i],
    model,
    backend,
    metadata: {
      ...metadata,
      total_chunks: chunks.length,
      source_document: documentId,
      processed_at: new Date().toISOString()
    } as any,
    embedding: vec as unknown as any,
  }));

  await db.insert(embeddingsTable).values(rows);
  console.log(`✅ Database storage complete: ${rows.length} records inserted`);
  
  return { stored: rows.length };
});

const cachingActor = fromPromise(async ({ input }: { 
  input: { 
    documentId: string; 
    chunks: string[]; 
    embeddings: number[][]; 
    metadata: Record<string, any> 
  } 
}) => {
  const { documentId, chunks, embeddings, metadata } = input;
  console.log(`🚀 Starting cache storage for document: ${documentId}`);
  
  const cacheKey = `embedding:${documentId}`;
  const cacheData = { 
    chunks, 
    embeddings, 
    metadata, 
    processed_at: new Date().toISOString() 
  };
  
  await cache.set(cacheKey, cacheData, 86400); // 24h TTL
  console.log(`✅ Cache storage complete: ${documentId}`);
  
  return { cached: true };
});

// Progress tracking actor
const progressTracker = fromCallback(({ sendBack, receive }) => {
  let progress = 0;
  
  receive((event) => {
    switch (event.type) {
      case 'CHUNKING_START':
        progress = 10;
        break;
      case 'CHUNKING_COMPLETE':
        progress = 25;
        break;
      case 'EMBEDDING_START':
        progress = 35;
        break;
      case 'EMBEDDING_COMPLETE':
        progress = 60;
        break;
      case 'STORAGE_START':
        progress = 70;
        break;
      case 'STORAGE_COMPLETE':
        progress = 85;
        break;
      case 'CACHING_START':
        progress = 90;
        break;
      case 'CACHING_COMPLETE':
        progress = 100;
        break;
    }
    
    sendBack({ type: 'PROGRESS_UPDATE', progress });
  });
});

// Main document processing state machine
export const documentProcessingMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwGIBlAFQG0AFAB1VgBdYBPWAYzFUQB2AFIAUAG3wA3PiAAOUsFWkBXGrRkgAHogC0AdgAsAJgCsADgBMAZj6n9RtUY1HTJgDQgAnocN6Jh0YUXsLe20TM1MHRzUAX2iHNCw8AmJScmZqWgYmFnYOLgB3UgIAa2Y+YVFxKRl5JRUEbV0jUwtdaxdTLxMfA39TC00Yuw6tdRNO4yCR8KjcAmI0nLyCkjEJKRkM3PyigGFgZhLSsoAmCpqFOpqGmFpgAC9t7oQfJwHdBCNTS1KdJrNqYLQgKhfCCAKAAIm4AEb4ACu6wgm12UGO+CKBSSxTKrQudju922vSGfhGUxMky8PlMJg+0ws1lcPgchJAp3O9EepEoaABwI2YJyiKOp3OFwArqRAQTngRnnQGFyPt8+USvlBIIC6GB0b9gkCUgBdCbqOg6LzWGzM1p+PxhBJhJoIBAAaXCdDRgNl2WVXCRvI1Wp1ep1BoNxutJHIjFUjo+MZdHrIXtgPr9AcDkgNOqNhoAxLHCRzOKi4gFguEYok0mlMqW8zIiTidbr9Uo2h0Pr6jdGHe6vQy-HkGhz2YyQs5HYL3SX0yWcnki3kywXMsVyuoVPWquVN7Wap1gKOhqbx+avRaKZv6eL1Rq-n7CJa3a3uyNPVzvf7uIoLFpTsT4w3NNsTxnINQ0nNZKhrf5l0XHlVw2dY9i6Ax7G2PoakA9dDx1Y9uVPBBz0ve1kGfV98l+T9vzAKB-xnEsq3fWty1rJx63Axtm1bVsQxGUMFDmKMTAg1sjA+AxONlZwYMQ4U7j+WCUOBckMMjZgowIAhSMDJsGNkZwjOvCJ43knQHy1Rk2VNcCAggICYDlKi5Vo9swlE0tJyDINnDaFpZV02ZZj6IZrH8pQpljEY+hGayHQrOS2XdZTmF9RSyJHdZKJGcwOhMAZP0GUxFP0qNdM7QyNOZeNEqSmKsrSxSSCy-8qnhNJmgaCJ5nC-ztDmMJFu0cL7M29xJoXGqJzq3Zm2a7Q20C4Z2kWcMYzcMIw10YYBp2YbXLhEaVOPNSDvqSK6t5MIdCOuz2g6IJdAsjwY3GcJVBdHQJh-JBHrkt7koBNIcvOoY1HC-yuiYMJOh6Jh5iuqJwmjHmrMDHNWe-drCb-IqyFEcEXrBKKovC6IzoZgLNq6qKNGsYZUZGvpZlGaI5iRmmZqO+brrfF7yAKkGbshN7LVh5SnFsL45mCRNnGsLyFrmlZwjitxzPmKNJiGaznxNhJEuOv0DsN7XdZJw26u2Zx3FYhbghVh5IxuXZFl0KLzN2JnZmG5mueKz6MFJgBBBAAAY0-I1P6q2wKxL4YKvpGxMCi++5Lkjl+ZGvjxZ5eUXUcAAK8MIgNPQzXl0xVZGq9UacBvNr9JdcQb7E-fHvMRmBZjKOOl-5+ZIyisrRrMhZdE6VyIiG2d1v3qf7qpomD6O0s2f27cJt0LQhKdGM-t27Qc+xrQ-7g-xA+7cAMABfN6cCnpQFCvSVQ9ckYchBJ8R2lJKyJ1jNzeYNJPb0mhOjLE6djqjjjI+TKXsRagWXigWAfFNYVyFo+dyFsHZWUjn8WkcwRhBAWEERpFkjD2A+m0L6mF9o6k2n9b2O0vr2xwf1R+sB-4AGU0qPSGBnIoIIQLWCrJYrQMSkTawsUNGEmGhOZBdAeDAOAaArGYC2wQKitA+mHs3YYxGFCOB+giTjB5s6VErDOHDTgUZGOxNOF6REWE0qBjDg9FcMuGMsZzRLnMJYIGjIBZx3joAfgAmxKRdD5FrQSjwvggASP0JdR49AqIIZyYH0MMhKEcC1dJNgcYBDiPHXQjQ9BeP1Ec2BEiOD9EwP0hJSjZFCAqB5ARDBjHhDScwWyMYgjAwdoaTsKd2Q9BdqGOK40nZTUqg-aqDTp7Yn7oPQx1xokyISbcpJ+zTbW3cZMn2KwFhdLnMEmZ3tYzuTGWwCZ6S-ajKKpFUq9wKxeFqtLYI9gkzKjmNFJZgpDDzFKQSB4b1JioJaG9QGb1Fm8hHo7IFQLeZUl9jqP6ksOQbKBTFFBpslDmAcEEgFqy1nqAOZA05+tjkrEcgsq5Fy2xXIOQAeWFU4fGPJjHwmAQCKprz4UIpefUwKFp-qhWdHsOmLIgrBV5BqRxmq8VVmtDWW0tZhbhh9rStJxKFx0zdqisBX0DbapjLfGMf9Y2Bvjaau5qLpXqt9MG7+dZ9CjAmBMB2fR-FvnVE4YmFh1AjzdsJbOBKGXEvSZ8nh79TKPKzjW2+xbK1+rrgA0Nqgtl9oJcG9FbAhlJPQYsJ+UZlbTMdIEqOGYIw1KiIGAJxBkQytkCOkIhxKSVuKt25tv6V1Yq-T8-lKaGSGGMqhKGE7TKDhqEHF8QN5gzPmdFcIidDCMjzS2gKtKz1I1iozTu56FZzL6Y8ntZQXCfTzBbX6hxhahiA5B1lQcOQ0bPQi9tRL31btjN8D4uxKkJK-qmQ4WdxNMwRhFY4tQ5lUlUBsqtPqEPXTIGWh6Z6C0UtadUjOUGjEJvreKn9dJoxGhNMqRwOh9hTBGHR9i5ZjGJRhQKxO5GhH1tI-9RjhKGMsJiDO6Zexti1MJF3Qo2p4aeITOGbOGnGxWaDUjRjb52ZBcCw2qNdAXMOEKfZ-KBHWk2rHNyJKfAjB1PDV8RwsRxkrNxTm36cM6bJqDeRz96WH0lCfRRl1bGaFfR7v8aYKwJM6yDaJ8+4QJNOaEwE0N8a8P2rdbGlzGYKSI0uNGX2VdyzJxhGUZwRdnOJvlJF5zTm+JHvO6e8h50yFjUYwWpj76QvGmFl1nkLwOsW062dJsUQozFHMKx6Lh6YsUcU5R3Ttm0b2YcE4Z0LgLbLYhksdOWH2sXD-sKCYgHgOubG1FyAo2xvjZKJN6bw3Dvjdi4t9NlGHBzEnCUE2-4TbJktsYU4qczaRi+2xjbHLqAAGIDvOZG8dsb3Ybve5tz7sBvt7YAIo6F+yNiDLm2BHCUf0VjwAUGh9WwIAA */
  id: 'documentProcessing',
  
  types: {
    context: {} as DocumentProcessingContext,
    events: {} as DocumentProcessingEvent,
  },

  context: {
    documentId: '',
    content: '',
    metadata: {},
    chunks: [],
    embeddings: [],
    progress: 0,
    errors: [],
    startTime: 0,
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    processingStage: 'chunking',
  },

  initial: 'idle',

  states: {
    idle: {
      on: {
        START_PROCESSING: {
          target: 'processing',
          actions: assign({
            documentId: ({ event }) => event.documentId,
            content: ({ event }) => event.content,
            metadata: ({ event }) => event.metadata || {},
            startTime: () => Date.now(),
            status: 'processing',
            progress: 10,
            processingStage: 'chunking',
            errors: [],
            retryCount: 0,
          }),
        },
      },
    },

    processing: {
      invoke: {
        src: progressTracker,
        id: 'progressTracker',
      },

      initial: 'chunking',

      states: {
        chunking: {
          entry: sendTo('progressTracker', { type: 'CHUNKING_START' }),
          
          invoke: {
            src: chunkingActor,
            id: 'chunkingActor',
            input: ({ context }) => ({
              content: context.content,
              chunkSize: 512,
            }),
          },

          on: {
            'xstate.done.actor.chunkingActor': {
              target: 'embedding',
              actions: [
                assign({
                  chunks: ({ event }) => event.output.chunks,
                  progress: 25,
                  processingStage: 'embedding',
                }),
                sendTo('progressTracker', { type: 'CHUNKING_COMPLETE' }),
              ],
            },

            'xstate.error.actor.chunkingActor': {
              target: '#documentProcessing.error',
              actions: assign({
                errors: ({ context, event }) => [
                  ...context.errors,
                  `Chunking failed: ${event.error?.message || 'Unknown error'}`,
                ],
              }),
            },
          },
        },

        embedding: {
          entry: sendTo('progressTracker', { type: 'EMBEDDING_START' }),
          
          invoke: {
            src: embeddingActor,
            id: 'embeddingActor',
            input: ({ context }) => ({
              chunks: context.chunks,
              model: 'nomic-embed-text:latest',
            }),
          },

          on: {
            'xstate.done.actor.embeddingActor': {
              target: 'storing',
              actions: [
                assign({
                  embeddings: ({ event }) => event.output.embeddings,
                  progress: 60,
                  processingStage: 'storing',
                  metadata: ({ context, event }) => ({
                    ...context.metadata,
                    backend: event.output.backend,
                    model: event.output.model,
                  }),
                }),
                sendTo('progressTracker', { type: 'EMBEDDING_COMPLETE' }),
              ],
            },

            'xstate.error.actor.embeddingActor': {
              target: '#documentProcessing.error',
              actions: assign({
                errors: ({ context, event }) => [
                  ...context.errors,
                  `Embedding failed: ${event.error?.message || 'Unknown error'}`,
                ],
              }),
            },
          },
        },

        storing: {
          entry: sendTo('progressTracker', { type: 'STORAGE_START' }),
          
          type: 'parallel',
          
          states: {
            database: {
              invoke: {
                src: storageActor,
                id: 'storageActor',
                input: ({ context }) => ({
                  documentId: context.documentId,
                  chunks: context.chunks,
                  embeddings: context.embeddings,
                  metadata: context.metadata,
                  model: context.metadata.model || 'nomic-embed-text:latest',
                  backend: context.metadata.backend || 'ollama',
                }),
              },

              initial: 'pending',

              states: {
                pending: {
                  on: {
                    'xstate.done.actor.storageActor': 'completed',
                    'xstate.error.actor.storageActor': 'failed',
                  },
                },
                completed: { type: 'final' },
                failed: { type: 'final' },
              },
            },

            cache: {
              invoke: {
                src: cachingActor,
                id: 'cachingActor',
                input: ({ context }) => ({
                  documentId: context.documentId,
                  chunks: context.chunks,
                  embeddings: context.embeddings,
                  metadata: context.metadata,
                }),
              },

              initial: 'pending',

              states: {
                pending: {
                  on: {
                    'xstate.done.actor.cachingActor': 'completed',
                    'xstate.error.actor.cachingActor': 'completed', // Cache failure is not critical
                  },
                },
                completed: { type: 'final' },
              },
            },
          },

          onDone: {
            target: '#documentProcessing.completed',
            actions: [
              assign({
                progress: 100,
                status: 'completed',
                endTime: () => Date.now(),
                processingStage: 'finalizing',
              }),
              sendTo('progressTracker', { type: 'STORAGE_COMPLETE' }),
            ],
          },

          on: {
            'xstate.error.actor.storageActor': {
              target: '#documentProcessing.error',
              actions: assign({
                errors: ({ context, event }) => [
                  ...context.errors,
                  `Storage failed: ${event.error?.message || 'Unknown error'}`,
                ],
              }),
            },
          },
        },
      },

      on: {
        CANCEL: 'cancelled',
        PROGRESS_UPDATE: {
          actions: assign({
            progress: ({ event }) => event.progress,
          }),
        },
      },
    },

    completed: {
      type: 'final',
      entry: assign({
        status: 'completed',
        progress: 100,
      }),
    },

    error: {
      entry: assign({
        status: 'failed',
      }),

      on: {
        RETRY: [
          {
            target: 'processing',
            guard: ({ context }) => context.retryCount < context.maxRetries,
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              status: 'processing',
              progress: 0,
              processingStage: 'chunking',
            }),
          },
          {
            target: 'failed',
            actions: assign({
              errors: ({ context }) => [
                ...context.errors,
                `Maximum retry attempts (${context.maxRetries}) exceeded`,
              ],
            }),
          },
        ],
      },
    },

    failed: {
      type: 'final',
      entry: assign({
        status: 'failed',
      }),
    },

    cancelled: {
      type: 'final',
      entry: assign({
        status: 'failed',
      }),
    },
  },

  on: {
    RESET: {
      target: 'idle',
      actions: assign({
        documentId: '',
        content: '',
        metadata: {},
        chunks: [],
        embeddings: [],
        progress: 0,
        errors: [],
        startTime: 0,
        endTime: undefined,
        status: 'pending',
        retryCount: 0,
        processingStage: 'chunking',
      }),
    },
  },
});

export default documentProcessingMachine;