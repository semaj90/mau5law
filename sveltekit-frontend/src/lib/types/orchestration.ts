// Service Orchestration Types
// Complete type definitions for managing 37 Go microservices

export type ServiceTier = 'core' | 'enhanced' | 'specialized' | 'infrastructure';

export type ServiceHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'starting' | 'stopping';

export type OrchestrationAction = 'start' | 'stop' | 'restart' | 'scale' | 'health_check' | 'deploy';

export type DeploymentStrategy = 'rolling' | 'blue_green' | 'canary' | 'immediate';

export type ScalingMode = 'manual' | 'auto' | 'predictive' | 'load_based';

// Core Configuration Types

export interface ServiceConfig {
	name: string;
	tier: ServiceTier;
	port: number;
	binary: string;
	critical?: boolean;
	dependencies?: string[];
	resource_requirements?: ResourceRequirements;
	scaling_config?: ScalingConfig;
	health_check_config?: HealthCheckConfig;
	environment?: Record<string, string>;
}

export interface ResourceRequirements {
	cpu_cores: number;
	memory_mb: number;
	disk_mb?: number;
	gpu_required?: boolean;
	network_bandwidth_mbps?: number;
}

export interface ScalingConfig {
	min_instances: number;
	max_instances: number;
	target_cpu_utilization: number;
	target_memory_utilization: number;
	scale_up_threshold: number;
	scale_down_threshold: number;
	cooldown_period_ms: number;
}

export interface HealthCheckConfig {
	endpoint?: string;
	interval_ms: number;
	timeout_ms: number;
	retries: number;
	grace_period_ms: number;
	failure_threshold: number;
	success_threshold: number;
}

// Status and Monitoring Types

export interface ServiceStatusDetail {
	name: string;
	status: ServiceHealth;
	health_score: number; // 0-100
	last_check: string;
	uptime?: number;
	response_time_ms?: number;
	error_count?: number;
	instances?: ServiceInstance[];
	error?: string;
	metadata?: Record<string, any>;
}

export interface ServiceInstance {
	id: string;
	status: ServiceHealth;
	pid?: number;
	port: number;
	cpu_usage: number;
	memory_usage_mb: number;
	started_at: string;
	health_score: number;
}

export interface HealthCheckReport {
	overall_health: string;
	total_services: number;
	healthy_services: number;
	degraded_services: number;
	unhealthy_services: number;
	services: Record<string, ServiceStatusDetail>;
	check_timestamp: string;
	system_metrics?: SystemMetrics;
	network_health?: NetworkHealth;
	resource_health?: ResourceHealth;
	dependency_health?: DependencyHealth;
	comprehensive?: boolean;
}

// Request/Response Types

