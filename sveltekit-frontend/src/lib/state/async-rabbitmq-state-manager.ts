/**
 * Asynchronous RabbitMQ State Manager with XState Integration
 * Manages distributed state across RabbitMQ workers and UI components
 */

import { createMachine, createActor, assign, send, spawn } from 'xstate';
import { writable, derived, type Readable, type Writable } from 'svelte/store';
import {
  optimizedOrchestrator,
  type JobDefinition,
  type JobType,
} from '$lib/orchestration/optimized-rabbitmq-orchestrator.js';
import { autoAttachQueueManager } from '$lib/services/auto-attach-queue-manager.js';
import { rabbitmqService } from '$lib/server/messaging/rabbitmq-service.js';

export interface AsyncStateContext {
  jobStates: Map<string, JobState>;
  queueStates: Map<string, QueueState>;
  globalState: GlobalSystemState;
  syncStatus: SyncStatus;
  stateHistory: StateHistoryEntry[];
  subscriptions: Map<string, StateSubscription>;
  conflictResolution: ConflictResolution;
  distributedLocks: Map<string, DistributedLock>;
}

export interface JobState {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  metadata: JobMetadata;
  dependencies: string[];
  dependents: string[];
  timeline: JobTimelineEntry[];
  stateVersion: number;
  lastUpdated: number;
}

export type JobStatus =
  | 'queued'
  | 'dispatched'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying'
  | 'zombie' // Stale state
  | 'conflicted'; // State conflict detected

export interface JobMetadata {
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  workerId?: string;
  queueName: string;
  priority: number;
  retryCount: number;
  estimatedDuration: number;
  actualDuration?: number;
  resourceUsage?: ResourceUsage;
  tags: string[];
  userContext?: any;
}

export interface JobTimelineEntry {
  timestamp: number;
  event: JobTimelineEvent;
  data?: any;
  source: 'client' | 'worker' | 'orchestrator' | 'queue';
}

export type JobTimelineEvent =
  | 'submitted'
  | 'queued'
  | 'dispatched'
  | 'started'
  | 'progress_update'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retry_scheduled'
  | 'state_conflict'
  | 'state_resolved';

export interface ResourceUsage {
  cpu: number;
  memory: number;
  gpu?: number;
  network: number;
  storage: number;
  peakUsage: ResourcePeak;
}

export interface ResourcePeak {
  cpu: number;
  memory: number;
  timestamp: number;
}

export interface QueueState {
  name: string;
  depth: number;
  consumers: number;
  producers: number;
  throughput: ThroughputMetrics;
  health: QueueHealth;
  configuration: QueueConfiguration;
  lastUpdated: number;
}

export interface ThroughputMetrics {
  messagesPerSecond: number;
  avgProcessingTime: number;
  peakThroughput: number;
  lowThroughput: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}

export interface QueueHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number; // 0-1
  issues: QueueIssue[];
  lastHealthCheck: number;
}

export interface QueueIssue {
  type: 'high_latency' | 'message_buildup' | 'consumer_unavailable' | 'memory_pressure' | 'dead_letters';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
  autoResolvable: boolean;
}

export interface QueueConfiguration {
  durable: boolean;
  autoDelete: boolean;
  maxLength?: number;
  messageTtl?: number;
  deadLetterExchange?: string;
  priority?: number;
}

export interface GlobalSystemState {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  systemHealth: SystemHealth;
  performance: SystemPerformance;
  alerts: SystemAlert[];
  maintenanceMode: boolean;
  lastSyncAt: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: Map<string, ComponentHealth>;
  uptime: number;
  lastIncident?: IncidentInfo;
}

export interface ComponentHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency: number;
  errorRate: number;
  lastCheck: number;
}

export interface IncidentInfo {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAt: number;
  resolvedAt?: number;
  description: string;
  affectedComponents: string[];
}

export interface SystemPerformance {
  totalThroughput: number;
  avgResponseTime: number;
  errorRate: number;
  resourceUtilization: SystemResourceUtilization;
  bottlenecks: Bottleneck[];
}

export interface SystemResourceUtilization {
  cpu: number;
  memory: number;
  gpu?: number;
  network: number;
  storage: number;
}

