import type { RequestHandler } from './$types.js';

/*
 * Multi-Protocol API Gateway Integration
 * SvelteKit frontend integration with enhanced multi-protocol gateway
 * Provides intelligent routing and fallback capabilities
 */
import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';
import { URL } from "url";

// Protocol types and priorities
type ProtocolType = 'quic' | 'grpc' | 'http' | 'websocket';
type ProtocolPriority = 1 | 2 | 3 | 4;

// Protocol fallback request interface
export interface ProtocolFallbackRequest {
	service: string;
	preferred_protocol: ProtocolType;
	method: string;
	path: string;
	headers?: Record<string, string>;
	body?: any;
	metadata?: Record<string, any>;
	timeout?: number;
	max_retries?: number;
	enable_fallback: boolean;
}

// Protocol fallback response interface
export interface ProtocolFallbackResponse {
	success: boolean;
	status_code?: number;
	body?: any;
	headers?: Record<string, string>;
	protocol_used: ProtocolType;
	endpoint_used: string;
	fallback_level: number;
	attempt_count: number;
	total_latency: number;
	protocol_latency: number;
	error?: string;
	metadata?: Record<string, any>;
}

// Service endpoint information
export interface ServiceEndpoint {
	name: string;
	protocol: ProtocolType;
	priority: ProtocolPriority;
	address: string;
	port: number;
	path?: string;
	healthy: boolean;
	weight: number;
	load_factor: number;
	response_time: number;
	last_check: string;
	capabilities: string[];
	request_count: number;
	error_count: number;
	success_rate: number;
}

// Gateway configuration
const GATEWAY_CONFIG = {
	baseUrl: import.meta.env.GATEWAY_BASE_URL || 'http://localhost:8230',
	timeout: parseInt(import.meta.env.GATEWAY_TIMEOUT || '30000', 10),
	retryAttempts: parseInt(import.meta.env.GATEWAY_RETRY_ATTEMPTS || '3', 10),
	enableFallback: import.meta.env.GATEWAY_ENABLE_FALLBACK !== 'false',
};

// Protocol priority mapping
const PROTOCOL_PRIORITIES: Record<ProtocolType, ProtocolPriority> = {
	quic: 1,      // Highest priority - lowest latency
	grpc: 2,      // Second priority - high performance
	http: 3,      // Third priority - standard fallback
	websocket: 4  // Lowest priority - real-time specific
};

/*
 * GET /api/v1/multi-protocol - Get multi-protocol gateway status and services
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeMetrics = url.searchParams.get('metrics') === 'true';
		const serviceName = url.searchParams.get('service');
		const protocol = url.searchParams.get('protocol') as ProtocolType;

		// Fetch gateway health and services
		const [healthResponse, servicesResponse, metricsResponse] = await Promise.allSettled([
			fetchGatewayHealth(),
			fetchGatewayServices(),
			includeMetrics ? fetchGatewayMetrics() : Promise.resolve(null)
		]);

		const health = healthResponse.status === 'fulfilled' ? healthResponse.value : null;
		const services = servicesResponse.status === 'fulfilled' ? servicesResponse.value : null;
		const metrics = metricsResponse.status === 'fulfilled' ? metricsResponse.value : null;

		// Filter by service name if specified
		let filteredServices = services;
		if (serviceName && services) {
			filteredServices = {
				[serviceName]: services[serviceName] || []
			};
		}

		// Filter by protocol if specified
		if (protocol && filteredServices) {
			for (const [service, endpoints] of Object.entries(filteredServices)) {
				filteredServices[service] = (endpoints as ServiceEndpoint[]).filter(
					endpoint => endpoint.protocol === protocol
				);
			}
		}

		return json({
			gateway: {
				status: health?.status || 'unknown',
				protocols: health?.protocols || {},
				timestamp: new Date().toISOString()
			},
			services: filteredServices || {},
			metrics: metrics || null,
			config: {
				fallback_enabled: GATEWAY_CONFIG.enableFallback,
				timeout: GATEWAY_CONFIG.timeout,
				retry_attempts: GATEWAY_CONFIG.retryAttempts
			}
		});

	} catch (err: any) {
		console.error('Multi-protocol gateway status check failed:', err);
		error(500, ensureError({
			message: 'Failed to check gateway status',
			error: err instanceof Error ? err.message : 'Unknown error'
		}));
	}
};

/*
 * POST /api/v1/multi-protocol - Execute request with protocol fallback
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const requestData = await request.json();

		// Validate request structure
		const fallbackRequest = validateFallbackRequest(requestData);

		// Execute request with fallback through gateway
		const response = await executeProtocolFallback(fallbackRequest);

		// Determine HTTP status code based on response
		let statusCode = 200;
		if (!response.success) {
			statusCode = response.status_code || 500;
		}

		return json(response, { status: statusCode });

	} catch (err: any) {
		console.error('Multi-protocol request failed:', err);
		error(500, ensureError({
			message: 'Multi-protocol request failed',
			error: err instanceof Error ? err.message : 'Unknown error'
		}));
	}
};

/*
 * PUT /api/v1/multi-protocol/config - Update gateway configuration
 */
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const config = await request.json();

		// Update gateway configuration
		const response = await fetch(`${GATEWAY_CONFIG.baseUrl}/api/gateway/config`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(config),
			signal: AbortSignal.timeout(GATEWAY_CONFIG.timeout)
		});

		if (!response.ok) {
			throw new Error(`Gateway config update failed: ${response.status}`);
		}

		const result = await response.json();

		return json({
			success: true,
			message: 'Gateway configuration updated',
			config: result
		});

	} catch (err: any) {
		console.error('Gateway configuration update failed:', err);
		error(500, ensureError({
			message: 'Configuration update failed',
			error: err instanceof Error ? err.message : 'Unknown error'
		}));
	}
};

