// YoRHa Interface Types
// Complete type definitions for the cyberpunk YoRHa legal AI interface system

// Core System Types

export interface SystemMetrics {
	cpu_usage: number;
	memory_usage: number;
	gpu_utilization: number;
	network_latency: number;
	active_processes: number;
	security_level: SecurityLevel;
	quantum_state: QuantumState;
	neural_activity: number;
}

export type SecurityLevel = 'MINIMUM' | 'STANDARD' | 'HIGH' | 'MAXIMUM' | 'CLASSIFIED';
export type QuantumState = 'COHERENT' | 'ENTANGLED' | 'SUPERPOSITION' | 'COLLAPSED' | 'UNSTABLE';
export type SystemStatus = 'ONLINE' | 'DEGRADED' | 'MAINTENANCE' | 'OFFLINE' | 'CRITICAL';

// Module System Types

export interface YoRHaModule {
	id: string;
	name: string;
	status: ModuleStatus;
	power: number; // 0-100
	description: string;
	icon: string;
	color: string;
	version?: string;
	last_update?: string;
	dependencies?: string[];
	error_count?: number;
	uptime_seconds?: number;
}

export type ModuleStatus =
	| 'ACTIVE'
	| 'STANDBY'
	| 'INACTIVE'
	| 'ERROR'
	| 'MAINTENANCE'
	| 'UPDATING'
	| 'MAXIMUM'
	| 'OFFLINE';

export interface ModuleConfiguration {
	auto_start: boolean;
	priority: number; // 1-10
	resource_allocation: ResourceAllocation;
	monitoring_enabled: boolean;
	logging_level: LogLevel;
	backup_enabled: boolean;
}

export interface ResourceAllocation {
	cpu_cores: number;
	memory_mb: number;
	gpu_memory_mb?: number;
	disk_space_mb: number;
	network_bandwidth_mbps: number;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

// Command System Types

export interface CommandResult {
	id: string;
	command: string;
	timestamp: string;
	status: CommandStatus;
	output: string;
	module: string;
	execution_time_ms?: number;
	data?: any;
	error_code?: string;
}

export type CommandStatus = 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';

export interface CommandContext {
	user_id: string;
	session_id: string;
	security_clearance: SecurityLevel;
	current_module?: string;
	environment_variables?: Record<string, string>;
}

export interface CommandDefinition {
	name: string;
	description: string;
	syntax: string;
	examples: string[];
	required_clearance: SecurityLevel;
	module: string;
	parameters: CommandParameter[];
}

export interface CommandParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required: boolean;
	description: string;
	default_value?: any;
	validation?: string; // regex pattern
}

// 3D Holographic Types

export interface HolographicData {
	id: string;
	type: HolographicType;
	position: Vector3D;
	rotation: Vector3D;
	scale: number;
	color: string;
	opacity: number;
	animation?: AnimationType;
	data?: any;
}

export type HolographicType =
	| 'sphere'
	| 'cube'
	| 'cylinder'
	| 'torus'
	| 'lines'
	| 'points'
	| 'mesh'
	| 'text'
	| 'particles';

export type AnimationType =
	| 'rotate'
	| 'pulse'
	| 'flow'
	| 'wave'
	| 'spiral'
	| 'orbit'
	| 'bounce'
	| 'static';

export interface Vector3D {
	x: number;
	y: number;
	z: number;
}

export interface HolographicScene {
	id: string;
	name: string;
	objects: HolographicData[];
	lighting: LightingConfig;
	camera: CameraConfig;
	effects: VisualEffect[];
}

export interface LightingConfig {
	ambient_color: string;
	ambient_intensity: number;
	directional_lights: DirectionalLight[];
	point_lights: PointLight[];
}

export interface DirectionalLight {
	direction: Vector3D;
	color: string;
	intensity: number;
	cast_shadows: boolean;
}

export interface PointLight {
	position: Vector3D;
	color: string;
	intensity: number;
	range: number;
	decay: number;
}

export interface CameraConfig {
	position: Vector3D;
	target: Vector3D;
	field_of_view: number;
	near_plane: number;
	far_plane: number;
	auto_rotate: boolean;
}

// Visual Effects Types

export interface VisualEffect {
	type: EffectType;
	enabled: boolean;
	intensity: number;
	parameters: Record<string, any>;
}

