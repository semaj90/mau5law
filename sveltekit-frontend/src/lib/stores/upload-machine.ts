import { createMachine, assign, createActor, type StateFrom, fromPromise } from "xstate";
import { writable } from 'svelte/store';
// TODO: Fix import - // Orphaned content: import {  // Context interfaces
export interface UploadContext {
  uploadId?: string;
  caseId: string;
  files: File[];
  presignedUrls: string[];
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
  error?: string;
  metadata?: {
    filename: string;
    fileSize: number;
    contentType: string;
    expiresAt: Date;
  };
  jobIds: {
    extraction?: string;
    embedding?: string;
    tensor?: string;
    indexing?: string;
  };
  results: {
    extractedText?: string;
    embeddings?: number[][];
    tensorProcessing?: unknown;
    indexingComplete?: boolean;
  };
}

// Event types
type UploadEvent =
  | { type: 'UPLOAD_FILES'; files: File[]; caseId: string }
  | { type: 'PRESIGN_SUCCESS'; uploadId: string; presignedUrls: string[]; metadata: any }
  | { type: 'PRESIGN_FAILED'; error: string }
  | { type: 'CHUNK_UPLOADED'; chunkIndex: number }
  | { type: 'UPLOAD_COMPLETE' }
  | { type: 'UPLOAD_FAILED'; error: string }
  | { type: 'PROCESSING_STARTED'; stage: string; jobId: string }
  | { type: 'PROCESSING_PROGRESS'; stage: string; progress: number }
  | { type: 'PROCESSING_COMPLETE'; stage: string; result: any }
  | { type: 'PROCESSING_FAILED'; stage: string; error: string }
  | { type: 'INDEXING_COMPLETE'; result: any }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Upload and processing state machine
