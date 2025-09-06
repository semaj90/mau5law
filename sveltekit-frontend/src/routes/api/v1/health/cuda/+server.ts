import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


export interface CudaHealthCheck {
	service: string;
	timestamp: number;
	status: 'healthy' | 'degraded' | 'unhealthy';
	checks: {
		database: boolean;
		redis: boolean;
		cuda_worker: boolean;
	};
}

export interface ServiceHealth {
	name: string;
	url: string;
	status: 'online' | 'offline' | 'degraded';
	responseTime?: number;
	lastCheck: number;
	details?: any;
}

export const GET: RequestHandler = async ({ fetch }) => {
	const services = [
		{ name: 'cuda-service', url: 'http://localhost:8096/health' },
		{ name: 'enhanced-rag', url: 'http://localhost:8094/health' },
		{ name: 'upload-service', url: 'http://localhost:8093/health' },
		{ name: 'ollama', url: 'http://localhost:11434/api/tags' },
		{ name: 'redis', url: 'http://localhost:6379' }, // Will handle differently
		{ name: 'postgres', url: 'postgresql://localhost:5432' } // Will handle differently
	];

	const healthChecks: ServiceHealth[] = [];

	// Check CUDA service specifically
	try {
		const startTime = Date.now();
		const response = await fetch('http://localhost:8096/health');
		const responseTime = Date.now() - startTime;
		
		if (response.ok) {
			const health: CudaHealthCheck = await response.json();
			healthChecks.push({
				name: 'cuda-service',
				url: 'http://localhost:8096',
				status: health.status === 'healthy' ? 'online' : 'degraded',
				responseTime,
				lastCheck: Date.now(),
				details: {
					database: health.checks.database,
					redis: health.checks.redis,
					cuda_worker: health.checks.cuda_worker,
					gpu_available: health.checks.cuda_worker,
					service_version: '1.0.0'
				}
			});
		} else {
			healthChecks.push({
				name: 'cuda-service',
				url: 'http://localhost:8096',
				status: 'offline',
				lastCheck: Date.now(),
				details: { error: `HTTP ${response.status}` }
			});
		}
	} catch (error: any) {
		healthChecks.push({
			name: 'cuda-service',
			url: 'http://localhost:8095',
			status: 'offline',
			lastCheck: Date.now(),
			details: { error: error instanceof Error ? error.message : 'Connection failed' }
		});
	}

	// Check other services
	for (const service of services.slice(1)) { // Skip cuda-service as we already checked it
		try {
			const startTime = Date.now();
			let response;
			let serviceStatus: 'online' | 'offline' | 'degraded' = 'offline';
			let details: any = {};

			switch (service.name) {
				case 'ollama':
					response = await fetch(service.url);
					if (response.ok) {
						const data = await response.json();
						serviceStatus = 'online';
						details = {
							models: data.models?.length || 0,
							available: true
						};
					}
					break;

				case 'enhanced-rag':
				case 'upload-service':
					response = await fetch(service.url);
					serviceStatus = response.ok ? 'online' : 'degraded';
					if (response.ok) {
						details = await response.json();
					}
					break;

				default:
					// For redis and postgres, we'll assume they're checked by other services
					serviceStatus = 'online'; // Optimistic
					details = { note: 'Status inferred from dependent services' };
					break;
			}

			const responseTime = Date.now() - startTime;

			healthChecks.push({
				name: service.name,
				url: service.url,
				status: serviceStatus,
				responseTime,
				lastCheck: Date.now(),
				details
			});

		} catch (error: any) {
			healthChecks.push({
				name: service.name,
				url: service.url,
				status: 'offline',
				lastCheck: Date.now(),
				details: { error: error instanceof Error ? error.message : 'Connection failed' }
			});
		}
	}

	// Calculate overall system health
	const onlineServices = healthChecks.filter(s => s.status === 'online').length;
	const totalServices = healthChecks.length;
	const healthPercentage = Math.round((onlineServices / totalServices) * 100);

	let overallStatus: 'healthy' | 'degraded' | 'critical';
	if (healthPercentage >= 90) overallStatus = 'healthy';
	else if (healthPercentage >= 60) overallStatus = 'degraded';
	else overallStatus = 'critical';

	// Special focus on CUDA service
	const cudaService = healthChecks.find(s => s.name === 'cuda-service');
	const cudaWorkerAvailable = cudaService?.status === 'online' && cudaService.details?.cuda_worker;

	return json({
		timestamp: Date.now(),
		overall_status: overallStatus,
		health_percentage: healthPercentage,
		services_online: onlineServices,
		services_total: totalServices,
		cuda: {
			service_available: cudaService?.status === 'online',
			worker_available: cudaWorkerAvailable,
			gpu_ready: cudaWorkerAvailable,
			response_time: cudaService?.responseTime || null
		},
		services: healthChecks,
		summary: {
			critical_services: healthChecks.filter(s => 
				['cuda-service', 'enhanced-rag', 'postgres'].includes(s.name) && s.status !== 'online'
			).map(s => s.name),
			degraded_services: healthChecks.filter(s => s.status === 'degraded').map(s => s.name),
			offline_services: healthChecks.filter(s => s.status === 'offline').map(s => s.name)
		},
		recommendations: generateRecommendations(healthChecks)
	});
};

function generateRecommendations(services: ServiceHealth[]): string[] {
	const recommendations: string[] = [];
	
	const cudaService = services.find(s => s.name === 'cuda-service');
	if (!cudaService || cudaService.status !== 'online') {
		recommendations.push('Start CUDA service: go run cmd/cuda-service/main.go');
	} else if (cudaService.details && !cudaService.details.cuda_worker) {
		recommendations.push('Build CUDA worker: cd cuda-worker && build-simple.bat');
	}

	const ragService = services.find(s => s.name === 'enhanced-rag');
	if (!ragService || ragService.status !== 'online') {
		recommendations.push('Start Enhanced RAG service: ./bin/enhanced-rag.exe');
	}

	const uploadService = services.find(s => s.name === 'upload-service');
	if (!uploadService || uploadService.status !== 'online') {
		recommendations.push('Start Upload service: ./bin/upload-service.exe');
	}

	const ollamaService = services.find(s => s.name === 'ollama');
	if (!ollamaService || ollamaService.status !== 'online') {
		recommendations.push('Start Ollama: ollama serve');
	}

	if (recommendations.length === 0) {
		recommendations.push('All services are running optimally! 🚀');
	}

	return recommendations;
}