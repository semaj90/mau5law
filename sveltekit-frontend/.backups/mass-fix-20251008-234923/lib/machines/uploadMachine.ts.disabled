import { EventEmitter } from "events";
// src/lib/machines/uploadMachine.ts
import type { ProgressMsg } from "$lib/types/progress";
import {
  setup, assign, createActor, fromCallback
} from "xstate";

export interface UploadContext {
  files: Record<string, {
    uploadProgress?: number;
    step?: string;
    stepProgress?: number;
    fragment?: unknown;
    result?: unknown;
    status?: 'uploading' | 'processing' | 'done' | 'error';
    error?: string;
  }>;
  sessionId?: string;
  wsConnected: boolean;
  retryCount: number;
  lastError?: string;
}

type UploadEvent =
  | { type: 'START_PROCESS'; sessionId: string; fileId: string }
  | { type: 'UPLOAD_PROGRESS'; fileId: string; progress: number }
  | { type: 'PROCESSING_STEP'; fileId: string; step: string; progress?: number; fragment?: unknown }
  | { type: 'PROCESSING_COMPLETE'; fileId: string; result?: unknown }
  | { type: 'ERROR'; fileId?: string; error: any }
  | { type: 'WS_CLOSED' }
  | { type: 'WS_OPENED' }
  | { type: 'RETRY' }
  | { type: 'CANCEL'; fileId?: string }
  | { type: 'RESET' };