export const uploadMachine = createMachine({
  id: 'upload',
  types: {} as {
    context: UploadContext;
    events: UploadEvent;
  },
  initial: 'idle',
  context: {
    caseId: '',
    files: [],
    presignedUrls: [],
    uploadedChunks: 0,
    totalChunks: 0,
    progress: 0,
    jobIds: {},
    results: {},
  },
  states: {
    idle: {
      on: {
        UPLOAD_FILES: {
          target: 'requesting_presign',
          actions: assign({
            files: ({ event }) => event.files,
            caseId: ({ event }) => event.caseId,
            progress: 0,
            error: undefined,
          }),
        },
      },
    },

    requesting_presign: {
      invoke: {
        id: 'requestPresign',
        src: 'requestPresignedUrls',
        input: ({ context }) => ({
          files: context.files,
          caseId: context.caseId,
        }),
        onDone: {
          target: 'uploading',
          actions: assign({
            uploadId: ({ event }) => event.output.uploadId,
            presignedUrls: ({ event }) => event.output.presignedUrls,
            metadata: ({ event }) => event.output.metadata,
            totalChunks: ({ event }) => event.output.presignedUrls.length,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event.error as Error)?.message || 'Unknown error',
          }),
        },
      },
    },

    uploading: {
      invoke: {
        id: 'uploadChunks',
        src: 'uploadFileChunks',
        input: ({ context }) => ({
          files: context.files,
          presignedUrls: context.presignedUrls,
          uploadId: context.uploadId,
        }),
        onDone: {
          target: 'processing',
          actions: assign({
            progress: 100,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event.error as Error)?.message || 'Unknown error',
          }),
        },
      },
      on: {
        CHUNK_UPLOADED: {
          actions: assign({
            uploadedChunks: ({ context, event }) => context.uploadedChunks + 1,
            progress: ({ context, event }) =>
              Math.round(((context.uploadedChunks + 1) / context.totalChunks) * 100),
          }),
        },
      },
    },

    processing: {
      initial: 'extraction',
      states: {
        extraction: {
          invoke: {
            id: 'documentExtraction',
            src: 'startDocumentExtraction',
            input: ({ context }) => ({
              uploadId: context.uploadId,
              caseId: context.caseId,
              metadata: context.metadata,
            }),
            onDone: {
              target: 'embedding',
              actions: assign({
                jobIds: ({ context, event }) => ({
                  ...context.jobIds,
                  extraction: event.output.jobId,
                }),
                results: ({ context, event }) => ({
                  ...context.results,
                  extractedText: event.output.extractedText,
                }),
              }),
            },
            onError: {
              target: '#upload.error',
              actions: assign({
                error: ({ event }) => `Extraction failed: ${(event.error as any)?.message || 'Unknown error'}`,
              }),
            },
          },
          on: {
            PROCESSING_PROGRESS: {
              guard: ({ event }) => event.stage === 'extraction',
              actions: assign({
                progress: ({ event }) => event.progress,
              }),
            },
          },
        },

        embedding: {
          invoke: {
            id: 'embeddingGeneration',
            src: 'generateEmbeddings',
            input: ({ context }) => ({
              uploadId: context.uploadId,
              extractedText: context.results.extractedText,
            }),
            onDone: {
              target: 'tensor_processing',
              actions: assign({
                jobIds: ({ context, event }) => ({
                  ...context.jobIds,
                  embedding: event.output.jobId,
                }),
                results: ({ context, event }) => ({
                  ...context.results,
                  embeddings: event.output.embeddings,
                }),
              }),
            },
            onError: {
              target: '#upload.error',
              actions: assign({
                error: ({ event }) => `Embedding failed: ${(event.error as any)?.message || 'Unknown error'}`,
              }),
            },
          },
          on: {
            PROCESSING_PROGRESS: {
              guard: ({ event }) => event.stage === 'embedding',
              actions: assign({
                progress: ({ event }) => event.progress,
              }),
            },
          },
        },

        tensor_processing: {
          invoke: {
            id: 'tensorProcessing',
            src: 'processTensorData',
            input: ({ context }) => ({
              uploadId: context.uploadId,
              embeddings: context.results.embeddings,
            }),
            onDone: {
              target: 'indexing',
              actions: assign({
                jobIds: ({ context, event }) => ({
                  ...context.jobIds,
                  tensor: event.output.jobId,
                }),
                results: ({ context, event }) => ({
                  ...context.results,
                  tensorProcessing: event.output.result,
                }),
              }),
            },
            onError: {
              target: '#upload.error',
              actions: assign({
                error: ({ event }) => `Tensor processing failed: ${(event.error as any)?.message || 'Unknown error'}`,
              }),
            },
          },
          on: {
            PROCESSING_PROGRESS: {
              guard: ({ event }) => event.stage === 'tensor',
              actions: assign({
                progress: ({ event }) => event.progress,
              }),
            },
          },
        },

        indexing: {
          invoke: {
            id: 'vectorIndexing',
            src: 'indexVectors',
            input: ({ context }) => ({
              uploadId: context.uploadId,
              embeddings: context.results.embeddings,
              metadata: context.metadata,
            }),
            onDone: {
              target: 'complete',
              actions: assign({
                jobIds: ({ context, event }) => ({
                  ...context.jobIds,
                  indexing: event.output.jobId,
                }),
                results: ({ context }) => ({
                  ...context.results,
                  indexingComplete: true,
                }),
              }),
            },
            onError: {
              target: '#upload.error',
              actions: assign({
                error: ({ event }) => `Indexing failed: ${(event.error as any)?.message || 'Unknown error'}`,
              }),
            },
          },
          on: {
            PROCESSING_PROGRESS: {
              guard: ({ event }) => event.stage === 'indexing',
              actions: assign({
                progress: ({ event }) => event.progress,
              }),
            },
          },
        },

        complete: {
          type: 'final',
        },
      },
      onDone: {
        target: 'completed',
      },
    },

    completed: {
      type: 'final',
      entry: () => {
        console.log('🎉 Upload and processing completed successfully!');
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'idle',
          actions: assign({
            error: undefined,
            progress: 0,
            uploadedChunks: 0,
            jobIds: {},
            results: {},
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            files: [],
            caseId: '',
            presignedUrls: [],
            uploadedChunks: 0,
            totalChunks: 0,
            progress: 0,
            error: undefined,
            metadata: undefined,
            jobIds: {},
            results: {},
          }),
        },
      },
    },
  },
}, {
  actors: {
    // Presigned URL request actor
    requestPresignedUrls: fromPromise(async ({ input }: { input: { files: File[]; caseId: string } }) => {
      const { files, caseId } = input;
      const file = files[0]; // Handle single file for now

      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      const chunkCount = Math.ceil(file.size / chunkSize);

      const response = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          caseId,
          contentType: file.type,
          chunkCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Presign failed: ${response.statusText}`);
      }

      return await response.json();
    }),

    // Chunk upload actor
    uploadFileChunks: fromPromise(async ({
      input
    }: {
      input: { files: File[]; presignedUrls: string[]; uploadId: string };
    }) => {
      const { files, presignedUrls, uploadId } = input;
      const file = files[0];
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks

      const uploadPromises = presignedUrls.map(async (url, index) => {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const response = await fetch(url, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!response.ok) {
          throw new Error(`Chunk ${index} upload failed: ${response.statusText}`);
        }

        // Note: XState v5 fromPromise actors don't support sendBack
        return response.headers.get('ETag');
      });

      const etags = await Promise.all(uploadPromises);

      // Complete multipart upload
      const completeResponse = await fetch('/api/upload/presign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          etags: etags.map((etag, index) => ({ ETag: etag, PartNumber: index + 1 })),
        }),
      });

      if (!completeResponse.ok) {
        throw new Error(`Complete upload failed: ${completeResponse.statusText}`);
      }

      return await completeResponse.json();
    }),

    // Document extraction actor
    startDocumentExtraction: fromPromise(async ({ input }: {
      input: { uploadId: string; caseId: string; metadata: any }
    }) => {
      const { uploadId, caseId, metadata } = input;

      const response = await fetch('/api/processing/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          caseId,
          filename: metadata.filename,
          contentType: metadata.contentType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      return await response.json();
    }),

    // Embedding generation actor
    generateEmbeddings: fromPromise(async ({ input }: {
      input: { uploadId: string; extractedText: string }
    }) => {
      const { uploadId, extractedText } = input;

      const response = await fetch('/api/processing/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          text: extractedText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding failed: ${response.statusText}`);
      }

      return await response.json();
    }),

    // Tensor processing actor
    processTensorData: fromPromise(async ({ input }: {
      input: { uploadId: string; embeddings: number[][] }
    }) => {
      const { uploadId, embeddings } = input;

      // Convert embeddings to 4D tensor format
      const tensorData = embeddings.flat();
      const batchSize = 1;
      const depth = embeddings.length;
      const height = Math.ceil(Math.sqrt(embeddings[0]?.length || 1));
      const width = height;

      const response = await fetch('https://localhost:4433/tensor/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: `tensor-${uploadId}`,
          upload_id: uploadId,
          tensor_tile: {
            tile_id: `${uploadId}-main`,
            dimensions: [batchSize, depth, height, width],
            halo_size: 2,
            data: tensorData,
          },
          operation: 'som_cluster',
        }),
      });

      if (!response.ok) {
        throw new Error(`Tensor processing failed: ${response.statusText}`);
      }

      return await response.json();
    }),

    // Vector indexing actor
    indexVectors: fromPromise(async ({ input }: {
      input: { uploadId: string; embeddings: number[][]; metadata: any }
    }) => {
      const { uploadId, embeddings, metadata } = input;

      const response = await fetch('/api/processing/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          embeddings,
          metadata,
          indexType: 'pgvector',
        }),
      });

      if (!response.ok) {
        throw new Error(`Indexing failed: ${response.statusText}`);
      }

      return await response.json();
    }),
  },
});

// Types for Svelte components
export type UploadState = StateFrom<typeof uploadMachine>;
export type UploadActor = ReturnType<typeof createActor<typeof uploadMachine>>;

// Svelte store integration
function createUploadStore() {
  const actor = createActor(uploadMachine);
  const { subscribe } = writable(actor.getSnapshot(), (set) => {
    actor.subscribe(set);
    actor.start();
    return () => actor.stop();
  });

  return {
    subscribe,
    send: actor.send.bind(actor),
    getSnapshot: actor.getSnapshot.bind(actor),
  };
}

export const uploadStore = createUploadStore();