export interface OrchestrationRequest {
	action: OrchestrationAction;
	services?: string[];
	options?: OrchestrationOptions;
	emergency?: boolean;
	priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface OrchestrationOptions {
	// Startup options
	tier_startup_delay?: boolean;
	health_check_required?: boolean;
	timeout_ms?: number;

	// Shutdown options
	graceful_shutdown?: boolean;
	force_kill?: boolean;

	// Scaling options
	scale_factor?: number;
	scaling_mode?: ScalingMode;

	// Deployment options
	deployment_strategy?: DeploymentStrategy;
	stop_on_failure?: boolean;
	rollback_on_failure?: boolean;

	// General options
	parallel_execution?: boolean;
	batch_size?: number;
	priority?: string;
}

// Performance and Metrics Types

export interface PerformanceMetrics {
	cpu_usage: number;
	memory_usage: any;
	disk_usage: any;
	network_io: any;
	service_response_times: Record<string, number>;
	error_rates: Record<string, number>;
	throughput: Record<string, number>;
	timestamp: string;
}

export interface SystemMetrics {
	cpu: {
		usage_percent: number;
		load_average: number[];
		cores: number;
	};
	memory: {
		total_mb: number;
		used_mb: number;
		free_mb: number;
		usage_percent: number;
	};
	disk: {
		total_gb: number;
		used_gb: number;
		free_gb: number;
		usage_percent: number;
		io_read_mbps: number;
		io_write_mbps: number;
	};
	network: {
		rx_mbps: number;
		tx_mbps: number;
		connections: number;
		errors: number;
	};
}

export interface NetworkHealth {
	connectivity: boolean;
	latency_ms: number;
	bandwidth_mbps: number;
	packet_loss_percent: number;
	dns_resolution_ms: number;
	external_connectivity: boolean;
}

export interface ResourceHealth {
	cpu_health: 'healthy' | 'warning' | 'critical';
	memory_health: 'healthy' | 'warning' | 'critical';
	disk_health: 'healthy' | 'warning' | 'critical';
	network_health: 'healthy' | 'warning' | 'critical';
	overall_score: number;
	alerts: ResourceAlert[];
}

export interface ResourceAlert {
	type: 'cpu' | 'memory' | 'disk' | 'network';
	level: 'warning' | 'critical';
	message: string;
	threshold: number;
	current_value: number;
	timestamp: string;
}

export interface DependencyHealth {
	database_connections: Record<string, boolean>;
	external_services: Record<string, boolean>;
	message_queues: Record<string, boolean>;
	cache_services: Record<string, boolean>;
	overall_dependency_health: 'healthy' | 'degraded' | 'critical';
}

// Capabilities and Configuration

export interface ServiceCapabilities {
	total_managed_services: number;
	service_tiers: string[];
	deployment_strategies: string[];
	scaling_modes: string[];
	health_monitoring: boolean;
	performance_monitoring: boolean;
	emergency_recovery: boolean;
	load_balancing: boolean;
	service_discovery: boolean;
	configuration_management: boolean;
}

export interface OrchestrationCapabilities extends ServiceCapabilities {
	max_concurrent_operations: number;
	supported_protocols: string[];
	auto_scaling: boolean;
	disaster_recovery: boolean;
	blue_green_deployment: boolean;
	canary_deployment: boolean;
	rollback_support: boolean;
}

// Emergency and Recovery Types

export interface EmergencyRecoveryContext {
	failure_type: 'service_crash' | 'network_partition' | 'resource_exhaustion' | 'cascade_failure' | 'unknown';
	failure_timestamp: string;
	affected_services: string[];
	failure_details: Record<string, any>;
	recovery_priority: 'low' | 'normal' | 'high' | 'critical';
	auto_recovery_enabled: boolean;
}

export interface RecoveryStrategy {
	strategy_name: string;
	actions: RecoveryAction[];
	estimated_recovery_time_ms: number;
	success_probability: number;
	rollback_available: boolean;
}

export interface RecoveryAction {
	action_type: 'restart_service' | 'scale_up' | 'failover' | 'traffic_redirect' | 'resource_cleanup';
	target_service?: string;
	parameters: Record<string, any>;
	timeout_ms: number;
	required: boolean;
}

// Load Balancing Types

export interface LoadBalancerConfig {
	algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash';
	health_check_enabled: boolean;
	sticky_sessions: boolean;
	connection_timeout_ms: number;
	retry_attempts: number;
}

export interface LoadBalancingRule {
	service_name: string;
	weight: number;
	priority: number;
	health_check_path?: string;
	backup_services: string[];
}

// Service Discovery Types

export interface ServiceRegistry {
	services: Map<string, RegisteredService>;
	last_updated: string;
	version: string;
}

export interface RegisteredService {
	name: string;
	address: string;
	port: number;
	protocol: 'http' | 'https' | 'grpc' | 'tcp';
	health_check_url?: string;
	metadata: Record<string, any>;
	tags: string[];
	registered_at: string;
	last_heartbeat: string;
}

// Monitoring and Alerting Types

export interface MonitoringRule {
	rule_id: string;
	service_name: string;
	metric_name: string;
	threshold: number;
	comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
	duration_ms: number;
	alert_level: 'info' | 'warning' | 'error' | 'critical';
	notification_channels: string[];
	enabled: boolean;
}

export interface Alert {
	alert_id: string;
	rule_id: string;
	service_name: string;
	message: string;
	level: 'info' | 'warning' | 'error' | 'critical';
	timestamp: string;
	acknowledged: boolean;
	resolved: boolean;
	metadata: Record<string, any>;
}

// Deployment Types

export interface DeploymentPlan {
	plan_id: string;
	services: string[];
	strategy: DeploymentStrategy;
	stages: DeploymentStage[];
	rollback_plan: RollbackPlan;
	estimated_duration_ms: number;
	risk_level: 'low' | 'medium' | 'high';
}

export interface DeploymentStage {
	stage_id: string;
	stage_name: string;
	services: string[];
	dependencies: string[];
	actions: DeploymentAction[];
	success_criteria: SuccessCriteria[];
	timeout_ms: number;
}

export interface DeploymentAction {
	action_type: 'stop_service' | 'start_service' | 'update_config' | 'health_check' | 'smoke_test';
	service_name?: string;
	parameters: Record<string, any>;
	timeout_ms: number;
}

export interface SuccessCriteria {
	criteria_type: 'health_check' | 'response_time' | 'error_rate' | 'custom';
	threshold: number;
	duration_ms: number;
}

export interface RollbackPlan {
	automatic_rollback: boolean;
	rollback_triggers: string[];
	rollback_actions: DeploymentAction[];
	rollback_timeout_ms: number;
}

// Configuration Management Types

export interface ConfigurationTemplate {
	template_id: string;
	template_name: string;
	service_type: string;
	parameters: ConfigParameter[];
	default_values: Record<string, any>;
	validation_rules: ValidationRule[];
}

export interface ConfigParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required: boolean;
	description: string;
	default_value?: any;
	validation?: string; // regex pattern
}

export interface ValidationRule {
	field: string;
	rule: string;
	message: string;
}

export interface ServiceConfiguration {
	service_name: string;
	configuration: Record<string, any>;
	version: string;
	applied_at: string;
	applied_by: string;
	checksum: string;
}

// Orchestration Events and Logging

export interface OrchestrationEvent {
	event_id: string;
	event_type: 'service_start' | 'service_stop' | 'deployment' | 'scaling' | 'health_check' | 'alert';
	service_name?: string;
	timestamp: string;
	details: Record<string, any>;
	severity: 'debug' | 'info' | 'warning' | 'error';
}

export interface OrchestrationLog {
	log_id: string;
	timestamp: string;
	level: 'debug' | 'info' | 'warning' | 'error';
	service: string;
	message: string;
	metadata: Record<string, any>;
}

// Utility Types

export type OrchestrationResult<T = any> = {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: string;
	duration_ms?: number;
	metadata?: Record<string, any>;
};

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	per_page: number;
	has_more: boolean;
}

export interface ServiceFilter {
	tier?: ServiceTier[];
	status?: ServiceHealthStatus[];
	name_pattern?: string;
	tags?: string[];
	critical_only?: boolean;
}

export interface ServiceSort {
	field: 'name' | 'status' | 'health_score' | 'uptime' | 'last_check';
	direction: 'asc' | 'desc';
}