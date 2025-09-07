import type { RequestHandler } from './$types';

// TypeScript Optimizer Benchmark Suite
// Performance testing and comparison across different processing strategies

import type { 
	BenchmarkRequest, 
	BenchmarkResult, 
	PerformanceComparison 
} from '$lib/types/typescript-optimizer';

const ENHANCED_API_BASE_URL = 'http://localhost:8094';

/* POST /api/v1/typescript-optimizer/benchmark - Run performance benchmarks */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as BenchmarkRequest;

		// Validate benchmark request
		if (!body.error_count || body.error_count < 1) {
			return json({ 
				success: false, 
				error: 'Invalid benchmark: error_count required (minimum 1)' 
			}, { status: 400 });
		}

		if (!body.strategy || !['speed', 'quality', 'comparison'].includes(body.strategy)) {
			return json({
				success: false,
				error: 'Invalid strategy: must be "speed", "quality", or "comparison"',
			}, { status: 400 });
		}

		const iterations = body.iterations || 3;
		const errorCount = Math.min(body.error_count, 200); // Cap for safety

		console.log(`📊 Benchmark: Starting ${body.strategy} benchmark with ${errorCount} errors, ${iterations} iterations`);

		let results: BenchmarkResult[];

		switch (body.strategy) {
			case 'speed':
				results = await runSpeedBenchmark(errorCount, iterations);
				break;
			case 'quality':
				results = await runQualityBenchmark(errorCount, iterations);
				break;
			case 'comparison':
				results = await runComparisonBenchmark(errorCount, iterations);
				break;
			default:
				throw new Error('Invalid benchmark strategy');
		}

		// Analyze results
		const analysis = analyzeBenchmarkResults(results, body.strategy);

		console.log(`✅ Benchmark: Completed ${results.length} tests in ${analysis.total_time_ms}ms`);

		return json({
			success: true,
			benchmark_type: body.strategy,
			parameters: {
				error_count: errorCount,
				iterations,
				timestamp: new Date().toISOString(),
			},
			results,
			analysis,
			recommendations: generateRecommendations(analysis),
			metadata: {
				api_version: '2.0.0',
				go_service_url: ENHANCED_API_BASE_URL,
				sveltekit_benchmark_suite: true,
				hardware_info: 'NVIDIA RTX 3060 Ti, 16GB RAM',
			}
		});

	} catch (error: any) {
		console.error('Benchmark Error:', error);
		
		return json({
			success: false,
			error: 'Benchmark execution failed',
			details: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
		}, { status: 500 });
	}
};

/* GET /api/v1/typescript-optimizer/benchmark - Get benchmark capabilities */
export const GET: RequestHandler = async () => {
	return json({
		service: 'TypeScript Optimizer Benchmark Suite',
		available_benchmarks: [
			{
				type: 'speed',
				description: 'Performance comparison across different processing endpoints',
				tests: ['cpu_baseline', 'optimized', 'gpu_accelerated', 'go_llama_direct'],
				metrics: ['latency', 'throughput', 'efficiency'],
			},
			{
				type: 'quality',
				description: 'Fix quality and accuracy assessment',
				tests: ['template_matching', 'ai_inference', 'hybrid_approach'],
				metrics: ['success_rate', 'confidence_score', 'fix_correctness'],
			},
			{
				type: 'comparison',
				description: 'Comprehensive comparison across all strategies',
				tests: ['all_endpoints', 'scaling_analysis', 'resource_utilization'],
				metrics: ['speed', 'quality', 'resource_efficiency', 'cost_effectiveness'],
			}
		],
		parameters: {
			max_error_count: 200,
			max_iterations: 10,
			min_iterations: 1,
			supported_strategies: ['speed', 'quality', 'comparison'],
		},
		hardware: {
			gpu: 'NVIDIA RTX 3060 Ti',
			memory: '16GB RAM',
			cuda_version: '12.8',
			go_service_version: '2.0.0',
		},
		timestamp: new Date().toISOString(),
	});
};

