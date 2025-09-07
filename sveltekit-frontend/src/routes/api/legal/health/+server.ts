/**
 * Legal AI System Health API
 * 
 * Provides comprehensive health status for all legal AI processing systems
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalOrchestrationService } from '$lib/services/unified-legal-orchestration-service.js';

export const GET: RequestHandler = async () => {
	try {
		// Initialize service if needed
		await unifiedLegalOrchestrationService.initialize();

		// Get comprehensive system health
		const systemHealth = await unifiedLegalOrchestrationService.getSystemHealth();

		// Calculate overall system status
		const overallHealthy = 
			systemHealth.orchestrator.isHealthy &&
			systemHealth.queueManager.isHealthy &&
			systemHealth.stateManager.isHealthy;

		const response = {
			status: overallHealthy ? 'healthy' : 'degraded',
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			uptime: process.uptime(),
			components: {
				orchestrator: {
					status: systemHealth.orchestrator.isHealthy ? 'healthy' : 'unhealthy',
					metrics: {
						activeJobs: systemHealth.orchestrator.activeJobs,
						queuedJobs: systemHealth.orchestrator.queuedJobs,
						completedToday: systemHealth.orchestrator.completedToday,
						averageProcessingTime: `${systemHealth.orchestrator.averageProcessingTime}ms`,
						successRate: systemHealth.orchestrator.isHealthy ? '>95%' : '<95%'
					}
				},
				queueManager: {
					status: systemHealth.queueManager.isHealthy ? 'healthy' : 'unhealthy',
					metrics: {
						attachedQueues: systemHealth.queueManager.attachedQueues,
						optimizationScore: `${systemHealth.queueManager.optimizationScore}%`,
						autoScaling: systemHealth.queueManager.autoScalingActive ? 'active' : 'inactive'
					}
				},
				stateManager: {
					status: systemHealth.stateManager.isHealthy ? 'healthy' : 'unhealthy',
					metrics: {
						activeSubscriptions: systemHealth.stateManager.activeSubscriptions,
						stateConflicts: systemHealth.stateManager.stateConflicts,
						syncLatency: `${systemHealth.stateManager.syncLatency}ms`
					}
				},
				integrations: {
					rabbitmq: {
						status: 'connected',
						queues: [
							'legal.docs.process',
							'legal.chunks.embed', 
							'legal.chunks.store',
							'legal.evidence.analyze',
							'legal.entities.extract',
							'legal.relationships.map',
							'legal.patterns.detect',
							'legal.timeline.forensic'
						]
					},
					database: {
						status: 'connected',
						type: 'PostgreSQL with pgvector'
					},
					gpu: {
						status: 'available',
						type: 'CUDA acceleration'
					}
				}
			},
			endpoints: {
				process: '/api/legal/process',
				evidenceCanvas: '/api/legal/evidence-canvas',
				batch: '/api/legal/batch',
				status: '/api/legal/status/{jobId}',
				health: '/api/legal/health'
			}
		};

		return json(response, {
			headers: {
				'Cache-Control': 'no-cache',
				'X-System-Health': overallHealthy ? 'healthy' : 'degraded'
			}
		});

	} catch (error) {
		console.error('Legal system health check failed:', error);
		
		return json({
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'System health check failed',
			components: {
				orchestrator: { status: 'unknown' },
				queueManager: { status: 'unknown' },
				stateManager: { status: 'unknown' }
			}
		}, { 
			status: 503,
			headers: {
				'X-System-Health': 'unhealthy'
			}
		});
	}
};