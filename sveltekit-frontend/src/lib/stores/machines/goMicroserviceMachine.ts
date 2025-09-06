
/**
 * Go Microservice XState Machine (repaired)
 * Manages connection lifecycle & request execution against the Go backend.
 */

import { createMachine, assign, fromPromise } from 'xstate';
// Types sourced from local machine types module
import type { GoMicroserviceContext, GoServiceRequest, GoServiceResponse } from './types';

const DEFAULT_TIMEOUT = 30_000; // 30s
const HEALTH_CHECK_INTERVAL = 60_000; // 60s

interface MakeRequestEvent { type: 'MAKE_REQUEST'; request: GoServiceRequest }
interface HealthCheckEvent { type: 'HEALTH_CHECK' }
interface ConnectEvent { type: 'CONNECT'; endpoint?: string }
interface DisconnectEvent { type: 'DISCONNECT' }
type GoEvents = MakeRequestEvent | HealthCheckEvent | ConnectEvent | DisconnectEvent;

const initialContext: GoMicroserviceContext = {
  userId: undefined,
  sessionId: '',
  retryCount: 0,
  timestamp: Date.now(),
  endpoint: 'http://localhost:8080',
  connectionStatus: 'disconnected',
  healthCheck: { lastCheck: 0, status: 'unhealthy' }
};

type GoMicroserviceEvents =
  | MakeRequestEvent
  | HealthCheckEvent
  | ConnectEvent
  | DisconnectEvent;

interface HealthResult { responseTime: number }

export const goMicroserviceMachine = createMachine({
  id: 'goMicroservice',
  context: initialContext,
  initial: 'connecting',
  states: {
    connecting: {
      entry: assign(() => ({ connectionStatus: 'connecting' as any })),
      invoke: {
        id: 'initialConnect',
        src: fromPromise(async ({ input }) => {
          const { endpoint } = input as { endpoint: string };
          const start = Date.now();
          const res = await fetch(`${endpoint}/health`);
          if (!res.ok) throw new Error('health check failed');
          await res.json().catch(() => ({}));
          return { responseTime: Date.now() - start } as HealthResult;
        }),
        input: ({ context }: any) => ({ endpoint: context.endpoint }),
        onDone: {
          target: 'connected.idle',
          actions: assign((_, e: any) => ({
            connectionStatus: 'connected' as any,
            healthCheck: { lastCheck: Date.now(), status: 'healthy' as 'healthy', responseTime: e.output.responseTime }
          }))
        },
        onError: {
          target: 'error',
          actions: assign((_, e: any) => ({ connectionStatus: 'error' as any, error: e.error?.message }))
        }
      },
      on: { DISCONNECT: { target: 'disconnected' } }
    },
    disconnected: {
      entry: assign(() => ({ connectionStatus: 'disconnected' as any })),
      on: { CONNECT: { target: 'connecting', actions: assign((c: any, e: any) => ({ endpoint: e.endpoint || c.endpoint })) } }
    },
    connected: {
      entry: 'startHealthCheckTimer',
      exit: 'stopHealthCheckTimer',
      initial: 'idle',
      states: {
        idle: {
          on: {
            MAKE_REQUEST: { target: 'requesting' },
            HEALTH_CHECK: { target: 'healthChecking' },
            DISCONNECT: { target: '#goMicroservice.disconnected' }
          }
        },
        requesting: {
          invoke: {
            id: 'doRequest',
            src: fromPromise(async ({ input }) => {
              const { request, endpoint } = input as { request: GoServiceRequest; endpoint: string };
              if (!request) throw new Error('No request provided');
              const start = Date.now();
              const res = await fetch(`${endpoint}${request.path}`, {
                method: request.method,
                headers: { 'Content-Type': 'application/json', ...(request.headers || {}) },
                body: request.body ? JSON.stringify(request.body) : undefined
              } as RequestInit);
              if (!res.ok) throw new Error(`Request failed: ${res.status}`);
              const data = await res.json().catch(() => ({}));
              return { status: res.status, data, headers: Object.fromEntries(res.headers.entries()), duration: Date.now() - start } as GoServiceResponse;
            }),
            // Map MAKE_REQUEST event payload + current endpoint into promise input
            input: ({ event, context }: any) => event.type === 'MAKE_REQUEST'
              ? { request: event.request, endpoint: context.endpoint }
              : { endpoint: context.endpoint }
          },
          on: {
            'done.invoke.doRequest': {
              target: 'idle',
              actions: assign((_, e: any) => ({ response: e.output, retryCount: 0 }))
            },
            'error.invoke.doRequest': {
              target: 'idle',
              actions: assign((c: any, e: any) => ({ error: e.error?.message, retryCount: (c.retryCount ?? 0) + 1 }))
            }
          }
        },
        healthChecking: {
          invoke: {
            id: 'periodicHealth',
            src: fromPromise(async ({ input }) => {
              const { endpoint } = input as { endpoint: string };
              const start = Date.now();
              const res = await fetch(`${endpoint}/health`);
              if (!res.ok) throw new Error('health check failed');
              await res.json().catch(() => ({}));
              return { responseTime: Date.now() - start } as HealthResult;
            }),
            input: ({ context }: any) => ({ endpoint: context.endpoint })
          },
          on: {
            'done.invoke.periodicHealth': {
              target: 'idle',
              actions: assign((_, e: any) => ({
                healthCheck: { lastCheck: Date.now(), status: 'healthy' as 'healthy', responseTime: e.output.responseTime }
              }))
            },
            'error.invoke.periodicHealth': {
              target: 'idle',
              actions: assign(() => ({ healthCheck: { lastCheck: Date.now(), status: 'unhealthy' as 'unhealthy' } }))
            }
          }
        }
      }
    },
    error: {
      after: { 4000: { target: 'connecting' } },
      on: { CONNECT: { target: 'connecting' }, DISCONNECT: { target: 'disconnected' } }
    }
  }
}, {
  actions: {
    startHealthCheckTimer: () => { },
    stopHealthCheckTimer: () => { }
  }
});

