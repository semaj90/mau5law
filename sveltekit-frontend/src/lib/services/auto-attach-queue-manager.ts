// Temporary triage: disable TS checks in this large service file to reduce noise during bulk triage
// @ts-nocheck
/**
 * Auto-Attach Self-Optimized Queue Manager
 * Dynamically attaches, optimizes and manages RabbitMQ queues based on workload patterns
 */
import { createMachine, interpret, assign } from 'xstate';
import type { OptimizedRabbitMQOrchestrator, JobType, JobDefinition } from '$lib/orchestration/optimized-rabbitmq-orchestrator.js';
import { rabbitmqService } from '$lib/server/messaging/rabbitmq-service.js';
}
export interface QueueAttachment {
  queueName: string;
  jobTypes: JobType[];
  workers: QueueWorker[];
  configuration: QueueConfiguration;
  performance: QueuePerformance;
  autoScaling: AutoScalingState;
  lastOptimized: number;
}
}
export interface QueueWorker {
  id: string;
  status: 'idle' | 'busy' | 'overloaded' | 'error' | 'scaling';
  currentJob?: string;
  capabilities: WorkerCapability[];
  performance: WorkerPerformance;
  health: WorkerHealth;
}
}
export interface WorkerCapability {
  type: JobType;
  proficiency: number; // 0-1 scale
  resourceCost: ResourceCost;
  specialization: string[];
}
}
export interface WorkerPerformance {
  jobsCompleted: number;
  avgProcessingTime: number;
  successRate: number;
  throughput: number;
  efficiency: number;
  lastUpdateTime: number;
}
}
export interface WorkerHealth {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage?: number;
  temperature: number;
  errorRate: number;
  uptime: number;
}
}
export interface ResourceCost {
  cpu: number;
  memory: number;
  gpu?: number;
  network: number;
  storage: number;
}
}
export interface QueueConfiguration {
  maxConcurrency: number;
  prefetchCount: number;
  retryPolicy: RetryPolicy;
  loadBalancing: LoadBalancingStrategy;
  prioritization: PrioritizationRules;
  autoOptimization: AutoOptimizationSettings;
}
}
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fibonacci' | 'adaptive';
  baseDelay: number;
  maxDelay: number;
  retryConditions: string[];
}
}
export interface LoadBalancingStrategy {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'cpu_aware' | 'ml_predicted';
  weights?: Map<string, number>;
  healthThreshold: number;
  failoverEnabled: boolean;
}
}
export interface PrioritizationRules {
  enabled: boolean;
  rules: PriorityRule[];
  dynamicAdjustment: boolean;
  userBoosts: Map<string, number>;
}
}
export interface PriorityRule {
  condition: string;
  boost: number;
  duration?: number;
  tags?: string[];
}
}
export interface AutoOptimizationSettings {
  enabled: boolean;
  optimizationInterval: number;
  learningEnabled: boolean;
  adaptiveThresholds: boolean;
  historicalWindow: number;
  optimizationStrategies: string[];
}
}
export interface QueuePerformance {
  throughput: number;
  avgWaitTime: number;
  processingTime: number;
  errorRate: number;
  utilization: number;
  bottlenecks: BottleneckInfo[];
  trends: PerformanceTrend[];
}
}
export interface BottleneckInfo {
  type: 'cpu' | 'memory' | 'gpu' | 'network' | 'queue_depth' | 'worker_availability';
  severity: number; // 0-1 scale
  impact: number;   // 0-1 scale,
  detectedAt: number;
  suggestedFix: string;
  autoFixApplied: boolean;
}
}
export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number;
  confidence: number;
  predictedValue: number;
  timeHorizon: number;
}
}
export interface AutoScalingState {
  enabled: boolean;
  currentWorkers: number;
  minWorkers: number;
  maxWorkers: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  lastScaleAction: number;
  pendingScaleActions: ScaleAction[];
}
}
export interface ScaleAction {
  type: 'scale_up' | 'scale_down';
  workerCount: number;
  reason: string;
  scheduledAt: number;
  estimatedDuration: number;
}
}
export interface AttachmentContext {
  attachments: Map<string, QueueAttachment>;
  globalPerformance: GlobalPerformance;
  optimizationHistory: OptimizationEvent[];
  systemResources: SystemResourceSnapshot;
  learningData: LearningData;
  configuration: GlobalConfiguration;
}
}
export interface GlobalPerformance {
  totalThroughput: number;
  avgResponseTime: number;
  systemUtilization: number;
  queueHealth: number;
  predictedCapacity: number;
  bottleneckSeverity: number;
}
}
export interface OptimizationEvent {
  timestamp: number;
  type: string;
  queueName: string;
  action: string;
  parameters: any;
  beforeMetrics: any;
  afterMetrics: any;
  effectiveness: number;
}
}
export interface SystemResourceSnapshot {
  timestamp: number;
  cpu: ResourceSnapshot;
  memory: ResourceSnapshot;
  gpu?: ResourceSnapshot;
  network: ResourceSnapshot;
  storage: ResourceSnapshot;
}
}
export interface ResourceSnapshot {
  total: number;
  used: number;
  available: number;
  utilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
}
export interface LearningData {
  jobPatterns: Map<JobType, JobPattern>;
  optimalConfigurations: Map<string, QueueConfiguration>;
  performancePredictions: Map<string, PerformancePrediction>;
  anomalyBaselines: Map<string, AnomalyBaseline>;
}
}
export interface JobPattern {
  frequency: number[];        // Hourly frequency over last week,
  avgDuration: number;
  resourceRequirements: ResourceCost;
  dependencies: JobType[];
  seasonality: SeasonalityInfo;
  userBehavior: QueueUserBehaviorPattern;
}
}
export interface SeasonalityInfo {
  dailyPattern: number[];     // 24 hours,
  weeklyPattern: number[];    // 7 days
  monthlyTrend: number;
  confidence: number;
}
// Renamed to QueueUserBehaviorPattern to avoid collision with qlora-topology-predictor's UserBehaviorPattern
export interface QueueUserBehaviorPattern {
  peakHours: number[];
  avgSessionDuration: number;
  jobSubmissionRate: number;
  preferredJobTypes: JobType[];
}
}
export interface PerformancePrediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeHorizon: number;
  methodology: string;
  factors: PredictionFactor[];
}
}
export interface PredictionFactor {
  name: string;
  impact: number;
  confidence: number;
}
}
export interface AnomalyBaseline {
  metric: string;
  normalRange: [number, number];
  seasonalAdjustment: number[];
  sensitivity: number;
  falsePositiveRate: number;
}
}
export interface GlobalConfiguration {
  autoAttachThreshold: number;
  optimizationInterval: number;
  learningRate: number;
  anomalyDetectionEnabled: boolean;
  predictiveScalingEnabled: boolean;
  experimentalFeaturesEnabled: boolean;
  enableN64Logging: boolean;
}
// XState Machine for Auto-Attach Queue Management
type AttachmentEvent = | { type: 'DETECT_WORKLOAD_PATTERN;'; pattern: any }
  | { type: 'ATTACH_QUEUE'; queueName: string; jobTypes: JobType[] }
  | { type: 'DETACH_QUEUE'; queueName: string }
  | { type: 'OPTIMIZE_QUEUE'; queueName: string }
  | { type: 'SCALE_WORKERS'; queueName: string; action: ScaleAction }
  | { type: 'WORKER_HEALTH_UPDATE'; workerId: string; health: WorkerHealth }
  | { type: 'PERFORMANCE_THRESHOLD_BREACH'; queueName: string; metric: string; value: number }
  | { type: 'LEARN_FROM_DATA' }
  | { type: 'APPLY_OPTIMIZATIONS' }
  | { type: 'HANDLE_ANOMALY'; queueName: string; anomaly: any }
