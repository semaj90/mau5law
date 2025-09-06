import type { RequestHandler } from './$types';

// TypeScript Error Optimizer API - Production Integration
// Integrates with enhanced Go service for GPU-accelerated TypeScript error processing

import type { 
	TypeScriptError, 
	AutoSolveRequest, 
	AutoSolveResponse,
	OptimizedFixRequest,
	OptimizedFixResponse 
} from '$lib/types/typescript-optimizer';

const ENHANCED_API_BASE_URL = 'http://localhost:8094';

/** POST /api/v1/typescript-optimizer - Auto-solve TypeScript errors */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as AutoSolveRequest;

		// Validate request
		if (!body.errors || !Array.isArray(body.errors)) {
			return json({ 
				success: false, 
				error: 'Invalid request: errors array required' 
			}, { status: 400 });
		}

		// Route to appropriate endpoint based on strategy
		const endpoint = determineEndpoint(body);
		const apiUrl = `${ENHANCED_API_BASE_URL}${endpoint}`;

		console.log(`🔧 TypeScript Optimizer: Processing ${body.errors.length} errors via ${endpoint}`);

		// Forward request to Go service
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`Go service responded with ${response.status}: ${response.statusText}`);
		}

		const result = await response.json() as AutoSolveResponse;

		// Enhance response with metadata
		const enhancedResult = {
			...result,
			metadata: {
				...result.metadata,
				processed_at: new Date().toISOString(),
				api_version: '2.0.0',
				go_service_url: apiUrl,
				sveltekit_integration: true,
				performance_tier: getPerformanceTier(body.errors.length),
			}
		};

		console.log(`✅ TypeScript Optimizer: ${result.fixes_applied} fixes applied, ${result.remaining_errors} remaining`);

		return json(enhancedResult);

	} catch (error: any) {
		console.error('TypeScript Optimizer Error:', error);
		
		return json({
			success: false,
			error: 'Internal server error during TypeScript optimization',
			details: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
		}, { status: 500 });
	}
};

/** GET /api/v1/typescript-optimizer - Get optimizer status */
export const GET: RequestHandler = async () => {
	try {
		// Check Go service health
		const healthResponse = await fetch(`${ENHANCED_API_BASE_URL}/api/health`);
		const healthData = healthResponse.ok ? await healthResponse.json() : null;

		// Get optimizer performance stats
		const performanceResponse = await fetch(`${ENHANCED_API_BASE_URL}/api/optimized/performance`);
		const performanceData = performanceResponse.ok ? await performanceResponse.json() : null;

		return json({
			service: 'TypeScript Error Optimizer',
			status: 'operational',
			version: '2.0.0',
			timestamp: new Date().toISOString(),
			go_service: {
				available: healthResponse.ok,
				health: healthData,
				url: ENHANCED_API_BASE_URL,
			},
			performance: performanceData,
			capabilities: {
				auto_solve: true,
				gpu_acceleration: true,
				go_llama_direct: true,
				batch_processing: true,
				optimization_layers: ['template_matching', 'gpu_kernels', 'caching'],
				max_concurrent_fixes: 50,
				supported_strategies: [
					'optimized',
					'gpu_first',
					'llama_thinking',
					'template_only',
					'hybrid'
				]
			},
			endpoints: {
				auto_solve: '/api/v1/typescript-optimizer',
				batch_fix: '/api/v1/typescript-optimizer/batch',
				gpu_accelerated: '/api/v1/typescript-optimizer/gpu',
				benchmark: '/api/v1/typescript-optimizer/benchmark'
			}
		});

	} catch (error: any) {
		return json({
			service: 'TypeScript Error Optimizer',
			status: 'degraded',
			error: 'Unable to connect to Go service',
			details: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
		}, { status: 503 });
	}
};

// Helper functions

function determineEndpoint(request: AutoSolveRequest): string {
	const errorCount = request.errors.length;
	const strategy = request.strategy?.toLowerCase() || 'auto';

	// Route to optimal endpoint based on request characteristics
	if (strategy === 'gpu_first' || errorCount >= 20) {
		return '/api/gpu/batch-process';
	}
	
	if (strategy === 'optimized' || errorCount >= 5) {
		return '/api/optimized/auto-solve';
	}
	
	if (request.use_thinking || strategy === 'llama_thinking') {
		return '/api/go-llama/batch';
	}
	
	// Default to enhanced auto-solver
	return '/api/auto-solve';
}

function getPerformanceTier(errorCount: number): string {
	if (errorCount >= 50) return 'enterprise';
	if (errorCount >= 20) return 'professional';
	if (errorCount >= 5) return 'standard';
	return 'basic';
}