export const uploadMachine = setup({
  types: {} as {
    context: UploadContext;
    events: UploadEvent;
  },
  actions: {
    resetContext: assign({
      files: () => ({}),
      wsConnected: () => false,
      retryCount: () => 0,
      lastError: () => undefined
    }),
    setSessionId: assign({
      sessionId: ({ event }) => (event as any).sessionId
    }),
    setFileStatus: assign({
      files: ({ context, event }) => {
        const fileId = (event as any).fileId;
        if (!fileId) return context.files;
        return {
          ...context.files,
          [fileId]: {
            ...context.files[fileId],
            status: (event as any).status || ((event as any).type === 'START_PROCESS' ? 'uploading' : context.files[fileId]?.status),
            uploadProgress: (event as any).type === 'START_PROCESS' ? 0 : context.files[fileId]?.uploadProgress
          }
        };
      },
      retryCount: ({ event }) => (event as any).type === 'START_PROCESS' ? 0 : undefined,
      lastError: ({ event }) => (event as any).type === 'START_PROCESS' ? undefined : undefined
    }),
    updateFileProgress: assign({
      files: ({ context, event }) => {
        const fileId = (event as any).fileId;
        const progress = (event as any).progress;
        if (!fileId) return context.files;
        return {
          ...context.files,
          [fileId]: {
            ...context.files[fileId],
            uploadProgress: progress,
            status: progress >= 100 ? 'processing' : 'uploading'
          }
        };
      }
    }),
    updateProcessingStep: assign({
      files: ({ context, event }) => {
        const fileId = (event as any).fileId;
        const step = (event as any).step;
        const stepProgress = (event as any).progress;
        const fragment = (event as any).fragment;
        if (!fileId) return context.files;
        return {
          ...context.files,
          [fileId]: {
            ...context.files[fileId],
            step,
            stepProgress,
            fragment,
            status: 'processing'
          }
        };
      }
    }),
    setProcessingComplete: assign({
      files: ({ context, event }) => {
        const fileId = (event as any).fileId;
        const result = (event as any).result;
        if (!fileId) return context.files;
        return {
          ...context.files,
          [fileId]: {
            ...context.files[fileId],
            result,
            status: 'done'
          }
        };
      }
    }),
    setError: assign({
      files: ({ context, event }) => {
        const fileId = (event as any).fileId;
        const error = (event as any).error;
        if (!fileId) return context.files;
        return {
          ...context.files,
          [fileId]: {
            ...context.files[fileId],
            error: error?.message || error,
            status: 'error'
          }
        };
      },
      lastError: ({ event }) => (event as any).error?.message || (event as any).error
    }),
    setWsConnected: assign({
      wsConnected: ({ event }) => (event as any).connected ?? true
    }),
    incrementRetry: assign({
      retryCount: ({ context }) => context.retryCount + 1
    })
  }
}).createMachine({
  id: 'upload',
  initial: 'idle',
  context: {
    files: {},
    wsConnected: false,
    retryCount: 0
  },
  states: {
    idle: {
      on: {
        START_PROCESS: {
          target: 'connecting',
          actions: ['setSessionId', 'setFileStatus']
        }
      }
    },

    connecting: {
      invoke: {
        id: 'wsActor',
        src: fromCallback<UploadEvent, { sessionId: string }>(({ input, sendBack }) => {
          let ws: WebSocket | null = null;
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 5;
          let reconnectTimer: NodeJS.Timeout | null = null;

          function connect() {
            try {
              const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
              const wsUrl = `${protocol}//${location.host}/api/evidence/stream/${input.sessionId}`;

              console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

              ws = new WebSocket(wsUrl);

              ws.onopen = () => {
                console.log('✅ WebSocket connected');
                reconnectAttempts = 0;
                sendBack({ type: 'WS_OPENED' });
              };

              ws.onmessage = (event: any) => {
                try {
                  const msg: ProgressMsg = JSON.parse(event.data);
                  console.log('📨 WebSocket message:', msg);

                  // Transform WebSocket messages to machine events
                  switch (msg.type) {
                    case 'upload-progress':
                      sendBack({
                        type: 'UPLOAD_PROGRESS',
                        fileId: msg.fileId,
                        progress: msg.progress
                      });
                      break;

                    case 'processing-step':
                      sendBack({
                        type: 'PROCESSING_STEP',
                        fileId: msg.fileId,
                        step: msg.step,
                        progress: msg.stepProgress,
                        fragment: msg.fragment
                      });
                      break;

                    case 'processing-complete':
                      sendBack({
                        type: 'PROCESSING_COMPLETE',
                        fileId: msg.fileId,
                        result: msg.finalResult
                      });
                      break;

                    case 'error':
                      sendBack({
                        type: 'ERROR',
                        fileId: msg.fileId,
                        error: msg.error
                      });
                      break;
                    default:
                      sendBack(msg as UploadEvent);
                      break;
                  }
                } catch (parseError) {
                  console.error('❌ Failed to parse WebSocket message:', parseError);
                  sendBack({
                    type: 'ERROR',
                    error: { message: 'Failed to parse WebSocket message' }
                  });
                }
              };

              ws.onclose = () => {
                console.log('🔌 WebSocket closed, attempting reconnect...');
                sendBack({ type: 'WS_CLOSED' });

                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectTimer = setTimeout(() => {
                    reconnectAttempts++;
                    connect();
                  }, 1000 * Math.pow(2, reconnectAttempts));
                } else {
                  sendBack({ type: 'ERROR', error: new Error('Max reconnect attempts exceeded') });
                }
              };

              ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                sendBack({ type: 'ERROR', error });
              };

            } catch (error: any) {
              console.error('❌ Failed to create WebSocket:', error);
              sendBack({ type: 'ERROR', error });
            }
          }

          connect();

          return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) ws.close();
          };
        }),
        input: ({ context }) => ({ sessionId: context.sessionId! })
      },
      on: {
        WS_OPENED: {
          target: 'processing',
          actions: 'setWsConnected'
        },
        ERROR: {
          target: 'connection_failed',
          actions: ['setError', 'incrementRetry']
        }
      }
    },

    connection_failed: {
      after: {
        3000: {
          target: 'connecting_sse',
          guard: ({ context }) => context.retryCount < 3
        }
      },
      on: {
        RETRY: 'connecting',
        RESET: 'idle'
      }
    },

    connecting_sse: {
      invoke: {
        id: 'sseActor',
        src: fromCallback<UploadEvent, { sessionId: string }>(({ input, sendBack }) => {
          let eventSource: EventSource | null = null;

          try {
            const sseUrl = `/api/evidence/stream-sse/${input.sessionId}`;
            console.log(`🔌 Connecting to SSE: ${sseUrl}`);

            eventSource = new EventSource(sseUrl);

            eventSource.onopen = () => {
              console.log('✅ SSE connected');
              sendBack({ type: 'WS_OPENED' });
            };

            eventSource.onmessage = (event: any) => {
              try {
                const msg: ProgressMsg = JSON.parse(event.data);
                console.log('📨 SSE message:', msg);

                // Transform SSE messages to machine events (same as WebSocket)
                switch (msg.type) {
                  case 'upload-progress':
                    sendBack({
                      type: 'UPLOAD_PROGRESS',
                      fileId: msg.fileId,
                      progress: msg.progress
                    });
                    break;

                  case 'processing-step':
                    sendBack({
                      type: 'PROCESSING_STEP',
                      fileId: msg.fileId,
                      step: msg.step,
                      progress: msg.stepProgress,
                      fragment: msg.fragment
                    });
                    break;

                  case 'processing-complete':
                    sendBack({
                      type: 'PROCESSING_COMPLETE',
                      fileId: msg.fileId,
                      result: msg.finalResult
                    });
                    break;

                  case 'error':
                    sendBack({
                      type: 'ERROR',
                      fileId: msg.fileId,
                      error: msg.error
                    });
                    break;
                  default:
                    sendBack(msg as UploadEvent);
                    break;
                }
              } catch (parseError) {
                console.error('❌ Failed to parse SSE message:', parseError);
                sendBack({
                  type: 'ERROR',
                  error: { message: 'Failed to parse SSE message' }
                });
              }
            };

            eventSource.onerror = (error) => {
              console.error('❌ SSE error:', error);
              sendBack({ type: 'ERROR', error });
            };

          } catch (error: any) {
            console.error('❌ Failed to create SSE:', error);
            sendBack({ type: 'ERROR', error });
          }

          return () => {
            if (eventSource) eventSource.close();
          };
        }),
        input: ({ context }) => ({ sessionId: context.sessionId! })
      },
      on: {
        WS_OPENED: {
          target: 'processing',
          actions: 'setWsConnected'
        },
        ERROR: {
          target: 'failed',
          actions: 'setError'
        }
      }
    },

    processing: {
      on: {
        UPLOAD_PROGRESS: {
          actions: 'updateFileProgress'
        },

        PROCESSING_STEP: {
          actions: 'updateProcessingStep'
        },

        PROCESSING_COMPLETE: {
          actions: 'setProcessingComplete'
        },

        ERROR: {
          actions: 'setError'
        },

        WS_CLOSED: {
          target: 'connection_failed'
        },

        CANCEL: 'cancelling',
        RESET: {
          target: 'idle',
          actions: 'resetContext'
        }
      }
    },

    cancelling: {
      invoke: {
        id: 'cancelProcess',
        src: fromCallback(({ input, sendBack }) => {
          (async () => {
            try {
              const response = await fetch('/api/evidence/process', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: input.sessionId })
              });

              if (!response.ok) {
                throw new Error('Failed to cancel processing');
              }

              sendBack({ type: 'DONE', output: { success: true } });

            } catch (error: any) {
              sendBack({ type: 'ERROR', error });
            }
          })();
        }),
        input: ({ context }) => ({ sessionId: context.sessionId }),
        onDone: {
          target: 'idle',
          actions: 'resetContext'
        },
        onError: {
          target: 'processing',
          actions: 'setError'
        }
      }
    },

    failed: {
      on: {
        RETRY: 'connecting',
        RESET: {
          target: 'idle',
          actions: 'resetContext'
        }
      }
    }
  }
});

// Export actor for use in components
export const uploadActor = createActor(uploadMachine);

// Helper functions for the machine
export function getFileProgress(context: UploadContext, fileId: string): {
  uploadProgress: number;
  step?: string;
  stepProgress?: number;
  status: string;
  fragment?: unknown;
  error?: string;
} {
  const file = context.files[fileId];

  if (!file) {
    return {
      uploadProgress: 0,
      status: 'idle'
    };
  }

  return {
    uploadProgress: file.uploadProgress || 0,
    step: file.step,
    stepProgress: file.stepProgress,
    status: file.status || 'idle',
    fragment: file.fragment,
    error: file.error
  };
}

export function getAllFilesStatus(context: UploadContext): Array<{
  fileId: string;
  uploadProgress: number;
  step?: string;
  stepProgress?: number;
  status: string;
  fragment?: unknown;
  error?: string;
}> {
  return Object.entries(context.files).map(([fileId, file]) => ({
    fileId,
    uploadProgress: file.uploadProgress || 0,
    step: file.step,
    stepProgress: file.stepProgress,
    status: file.status || 'idle',
    fragment: file.fragment,
    error: file.error
  }));
}

// Export factory function to create the upload machine
export function createUploadMachine() {
  return uploadMachine;
}