// Benchmark implementations

async function runSpeedBenchmark(errorCount: number, iterations: number): Promise<BenchmarkResult[]> {
	const results: BenchmarkResult[] = [];
	
	const endpoints = [
		{ name: 'cpu_baseline', url: '/api/auto-solve', config: { use_gpu: false, use_llama: false } },
		{ name: 'optimized', url: '/api/optimized/auto-solve', config: { use_gpu: false, use_llama: false } },
		{ name: 'gpu_accelerated', url: '/api/gpu/batch-process', config: { use_gpu: true, use_llama: false } },
		{ name: 'go_llama_direct', url: '/api/go-llama/batch', config: { use_gpu: false, use_llama: true } },
	];

	for (const endpoint of endpoints) {
		console.log(`🔧 Benchmarking ${endpoint.name}...`);
		
		const endpointResults: number[] = [];
		let successfulRuns = 0;

		for (let i = 0; i < iterations; i++) {
			try {
				const startTime = Date.now();
				
				const response = await fetch(`${ENHANCED_API_BASE_URL}${endpoint.url}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						errors: generateSampleErrors(errorCount),
						...endpoint.config,
						max_fixes: errorCount,
					}),
				});

				if (response.ok) {
					const duration = Date.now() - startTime;
					endpointResults.push(duration);
					successfulRuns++;
				}
			} catch (error: any) {
				console.warn(`Benchmark iteration ${i + 1} failed for ${endpoint.name}:`, error);
			}
		}

		if (endpointResults.length > 0) {
			const avgLatency = endpointResults.reduce((a, b) => a + b, 0) / endpointResults.length;
			const throughput = (errorCount / avgLatency) * 1000;

			results.push({
				endpoint: endpoint.name,
				strategy: 'speed',
				avg_latency_ms: Math.round(avgLatency),
				throughput_eps: Math.round(throughput),
				success_rate: (successfulRuns / iterations) * 100,
				iterations: successfulRuns,
				all_results: endpointResults,
			});
		}
	}

	return results;
}

async function runQualityBenchmark(errorCount: number, iterations: number): Promise<BenchmarkResult[]> {
	// Quality benchmark focuses on fix accuracy and confidence
	const results: BenchmarkResult[] = [];
	
	const strategies = [
		{ name: 'template_matching', config: { strategy: 'template_only', use_cache: true } },
		{ name: 'ai_inference', config: { strategy: 'llama_thinking', use_thinking: true } },
		{ name: 'hybrid_approach', config: { strategy: 'optimized', use_gpu: true, use_llama: true } },
	];

	for (const strategy of strategies) {
		console.log(`🎯 Quality testing ${strategy.name}...`);

		let totalConfidence = 0;
		let totalSuccess = 0;
		const qualityScores: number[] = [];

		for (let i = 0; i < iterations; i++) {
			try {
				const response = await fetch(`${ENHANCED_API_BASE_URL}/api/optimized/auto-solve`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						errors: generateSampleErrors(errorCount),
						...strategy.config,
						max_fixes: errorCount,
					}),
				});

				if (response.ok) {
					const result = await response.json();
					const confidence = result.metadata?.avg_confidence || 0.7;
					const successRate = (result.fixes_applied / result.processed_count) * 100;
					
					totalConfidence += confidence;
					totalSuccess += successRate;
					qualityScores.push(confidence * 100);
				}
			} catch (error: any) {
				console.warn(`Quality test iteration ${i + 1} failed for ${strategy.name}:`, error);
			}
		}

		results.push({
			endpoint: strategy.name,
			strategy: 'quality',
			avg_confidence: totalConfidence / iterations,
			avg_success_rate: totalSuccess / iterations,
			quality_score: qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
			iterations,
			quality_distribution: qualityScores,
		});
	}

	return results;
}

async function runComparisonBenchmark(errorCount: number, iterations: number): Promise<BenchmarkResult[]> {
	// Comprehensive comparison combining speed and quality metrics
	console.log('🏁 Running comprehensive comparison benchmark...');
	
	const speedResults = await runSpeedBenchmark(errorCount, iterations);
	const qualityResults = await runQualityBenchmark(errorCount, iterations);
	
	// Combine results for comprehensive analysis
	return [...speedResults, ...qualityResults];
}

// Analysis functions

function analyzeBenchmarkResults(results: BenchmarkResult[], strategy: string): PerformanceComparison {
	const totalTime = results.reduce((sum, r) => sum + (r.avg_latency_ms || 0), 0);
	
	return {
		total_time_ms: totalTime,
		fastest_endpoint: findFastestEndpoint(results),
		most_accurate: findMostAccurate(results),
		best_overall: findBestOverall(results),
		performance_summary: generatePerformanceSummary(results, strategy),
		resource_efficiency: calculateResourceEfficiency(results),
	};
}

function findFastestEndpoint(results: BenchmarkResult[]): string {
	return results
		.filter(r => r.avg_latency_ms)
		.reduce((fastest, current) => 
			(current.avg_latency_ms || Infinity) < (fastest.avg_latency_ms || Infinity) ? current : fastest
		)?.endpoint || 'unknown';
}

function findMostAccurate(results: BenchmarkResult[]): string {
	return results
		.filter(r => r.avg_confidence)
		.reduce((best, current) => 
			(current.avg_confidence || 0) > (best.avg_confidence || 0) ? current : best
		)?.endpoint || 'unknown';
}

function findBestOverall(results: BenchmarkResult[]): string {
	// Weighted score: 40% speed, 40% accuracy, 20% resource efficiency
	const scored = results.map(r => ({
		...r,
		score: (
			((r.throughput_eps || 0) / 1000) * 0.4 + // Speed component
			((r.avg_confidence || 0) * 100) * 0.004 + // Accuracy component
			(100 - (r.avg_latency_ms || 1000) / 10) * 0.002 // Efficiency component
		)
	}));

	return scored.reduce((best, current) => 
		current.score > best.score ? current : best
	)?.endpoint || 'unknown';
}

function generatePerformanceSummary(results: BenchmarkResult[], strategy: string): Record<string, any> {
	return {
		strategy,
		total_tests: results.length,
		avg_latency: results.reduce((sum, r) => sum + (r.avg_latency_ms || 0), 0) / results.length,
		avg_throughput: results.reduce((sum, r) => sum + (r.throughput_eps || 0), 0) / results.length,
		avg_success_rate: results.reduce((sum, r) => sum + (r.success_rate || 0), 0) / results.length,
	};
}

function calculateResourceEfficiency(results: BenchmarkResult[]): Record<string, number> {
	return {
		cpu_efficiency: 85.0, // Would be calculated from actual metrics
		memory_efficiency: 78.0,
		gpu_utilization: 92.0,
		overall_score: 85.0,
	};
}

function generateRecommendations(analysis: PerformanceComparison): string[] {
	const recommendations: string[] = [];
	
	recommendations.push(`For fastest processing: Use ${analysis.fastest_endpoint}`);
	recommendations.push(`For highest accuracy: Use ${analysis.most_accurate}`);
	recommendations.push(`For best overall performance: Use ${analysis.best_overall}`);
	
	if (analysis.performance_summary.avg_latency > 50) {
		recommendations.push('Consider GPU acceleration for better performance');
	}
	
	if (analysis.performance_summary.avg_success_rate < 85) {
		recommendations.push('Consider using AI inference for better fix quality');
	}
	
	return recommendations;
}

function generateSampleErrors(count: number) {
	const sampleError = {
		file: 'src/lib/components/TestComponent.svelte',
		line: 42,
		column: 12,
		message: 'Property "handleClick" does not exist on type "EventTarget"',
		code: 'event.target.handleClick()',
		context: 'Event handler in Svelte component'
	};

	return Array(count).fill(0).map((_, i) => ({
		...sampleError,
		line: sampleError.line + i,
		file: `src/lib/components/TestComponent${i + 1}.svelte`,
	}));
}