
/**
 * LLM Provider and Multi-Agent System Types
 * Comprehensive type definitions for the AI orchestration system
 */

// Core LLM Provider Types
export interface LLMProvider {
	id: string;
	name: string;
	type: 'ollama' | 'vllm' | 'autogen' | 'crewai' | 'openai' | 'anthropic';
	endpoint: string;
	models: LLMModel[];
	capabilities: LLMCapability[];
	status: LLMStatus;
	performance?: PerformanceMetrics;
	config?: LLMProviderConfig;
}

export interface LLMModel {
	id: string;
	name: string;
	displayName: string;
	size: string;
	specialization: ModelSpecialization;
	performance: PerformanceMetrics;
	parameters?: ModelParameters;
	supportedFormats?: string[];
	contextWindow?: number;
}

export interface LLMProviderConfig {
	maxConcurrentRequests?: number;
	timeout?: number;
	retryAttempts?: number;
	apiKey?: string;
	customHeaders?: Record<string, string>;
	rateLimit?: {
		requestsPerMinute: number;
		tokensPerMinute: number;
	};
}

export interface PerformanceMetrics {
	avgResponseTime: number; // milliseconds
	tokensPerSecond: number;
	memoryUsage: string;
	uptime: number; // percentage
	throughput?: number;
	latency?: {
		p50: number;
		p95: number;
		p99: number;
	};
	errorRate?: number;
}

// Status and Capability Types
export type LLMStatus = 'online' | 'offline' | 'busy' | 'loading' | 'error' | 'maintenance';

export type LLMCapability = 
	| 'text-generation' 
	| 'embeddings' 
	| 'chat' 
	| 'completion'
	| 'streaming'
	| 'function-calling'
	| 'multi-agent'
	| 'code-execution'
	| 'high-throughput'
	| 'batch-processing'
	| 'role-based'
	| 'collaborative'
	| 'workflow'
	| 'reasoning'
	| 'legal-analysis'
	| 'document-processing';

export type ModelSpecialization = 
	| 'general' 
	| 'legal' 
	| 'code' 
	| 'reasoning'
	| 'chat'
	| 'embedding'
	| 'analysis'
	| 'medical'
	| 'financial'
	| 'technical';

// Model Parameters
export interface ModelParameters {
	temperature?: number;
	topP?: number;
	topK?: number;
	maxTokens?: number;
	presencePenalty?: number;
	frequencyPenalty?: number;
	stopSequences?: string[];
}

// Multi-Agent System Types
export interface AgentDefinition {
	id: string;
	name: string;
	role: string;
	description: string;
	llmProvider: string;
	systemPrompt: string;
	tools: AgentTool[];
	collaborators: string[];
	capabilities: AgentCapability[];
	config: AgentConfig;
}

export interface AgentTool {
	id: string;
	name: string;
	description: string;
	parameters: ToolParameter[];
	required: boolean;
}

export interface ToolParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	description: string;
	required: boolean;
	default?: unknown;
}

export interface LLMAgentConfig {
	maxIterations?: number;
	timeout?: number;
	memorySize?: number;
	collaborationMode?: 'sequential' | 'parallel' | 'hierarchical';
	debugMode?: boolean;
}

export type AgentCapability = 
	| 'research'
	| 'analysis'
	| 'writing'
	| 'coding'
	| 'review'
	| 'planning'
	| 'execution'
	| 'monitoring'
	| 'legal-research'
	| 'document-analysis'
	| 'case-preparation';

// Agent Team and Workflow Types
export interface AgentTeam {
	id: string;
	name: string;
	description: string;
	purpose: string;
	agents: AgentDefinition[];
	workflow: WorkflowStep[];
	coordinator: string;
	status: TeamStatus;
	metrics?: TeamMetrics;
}

export interface WorkflowStep {
	id: string;
	name: string;
	description: string;
	agent: string;
	dependencies: string[];
	inputs: WorkflowInput[];
	outputs: WorkflowOutput[];
	condition?: WorkflowCondition;
	retry?: RetryConfig;
}

export interface WorkflowInput {
	name: string;
	type: string;
	source: 'user' | 'previous_step' | 'external';
	required: boolean;
}

export interface WorkflowOutput {
	name: string;
	type: string;
	destination: 'next_step' | 'user' | 'storage';
}

export interface WorkflowCondition {
	type: 'if' | 'unless' | 'switch';
	expression: string;
	branches: WorkflowBranch[];
}

export interface WorkflowBranch {
	condition: string;
	nextStep: string;
}

export interface RetryConfig {
	maxAttempts: number;
	backoffStrategy: 'linear' | 'exponential';
	backoffBase: number;
}

export type TeamStatus = 'idle' | 'active' | 'paused' | 'completed' | 'error';