export interface Bottleneck {
  component: string;
  type: 'cpu' | 'memory' | 'gpu' | 'network' | 'storage' | 'queue';
  severity: number; // 0-1
  impact: string;
  suggestedFix: string;
}

export interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'health' | 'security';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  timestamp: number;
  acknowledged: boolean;
  autoResolved: boolean;
}

export interface SyncStatus {
  connected: boolean;
  lastSync: number;
  syncLag: number;
  conflictCount: number;
  retryCount: number;
  backoffDelay: number;
  syncHealth: 'healthy' | 'degraded' | 'failed';
}

export interface StateHistoryEntry {
  timestamp: number;
  jobId?: string;
  queueName?: string;
  event: string;
  previousState: any;
  newState: any;
  source: string;
  stateVersion: number;
}

export interface StateSubscription {
  id: string;
  pattern: string; // job:*, queue:legal.*, global
  callback: (event: StateEvent) => void;
  filters?: StateFilter[];
  qos?: QualityOfService;
}

export interface StateFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
  value: any;
}

export interface QualityOfService {
  deliveryGuarantee: 'at_most_once' | 'at_least_once' | 'exactly_once';
  ordering: 'none' | 'partition' | 'global';
  durability: boolean;
  priority: number;
}

export interface StateEvent {
  type: string;
  jobId?: string;
  queueName?: string;
  data: any;
  timestamp: number;
  source: string;
  stateVersion: number;
}

export interface ConflictResolution {
  strategy: 'last_write_wins' | 'merge' | 'manual' | 'vector_clock';
  pendingConflicts: StateConflict[];
  resolvedConflicts: ResolvedConflict[];
}

export interface StateConflict {
  id: string;
  resourceId: string;
  resourceType: 'job' | 'queue' | 'global';
  conflictingStates: ConflictingState[];
  detectedAt: number;
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
}

export interface ConflictingState {
  stateVersion: number;
  source: string;
  timestamp: number;
  data: any;
  vectorClock?: VectorClock;
}

export interface VectorClock {
  [nodeId: string]: number;
}

export interface ResolvedConflict {
  conflictId: string;
  resolutionStrategy: string;
  resolvedAt: number;
  winningState: any;
  conflictDuration: number;
}

export interface DistributedLock {
  resourceId: string;
  lockId: string;
  owner: string;
  acquiredAt: number;
  expiresAt: number;
  renewable: boolean;
  lockType: 'read' | 'write' | 'exclusive';
}

// Events for the state manager
export type AsyncStateEvent =
  | { type: 'SYNC_STATE' }
  | { type: 'JOB_STATE_UPDATE'; jobId: string; state: Partial<JobState> }
  | { type: 'QUEUE_STATE_UPDATE'; queueName: string; state: Partial<QueueState> }
  | { type: 'GLOBAL_STATE_UPDATE'; state: Partial<GlobalSystemState> }
  | { type: 'SUBSCRIBE_TO_STATE'; subscription: StateSubscription }
  | { type: 'UNSUBSCRIBE_FROM_STATE'; subscriptionId: string }
  | { type: 'RESOLVE_CONFLICT'; conflictId: string; resolution: any }
  | { type: 'ACQUIRE_LOCK'; resourceId: string; lockType: 'read' | 'write' | 'exclusive' }
  | { type: 'RELEASE_LOCK'; lockId: string }
  | { type: 'HANDLE_SYNC_ERROR'; error: any }
  | { type: 'CONNECTION_LOST' }
  | { type: 'CONNECTION_RESTORED' };

