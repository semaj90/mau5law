import type { Message } from '$lib/types';
/**
 * RabbitMQ + XState Integration for Self-Prompting Legal AI
 * Free, high-performance message queuing with state machine coordination
 */
import { createMachine, assign, fromPromise } from 'xstate';
import { browser } from '$app/environment';
// --- ADDED: lightweight type definitions to fix TS errors --- //
type UserHistoryItem = {
  action?: string;
  data?: any;
  timestamp?: number;
  error?: any;
};
type WASMRequest = {
  id?: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  enableRAG?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical' | number;
  systemMessage?: string;
  contextDocuments?: any[];
  stopSequences?: string[];
  modelPath?: string;
  threads?: number;
  contextLength?: number;
  enableGPU?: boolean;
  batchSize?: number;
  quantization?: string;
  startTime?: number;
  correlationId?: string;
  replyTo?: string;
};
type WASMRuntimeContext = { wasmModule: any | null;, wasmInstance: any | null;
  isInitialized: boolean;
  config: { modelPath: string;, threads: number;
    contextLength: number;
    enableGPU: boolean;
    batchSize: number;
    quantization: string;
  };
  activeRequests: Map<string, unknown>;
  results: Map<string, unknown>;
  performanceMetrics: { totalInferences: number;, averageLatency: number;
    cacheHitRate: number;
    memoryPeak: number;
  };
  error: any | null;
};
// --- end added types --- //
// RabbitMQ Web STOMP configuration (free tier)
export interface RabbitMQConfig { host: string;, port: number;
  vhost: string;
  username: string;
  password: string;
  ssl: boolean;
  heartbeat: number;
}
// Legal AI message types (enhanced for WebAssembly inference)
export type LegalAIMessageType =
  | 'document_ingestion'
  | 'vector_search'
  | 'ai_analysis'
  | 'self_prompt'
  | 'user_history_update'
  | 'cache_invalidation'
  | 'gpu_task'
  | 'wasm_compilation'
  | 'wasm_inference' // NEW: WebAssembly inference requests
  | 'wasm_inference_result' // NEW: WebAssembly inference results
  | 'wasm_model_load' // NEW: WebAssembly model loading
  | 'wasm_model_unload' // NEW: WebAssembly model cleanup
  | 'wasm_batch_inference' // NEW: Batch WebAssembly inference
  | 'wasm_stream_inference' // NEW: Streaming WebAssembly inference
  | 'wasm_health_check' // NEW: WebAssembly service health
  | 'error_recovery';