export interface TeamMetrics {
	tasksCompleted: number;
	averageTaskTime: number;
	successRate: number;
	collaborationEfficiency: number;
}

// Task and Execution Types
export interface AITaskRequest {
	type: AITaskType;
	priority: TaskPriority;
	provider: string;
	payload: any;
	metadata?: TaskMetadata;
	requirements?: TaskRequirements;
}

export type AITaskType = 
	| 'embedding'
	| 'generation'
	| 'analysis'
	| 'synthesis'
	| 'vector-search'
	| 'agent-workflow'
	| 'multi-agent-collaboration'
	| 'document-processing'
	| 'legal-research';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskMetadata {
	userId?: string;
	sessionId?: string;
	timestamp: number;
	estimatedDuration?: number;
	tags?: string[];
	context?: Record<string, any>;
}

export interface TaskRequirements {
	maxExecutionTime?: number;
	qualityThreshold?: number;
	outputFormat?: 'json' | 'markdown' | 'text' | 'html';
	streaming?: boolean;
	caching?: boolean;
}

// Response and Result Types
export interface AITaskResponse {
	taskId: string;
	success: boolean;
	result?: unknown;
	error?: string;
	duration: number;
	metrics?: ResponseMetrics;
	metadata?: ResponseMetadata;
}

export interface ResponseMetrics {
	tokensProcessed?: number;
	memoryUsed?: string;
	throughput?: number;
	qualityScore?: number;
	confidence?: number;
}

export interface ResponseMetadata {
	model?: string;
	provider?: string;
	version?: string;
	timestamp: number;
	processingSteps?: ProcessingStep[];
}

export interface ProcessingStep {
	id: string;
	name: string;
	duration: number;
	status: 'completed' | 'failed' | 'skipped';
	output?: unknown;
}

// System Health and Monitoring Types
export interface SystemHealth {
	overall: HealthStatus;
	providers: ProviderHealth[];
	workers: WorkerHealth[];
	queue: QueueHealth;
	resources: ResourceHealth;
	timestamp: number;
}

export interface ProviderHealth {
	providerId: string;
	status: LLMStatus;
	responseTime: number;
	errorRate: number;
	availability: number;
	load: number;
}

export interface WorkerHealth {
	workerId: string;
	type: string;
	status: 'idle' | 'busy' | 'error' | 'offline';
	tasksCompleted: number;
	averageTaskTime: number;
	load: number;
	memoryUsage: string;
}

export interface QueueHealth {
	totalTasks: number;
	pendingTasks: number;
	processingTasks: number;
	averageWaitTime: number;
	throughput: number;
}

export interface ResourceHealth {
	cpuUsage: number;
	memoryUsage: number;
	diskUsage: number;
	networkLatency: number;
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'down';

// Configuration and Settings Types
export interface AISystemConfig {
	providers: LLMProviderConfig[];
	workers: WorkerConfig;
	queue: QueueConfig;
	monitoring: MonitoringConfig;
	security: SecurityConfig;
}

export interface WorkerConfig {
	maxWorkers: number;
	workerTypes: WorkerTypeConfig[];
	loadBalancing: LoadBalancingConfig;
}

export interface WorkerTypeConfig {
	type: string;
	count: number;
	capabilities: string[];
	maxConcurrentTasks: number;
}

export interface LoadBalancingConfig {
	strategy: 'round-robin' | 'least-loaded' | 'capability-based';
	healthCheckInterval: number;
	failoverEnabled: boolean;
}

export interface QueueConfig {
	maxSize: number;
	priorityLevels: number;
	retentionTime: number;
	batchProcessing: boolean;
}

export interface MonitoringConfig {
	metricsInterval: number;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
	alerting: AlertingConfig;
}

export interface AlertingConfig {
	enabled: boolean;
	thresholds: AlertThreshold[];
	channels: AlertChannel[];
}

export interface AlertThreshold {
	metric: string;
	operator: '>' | '<' | '=' | '>=' | '<=';
	value: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertChannel {
	type: 'email' | 'slack' | 'webhook' | 'sms';
	endpoint: string;
	enabled: boolean;
}

export interface SecurityConfig {
	apiKeyValidation: boolean;
	rateLimiting: RateLimitConfig;
	encryption: EncryptionConfig;
	audit: AuditConfig;
}

export interface RateLimitConfig {
	enabled: boolean;
	requestsPerMinute: number;
	tokensPerMinute: number;
	burstLimit: number;
}

export interface EncryptionConfig {
	inTransit: boolean;
	atRest: boolean;
	keyRotation: boolean;
	algorithm: string;
}

export interface AuditConfig {
	enabled: boolean;
	logRequests: boolean;
	logResponses: boolean;
	retentionDays: number;
}