export type EffectType =
	| 'scanlines'
	| 'glitch'
	| 'hologram_flicker'
	| 'chromatic_aberration'
	| 'bloom'
	| 'distortion'
	| 'particle_system'
	| 'data_streams';

export interface ParticleSystem {
	particle_count: number;
	spawn_rate: number;
	lifetime: number;
	velocity: Vector3D;
	size: number;
	color: string;
	opacity: number;
	physics_enabled: boolean;
}

// Data Visualization Types

export interface DataVisualization {
	id: string;
	type: VisualizationType;
	title: string;
	data_source: string;
	config: VisualizationConfig;
	real_time: boolean;
	update_interval_ms?: number;
}

export type VisualizationType =
	| 'network_graph'
	| 'data_flow'
	| 'neural_network'
	| 'system_topology'
	| 'security_grid'
	| 'quantum_state'
	| 'legal_relationships';

export interface VisualizationConfig {
	width: number;
	height: number;
	interactive: boolean;
	color_scheme: string[];
	animation_speed: number;
	show_labels: boolean;
	show_connections: boolean;
}

// Neural Network Types

export interface NeuralNetworkState {
	total_nodes: number;
	active_nodes: number;
	connections: number;
	activity_level: number; // 0-100
	learning_rate: number;
	error_rate: number;
	training_status: TrainingStatus;
	model_accuracy: number;
}

export type TrainingStatus =
	| 'IDLE'
	| 'TRAINING'
	| 'VALIDATING'
	| 'TESTING'
	| 'OPTIMIZING'
	| 'COMPLETE'
	| 'ERROR';

export interface NeuralNode {
	id: string;
	layer: number;
	position: Vector3D;
	activation: number;
	bias: number;
	connections: NeuralConnection[];
	node_type: 'input' | 'hidden' | 'output';
}

export interface NeuralConnection {
	from_node: string;
	to_node: string;
	weight: number;
	active: boolean;
	signal_strength: number;
}

// Legal AI Specific Types

export interface LegalAISession {
	session_id: string;
	user_id: string;
	case_id?: string;
	started_at: string;
	last_activity: string;
	status: SessionStatus;
	query_count: number;
	processing_time_total: number;
	context: LegalContext;
}

export type SessionStatus = 'ACTIVE' | 'IDLE' | 'PAUSED' | 'TERMINATED' | 'ERROR';

export interface LegalContext {
	jurisdiction: string;
	practice_area: string[];
	case_type: string;
	priority_level: number;
	security_classification: SecurityLevel;
	related_cases: string[];
	key_entities: string[];
}

export interface LegalQuery {
	id: string;
	session_id: string;
	query_text: string;
	query_type: LegalQueryType;
	timestamp: string;
	processing_status: ProcessingStatus;
	confidence_score?: number;
	response?: LegalResponse;
}

export type LegalQueryType =
	| 'case_analysis'
	| 'document_review'
	| 'precedent_search'
	| 'risk_assessment'
	| 'compliance_check'
	| 'contract_analysis';

export type ProcessingStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface LegalResponse {
	id: string;
	query_id: string;
	content: string;
	confidence_score: number;
	sources: LegalSource[];
	recommendations: string[];
	risk_factors: RiskFactor[];
	processing_time_ms: number;
	model_used: string;
}

export interface LegalSource {
	id: string;
	type: 'case' | 'statute' | 'regulation' | 'precedent' | 'document';
	title: string;
	citation: string;
	relevance_score: number;
	excerpt?: string;
	url?: string;
}

export interface RiskFactor {
	category: string;
	description: string;
	severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	probability: number; // 0-1
	impact_score: number; // 0-10
	mitigation_strategies: string[];
}

// System Monitoring Types

export interface SystemAlert {
	id: string;
	type: AlertType;
	severity: AlertSeverity;
	module: string;
	message: string;
	timestamp: string;
	acknowledged: boolean;
	resolved: boolean;
	metadata?: Record<string, any>;
}

export type AlertType =
	| 'SYSTEM_ERROR'
	| 'PERFORMANCE_DEGRADATION'
	| 'SECURITY_BREACH'
	| 'RESOURCE_EXHAUSTION'
	| 'MODULE_FAILURE'
	| 'NETWORK_ISSUE'
	| 'DATA_INTEGRITY'
	| 'AUTHENTICATION_FAILURE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'EMERGENCY';