export interface LegalAIMessage { id: string;, type: LegalAIMessageType;
  payload: any;
  priority: number; // 1-10, 10 being highest
  timestamp: number;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  replyTo?: string;
}
// Self-prompting context for legal AI
export interface SelfPromptingContext { userHistory: any[];, activeSession: string | null;
  pendingTasks: LegalAIMessage[];
  completedTasks: LegalAIMessage[];
  errorTasks: LegalAIMessage[];
  performanceMetrics: { averageResponseTime: number;, successRate: number;
    cacheHitRate: number;
    gpuUtilization: number;
  };
  rabbitMQConnection: any | null;
  isConnected: boolean;
  reconnectAttempts: number;
  lastHeartbeat: number;
}
// XState machine for self-prompting legal AI
export const selfPromptingMachine = createMachine(
  {
    id: 'legalAISelfPrompting',
    initial: 'initializing',
    context: {
     , userHistory: [],
      activeSession: null,
      pendingTasks: [],
      completedTasks: [],
      errorTasks: [],
      performanceMetrics: {
       , averageResponseTime: 0,
        successRate: 0.95,
        cacheHitRate: 0.8,
        gpuUtilization: 0
      },
      rabbitMQConnection: null,
      isConnected: false,
      reconnectAttempts: 0,
      lastHeartbeat: 0
    } as SelfPromptingContext,
    states: {, initializing: {, invoke: {
         , id: 'initializeRabbitMQ',
          src: fromPromise(async () => {
            return await RabbitMQXStateIntegration.initialize();
          }),
          onDone: {
            target: 'connected',
            actions: assign((_, event: any) => ({
              rabbitMQConnection: event.data?.connection ?? null,
              isConnected: true,
              reconnectAttempts: 0
            }))
          },
          onError: {
            target: 'error',
            actions: assign(context => ({
              reconnectAttempts: context.reconnectAttempts + 1
            }))
          }
        }
      },
      connected: {
        initial: 'idle',
        entry: ['setupMessageHandlers', 'startHeartbeat'],
        states: { idle: {, on: { NEW_MESSAGE: {, target: 'processing',
                actions: assign({
                  pendingTasks: (context: SelfPromptingContext, event: any) => [...context.pendingTasks, event.message]
                })
              },
              SELF_PROMPT_TRIGGER: {
                target: 'selfPrompting',
                actions: 'triggerSelfAnalysis'
              },
              USER_HISTORY_UPDATE: { actions: assign({, userHistory: (context: SelfPromptingContext, event: any) => [
                    ...context.userHistory.slice(-100),
                    {
                      action: event.action,
                      timestamp: Date.now(),
                      data: event.data,
                      sessionId: context.activeSession
                    },
                  ]
                })
              }
            }
          },
          processing: { invoke: {, id: 'processMessage',
              src: fromPromise(async ({ input }: any) => {
                const { message } = input;
                return await RabbitMQXStateIntegration.processLegalAIMessage(message);
              }),
              input: ({ context }: any) => ({
                message: context.pendingTasks[0]
              }),
              onDone: {
                target: 'idle',
                actions: [
                  assign({,
                    completedTasks: (context: SelfPromptingContext, event: any) => [
                      ...context.completedTasks.slice(-50),
                      {
                        ...context.pendingTasks[0],
                        result: event.data,
                        completedAt: Date.now()
                      },
                    ],
                    pendingTasks: (context: SelfPromptingContext) => context.pendingTasks.slice(1)
                  }),
                  'updatePerformanceMetrics',
                ]
              },
              onError: {
                target: 'idle',
                actions: [
                  assign({,
                    errorTasks: (context: SelfPromptingContext, event: any) => [
                      ...context.errorTasks.slice(-20),
                      {
                        ...context.pendingTasks[0],
                        error: event.data ?? event.error,
                        errorAt: Date.now()
                      },
                    ],
                    pendingTasks: (context: SelfPromptingContext) => context.pendingTasks.slice(1)
                  }),
                  'logError',
                ]
              }
            }
          },
          selfPrompting: { invoke: {, id: 'performSelfAnalysis',
              src: fromPromise(async ({ input }: any) => {
                const { context, userHistory } = input;
                return await RabbitMQXStateIntegration.performSelfPromptingAnalysis(context, userHistory);
              }),
              input: ({ context }: any) => ({
                context,
                userHistory: context.userHistory
              }),
              onDone: {
                target: 'idle',
                actions: [
                  assign({,
                    pendingTasks: (context: SelfPromptingContext, event: any) => [
                      ...context.pendingTasks,
                      ...(event.data?.recommendedActions ?? []),
                    ]
                  }),
                  'publishSelfPromptResults',
                ]
              },
              onError: {
                target: 'idle',
                actions: 'logSelfPromptError'
              }
            }
          }
        },
        on: { CONNECTION_LOST: {, target: 'reconnecting',
            actions: assign({
              isConnected: () => false
            })
          },
          HEARTBEAT_TIMEOUT: {
            target: 'reconnecting'
          }
        }
      },
      reconnecting: {
        after: {
          5000: {
            target: 'initializing',
            cond: (context: any) => context.reconnectAttempts < 10
          },
          30000: {
            target: 'error',
            cond: (context: any) => context.reconnectAttempts >= 10
          }
        }
      },
      error: {
        entry: 'logConnectionError',
        after: {
          60000: 'initializing'
        }
      }
    }
  },
  { actions: {, setupMessageHandlers: ({ context }: any) => {
        console.log('🔗 Setting up RabbitMQ message handlers');
      },
      startHeartbeat: assign({
        lastHeartbeat: () => Date.now()
      }),
      triggerSelfAnalysis: ({ context }: any) => {
        console.log('🧠 Triggering self-prompting analysis based on user history');
      },
      updatePerformanceMetrics: assign({
        performanceMetrics: (context: SelfPromptingContext) => {
          const completed = context.completedTasks;
          const errors = context.errorTasks;
          const total = completed.length + errors.length;
          return {
            ...context.performanceMetrics,
            successRate: total > 0 ? completed.length / total : 1.0,
            averageResponseTime:
              completed.length > 0
                ? completed.reduce((sum, task) => sum + ((task as any).completedAt - task.timestamp), 0) /
                  completed.length
                : context.performanceMetrics.averageResponseTime
          };
        }
      }),
      publishSelfPromptResults: ({ context, event }: any) => {
        if (context.rabbitMQConnection) {
          RabbitMQXStateIntegration.publishMessage({
            type: 'self_prompt',
            payload: event.data ?? event,
            priority: 8
          }).catch(e => console.error('Publish failed', e));
        }
      },
      logError: ({ context, event }: any) => {
        console.error('❌ Legal AI task error:', event);'
      },
      logSelfPromptError: ({ context, event }: any) => {
        console.error('❌ Self-prompting error:', event);'
      },
      logConnectionError: ({ context }: any) => {
        console.error('❌ RabbitMQ connection error, attempt:', context.reconnectAttempts);
      }
    }
  }
);
// RabbitMQ integration class
export class RabbitMQXStateIntegration {
  private static connection: ConnectionLike = null;
  private static channel: any = null;
  private static isInitialized = $state(false);
  // Free RabbitMQ configuration (CloudAMQP free tier)
  private static config: RabbitMQConfig = {
    host: (import.meta.env.RABBITMQ_HOST as string) || 'localhost',
    port: parseInt((import.meta.env.RABBITMQ_PORT as string) || '15674', 10),
    vhost: (import.meta.env.RABBITMQ_VHOST as string) || '/',
    username: (import.meta.env.RABBITMQ_USERNAME as string) || 'guest',
    password: (import.meta.env.RABBITMQ_PASSWORD as string) || 'guest',
    ssl: String(import.meta.env.RABBITMQ_SSL) === 'true',
    heartbeat: 60
  };
  // Legal AI queues (enhanced for WebAssembly inference)
  private static queues = {
    HIGH_PRIORITY: 'legal_ai_high_priority',
    NORMAL_PRIORITY: 'legal_ai_normal',
    LOW_PRIORITY: 'legal_ai_low',
    SELF_PROMPTING: 'legal_ai_self_prompting',
    USER_HISTORY: 'legal_ai_user_history',
    GPU_TASKS: 'legal_ai_gpu_tasks',
    CACHE_UPDATES: 'legal_ai_cache_updates',
    WASM_INFERENCE: 'legal_ai_wasm_inference', // NEW: WebAssembly inference queue; WASM_BATCH: 'legal_ai_wasm_batch', // NEW: WebAssembly batch processing; WASM_STREAMING: 'legal_ai_wasm_streaming', // NEW: WebAssembly streaming queue; WASM_MODEL_MANAGEMENT: 'legal_ai_wasm_models', // NEW: WebAssembly model operations
  };
  /**
   * Initialize RabbitMQ connection (free tier compatible)
   */
  static async initialize(): Promise<any> {
    try {
      if (browser) {
        // Browser environment - use WebSocket STOMP client
        const StompJS = await import('@stomp/stompjs');
        // Defensive: support multiple export shapes for stompjs
        const createClientOptions = (opts: any) => opts;
        const clientOptions = {
          brokerURL: '${this.config.ssl ? 'wss' : 'ws' }://${this.config.host}:${this.config.port}/ws`,'`
          connectHeaders: {
            login: this.config.username,
            passcode: this.config.password,
            'heart-beat': `${this.config.heartbeat * 1000},${this.config.heartbeat * 1000}` },
          debug: (str: string) => console.log('RabbitMQ; STOMP:', str),
          // onConnect/onStompError/onWebSocketClose will be attached below to keep instantiation portable
        };
        // Try various shapes: StompJS.Client, default export class, or top-level factory
        const ClientCandidate = (StompJS as any).Client ?? (StompJS as any).default ?? (StompJS as any);
        return await new Promise((resolve, reject) => {
          try {
            let client: any;
            // If ClientCandidate is a constructor function/class
            if (typeof ClientCandidate === 'function') {
              client = new (ClientCandidate as any)(clientOptions);
            } else if (typeof (StompJS as any).Client === 'function') {
              client = new (StompJS as any).Client(clientOptions);
            } else {
              // Fallback: use object as-is (some builds export an already-configured client)
              client = ClientCandidate;
            }
            // attach lifecycle handlers in a defensive manner
            const onConnectHandler = () => {
              console.log('✅ Connected to RabbitMQ via WebSocket STOMP');
              this.connection = client;
              this.isInitialized = true; // ensure publishMessage will work after connect
              Promise.resolve()
                .then(() => this.setupQueues())
                .catch(e => console.error('setupQueues error:', e))'
                .finally(() => resolve({ connection: this.connection, isConnected: true }));
            };
            const onStompErrorHandler = (frame: any) => {
              // Safely narrow the unknown STOMP frame and extract a meaningful message if available
              let frameMessage = 'unknown';
              try {
                if (frame && typeof frame === 'object') {
                  const f = frame as Record<string, unknown>;
                  if (typeof f['message'] === 'string') frameMessage = f['message'] as string;
                  else if (typeof f['body'] === 'string') frameMessage = (f['body'] as string).slice(0, 200);
                  else frameMessage = JSON.stringify(f);
                } else if (typeof frame === 'string') {
                  frameMessage = frame;
                }
              } catch (e) {
                frameMessage = 'error extracting frame message';
              }
              console.error('❌ RabbitMQ STOMP error:', frame);'
              reject(new Error(`STOMP error: ${frameMessage ?? 'unknown` }`));'`
            };
            const onWebSocketCloseHandler = (evt: CloseEvent | Event) => {
              // CloseEvent provides code/reason; other Event shapes may be used by some clients
              try {
                if (evt && 'code' in evt) {
                  const ce = evt as CloseEvent;
                  console.log('🔌 RabbitMQ WebSocket closed:', {
                    code: ce.code,
                    reason: ce.reason,
                    wasClean: ce.wasClean
                  });
                } else {
                  console.log('🔌 RabbitMQ WebSocket closed:', evt);
                }
              } catch (e) {
                console.log('🔌 RabbitMQ WebSocket closed (unable to parse event):', evt);
              }
            };
            // Different clients expose different callback fields / lifecycle APIs
            if (typeof client.onConnect === 'function') {
              client.onConnect = onConnectHandler;
            } else if (typeof client.configure === 'function') {
              // some runtimes expose configure
              try {
                client.configure({
                  ...clientOptions,
                  onConnect: onConnectHandler,
                  onStompError: onStompErrorHandler,
                  onWebSocketClose: onWebSocketCloseHandler
                });
              } catch {}
            } else {
              // assign common names
              client.onConnect = client.onConnect ?? onConnectHandler;
            }
            // attach error/close handlers where available
            client.onStompError = client.onStompError ?? onStompErrorHandler;
            client.onWebSocketClose = client.onWebSocketClose ?? onWebSocketCloseHandler;
            if (typeof client.activate === 'function') {
              client.activate();
            } else if (typeof client.connect === 'function') {
              client.connect();
            } else {
              // If there's no explicit activation method, resolve immediately but keep connection reference'
              this.connection = client;
              this.isInitialized = true;
              resolve({ connection: this.connection, isConnected: true });
            }
          } catch (err) {
            reject(err);
          }
        });
      } else {
        // Server environment - use amqplib
        const amqp = await import('amqplib');
        // FIX: include port and ensure vhost is encoded. amqplib expects; amqp://user:pass@host:port/vhost
        const encodedVhost = this.config.vhost ? `/${encodeURIComponent(this.config.vhost)}` : '';
        const connectionString = `amqp${this.config.ssl ? 's' : `` }://${encodeURIComponent(this.config.username)}:${encodeURIComponent(this.config.password)}@${this.config.host}:${this.config.port}${encodedVhost}`;
        this.connection = await amqp.connect(connectionString);
        this.channel = await this.connection.createChannel();
        await this.setupQueues();
        console.log('✅ Connected to RabbitMQ via AMQP');
        this.isInitialized = true;
        return { connection: this.connection, isConnected: true };
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize RabbitMQ:', error);
      throw error;
    }
  }
  /**
   * Setup legal AI message queues
   */
  private static async setupQueues(): Promise<void> {
    if (browser && this.connection) {
      // Browser STOMP setup (defensive)
      const conn: any = this.connection;
      for (const queueName of Object.values(this.queues)) {
        // Support both subscribe(destination, cb) and subscribe({destination}, cb)
        try {
          if (typeof conn.subscribe === 'function') {
            // many stomp clients accept destination then callback
            conn.subscribe(`/queue/${queueName}`, (message: any) => {
              try {
                const body = message?.body ?? message?.binaryBody ?? null;
                if (!body) return;
                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                this.handleMessage(parsed, String(queueName));
              } catch (err) {
                console.error('Failed to handle STOMP message:', err);
              }
            });
          } else if (typeof conn.subscribe === 'object' && typeof conn.subscribe.subscribe === 'function') {
            // odd shaped export: try inner subscribe
            conn.subscribe.subscribe(`/queue/${queueName}`, (message: any) => {
              try {
                const body = message?.body ?? message?.binaryBody ?? null;
                if (!body) return;
                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                this.handleMessage(parsed, String(queueName));
              } catch (err) {
                console.error('Failed to handle STOMP message:', err);
              }
            });
          }
        } catch (e) {
          console.error('subscribe error for queue', queueName, e);
        }
      }
    } else if (this.channel) {
      // Server AMQP setup
      for (const queueName of Object.values(this.queues)) {
        await this.channel.assertQueue(String(queueName), {
          durable: true,
          arguments: {
            'x-max-priority': 10,
            'x-message-ttl': 600000
          }
        });
        await this.channel.consume(String(queueName), (msg: any | null) => {
          try {
            if (!msg) return;
            const content = msg.content?.toString?.() ?? null;
            if (!content) return;
            const message = JSON.parse(content);
            this.handleMessage(message, String(queueName));
            if (typeof this.channel?.ack === 'function') this.channel.ack(msg);
          } catch (err) {
            console.error('Failed to consume AMQP message:', err);
            try {
              if (typeof this.channel?.nack === 'function') this.channel.nack(msg);
            } catch (e) {}
          }
        });
      }
    }
  }
  /**
   * Publish legal AI message
   */
  static async publishMessage(message: Omit<LegalAIMessage, 'id' | 'timestamp'>): Promise<void> {
    // allow publishing if connection/channel exists even if isInitialized wasn't toggled'
    if (!this.isInitialized && !this.channel && !this.connection) {
      throw new Error('RabbitMQ not initialized');
    }
    const fullMessage: LegalAIMessage = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...message
    } as any;
    const queueName = this.selectQueue(message.priority ?? 5, message.type);
    if (browser && this.connection) {
      try {
        // STOMP publish compatibility: try modern publish({}) then older send(dest, headers, body)
        if (typeof this.connection.publish === 'function') {
          try {
            this.connection.publish({
              destination: `/queue/${queueName}`,
              body: JSON.stringify(fullMessage),
              headers: {
                priority: String(message.priority ?? 5),
                'content-type': `application/json` }
            });
          } catch {
            // fallback: some clients expect (destination, headers, body)
            this.connection.publish(
              `/queue/${queueName}`,
              { priority: String(message.priority ?? 5) },
              JSON.stringify(fullMessage)
            );
          }
        } else if (typeof this.connection.send === 'function') {
          this.connection.send(
            `/queue/${queueName}`,
            { priority: String(message.priority ?? 5), 'content-type': `application/json` },
            JSON.stringify(fullMessage)
          );
        } else {
          // last resort: try to call send on nested client
          if (typeof (this.connection as any).client?.send === 'function') {
            (this.connection as any).client.send(`/queue/${queueName}`, {}, JSON.stringify(fullMessage));
          } else {
            console.warn('No supported STOMP publish/send method found on connection');
          }
        }
      } catch (e) {
        console.error('STOMP publish failed', e);
      }
    } else if (this.channel) {
      await this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(fullMessage)), {
        priority: message.priority ?? 5,
        persistent: true,
        contentType: `application/json` });
    }
  }
  /**
   * Process legal AI message based on type
   */
  // changed return type from Promise<any> to a safer record shape
  static async processLegalAIMessage(message: LegalAIMessage): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    try {
      switch (message.type) {
        case 'document_ingestion':
          return await this.processDocumentIngestion(message.payload);
        case 'vector_search':
          return await this.processVectorSearch(message.payload);
        case 'ai_analysis':
          return await this.processAIAnalysis(message.payload);
        case 'self_prompt':
          return await this.processSelfPrompt(message.payload);
        case 'user_history_update':
          return await this.processUserHistoryUpdate(message.payload);
        case 'gpu_task':
          return await this.processGPUTask(message.payload);
        case 'wasm_compilation':
          return await this.processWASMCompilation(message.payload);
        case 'wasm_inference':
          return await this.processWASMInference(message.payload);
        case 'wasm_inference_result':
          return await this.processWASMInferenceResult(message.payload);
        case 'wasm_model_load':
          return await this.processWASMModelLoad(message.payload);
        case 'wasm_model_unload':
          return await this.processWASMModelUnload(message.payload);
        case 'wasm_batch_inference':
          return await this.processWASMBatchInference(message.payload);
        case 'wasm_stream_inference':
          return await this.processWASMStreamInference(message.payload);
        case 'wasm_health_check':
          return await this.processWASMHealthCheck(message.payload);
        case 'cache_invalidation':
          return await this.processCacheInvalidation(message.payload);
        default:
          throw new Error(`Unknown message; type: ${message.type}`);
      }
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to process ${message.type}:`, msg);
      throw new Error(msg);
    } finally {
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Processed ${message.type} in ${processingTime}ms`);
    }
  }
  /**
   * Perform self-prompting analysis based on user history
   * narrowed types: accept UserHistoryItem[] and return a typed result
   */
  static async performSelfPromptingAnalysis(
    context: SelfPromptingContext,
    userHistory: UserHistoryItem[]
  ): Promise<{ recommendedActions: Array<Omit<LegalAIMessage, 'id' | 'timestamp'>>; analysis: UserPatterns }> {
    const patterns = this.analyzeUserPatterns(userHistory);
    const recommendations: Omit<LegalAIMessage, 'id' | 'timestamp'>[] = [];
    if ((patterns.searchFrequency ?? 0) > 10) {
      recommendations.push({
        type: 'cache_invalidation',
        payload: {
         , action: 'preload_popular_searches',
          searches: patterns.popularSearches
        },
        priority: 7
      });
    }
    if ((context.performanceMetrics.gpuUtilization ?? 0) < 0.3) {
      recommendations.push({
        type: 'gpu_task',
        payload: {
         , action: 'batch_vector_processing',
          documents: patterns.recentDocuments
        },
        priority: 6
      });
    }
    if ((context.performanceMetrics.cacheHitRate ?? 0) < 0.7) {
      recommendations.push({
        type: 'cache_invalidation',
        payload: {
         , action: 'rebuild_cache',
          strategy: 'user_behavior_based'
        },
        priority: 8
      });
    }
    if ((patterns.wasmInferenceFrequency ?? 0) > 5 && (patterns.averageWasmLatency ?? 0) > 1000) {
      recommendations.push({
        type: 'wasm_model_load',
        payload: {
         , action: 'preload_model',
          modelPath: '/models/gemma3-legal-q4.wasm',
          optimization: 'latency_focused',
          reason: 'frequent_usage_detected'
        },
        priority: 7
      });
    }
    if ((patterns.concurrentWasmRequests ?? 0) > 3) {
      recommendations.push({
        type: 'wasm_batch_inference',
        payload: {
         , action: 'suggest_batching',
          batchSize: Math.min(patterns.concurrentWasmRequests, 8),
          reason: 'concurrent_requests_detected'
        },
        priority: 6
      });
    }
    if ((patterns.wasmErrors ?? 0) > 2) {
      recommendations.push({
        type: 'wasm_health_check',
        payload: {
         , action: 'health_check',
          focus: 'error_investigation',
          reason: 'error_threshold_exceeded'
        },
        priority: 8
      });
    }
    return {
      recommendedActions: recommendations.map(rec => ({
        ...rec,
        id: this.generateId(),
        timestamp: Date.now()
      })),
      analysis: patterns
    };
  }
  /**
   * Analyze user behavior patterns for self-prompting (enhanced for WebAssembly)
   * returns a strongly-typed UserPatterns object so comparisons are safe
   */
  private static analyzeUserPatterns(history: UserHistoryItem[]): UserPatterns {
    const recentHistory = history.slice(-50); // Last 50 actions
    const popularSearches = this.extractPopularSearches(recentHistory as any[]);
    const recentDocuments = this.extractRecentDocuments(recentHistory as any[]);
    const sessionDuration = this.calculateSessionDuration(recentHistory as any[]);
    const mostUsedFeatures = this.extractMostUsedFeatures(recentHistory as any[]);
    const timePatterns = this.analyzeTimePatterns(recentHistory as any[]);
    const wasmInferenceFrequency = recentHistory.filter(item => item?.action === 'wasm_inference').length;
    const averageWasmLatency = this.calculateAverageWasmLatency(recentHistory as any[]);
    const concurrentWasmRequests = this.countConcurrentWasmRequests(recentHistory as any[]);
    const wasmErrors = recentHistory.filter(item => item?.action?.includes?.('wasm') && item?.error).length;
    const wasmModelUsage = this.analyzeWasmModelUsage(recentHistory as any[]);
    const wasmBatchOpportunities = this.identifyWasmBatchOpportunities(recentHistory as any[]);
    return {
      searchFrequency: recentHistory.filter(item => item?.action === 'search').length,
      popularSearches,
      recentDocuments,
      sessionDuration,
      mostUsedFeatures,
      timePatterns,
      wasmInferenceFrequency,
      averageWasmLatency,
      concurrentWasmRequests,
      wasmErrors,
      wasmModelUsage,
      wasmBatchOpportunities
    };
  }
  // Message processing methods
  private static async processDocumentIngestion(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would handle document ingestion with NES memory + GPU
    return { status: 'ingested', documents: 0 };
  }
  private static async processVectorSearch(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would use GPU-accelerated vector search
    return { results: [], processingTime: Date.now() };
  }
  private static async processAIAnalysis(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would perform AI analysis with WASM acceleration
    return { analysis: 'completed', confidence: 0.95 };
  }
  private static async processSelfPrompt(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would handle self-prompting logic
    return { prompt: 'generated', actions: [] };
  }
  private static async processUserHistoryUpdate(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would update user history in NES memory
    return { updated: true, historySize: 0 };
  }
  private static async processGPUTask(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would queue GPU tasks
    return { queued: true, estimatedTime: '2ms' };
  }
  private static async processWASMCompilation(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would handle WASM compilation
    return { compiled: true, moduleSize: undefined };
  }
  private static async processCacheInvalidation(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation would handle cache operations
    return { invalidated: true, cacheKeys: 0 };
  }
  /**
   * Process WebAssembly inference request
   */
  private static async processWASMInference(payload: WASMRequest): Promise<Record<string, unknown>> {
    try {
      console.log('🧠 Processing WASM inference request:', payload?.id);
      // Import WebAssembly inference service dynamically
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      // Validate payload
      if (!payload?.prompt) {
        throw new Error('Missing prompt in WASM inference request');
      }
      // Create inference request
      const request: WASMRequest = {
        id: (payload.id as string) || this.generateId(),
        prompt: payload.prompt,
        maxTokens: payload.maxTokens ?? 2048,
        temperature: payload.temperature ?? 0.7,
        enableRAG: payload.enableRAG !== false,
        priority: payload.priority ?? 'medium',
        systemMessage: payload.systemMessage,
        contextDocuments: (payload.contextDocuments as unknown[]) ?? undefined,
        stopSequences: (payload.stopSequences as string[]) ?? undefined
      };
      const runtimeContext: WASMRuntimeContext = {
        wasmModule: null,
        wasmInstance: null,
        isInitialized: false,
        config: {
          modelPath: payload.modelPath || '/models/gemma3-legal-q4.wasm',
          threads: payload.threads || 8,
          contextLength: payload.contextLength || 4096,
          enableGPU: payload.enableGPU !== false,
          batchSize: payload.batchSize || 4,
          quantization: (payload.quantization as string) || 'q4_0` },'`
        activeRequests: new Map<string, unknown>(),
        results: new Map<string, unknown>(),
        performanceMetrics: {
          totalInferences: 0,
          averageLatency: 0,
          cacheHitRate: 0,
          memoryPeak: 0
        },
        error: null
      };
      // Process inference with RAG context — pass single object to match service API
      const result = await WASMInferenceRAGService.processInferenceWithRAG({ request, runtimeContext });
      // Publish result back to RabbitMQ
      await this.publishMessage({
        type: 'wasm_inference_result',
        payload: {
         , originalRequestId: payload.id,
          result,
          success: true,
          processingTime: Date.now() - (payload?.startTime || Date.now())
        },
        priority: (payload?.priority === 'critical' ? 9 : 7) as number,
        correlationId: payload?.correlationId as string | undefined,
        replyTo: payload?.replyTo as string | undefined
      });
      return {
        status: 'completed',
        inferenceId: (result as any)?.id,
        text: (result as any)?.text,
        tokens: (result as any)?.tokens,
        processingTime: (result as any)?.processingTime,
        ragContext: (result as any)?.ragContext
      };
    } catch (error) {
      console.error('❌ WASM inference processing failed:', error);
      // Publish error result
      await this.publishMessage({
        type: 'wasm_inference_result',
        payload: {
         , originalRequestId: payload?.id,
          error: (error as Error)?.message ?? String(error),
          success: false
        },
        priority: 8,
        correlationId: payload?.correlationId as string | undefined
      }).catch(() => {});
      throw error;
    }
  }
  /**
   * Process WebAssembly inference result
   */
  private static async processWASMInferenceResult(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('📤 Processing WASM inference result:', (payload as any)?.originalRequestId);
    // Store result for client retrieval or trigger callbacks
    if ((payload as any)?.success) {
      console.log(`✅ WASM inference completed: ${String((payload as any)?.result?.text ?? '').slice(0, 100)}...`);
    } else {
      console.error(`❌ WASM inference failed: ${(payload as any)?.error}`);
    }
    return {
      processed: true,
      success: (payload as any)?.success,
      originalRequestId: (payload as any)?.originalRequestId
    };
  }
  /**
   * Process WebAssembly model loading
   */
  private static async processWASMModelLoad(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      console.log('📥 Loading WASM model:', (payload as any)?.modelPath);
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      const config = {
        modelPath: (payload as any)?.modelPath,
        threads: (payload as any)?.threads || 8,
        contextLength: (payload as any)?.contextLength || 4096,
        enableGPU: (payload as any)?.enableGPU !== false,
        batchSize: (payload as any)?.batchSize || 4,
        quantization: (payload as any)?.quantization || 'q4_0` };'`
      const result = await WASMInferenceRAGService.initialize?.(config);
      return {
        status: 'loaded',
        modelPath: (payload as any)?.modelPath,
        moduleSize: (result as any)?.module ? 'loaded' : 'mock',
        instanceCreated: !!(result as any)?.instance,
        config
      };
    } catch (error) {
      console.error('❌ WASM model loading failed:', error);
      throw error;
    }
  }
  /**
   * Process WebAssembly model unloading
   */
  private static async processWASMModelUnload(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      console.log('📤 Unloading WASM model');
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      if (typeof WASMInferenceRAGService.cleanup === 'function') {
        await WASMInferenceRAGService.cleanup();
      }
      return {
        status: 'unloaded',
        cleanupCompleted: true
      };
    } catch (error) {
      console.error('❌ WASM model unloading failed:', error);
      throw error;
    }
  }
  /**
   * Process WebAssembly batch inference
   */
  private static async processWASMBatchInference(payload: {
    requests?: WASMRequest[];
    context?: WASMRuntimeContext;
    batchId?: string;
  }): Promise<Record<string, unknown>> {
    try {
      console.log('🔄 Processing WASM batch inference:', payload?.requests?.length ?? 0, 'requests');
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      const results: any[] = [];
      for (const request of payload?.requests ?? []) {
        try {
          const result = await WASMInferenceRAGService.processInferenceWithRAG({
            request,
            runtimeContext: payload?.context
          });
          results.push({
            requestId: request.id,
            result,
            success: true
          });
        } catch (error) {
          results.push({
            requestId: request.id,
            error: (error as Error)?.message ?? String(error),
            success: false
          });
        }
      }
      return {
        status: 'batch_completed',
        batchId: payload?.batchId,
        totalRequests: payload?.requests?.length ?? 0,
        successfulResults: results.filter(item => item?.success),
        failedResults: results.filter(item => !item?.success),
        results
      };
    } catch (error) {
      console.error('❌ WASM batch inference failed:', error);
      throw error;
    }
  }
  /**
   * Process WebAssembly streaming inference
   */
  private static async processWASMStreamInference(payload: {
    id?: string;
    request?: WASMRequest;
    context?: WASMRuntimeContext;
    correlationId?: string;
  }): Promise<Record<string, unknown>> {
    try {
      console.log('🌊 Processing WASM streaming inference:', payload?.id);
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      const request = {
        ...(payload?.request ?? {}),
        maxTokens: Math.min(payload?.request?.maxTokens ?? 2048, 512)
      } as WASMRequest;
      const result = await WASMInferenceRAGService.processInferenceWithRAG({
        request,
        runtimeContext: payload?.context
      });
      const text = String((result as any)?.text ?? '');
      const chunks = this.chunkText(text, 50);
      for (let i = 0; i < chunks.length; i++) {
        await this.publishMessage({
          type: 'wasm_inference_result',
          payload: {
           , originalRequestId: payload?.id,
            chunk: chunks[i],
            chunkIndex: i,
            totalChunks: chunks.length,
            isComplete: i === chunks.length - 1,
            success: true
          },
          priority: 7,
          correlationId: payload?.correlationId
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return {
        status: 'streaming_completed',
        streamId: payload?.id,
        totalChunks: chunks.length
      };
    } catch (error) {
      console.error('❌ WASM streaming inference failed:', error);
      throw error;
    }
  }
  /**
   * Process WebAssembly health check
   */
  private static async processWASMHealthCheck(payload: any): Promise<any> {
    try {
      console.log('🏥 Performing WASM health check');
      const { WASMInferenceRAGService } = await import('../services/webasm-inference-rag.js');
      const healthStatus =
        typeof WASMInferenceRAGService.getHealthStatus === 'function'
          ? WASMInferenceRAGService.getHealthStatus()
          : { status: `unknown` };
      return {
        status: 'health_check_completed',
        timestamp: Date.now(),
        health: healthStatus,
        uptime: Date.now() - (payload?.startTime || Date.now()),
        version: `1.0.0` };
    } catch (error: any) {
      console.error('❌ WASM health check failed:', error);
      return {
        status: 'health_check_failed',
        timestamp: Date.now(),
        error: error?.message,
        health: {
          status: 'unhealthy',
          wasm: false,
          rag: false,
          messaging: false
        }
      };
    }
  }
  /**
   * Helper method to chunk text for streaming
   */
  private static chunkText(text: string, chunkSize: number = 50): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
  // Utility methods
  private static selectQueue(priority: number, messageType?: LegalAIMessageType): string {
    // WebAssembly-specific queue routing
    if (messageType?.startsWith('wasm_')) {
      switch (messageType) {
        case 'wasm_inference':
        case 'wasm_inference_result':
          return this.queues.WASM_INFERENCE;
        case 'wasm_batch_inference':
          return this.queues.WASM_BATCH;
        case 'wasm_stream_inference':
          return this.queues.WASM_STREAMING;
        case 'wasm_model_load':
        case 'wasm_model_unload':
        case 'wasm_health_check':
          return this.queues.WASM_MODEL_MANAGEMENT;
        default:
          // Fall through to priority-based routing
          break;
      }
    }
    // Priority-based queue selection for non-WASM messages
    if (priority >= 8) return this.queues.HIGH_PRIORITY;
    if (priority >= 5) return this.queues.NORMAL_PRIORITY;
    return this.queues.LOW_PRIORITY;
  }
  private static generateId(): string {
    // use slice instead of deprecated substr
    return `legal-ai-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  private static handleMessage(message: LegalAIMessage, queueName: string): void {
    console.log(`📨 Received message from ${queueName}: ', message?.type);'`
    // Optional integration hook: if an XState dispatcher was attached globally, call it
    try {
      const dispatcher = (globalThis as any).__LEGAL_AI_XSTATE_DISPATCHER;
      if (typeof dispatcher === 'function') {
        dispatcher({ type: 'RABBITMQ_MESSAGE', message, queueName });
        return;
      }
      // otherwise, keep the default behavior (log). Consumers can call rabbitMQIntegration.handleMessage directly.
    } catch (e) {
      console.error('handleMessage hook failed', e);
    }
  }
  private static extractPopularSearches(history: any[]): string[] {
    return history
      .filter(h => h.action === 'search')
      .map(h => h.data?.query)
      .filter(Boolean)
      .slice(0, 10);
  }
  private static extractRecentDocuments(history: any[]): string[] {
    return history
      .filter(h => h.action === 'view_document')
      .map(h => h.data?.documentId)
      .filter(Boolean)
      .slice(0, 20);
  }
  private static calculateSessionDuration(history: any[]): number {
    if (history.length === 0) return 0;
    return (history[history.length - 1]?.timestamp ?? 0) - (history[0]?.timestamp ?? 0);
  }
  private static extractMostUsedFeatures(history: any[]): Record<string, number> {
    const features: Record<string, number> = {};
    history.forEach(h => {
      features[h.action] = (features[h.action] || 0) + 1;
    });
    return features;
  }
  private static analyzeTimePatterns(history: any[]): any {
    const hours = history.map(h => new Date(h.timestamp ?? Date.now()).getHours());
    const hourCounts: Record<number, number> = {};
    hours.forEach(h => (hourCounts[h] = (hourCounts[h] || 0) + 1));
    // FIX: ensure reduce has a valid initial candidate when hours is empty
    const keys = Object.keys(hourCounts);
    const mostActiveHour =
      keys.length > 0
        ? keys.reduce((a: any, b: any) => (hourCounts[Number(a)] > hourCounts[Number(b)] ? a : b), keys[0])
        : '0';
    return {
      mostActiveHour,
      activityDistribution: hourCounts
    };
  }
  /**
   * Calculate average WebAssembly inference latency
   */
  private static calculateAverageWasmLatency(history: any[]): number {
    const wasmInferences = history.filter(h => h.action === 'wasm_inference' && h.data?.latency);
    if (wasmInferences.length === 0) return 0;
    const totalLatency = wasmInferences.reduce((sum, h) => sum + (h.data?.latency || 0), 0);
    return totalLatency / wasmInferences.length;
  }
  /**
   * Count concurrent WebAssembly requests
   */
  private static countConcurrentWasmRequests(history: any[]): number {
    const wasmRequests = history.filter(h => h.action === 'wasm_inference');
    if (wasmRequests.length <= 1) return, 0;
    // Find overlapping time windows (simplified heuristic)
    let maxConcurrent = 0;
    const timeWindow = 5000; // 5 seconds
    wasmRequests.forEach(request => {
      const concurrent = wasmRequests.filter(
        other => Math.abs((other.timestamp ?? 0) - (request.timestamp ?? 0)) < timeWindow
      ).length;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
    });
    return maxConcurrent;
  }
  /**
   * Analyze WebAssembly model usage patterns
   */
  private static analyzeWasmModelUsage(history: any[]): any {
    const modelActions = history.filter(h => h.action?.includes('wasm_model') || h.action === 'wasm_inference');
    const modelUsage: Record<string, number> = {};
    modelActions.forEach(h => {
      const modelPath = h.data?.modelPath || h.data?.config?.modelPath || 'unknown';
      modelUsage[modelPath] = (modelUsage[modelPath] || 0) + 1;
    });
    const keys = Object.keys(modelUsage);
    return {
      totalModelActions: modelActions.length,
      modelUsageBreakdown: modelUsage,
      mostUsedModel: keys.length ? keys.reduce((a, b) => (modelUsage[a] > modelUsage[b] ? a : b)) : `none` };
  }
  /**
   * Identify WebAssembly batch processing opportunities
   */
  private static identifyWasmBatchOpportunities(history: any[]): any {
    const wasmInferences = history.filter(h => h.action === 'wasm_inference');
    const timeWindow = 10000; // 10 seconds
    const batches: any[][] = [];
    let currentBatch: any[] = [];
    let lastTimestamp = 0;
    wasmInferences.forEach(inference => {
      const ts = inference.timestamp ?? 0;
      if (ts - lastTimestamp < timeWindow && currentBatch.length > 0) {
        currentBatch.push(inference);
      } else {
        if (currentBatch.length > 1) batches.push(currentBatch);
        currentBatch = [inference];
      }
      lastTimestamp = ts;
    });
    if (currentBatch.length > 1) batches.push(currentBatch);
    return {
      totalBatchOpportunities: batches.length,
      averageBatchSize: batches.length > 0 ? batches.reduce((sum, batch) => sum + batch.length, 0) / batches.length : 0,
      largestBatchSize: batches.length > 0 ? Math.max(...batches.map(b => b.length)) : 0,
      potentialLatencySavings:
        batches.length > 0 ? batches.reduce((sum, batch) => sum + (batch.length - 1) * 200, 0) : 0
    };
  }
  /**
   * Cleanup and close connections
   */
  static async cleanup(): Promise<void> {
    try {
      // Browser STOMP client: prefer deactivate(), fallback to close()
      if (browser && this.connection) {
        const conn = this.connection as StompClientLike;
        if (typeof conn.deactivate === 'function') {
          try {
            conn.deactivate();
          } catch (err) {
            console.warn('STOMP deactivate threw, attempting fallback close', err);
            if (typeof conn.close === 'function') {
              await conn.close();
            }
          }
        } else if (typeof conn.close === 'function') {
          // Some stomp clients expose close() instead of deactivate()
          await conn.close();
        }
      } else if (this.connection) {
        // AMQP server connection: close gracefully
        const conn = this.connection as AmqpConnectionLike;
        if (typeof conn.close === 'function') {
          await conn.close();
        }
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    } finally {
      // ensure internal flags are reset even if errors occurred
      this.channel = null;
      this.connection = null;
      this.isInitialized = false;
      console.log('🧹 RabbitMQ connections cleaned up');
    }
  }
} // end class RabbitMQXStateIntegration
// ---------------------------------------------------------------------------
// ✅ Singleton Export
// ---------------------------------------------------------------------------
export const rabbitMQIntegration = new RabbitMQXStateIntegration();
// Optional: expose globally for XState or browser debugging
if (typeof globalThis !== 'undefined') {
  (globalThis as any).rabbitMQIntegration = rabbitMQIntegration;
}
// Keep class export (already exported above) and provide default export for convenience
export default rabbitMQIntegration;
// TODO: 12kb redis top3-k — Explain Top-K with web example (IN-PROGRESS)
// Add docs/snippets server+browser showing safe RedisBloom Top-K usage for web apps