/*
 * DELETE /api/v1/multi-protocol/circuit-breaker/:service/:endpoint - Reset circuit breaker
 */
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const pathParts = url.pathname.split('/');
		const service = pathParts[pathParts.length - 2];
		const endpoint = pathParts[pathParts.length - 1];

		if (!service || !endpoint) {
			error(400, ensureError({ message: 'Service and endpoint are required' }));
		}

		const response = await fetch(
			`${GATEWAY_CONFIG.baseUrl}/api/circuit-breaker/reset/${service}/${endpoint}`,
			{
				method: 'POST',
				signal: AbortSignal.timeout(GATEWAY_CONFIG.timeout)
			}
		);

		if (!response.ok) {
			throw new Error(`Circuit breaker reset failed: ${response.status}`);
		}

		const result = await response.json();

		return json({
			success: true,
			message: 'Circuit breaker reset',
			service,
			endpoint,
			result
		});

	} catch (err: any) {
		console.error('Circuit breaker reset failed:', err);
		error(500, ensureError({
			message: 'Circuit breaker reset failed',
			error: err instanceof Error ? err.message : 'Unknown error'
		}));
	}
};

/*
 * Validate protocol fallback request
 */
function validateFallbackRequest(data: any): ProtocolFallbackRequest {
	if (!data.service || typeof data.service !== 'string') {
		throw new Error('Service name is required');
	}

	if (!data.method || typeof data.method !== 'string') {
		throw new Error('HTTP method is required');
	}

	const validProtocols: ProtocolType[] = ['quic', 'grpc', 'http', 'websocket'];
	const preferredProtocol = data.preferred_protocol || 'quic';

	if (!validProtocols.includes(preferredProtocol)) {
		throw new Error(`Invalid protocol. Must be one of: ${validProtocols.join(', ')}`);
	}

	return {
		service: data.service,
		preferred_protocol: preferredProtocol,
		method: data.method.toUpperCase(),
		path: data.path || '/',
		headers: data.headers || {},
		body: data.body,
		metadata: data.metadata || {},
		timeout: data.timeout || GATEWAY_CONFIG.timeout,
		max_retries: data.max_retries || GATEWAY_CONFIG.retryAttempts,
		enable_fallback: data.enable_fallback !== false
	};
}

/*
 * Execute protocol fallback request through gateway
 */
async function executeProtocolFallback(request: ProtocolFallbackRequest): Promise<ProtocolFallbackResponse> {
	const startTime = Date.now();

	try {
		const response = await fetch(`${GATEWAY_CONFIG.baseUrl}/api/gateway/fallback`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Request-ID': generateRequestId(),
				'X-Source': 'sveltekit-frontend'
			},
			body: JSON.stringify(request),
			signal: AbortSignal.timeout(request.timeout || GATEWAY_CONFIG.timeout)
		});

		const responseData = await response.json();
		const totalLatency = Date.now() - startTime;

		if (response.ok) {
			return {
				...responseData,
				total_latency: totalLatency
			};
		} else {
			return {
				success: false,
				status_code: response.status,
				protocol_used: 'http',
				endpoint_used: 'gateway',
				fallback_level: 0,
				attempt_count: 1,
				total_latency: totalLatency,
				protocol_latency: totalLatency,
				error: responseData.error || `Gateway error: ${response.status}`,
				metadata: { gateway_error: true }
			};
		}

	} catch (err: any) {
		const totalLatency = Date.now() - startTime;

		return {
			success: false,
			status_code: 500,
			protocol_used: 'http',
			endpoint_used: 'gateway',
			fallback_level: 0,
			attempt_count: 1,
			total_latency: totalLatency,
			protocol_latency: totalLatency,
			error: err instanceof Error ? err.message : 'Gateway communication failed',
			metadata: { gateway_communication_error: true }
		};
	}
}

/*
 * Fetch gateway health status
 */
async function fetchGatewayHealth(): Promise<any> {
	const response = await fetch(`${GATEWAY_CONFIG.baseUrl}/api/gateway/health`, {
		signal: AbortSignal.timeout(5000)
	});

	if (!response.ok) {
		throw new Error(`Gateway health check failed: ${response.status}`);
	}

	return await response.json();
}

/*
 * Fetch gateway services
 */
