import type { RequestHandler } from './$types';

// TypeScript Batch Processor - High-Performance Batch Processing
// Optimized for processing large numbers of TypeScript errors

import type { 
	OptimizedFixRequest, 
	OptimizedFixResponse,
	TypeScriptError,
	BatchProcessingStats
} from '$lib/types/typescript-optimizer';

const ENHANCED_API_BASE_URL = 'http://localhost:8094';

/* POST /api/v1/typescript-optimizer/batch - Batch process TypeScript errors */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as OptimizedFixRequest;

		// Validate batch request
		if (!body.errors || !Array.isArray(body.errors)) {
			return json({ 
				success: false, 
				error: 'Invalid batch request: errors array required' 
			}, { status: 400 });
		}

		if (body.errors.length === 0) {
			return json({
				success: true,
				processed_count: 0,
				successful_count: 0,
				results: [],
				processing_stats: {
					total_time: 0,
					processed_count: 0,
					successful_count: 0
				},
				message: 'No errors to process'
			});
		}

		const startTime = Date.now();
		const errorCount = body.errors.length;

		console.log(`🚀 Batch Processor: Starting batch processing of ${errorCount} TypeScript errors`);

		// Auto-configure optimal settings for batch processing
		const optimizedRequest: OptimizedFixRequest = {
			...body,
			use_gpu: body.use_gpu ?? (errorCount >= 10), // Auto-enable GPU for large batches
			use_llama: body.use_llama ?? (errorCount < 50 && errorCount >= 5), // Llama for medium batches
			use_cache: body.use_cache ?? true,
			max_concurrency: body.max_concurrency ?? Math.min(errorCount, 8),
			target_latency: body.target_latency ?? (errorCount >= 20 ? 5 : 10), // ms per error
			quality_threshold: body.quality_threshold ?? 0.8
		};

		// Choose optimal endpoint based on batch characteristics
		const endpoint = selectOptimalEndpoint(optimizedRequest);
		const apiUrl = `${ENHANCED_API_BASE_URL}${endpoint}`;

		console.log(`⚡ Batch Processor: Using ${endpoint} with GPU=${optimizedRequest.use_gpu}, Llama=${optimizedRequest.use_llama}`);

		// Process batch with Go service
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(optimizedRequest),
		});

		if (!response.ok) {
			throw new Error(`Go service error ${response.status}: ${response.statusText}`);
		}

		const result = await response.json() as OptimizedFixResponse;
		const processingTime = Date.now() - startTime;

		// Calculate batch processing statistics
		const stats: BatchProcessingStats = {
			total_processing_time_ms: processingTime,
			go_service_time_ms: result.processing_stats?.total_time || 0,
			overhead_ms: processingTime - (result.processing_stats?.total_time || 0),
			throughput_errors_per_second: (errorCount / processingTime) * 1000,
			success_rate: (result.successful_count / result.processed_count) * 100,
			performance_grade: calculatePerformanceGrade(processingTime, errorCount, result.successful_count),
		};

		console.log(`✅ Batch Processor: Completed in ${processingTime}ms, ${result.successful_count}/${result.processed_count} successful (${stats.success_rate.toFixed(1)}%)`);

		// Enhanced response with batch-specific metadata
		const enhancedResult = {
			...result,
			batch_stats: stats,
			optimization_applied: {
				gpu_acceleration: optimizedRequest.use_gpu,
				llama_inference: optimizedRequest.use_llama,
				caching_enabled: optimizedRequest.use_cache,
				concurrency_level: optimizedRequest.max_concurrency,
				endpoint_used: endpoint,
				auto_optimization: true,
			},
			metadata: {
				...result.optimization_meta,
				batch_size: errorCount,
				processed_at: new Date().toISOString(),
				api_version: '2.0.0',
				performance_tier: getPerformanceTier(errorCount),
				sveltekit_batch_processor: true,
			}
		};

		return json(enhancedResult);

	} catch (error: any) {
		console.error('Batch Processing Error:', error);
		
		return json({
			success: false,
			error: 'Batch processing failed',
			details: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
			batch_processing: true,
		}, { status: 500 });
	}
};

// Helper functions

function selectOptimalEndpoint(request: OptimizedFixRequest): string {
	const errorCount = request.errors.length;
	
	// Ultra-high performance: GPU batch processing
	if (errorCount >= 100 || request.use_gpu) {
		return '/api/gpu/batch-process';
	}
	
	// High performance: Optimized batch processing
	if (errorCount >= 20) {
		return '/api/optimized/batch-fix';
	}
	
	// Medium performance: Go-Llama batch processing
	if (errorCount >= 5 && request.use_llama) {
		return '/api/go-llama/batch';
	}
	
	// Standard: Optimized auto-solver
	return '/api/optimized/auto-solve';
}

function calculatePerformanceGrade(processingTimeMs: number, errorCount: number, successfulCount: number): string {
	const avgTimePerError = processingTimeMs / errorCount;
	const successRate = (successfulCount / errorCount) * 100;
	
	// Grade based on speed and accuracy
	if (avgTimePerError <= 2 && successRate >= 95) return 'A+';
	if (avgTimePerError <= 5 && successRate >= 90) return 'A';
	if (avgTimePerError <= 10 && successRate >= 85) return 'B+';
	if (avgTimePerError <= 20 && successRate >= 80) return 'B';
	if (avgTimePerError <= 50 && successRate >= 70) return 'C';
	return 'D';
}

function getPerformanceTier(errorCount: number): string {
	if (errorCount >= 200) return 'ultra';
	if (errorCount >= 100) return 'enterprise';
	if (errorCount >= 50) return 'professional';
	if (errorCount >= 20) return 'standard';
	if (errorCount >= 5) return 'basic';
	return 'minimal';
}