// Service helpers turned into simple event factory functions
export const goMicroserviceServices = {
  parseJSON: (data: any, options?: { parallel?: boolean; chunkSize?: number }) => ({
    type: 'MAKE_REQUEST' as const,
    request: {
      method: 'POST' as const,
      path: '/parse',
      body: {
        data,
        format: 'json',
        options: {
          parallel: options?.parallel ?? false,
          chunk_size: options?.chunkSize ?? 1024,
          compression: true
        }
      }
    }
  }),
  trainSOM: (vectors: number[][], labels: string[], options?: { width?: number; height?: number; iterations?: number; learningRate?: number }) => ({
    type: 'MAKE_REQUEST' as const,
    request: {
      method: 'POST' as const,
      path: '/train-som',
      body: {
        vectors,
        labels,
        dimensions: { width: options?.width ?? 10, height: options?.height ?? 10 },
        iterations: options?.iterations ?? 1000,
        learning_rate: options?.learningRate ?? 0.1
      }
    }
  }),
  cudaInfer: (model: string, input: any, options?: { batchSize?: number; precision?: 'fp32' | 'fp16' | 'int8'; streaming?: boolean }) => ({
    type: 'MAKE_REQUEST' as const,
    request: {
      method: 'POST' as const,
      path: '/cuda-infer',
      body: {
        model,
        input,
        batch_size: options?.batchSize ?? 1,
        precision: options?.precision ?? 'fp32',
        streaming: options?.streaming ?? false
      }
    }
  }),
  getMetrics: () => ({
    type: 'MAKE_REQUEST' as const,
    request: { method: 'GET' as const, path: '/metrics' }
  }),
  healthCheck: () => ({ type: 'HEALTH_CHECK' as const })
};

// Simple selectors
export const isServiceReady = (state: any) => state.matches('connected.idle') && state.context.healthCheck.status === 'healthy';
export const getLastResponse = (state: any): GoServiceResponse | undefined => state.context.response;
export const getConnectionStatus = (state: any) => ({
  status: state.context.connectionStatus,
  endpoint: state.context.endpoint,
  lastHealthCheck: state.context.healthCheck.lastCheck,
  healthStatus: state.context.healthCheck.status,
  responseTime: state.context.healthCheck.responseTime,
  error: state.context.error
});
