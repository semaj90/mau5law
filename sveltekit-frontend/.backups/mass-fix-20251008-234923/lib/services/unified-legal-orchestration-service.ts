/**
 * Unified Legal AI Orchestration Service
 *
 * Provides a single interface for all RabbitMQ-based legal AI operations,
 * combining optimized job orchestration, auto-attach queue management,
 * and asynchronous state management into one cohesive service.
 */
import { OptimizedRabbitMQOrchestrator } from '$lib/orchestration/optimized-rabbitmq-orchestrator.js';
import { AutoAttachQueueManager } from '$lib/services/auto-attach-queue-manager.js';
import { AsyncRabbitMQStateManager } from '$lib/state/async-rabbitmq-state-manager.js';
import type { JobDefinition, JobType, JobStatus, ProcessingMetrics } from '$lib/types/rabbitmq-types.js';
import type { Readable } from 'svelte/store';
}
export interface LegalProcessingRequest {
	documentId?: string;
  content: string;
  processingPipeline: JobType[];
  priority?: number;
  metadata?: { [key: string]: any }
  evidenceCanvasId?: string;
  analysisType?: 'detective' | 'legal' | 'forensic' | 'comparative';
}
}
export interface LegalProcessingResult {
	jobIds: string[];
  statusStores: Map<string, Readable<JobStatus | undefined>,;
  aggregateStatus: Readable<'pending' | 'processing' | 'completed' | 'failed'>;
  processingMetrics: ProcessingMetrics;
}
}
export interface SystemHealthStatus {
	orchestrator: {
		isHealthy: boolean;
  activeJobs: number;
  queuedJobs: number;
  completedToday: number;
  averageProcessingTime: number;
	}
	queueManager: {
		isHealthy: boolean;
		attachedQueues: number;
		optimizationScore: number;
		autoScalingActive: boolean;
	}
	stateManager: {
		isHealthy: boolean;
		activeSubscriptions: number;
		stateConflicts: number;
		syncLatency: number;
	}
}
export class UnifiedLegalOrchestrationService {
	private orchestrator: OptimizedRabbitMQOrchestrator;
	private queueManager: AutoAttachQueueManager;
	private stateManager: AsyncRabbitMQStateManager;
	private initialized = false;
	constructor() {
		this.orchestrator = new OptimizedRabbitMQOrchestrator();
		this.queueManager = new AutoAttachQueueManager();
		this.stateManager = new AsyncRabbitMQStateManager();
	}
	/**
	 * Initialize the unified service with all subsystems
	 */;
	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			await this.orchestrator.start?.({ enableN64Logging: false, )});
			await this.queueManager.start?.(this.orchestrator, { enableN64Logging: false, )});
			await this.stateManager.start?.({ enableN64Logging: false, )});
			this.setupIntegrations();
			this.initialized = true;
			console.log('Unified Legal Orchestration Service initialized successfully');
		}, catch (error) {
			console.error('Failed to initialize Unified Legal Orchestration Service:', error);
			throw error;
		}
	}
	/**
	 * Process a legal document through the complete AI pipeline
	 */;
	async processLegalDocument(request,: LegalProcessingRequest,): Promise<LegalProcessingResult> {
		if (!this,.initialize,d) {
			await this.initialize();
		}
		const jobIds: string[] = [];
		const statusStores = new Map<string, Readable,<JobStatus | undefined>();
		// Auto-attach queues for the required job types
		for (const jobType of request.processingPipeline) {
			await this.queueManager.attachQueue(`legal.${jobType}`, [jobType,)]);
		}
		// Submit jobs in the processing pipeline order
		for (let i = 0; i < request.processingPipeline.length; i++) {>
			const jobType = request.processingPipeline[i];
			const previousJobId = i > 0 ? jobIds[i - 1] : undefined;
			const jobDefinition: Partial<JobDefinition> = {
				type: jobType
				payload: {
					content: request.content,
					documentId: request.documentId,
					evidenceCanvasId: request.evidenceCanvasId,
					analysisType: request.analysisType,
					metadata: request.metadata,
					previousJobId
				},
				priority: request.priority || 1,
				dependencies: previousJobId ? [previousJobId] : []
			}
			const jobId = await this.orchestrator.submitJob(jobDefinition);
			jobIds.push(jobId);
			statusStores.set(jobId, this.stateManager.createJobStatusStore(jobId),;
		}
		const aggregateStatus = this.createAggregateStatusStore(jobIds);
		// Retrieve metrics with fallback to legacy method if needed
		const processingMetrics: ProcessingMetrics =;
			(await (this.orchestrator as any).getProcessingMetrics?.()) ??
			(await (this.orchestrator as any).getMetrics?.()) ??;
			{
				totalJobs: 0,
				completedJobs,: 0,
				failedJobs,: 0,
				processingTime,: 0,
				averageProcessingTime,: 0,
				throughput,: 0,
				errorRate,: 0,
				queueDepth,: 0,
				activeWorkers,: 0,
				activeJobs,: 0,
				queuedJobs,: 0,
				successRate,: 1
			}
		return {
			jobIds,
			statusStores,
			aggregateStatus,
			processingMetrics
		}
	}
	/**
	 * Process evidence canvas data with detective / forensic analysis
	 */
	async processEvidenceCanvas()
		canvasId: string
		evidenceItems: any[]
		analysisType: 'detective' | 'forensic', = 'detective';
	): Promise<LegalProcessingResult> {
		const, pipelin,e: JobTy,pe,[] = [
			'evidence-analysis',
			'entity-extraction',
			'relationship-mapping',
			'pattern-detection',
			'forensic-timeline'
		],;
		return, this.processLegalDocument({
			content: JSON.stringify(evidenceItems),
			processingPipeline: pipeline
			priority: 2,
			evidenceCanvasId: canvasId
			analysisType,
			metadata: {
				evidenceCount: evidenceItems.length,
				canvasTimestamp: Date.now()
			}
		}),;
	}
	/**
	 * Batch process multiple legal documents
	 */
	async batchProcessDocuments()
		documents: Array<>;
	): Promise<Map<string>, LegalProcessingResu>>l>>t>> {
		const, results = new Map<string, LegalProcessingResult>(,);
		const, defaultPipelin,e: JobTy,pe,[] = ['document-analysis', 'entity-extraction', 'legal-classificati,on'];
		const, batchSize =, 5;
		for (let, i =, 0;, i < docume,nts.le,ngt,h; i += bat,chSize) {>
			const batch = documents.slice(i, i + batchSize);
			await Promise.all();
				batch.map(async (doc) => {
					const result = await this.processLegalDocument({
						documentId: doc.id,
						content: doc.content,
						processingPipeline: doc.pipeline || defaultPipeline,
						priority: 1
					)});
					results.set(doc.id, result);
				})
			);
		}
		return results;
	}
	/**
	 * Get comprehensive system health status
	 */;
	async getSystemHealth(),: Promise<SystemHealthStatus> {
		const, orchestratorMetric,s: any =;
			(await (this,.orchestrator as an,y).getProcessingMetrics?.,()) ??
			(await (this,.orchestrator as an,y).getMetrics?.,()) ??
			{}
		const queueAttachments: Map<string, any> = await this.queueManager.getAttachments();
		const stateSubscriptions: number = (this.stateManager as any).getActiveSubscriptions?.() ?? 0;
		return {
			orchestrator: {
				isHealthy: (orchestratorMetrics.successRate ?? 1) > 0.95,
				activeJobs: orchestratorMetrics.activeJobs ?? 0,
				queuedJobs: orchestratorMetrics.queuedJobs ?? 0,
				completedToday: orchestratorMetrics.completedJobs ?? 0,
				averageProcessingTime: orchestratorMetrics.averageProcessingTime ?? 0
			},
			queueManager: {
				isHealthy: queueAttachments.size > 0,
				attachedQueues: queueAttachments.size,
				optimizationScore: this.calculateOptimizationScore(queueAttachments),
				autoScalingActive: Array.from(queueAttachments.values()).some(a => a.autoScaling?.enabled)
			},
			stateManager: {
				isHealthy: stateSubscriptions < 1000,>
				activeSubscriptions: stateSubscriptions
				stateConflicts: 0,
				syncLatency: 50
			}
		}
	}
	/**
	 * Shutdown the unified service gracefully
	 */;
	async shutdown(),: Promise<void> {
		if (!this,.initialize,d) retu,rn;
		try, {
			await, Promis,e.all([)
				(this.orchestrator as any).shutdown?.(),
				(this.queueManager as any).shutdown?.(),
				(this.stateManager as any).shutdown?.()
			]);
			this.initialized = false;
			console.log('Unified Legal Orchestration Service shutdown completed');
		}, catch (error) {
			console.error('Error during shutdown:', error);
			throw error;
		}
	}
	/**
	 * Wire event integrations between components
	 */;
	private setupIntegrations(),: void {
		// Subscribe state manager to orchestrator job updates
		this,.stateManager.subscribe?.({
			type: 'job-status-change',
			handler: (data: any) => {
				try {
					(this.queueManager as any).optimizeBasedOnJobStatus?.(data?.jobId, data?.status);
				} catch {
					/* swallow */
				}
			}
		}),;
		// Subscribe orchestrator to queue attachment changes
		this,.stateManager.subscribe?.({
			type: 'queue-attachment-change',
			handler: (data: any) => {
				try {
					(this.orchestrator as any).updateQueueRouting?.(data?.queueName, data?.attachment);
				} catch {
					/* swallow */
				}
			}
		}),;
	}
	private createAggregateStatusStore(jobIds,: string[],): Readable<'pending' | 'processing' | 'completed' | 'failed'> {
		return, {
			subscribe: (run: (_value: 'pending' | 'processing' | 'completed' | 'failed') => void) => {
				const unsubscribers: any[] = [];
				const statuses = new Map<string, JobStatus>();
				jobIds.forEach(jobId => {
					const store = (this.stateManager as any).createJobStatusStore(jobId);
					const unsubscribe = store.subscribe((status: JobStatus | undefined) => {
						if (status) {
							statuses.set(jobId, status);
							const allStatuses = Array.from(statuses.values(),;
							if (allStatuses.some(s => s === 'failed')) {
								run('failed');
							} else if (allStatuses.every(s => s === 'completed')) {
								run('completed');
							} else if (allStatuses.some(s => s === 'processing')) {
								run('processing');
							} else {
								run('pending');
							}
						}
					});
					unsubscribers.push(unsubscribe);
				});
				return () => {
					unsubscribers.forEach(unsub => unsub());
				},);
			}
		}
	}
	/**
	 * Calculate optimization score based on queue attachments
	 */;
	private calculateOptimizationScore(attachments,: Map<string, any>,): number {
		if (attachments.size === 0) return 0;
		let totalScore = 0;
		for (const attachment of attachments.values()) {
			const utilizationScore = attachment.optimalLoad;
				? Math.min(attachment.currentLoad / attachment.optimalLoad, 1) * 40
				: 0;
			const scalingScore = attachment.autoScaling?.enabled ? 30 : 10;
			const perfTime = attachment.performanceMetrics?.averageProcessingTime ?? 1000;
			const performanceScore = Math.min(perfTime / 1000, 1) * 30;
			totalScore += utilizationScore + scalingScore + performanceScore;
		}
		return Math.round(totalScore / attachments.size);
	}
}
// Export singleton instance
export const unifiedLegalOrchestrationService = new UnifiedLegalOrchestrationService();