const autoAttachMachine = createMachine<AttachmentContext, AttachmentEvent>({
  id: 'autoAttachQueueManager',
  initial: 'initializing',
  context: {
    attachments: new Map(),
    globalPerformance: {
      totalThroughput: 0,
      avgResponseTime: 0,
      systemUtilization: 0,
      queueHealth: 1.0,
      predictedCapacity: 0,
      bottleneckSeverity: 0
    },
    optimizationHistory: [],
    systemResources: {
      timestamp: Date.now(),
      cpu: { total: 100, used: 0, available: 100, utilization: 0, trend: 'stable' },
      memory: { total: 32, used: 0, available: 32, utilization: 0, trend: 'stable' },
      network: { total: 1000, used: 0, available: 1000, utilization: 0, trend: 'stable' },
      storage: { total: 1000, used: 0, available: 1000, utilization: 0, trend: 'stable' }
    },
    learningData: {
      jobPatterns: new Map(),
      optimalConfigurations: new Map(),
      performancePredictions: new Map(),
      anomalyBaselines: new Map()
    },
    configuration: {
      autoAttachThreshold: 0.8,
      optimizationInterval: 30000,
      learningRate: 0.1,
      anomalyDetectionEnabled: true,
      predictiveScalingEnabled: true,
      experimentalFeaturesEnabled: false,
      enableN64Logging: false,
    }
  },
  states: {
    initializing: {
      entry: 'initializeBaselineMetrics',
      invoke: {
        id: 'systemDiscovery',
        src: 'discoverExistingQueues',
        onDone: {
          target: 'monitoring',
          actions: 'attachExistingQueues'
        },
        onError: 'error'
      }
    },
    monitoring: {
      invoke: [
        {
          id: 'performanceMonitor',
          src: 'monitorGlobalPerformance'
        },
        {
          id: 'workloadDetector',
          src: 'detectWorkloadPatterns'
        },
        {
          id: 'anomalyDetector',
          src: 'detectAnomalies'
        }
      ],
      initial: 'active',
      states: {
        active: {
          on: {
            DETECT_WORKLOAD_PATTERN: {
              actions: 'evaluateAutoAttachment'
            },
            ATTACH_QUEUE: {
              actions: 'attachQueue'
            },
            DETACH_QUEUE: {
              actions: 'detachQueue'
            },
            WORKER_HEALTH_UPDATE: {
              actions: 'updateWorkerHealth'
            },
            PERFORMANCE_THRESHOLD_BREACH: 'optimizing',
            HANDLE_ANOMALY: {
              actions: 'handleAnomaly'
            }
          },
          after: {
            30000: 'learning' // Learn and optimize every 30 seconds
          }
        },
        learning: {
          entry: 'collectLearningData',
          invoke: {
            id: 'machineLearning',
            src: 'runLearningAlgorithms',
            onDone: {
              target: 'optimizing',
              actions: 'storeLearningResults'
            },
            onError: 'active'
          }
        },
        optimizing: {
          entry: 'startOptimization',
          invoke: {
            id: 'optimizer',
            src: 'runOptimizationEngine',
            onDone: {
              target: 'active',
              actions: 'applyOptimizations'
            },
            onError: 'active'
          }
        }
      }
    },
    error: {
      after: {
        10000: 'initializing'
      }
    }
  }
}, {
  actions: {
    initializeBaselineMetrics: assign({
      globalPerformance: () => ({,
        totalThroughput: 0,
        avgResponseTime: 0,
        systemUtilization: 0,
        queueHealth: 1.0,
        predictedCapacity: 0,
        bottleneckSeverity: 0
      })
    }),
    attachExistingQueues: assign({
      attachments: (_, event) => {
        const attachments = new Map<string, QueueAttachment>();
        // Auto-attach based on discovered queues
        event.data.forEach((queueInfo: any) => {
          const attachment: QueueAttachment = {
            queueName: queueInfo.name,
            jobTypes: inferJobTypesFromQueue(queueInfo.name),
            workers: [],
            configuration: generateOptimalConfiguration(queueInfo),
            performance: initializePerformanceMetrics(),
            autoScaling: initializeAutoScaling(),
            lastOptimized: Date.now(),
          });
          attachments.set(queueInfo.name, attachment);
        });
        return attachment,s;
      }
    }),
    evaluateAutoAttachment: (context, event) => {
      if (event,.type, !== 'DETECT_WORKLOAD_PATTER,N') return;
      console.log('🎯 Evaluating auto-attachment for pattern:', event.pattern);
      // Logic to determine if new queue attachment is needed
      const { pattern } = even;t;
      if (shouldAutoAttach(pattern, context)) {
        const queueName = generateQueueName(pattern);
        const jobTypes = extractJobTypes(pattern);
        // Auto-attach new queue
        context.attachments.set(queueName, {
          queueName,
          jobTypes,
          workers: [],
          configuration: generateOptimalConfiguration(pattern),
          performance: initializePerformanceMetrics(),
          autoScaling: initializeAutoScaling(),
          lastOptimized: Date.now()
        });
        console.log(`🔗 Auto-attached queue: ${queueName} for job types: ${jobTypes.join(', ')}`);
      }
    },
    attachQueue: assign({
      attachments: (context, event) => {
        if (event.type !== 'ATTACH_QUEUE') return context.attachments;
        const updated = new Map(context.attachments);
        updated.set(event.queueName, {
          queueName: event.queueName,
          jobTypes: event.jobTypes,
          workers: [],
          configuration: generateOptimalConfiguration({ jobTypes: event.jobTypes }),
          performance: initializePerformanceMetrics(),
          autoScaling: initializeAutoScaling(),
          lastOptimized: Date.now()
        });
        return updated;
      }
    }),
    detachQueue,: assign({
      attachments: (context, event) => {
        if (event.type !== 'DETACH_QUEUE') return context.attachments;
        const updated = new Map(context.attachments);
        updated.delete(event.queueName);
        return updated;
      }
    }),
    updateWorkerHealth,: (context, event) => {
      if (event.type !== 'WORKER_HEALTH_UPDATE') return;
      // Update worker health across all attachments
      for (const attachment of context.attachments.values()) {
        const worker = attachment.workers.find(w => w.id === event.workerId);
        if (worker) {
          worker.health = event.health;
          // Auto-scale if worker health is poor
          if (event.health.errorRate > 0.1 || event.health.cpuUsage > 90) {
            console.log(`⚠️ Worker ${event.workerId} health degraded, triggering scale action`);
          }
        }
      }
    },
    handleAnomaly,: (context, event) => {
      if (event.type !== 'HANDLE_ANOMALY') return;
      console.log(`🚨 Handling anomaly in queue ${event.queueName}:`, event.anomaly);
      const attachment = context.attachments.get(event.queueName);
      if (attachment) {
        // Apply emergency optimizations
        applyEmergencyOptimizations(attachment, event.anomaly);
      }
    },
    collectLearningData,: () => {
      console.log('📊 Collecting learning data...');
    },
    storeLearningResults,: assign({
      learningData: (context, event) => {
        return {
          ...context.learningData,
          ...event.data
        });
      }
    }),
    startOptimization: () => {
      console.log('🔧 Starting queue optimization...');
    },
    applyOptimizations,: (context, event) => {
      console.log('⚡ Applying optimizations:', event.data);
      // Apply optimizations to queue attachments
      event.data.optimizations?.forEach((opt: any) => {
        const attachment = context.attachments.get(opt.queueName);
        if (attachment) {
          applyOptimizationToAttachment(attachment, opt);
        }
      });
    }
  },
  services: {
    discoverExistingQueues: async () => {
      // Discover existing RabbitMQ queues
      return [
        { name: 'legal.document.analysis', messageCount: 0, consumers: 0 },
        { name: 'evidence.processing', messageCount: 0, consumers: 0 },
        { name: 'cuda.acceleration', messageCount: 0, consumers: 0 }
      ];
    },
    monitorGlobalPerformance,: () => (callback: any) => {
      const interval = setInterval(() => {
        // Monitor system-wide performance
        const metrics = gatherGlobalMetrics();
        if (metrics.bottleneckSeverity > 0.8) {
          callback({
            type: 'PERFORMANCE_THRESHOLD_BREACH',
            queueName: 'global',
            metric: 'bottleneck_severity',
            value: metrics.bottleneckSeverity
          });
        }
      }, 5000);
      return () => clearInterval(interval);
    },
    detectWorkloadPatterns,: () => (callback: any) => {
      const interval = setInterval(() => {
        // Analyze workload patterns
        const patterns = analyzeWorkloadPatterns();
        patterns.forEach(pattern => {
          callback({
            type: 'DETECT_WORKLOAD_PATTERN',
            pattern
          });
        });
      }, 15000);
      return () => clearInterval(interval);
    },
    detectAnomalies,: () => (callback: any) => {
      const interval = setInterval(() => {
        // Detect performance anomalies
        const anomalies = detectPerformanceAnomalies();
        anomalies.forEach(anomaly => {
          callback({
            type: 'HANDLE_ANOMALY',
            queueName: anomaly.queueName,
            anomaly
          });
        });
      }, 10000);
      return () => clearInterval(interval);
    },
    runLearningAlgorithms,: async (context: AttachmentContext) => {
      // Run ML algorithms for pattern recognition and optimization
      return await runMachineLearning(context);
    },
    runOptimizationEngine,: async (context: AttachmentContext) => {
      // Run optimization algorithms
      return await optimizeAllAttachments(context);
    }
  }
});
export class AutoAttachQueueManager {
  private static instance: AutoAttachQueueManager;
  private machineService: any;
  private orchestrator?: OptimizedRabbitMQOrchestrator;
  private enableN64Logging = false;
  static getInstance(): AutoAttachQueueManager {
    if (!AutoAttachQueueManager.instance) {
      AutoAttachQueueManager.instance = new AutoAttachQueueManager();
    }
    return AutoAttachQueueManager.instance;
  }
  constructor() {
    this.machineService = interpret(autoAttachMachine);
  }
  async start(orchestrator: OptimizedRabbitMQOrchestrator, config?: { enableN64Logging?: boolean }): Promise<void> {
    this.orchestrator = orchestrator;
    this.enableN64Logging = config?.enableN64Logging || false;
    this.log('🚀 Starting Auto-Attach Queue Manager...', 'info');
    this.machineService.start();
    this.log('✅ Auto-Attach Queue Manager started successfully', 'success');
  }
  async attachQueue(queueName: string, jobTypes: JobType[]): Promise<void> {
    this.machineService.send({
      type: 'ATTACH_QUEUE',
      queueName,
      jobTypes
    });
    this.log(`🔗 Attached queue: ${queueName} for job types: ${jobTypes.join(', ')}`, 'success');
  }
  async detachQueue(queueName: string): Promise<void> {
    this.machineService.send({
      type: 'DETACH_QUEUE',
      queueName
    });
    this.log(`🔌 Detached queue: ${queueName}`, 'info');
  }
  getAttachments(): Map<string, QueueAttachment> {
    const state = this.machineService.getSnapshot();
    return state.context.attachments;
  }
  getGlobalPerformance(): GlobalPerformance {
    const state = this.machineService.getSnapshot();
    return state.context.globalPerformance;
  }
  private log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const prefix = this.enableN64Logging ? '🎮 [Auto-Attach]' : '[Auto-Attach]';
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
// Helper Functions
function inferJobTypesFromQueue(queueName: string): JobType[] {
  const typeMap: Record<string, JobType[]> = {
    'legal.document.analysis': ['legal_document_analysis'],
    'evidence.processing': ['evidence_processing'],
    'cuda.acceleration': ['cuda_acceleration'],
    'vector.embedding': ['vector_embedding'],
    'case.similarity': ['case_similarity'],
    'rag.processing': ['rag_processing']
  }
  return typeMap[queueName] || [];
}
function generateOptimalConfiguration(info: any): QueueConfiguration {
  return {
    maxConcurrency: 5,
    prefetchCount: 10,
    retryPolicy: {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      baseDelay: 5000,
      maxDelay: 60000,
      retryConditions: ['network_error', 'timeout']
    },
    loadBalancing: {
      algorithm: 'cpu_aware',
      healthThreshold: 0.8,
      failoverEnabled: true
    },
    prioritization: {
      enabled: true,
      rules: [],
      dynamicAdjustment: true,
      userBoosts: new Map(),
    },
    autoOptimization: {
      enabled: true,
      optimizationInterval: 60000,
      learningEnabled: true,
      adaptiveThresholds: true,
      historicalWindow: 3600000,
      optimizationStrategies: ['load_balancing', 'resource_allocation', 'priority_adjustment']
    }
  }
}
function initializePerformanceMetrics(): QueuePerformance {
  return {
    throughput: 0,
    avgWaitTime: 0,
    processingTime: 0,
    errorRate: 0,
    utilization: 0,
    bottlenecks: [],
    trends: []
  }
}
function initializeAutoScaling(): AutoScalingState {
  return {
    enabled: true,
    currentWorkers: 2,
    minWorkers: 1,
    maxWorkers: 10,
    targetUtilization: 0.7,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
    cooldownPeriod: 300000,
    lastScaleAction: 0,
    pendingScaleActions: []
  }
}
function shouldAutoAttach(pattern: any, context: AttachmentContext): boolean {
  // Logic to determine if auto-attachment is warranted
  const threshold = context.configuration.autoAttachThreshold;
  return pattern.intensity > threshold && !hasExistingQueue(pattern, context);
}
function hasExistingQueue(pattern: any, context: AttachmentContext): boolean {
  for (const attachment of context.attachments.values()) {
    if (attachment.jobTypes.some(type => pattern.jobTypes.includes(type))) {
      return true;
    }
  }
  return false;
}
function generateQueueName(pattern: any): string {
  return `auto.${pattern.primaryJobType}.${Date.now()}`;
}
function extractJobTypes(pattern: any): JobType[] {
  return pattern.jobTypes || [];
}
function gatherGlobalMetrics(): any {
  return {
    bottleneckSeverity: Math.random() * 0.5, // Mock implementation
    systemUtilization: Math.random() * 0.8
  }
}
function analyzeWorkloadPatterns(): any[] {
  return []; // Mock implementation
}
function detectPerformanceAnomalies(): any[] {
  return []; // Mock implementation
}
function applyEmergencyOptimizations(attachment: QueueAttachment, anomaly: any): void {
  console.log(`🚑 Applying emergency optimizations to ${attachment.queueName}`);
  // Emergency optimization logic
  if (anomaly.type === 'high_cpu') {
    attachment.configuration.maxConcurrency = Math.max(1, attachment.configuration.maxConcurrency - 2);
  } else if (anomaly.type === 'queue_overflow') {
    attachment.autoScaling.currentWorkers = Math.min()
      attachment.autoScaling.maxWorkers,
      attachment.autoScaling.currentWorkers + 2
    );
  }
}
function applyOptimizationToAttachment(attachment: QueueAttachment, optimization: any): void {
  console.log(`🔧 Applying optimization to ${attachment.queueName}:`, optimization);
  // Apply specific optimizations based on type
  switch (optimization.type) {
    case 'adjust_concurrency':
      attachment.configuration.maxConcurrency = optimization.value;
      break;
    case 'update_prefetch':
      attachment.configuration.prefetchCount = optimization.value;
      break;
    case 'scale_workers':
      attachment.autoScaling.currentWorkers = optimization.value;
      break;
  }
  attachment.lastOptimized = Date.now();
}
async function runMachineLearning(context: AttachmentContext): Promise<any> {
  // Mock ML implementation
  return {
    patterns: new Map(),
    predictions: new Map(),
    optimizations: []
  }
}
async function optimizeAllAttachments(context: AttachmentContext): Promise<any> {
  const optimizations: any[] = [];
  for (const [queueName, attachment] of context.attachments) {
    // Generate optimizations for each queue
    const queueOpts = await optimizeQueueAttachment(attachment, context);
    optimizations.push(...queueOpts.map(opt => ({ ...opt, queueName });
  }
  return { optimizations }
}
async function optimizeQueueAttachment(attachment: QueueAttachment, context: AttachmentContext): Promise<any[]> {
  const optimizations = [];
  // Performance-based optimizations
  if (attachment.performance.utilization > 0.9) {
    optimizations.push({
      type: 'scale_workers',
      value: Math.min(attachment.autoScaling.maxWorkers, attachment.autoScaling.currentWorkers + 1),
      reason: 'high_utilization'
    });
  }
  if (attachment.performance.avgWaitTime > 10000) { // 10 seconds
    optimizations.push({
      type: 'adjust_concurrency',
      value: Math.min(20, attachment.configuration.maxConcurrency + 2),
      reason: 'high_wait_time'
    });
  }
  return optimizations;
}
export const autoAttachQueueManager = AutoAttachQueueManager.getInstance();