export interface PerformanceReport {
	timestamp: string;
	uptime_seconds: number;
	total_queries: number;
	avg_response_time_ms: number;
	error_rate: number;
	resource_utilization: ResourceUtilization;
	module_performance: ModulePerformance[];
	alerts_count: number;
}

export interface ResourceUtilization {
	cpu_percentage: number;
	memory_percentage: number;
	disk_percentage: number;
	network_bandwidth_percentage: number;
	gpu_percentage?: number;
}

export interface ModulePerformance {
	module_id: string;
	requests_processed: number;
	avg_processing_time_ms: number;
	error_count: number;
	success_rate: number;
	resource_usage: ResourceUtilization;
}

// User Interface Types

export interface UITheme {
	name: string;
	colors: ColorPalette;
	fonts: FontConfig;
	effects: EffectSettings;
	layout: LayoutConfig;
}

export interface ColorPalette {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	surface: string;
	text_primary: string;
	text_secondary: string;
	success: string;
	warning: string;
	error: string;
	hologram: string;
}

export interface FontConfig {
	primary_family: string;
	secondary_family: string;
	mono_family: string;
	base_size: string;
	heading_scale: number;
}

export interface EffectSettings {
	scanlines_enabled: boolean;
	scanlines_opacity: number;
	glitch_frequency: number;
	hologram_flicker: boolean;
	particle_density: number;
	animation_speed: number;
}

export interface LayoutConfig {
	sidebar_width: string;
	header_height: string;
	panel_spacing: string;
	border_radius: string;
	grid_columns: number;
}

// API Integration Types

export interface APIEndpoint {
	name: string;
	url: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	authentication_required: boolean;
	rate_limit?: number;
	timeout_ms: number;
	retry_attempts: number;
}

export interface APIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: string;
	request_id: string;
	processing_time_ms: number;
}

// WebGL and Rendering Types

export interface WebGLConfig {
	canvas_width: number;
	canvas_height: number;
	antialias: boolean;
	alpha: boolean;
	depth_test: boolean;
	stencil_test: boolean;
	preserve_drawing_buffer: boolean;
	power_preference: 'default' | 'high-performance' | 'low-power';
}

export interface ShaderProgram {
	id: string;
	vertex_shader: string;
	fragment_shader: string;
	uniforms: Record<string, any>;
	attributes: Record<string, number>;
}

export interface RenderObject {
	id: string;
	geometry: Geometry;
	material: Material;
	position: Vector3D;
	rotation: Vector3D;
	scale: Vector3D;
	visible: boolean;
}

export interface Geometry {
	vertices: Float32Array;
	indices?: Uint16Array;
	normals?: Float32Array;
	uvs?: Float32Array;
	colors?: Float32Array;
}

export interface Material {
	type: 'basic' | 'phong' | 'holographic' | 'particle';
	color: string;
	opacity: number;
	transparent: boolean;
	texture?: string;
	uniforms?: Record<string, any>;
}

// Utility Types

export type YoRHaEventType =
	| 'system_boot'
	| 'module_start'
	| 'module_stop'
	| 'command_executed'
	| 'alert_raised'
	| 'user_login'
	| 'user_logout'
	| 'data_updated';

export interface YoRHaEvent {
	type: YoRHaEventType;
	timestamp: string;
	source: string;
	data: any;
	user_id?: string;
	session_id?: string;
}

export interface ConfigurationOption {
	key: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	value: any;
	default_value: any;
	description: string;
	category: string;
	requires_restart: boolean;
	validation?: {
		min?: number;
		max?: number;
		pattern?: string;
		options?: any[];
	};
}

export interface SystemCapabilities {
	webgl_supported: boolean;
	webgl_version: string;
	gpu_vendor: string;
	max_texture_size: number;
	max_render_buffer_size: number;
	extensions: string[];
	performance_tier: 'low' | 'medium' | 'high' | 'maximum';
}

// Export collections for easy importing
export type YoRHaModuleStatus = ModuleStatus;
export type YoRHaSystemStatus = SystemStatus;
export type YoRHaSecurityLevel = SecurityLevel;
export type YoRHaCommandStatus = CommandStatus;