// XState Machine for Async State Management
const asyncStateMachine = createMachine<AsyncStateContext, AsyncStateEvent>(
  {
    id: 'asyncRabbitMQStateManager',
    initial: 'initializing',

    context: {
      jobStates: new Map(),
      queueStates: new Map(),
      globalState: {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        systemHealth: {
          overall: 'healthy',
          components: new Map(),
          uptime: 0,
        },
        performance: {
          totalThroughput: 0,
          avgResponseTime: 0,
          errorRate: 0,
          resourceUtilization: {
            cpu: 0,
            memory: 0,
            network: 0,
            storage: 0,
          },
          bottlenecks: [],
        },
        alerts: [],
        maintenanceMode: false,
        lastSyncAt: 0,
      },
      syncStatus: {
        connected: false,
        lastSync: 0,
        syncLag: 0,
        conflictCount: 0,
        retryCount: 0,
        backoffDelay: 1000,
        syncHealth: 'failed',
      },
      stateHistory: [],
      subscriptions: new Map(),
      conflictResolution: {
        strategy: 'last_write_wins',
        pendingConflicts: [],
        resolvedConflicts: [],
      },
      distributedLocks: new Map(),
    },

    states: {
      initializing: {
        entry: 'initializeStateSync',
        invoke: {
          id: 'connectToStateSync',
          src: 'establishStateSyncConnection',
          onDone: {
            target: 'connected',
            actions: 'markConnected',
          },
          onError: {
            target: 'disconnected',
            actions: 'handleConnectionError',
          },
        },
      },

      connected: {
        entry: 'startStateSyncLoop',
        invoke: [
          {
            id: 'stateSyncMonitor',
            src: 'monitorStateSync',
          },
          {
            id: 'conflictDetector',
            src: 'detectStateConflicts',
          },
          {
            id: 'lockManager',
            src: 'manageLocks',
          },
        ],

        initial: 'syncing',

        states: {
          syncing: {
            on: {
              JOB_STATE_UPDATE: {
                actions: ['updateJobState', 'broadcastStateChange', 'recordStateHistory'],
              },
              QUEUE_STATE_UPDATE: {
                actions: ['updateQueueState', 'broadcastStateChange', 'recordStateHistory'],
              },
              GLOBAL_STATE_UPDATE: {
                actions: ['updateGlobalState', 'broadcastStateChange', 'recordStateHistory'],
              },
              SUBSCRIBE_TO_STATE: {
                actions: 'addSubscription',
              },
              UNSUBSCRIBE_FROM_STATE: {
                actions: 'removeSubscription',
              },
              RESOLVE_CONFLICT: {
                actions: 'resolveStateConflict',
              },
              ACQUIRE_LOCK: {
                actions: 'acquireDistributedLock',
              },
              RELEASE_LOCK: {
                actions: 'releaseDistributedLock',
              },
            },
          },
        },

        on: {
          CONNECTION_LOST: 'disconnected',
          HANDLE_SYNC_ERROR: {
            actions: 'handleSyncError',
          },
        },
      },

      disconnected: {
        entry: 'markDisconnected',
        invoke: {
          id: 'reconnectTimer',
          src: 'attemptReconnection',
        },
        on: {
          CONNECTION_RESTORED: 'connected',
        },
      },
    },
  },
  {
    actions: {
      initializeStateSync: () => {
        console.log('🔄 Initializing async state management...');
      },

      markConnected: assign({
        syncStatus: (context) => ({
          ...context.syncStatus,
          connected: true,
          lastSync: Date.now(),
          syncHealth: 'healthy' as const,
          retryCount: 0,
        }),
      }),

      markDisconnected: assign({
        syncStatus: (context) => ({
          ...context.syncStatus,
          connected: false,
          syncHealth: 'failed' as const,
        }),
      }),

      updateJobState: assign({
        jobStates: (context, event) => {
          if (event.type !== 'JOB_STATE_UPDATE') return context.jobStates;

          const updated = new Map(context.jobStates);
          const existing = updated.get(event.jobId);

          const newState: JobState = existing
            ? {
                ...existing,
                ...event.state,
                stateVersion: existing.stateVersion + 1,
                lastUpdated: Date.now(),
              }
            : {
                id: event.jobId,
                type: event.state.type || 'workflow_orchestration',
                status: event.state.status || 'queued',
                progress: event.state.progress || 0,
                metadata: event.state.metadata || {
                  submittedAt: Date.now(),
                  queueName: 'default',
                  priority: 1,
                  retryCount: 0,
                  estimatedDuration: 30000,
                  tags: [],
                },
                dependencies: event.state.dependencies || [],
                dependents: event.state.dependents || [],
                timeline: event.state.timeline || [],
                stateVersion: 1,
                lastUpdated: Date.now(),
              };

          updated.set(event.jobId, newState);
          return updated;
        },
      }),

      updateQueueState: assign({
        queueStates: (context, event) => {
          if (event.type !== 'QUEUE_STATE_UPDATE') return context.queueStates;

          const updated = new Map(context.queueStates);
          const existing = updated.get(event.queueName);

          const newState: QueueState = existing
            ? {
                ...existing,
                ...event.state,
                lastUpdated: Date.now(),
              }
            : {
                name: event.queueName,
                depth: 0,
                consumers: 0,
                producers: 0,
                throughput: {
                  messagesPerSecond: 0,
                  avgProcessingTime: 0,
                  peakThroughput: 0,
                  lowThroughput: 0,
                  trend: 'stable',
                },
                health: {
                  status: 'unknown',
                  score: 0.5,
                  issues: [],
                  lastHealthCheck: Date.now(),
                },
                configuration: {
                  durable: true,
                  autoDelete: false,
                },
                lastUpdated: Date.now(),
                ...event.state,
              };

          updated.set(event.queueName, newState);
          return updated;
        },
      }),

      updateGlobalState: assign({
        globalState: (context, event) => {
          if (event.type !== 'GLOBAL_STATE_UPDATE') return context.globalState;

          return {
            ...context.globalState,
            ...event.state,
            lastSyncAt: Date.now(),
          };
        },
      }),

      broadcastStateChange: (context, event) => {
        // Broadcast state changes to subscribers
        for (const [id, subscription] of context.subscriptions) {
          const stateEvent: StateEvent = {
            type: event.type,
            data: event,
            timestamp: Date.now(),
            source: 'state_manager',
            stateVersion: 1,
          };

          if (event.type === 'JOB_STATE_UPDATE' && 'jobId' in event) {
            stateEvent.jobId = event.jobId;
          } else if (event.type === 'QUEUE_STATE_UPDATE' && 'queueName' in event) {
            stateEvent.queueName = event.queueName;
          }

          try {
            subscription.callback(stateEvent);
          } catch (error) {
            console.error(`Error in state subscription ${id}:`, error);
          }
        }
      },

      recordStateHistory: assign({
        stateHistory: (context, event) => {
          const historyEntry: StateHistoryEntry = {
            timestamp: Date.now(),
            event: event.type,
            previousState: null, // Would store actual previous state
            newState: event,
            source: 'state_manager',
            stateVersion: 1,
          };

          if (event.type === 'JOB_STATE_UPDATE' && 'jobId' in event) {
            historyEntry.jobId = event.jobId;
          } else if (event.type === 'QUEUE_STATE_UPDATE' && 'queueName' in event) {
            historyEntry.queueName = event.queueName;
          }

          return [historyEntry, ...context.stateHistory].slice(0, 1000); // Keep last 1000 entries
        },
      }),

      addSubscription: assign({
        subscriptions: (context, event) => {
          if (event.type !== 'SUBSCRIBE_TO_STATE') return context.subscriptions;

          const updated = new Map(context.subscriptions);
          updated.set(event.subscription.id, event.subscription);
          return updated;
        },
      }),

      removeSubscription: assign({
        subscriptions: (context, event) => {
          if (event.type !== 'UNSUBSCRIBE_FROM_STATE') return context.subscriptions;

          const updated = new Map(context.subscriptions);
          updated.delete(event.subscriptionId);
          return updated;
        },
      }),

      resolveStateConflict: (context, event) => {
        if (event.type !== 'RESOLVE_CONFLICT') return;
        console.log(`🔧 Resolving state conflict: ${event.conflictId}`);
      },

      acquireDistributedLock: assign({
        distributedLocks: (context, event) => {
          if (event.type !== 'ACQUIRE_LOCK') return context.distributedLocks;

          const lockId = `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const lock: DistributedLock = {
            resourceId: event.resourceId,
            lockId,
            owner: 'state_manager',
            acquiredAt: Date.now(),
            expiresAt: Date.now() + 60000, // 1 minute
            renewable: true,
            lockType: event.lockType,
          };

          const updated = new Map(context.distributedLocks);
          updated.set(lockId, lock);
          return updated;
        },
      }),

      releaseDistributedLock: assign({
        distributedLocks: (context, event) => {
          if (event.type !== 'RELEASE_LOCK') return context.distributedLocks;

          const updated = new Map(context.distributedLocks);
          updated.delete(event.lockId);
          return updated;
        },
      }),

      handleConnectionError: (_, event) => {
        console.error('❌ State sync connection error:', event.data);
      },

      handleSyncError: (_, event) => {
        if (event.type !== 'HANDLE_SYNC_ERROR') return;
        console.error('⚠️ State sync error:', event.error);
      },

      startStateSyncLoop: () => {
        console.log('🔄 Starting state sync loop...');
      },
    },

    services: {
      establishStateSyncConnection: async () => {
        // Establish connection to RabbitMQ for state synchronization
        await rabbitmqService.connect();
        return { connected: true };
      },

      monitorStateSync: () => (callback: any) => {
        const interval = setInterval(() => {
          // Monitor sync health
          callback({ type: 'SYNC_STATE' });
        }, 5000);

        return () => clearInterval(interval);
      },

      detectStateConflicts: () => (callback: any) => {
        const interval = setInterval(() => {
          // Detect state conflicts
          // Mock implementation
        }, 10000);

        return () => clearInterval(interval);
      },

      manageLocks: () => (callback: any) => {
        const interval = setInterval(() => {
          // Manage distributed locks
          // Mock implementation
        }, 30000);

        return () => clearInterval(interval);
      },

      attemptReconnection: () => (callback: any) => {
        const timeout = setTimeout(() => {
          callback({ type: 'CONNECTION_RESTORED' });
        }, 5000);

        return () => clearTimeout(timeout);
      },
    },
  }
);

export class AsyncRabbitMQStateManager {
  private static instance: AsyncRabbitMQStateManager;
  private stateService: any;
  private svelteStores: Map<string, Writable<any>> = new Map();
  private enableN64Logging = false;

  // Svelte stores for reactive UI updates
  public readonly jobStates: Readable<Map<string, JobState>>;
  public readonly queueStates: Readable<Map<string, QueueState>>;
  public readonly globalState: Readable<GlobalSystemState>;
  public readonly syncStatus: Readable<SyncStatus>;

  static getInstance(): AsyncRabbitMQStateManager {
    if (!AsyncRabbitMQStateManager.instance) {
      AsyncRabbitMQStateManager.instance = new AsyncRabbitMQStateManager();
    }
    return AsyncRabbitMQStateManager.instance;
  }

  constructor() {
    this.stateService = interpret(asyncStateMachine);

    // Create reactive Svelte stores
    const jobStatesStore = writable(new Map<string, JobState>());
    const queueStatesStore = writable(new Map<string, QueueState>());
    const globalStateStore = writable<GlobalSystemState>({
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      systemHealth: { overall: 'healthy', components: new Map(), uptime: 0 },
      performance: {
        totalThroughput: 0,
        avgResponseTime: 0,
        errorRate: 0,
        resourceUtilization: { cpu: 0, memory: 0, network: 0, storage: 0 },
        bottlenecks: [],
      },
      alerts: [],
      maintenanceMode: false,
      lastSyncAt: 0,
    });
    const syncStatusStore = writable<SyncStatus>({
      connected: false,
      lastSync: 0,
      syncLag: 0,
      conflictCount: 0,
      retryCount: 0,
      backoffDelay: 1000,
      syncHealth: 'failed',
    });

    // Make stores readonly
    this.jobStates = { subscribe: jobStatesStore.subscribe };
    this.queueStates = { subscribe: queueStatesStore.subscribe };
    this.globalState = { subscribe: globalStateStore.subscribe };
    this.syncStatus = { subscribe: syncStatusStore.subscribe };

    // Update stores when state machine changes
    this.stateService.onTransition((state: any) => {
      jobStatesStore.set(state.context.jobStates);
      queueStatesStore.set(state.context.queueStates);
      globalStateStore.set(state.context.globalState);
      syncStatusStore.set(state.context.syncStatus);
    });
  }

  async start(config?: { enableN64Logging?: boolean }): Promise<void> {
    this.enableN64Logging = config?.enableN64Logging || false;

    this.log('🚀 Starting Async RabbitMQ State Manager...', 'info');

    this.stateService.start();

    // Connect to orchestrator and auto-attach manager
    await this.integrateWithServices();

    this.log('✅ Async State Manager started successfully', 'success');
  }

  private async integrateWithServices(): Promise<void> {
    // Subscribe to orchestrator events
    const orchestratorSubscription: StateSubscription = {
      id: 'orchestrator-integration',
      pattern: 'job:*',
      callback: (event) => this.handleOrchestratorEvent(event),
    };

    this.subscribe(orchestratorSubscription);

    // Subscribe to auto-attach manager events
    const autoAttachSubscription: StateSubscription = {
      id: 'auto-attach-integration',
      pattern: 'queue:*',
      callback: (event) => this.handleAutoAttachEvent(event),
    };

    this.subscribe(autoAttachSubscription);

    this.log('🔗 Integrated with orchestrator and auto-attach services', 'info');
  }

  private handleOrchestratorEvent(event: StateEvent): void {
    this.log(`📤 Handling orchestrator event: ${event.type}`, 'info');

    // Forward orchestrator events to state machine
    if (event.jobId && event.type.includes('job')) {
      this.updateJobState(event.jobId, event.data);
    }
  }

  private handleAutoAttachEvent(event: StateEvent): void {
    this.log(`🔗 Handling auto-attach event: ${event.type}`, 'info');

    // Forward auto-attach events to state machine
    if (event.queueName && event.type.includes('queue')) {
      this.updateQueueState(event.queueName, event.data);
    }
  }

  updateJobState(jobId: string, state: Partial<JobState>): void {
    this.stateService.send({
      type: 'JOB_STATE_UPDATE',
      jobId,
      state,
    });
  }

  updateQueueState(queueName: string, state: Partial<QueueState>): void {
    this.stateService.send({
      type: 'QUEUE_STATE_UPDATE',
      queueName,
      state,
    });
  }

  updateGlobalState(state: Partial<GlobalSystemState>): void {
    this.stateService.send({
      type: 'GLOBAL_STATE_UPDATE',
      state,
    });
  }

  subscribe(subscription: StateSubscription): () => void {
    this.stateService.send({
      type: 'SUBSCRIBE_TO_STATE',
      subscription,
    });

    return () => {
      this.stateService.send({
        type: 'UNSUBSCRIBE_FROM_STATE',
        subscriptionId: subscription.id,
      });
    };
  }

  acquireLock(resourceId: string, lockType: 'read' | 'write' | 'exclusive' = 'write'): string {
    this.stateService.send({
      type: 'ACQUIRE_LOCK',
      resourceId,
      lockType,
    });

    return `lock-${Date.now()}`;
  }

  releaseLock(lockId: string): void {
    this.stateService.send({
      type: 'RELEASE_LOCK',
      lockId,
    });
  }

  getJobState(jobId: string): JobState | undefined {
    const state = this.stateService.getSnapshot();
    return state.context.jobStates.get(jobId);
  }

  getQueueState(queueName: string): QueueState | undefined {
    const state = this.stateService.getSnapshot();
    return state.context.queueStates.get(queueName);
  }

  getStateHistory(limit: number = 100): StateHistoryEntry[] {
    const state = this.stateService.getSnapshot();
    return state.context.stateHistory.slice(0, limit);
  }

  // Create derived stores for specific use cases
  createJobStatusStore(jobId: string): Readable<JobStatus | undefined> {
    return derived(this.jobStates, ($jobStates) => {
      return $jobStates.get(jobId)?.status;
    });
  }

  createJobProgressStore(jobId: string): Readable<number> {
    return derived(this.jobStates, ($jobStates) => {
      return $jobStates.get(jobId)?.progress ?? 0;
    });
  }

  createQueueHealthStore(queueName: string): Readable<QueueHealth | undefined> {
    return derived(this.queueStates, ($queueStates) => {
      return $queueStates.get(queueName)?.health;
    });
  }

  createSystemHealthStore(): Readable<SystemHealth> {
    return derived(this.globalState, ($globalState) => {
      return $globalState.systemHealth;
    });
  }

  private log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const prefix = this.enableN64Logging ? '🎮 [AsyncState]' : '[AsyncState]';

    switch (type) {
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️ ${message}`);
    }
  }
}

// Export singleton instance
export const asyncStateManager = AsyncRabbitMQStateManager.getInstance();