async function fetchGatewayServices(): Promise<any> {
	const response = await fetch(`${GATEWAY_CONFIG.baseUrl}/api/gateway/services`, {
		signal: AbortSignal.timeout(5000)
	});

	if (!response.ok) {
		throw new Error(`Gateway services fetch failed: ${response.status}`);
	}

	const data = await response.json();
	return data.services || {};
}

/*
 * Fetch gateway metrics
 */
async function fetchGatewayMetrics(): Promise<any> {
	const response = await fetch(`${GATEWAY_CONFIG.baseUrl}/api/gateway/metrics`, {
		signal: AbortSignal.timeout(5000)
	});

	if (!response.ok) {
		throw new Error(`Gateway metrics fetch failed: ${response.status}`);
	}

	return await response.json();
}

/*
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/*
 * Get optimal protocol for service based on requirements
 */
export function getOptimalProtocol(
	service: string,
	requirements: {
		latency?: 'low' | 'medium' | 'high';
		throughput?: 'low' | 'medium' | 'high';
		realtime?: boolean;
		reliability?: 'standard' | 'high';
	} = {}
): ProtocolType {
	const { latency = 'medium', throughput = 'medium', realtime = false, reliability = 'standard' } = requirements;

	// Real-time requirements typically need WebSocket
	if (realtime) {
		return 'websocket';
	}

	// High throughput + low latency = QUIC
	if (latency === 'low' && throughput === 'high') {
		return 'quic';
	}

	// High throughput + medium latency = gRPC
	if (throughput === 'high' && latency === 'medium') {
		return 'grpc';
	}

	// High reliability requirements = HTTP (most compatible)
	if (reliability === 'high') {
		return 'http';
	}

	// Default to QUIC for best performance
	return 'quic';
}

/*
 * Create protocol fallback chain based on service and requirements
 */
export function createFallbackChain(
	preferredProtocol: ProtocolType,
	serviceCapabilities: string[] = []
): ProtocolType[] {
	const allProtocols: ProtocolType[] = ['quic', 'grpc', 'http', 'websocket'];

	// Filter protocols based on service capabilities if provided
	const availableProtocols = serviceCapabilities.length > 0
		? allProtocols.filter(protocol => serviceCapabilities.includes(protocol))
		: allProtocols;

	// Create fallback chain with preferred protocol first
	const chain = [preferredProtocol];

	// Add remaining protocols in priority order
	const remaining = availableProtocols
		.filter(p => p !== preferredProtocol)
		.sort((a, b) => PROTOCOL_PRIORITIES[a] - PROTOCOL_PRIORITIES[b]);

	chain.push(...remaining);

	return chain;
}

/*
 * Protocol selection utility functions for frontend components
 */
export const ProtocolUtils = {
	getOptimalProtocol,
	createFallbackChain,

	/*
	 * Check if protocol is available for service
	 */
	isProtocolAvailable(services: Record<string, ServiceEndpoint[]>, serviceName: string, protocol: ProtocolType): boolean {
		const serviceEndpoints = services[serviceName] || [];
		return serviceEndpoints.some(endpoint => endpoint.protocol === protocol && endpoint.healthy);
	},

	/*
	 * Get best endpoint for service and protocol
	 */
	getBestEndpoint(services: Record<string, ServiceEndpoint[]>, serviceName: string, protocol: ProtocolType): ServiceEndpoint | null {
		const serviceEndpoints = services[serviceName] || [];
		const protocolEndpoints = serviceEndpoints.filter(
			endpoint => endpoint.protocol === protocol && endpoint.healthy
		);

		if (protocolEndpoints.length === 0) {
			return null;
		}

		// Sort by success rate and response time
		return protocolEndpoints.sort((a, b) => {
			const scoreA = a.success_rate * 0.7 + (1 / (a.response_time + 1)) * 0.3;
			const scoreB = b.success_rate * 0.7 + (1 / (b.response_time + 1)) * 0.3;
			return scoreB - scoreA;
		})[0];
	},

	/*
	 * Get protocol statistics
	 */
	getProtocolStats(services: Record<string, ServiceEndpoint[]>): Record<ProtocolType, {
		total: number;
		healthy: number;
		avg_response_time: number;
		avg_success_rate: number;
	}> {
		const stats: Record<string, any> = {};
		const protocolData: Record<ProtocolType, ServiceEndpoint[]> = {
			quic: [],
			grpc: [],
			http: [],
			websocket: []
		};

		// Collect endpoints by protocol
		Object.values(services).flat().forEach(endpoint => {
			protocolData[endpoint.protocol].push(endpoint);
		});

		// Calculate statistics
		Object.entries(protocolData).forEach(([protocol, endpoints]) => {
			const healthy = endpoints.filter(e => e.healthy);
			stats[protocol] = {
				total: endpoints.length,
				healthy: healthy.length,
				avg_response_time: healthy.length > 0
					? healthy.reduce((sum, e) => sum + e.response_time, 0) / healthy.length
					: 0,
				avg_success_rate: healthy.length > 0
					? healthy.reduce((sum, e) => sum + e.success_rate, 0) / healthy.length
					: 0
			};
		});

		return stats as Record<ProtocolType, any>;
	}
};