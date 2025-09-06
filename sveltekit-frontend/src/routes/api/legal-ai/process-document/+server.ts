/// <reference types="vite/client" />

import { URL } from "url";
import { queueDocumentProcessing, getJobStatus, getQueueStats, type DocumentProcessingJobData } from "$lib/services/queue-service";
import type { RequestHandler } from './$types';


// Types for Go server integration (kept for compatibility)
export interface DocumentProcessRequest {
	document_id: string;
	content: string;
	document_type: string;
	case_id?: string;
	options: ProcessingOptions;
}

export interface ProcessingOptions {
	extract_entities: boolean;
	generate_summary: boolean;
	assess_risk: boolean;
	generate_embedding: boolean;
	store_in_database: boolean;
	use_gemma3_legal: boolean;
}

export interface DocumentProcessResponse {
	success: boolean;
	document_id: string;
	summary?: string;
	entities?: LegalEntity[];
	risk_assessment?: RiskAssessment;
	embedding?: number[];
	processing_time: string;
	metadata: Record<string, unknown>;
	error?: string;
}

export interface LegalEntity {
	type: string;
	value: string;
	confidence: number;
	start_pos: number;
	end_pos: number;
}

export interface RiskAssessment {
	overall_risk: string;
	risk_score: number;
	risk_factors: string[];
	recommendations: string[];
	confidence: number;
}

// Configuration
const GO_SERVER_URL = import.meta.env.GO_SERVER_URL || 'http://localhost:8080';
const USE_QUEUE = import.meta.env.USE_QUEUE !== 'false'; // Enable by default

/**
 * Process document through BullMQ worker system
 * Integrates with Go Legal AI Server via queue workers
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const body = await request.json();
		
		// Check if this is a job status check
		const jobId = url.searchParams.get('job_id');
		if (jobId) {
			try {
				const status = await getJobStatus(jobId);
				return json(status);
			} catch (error: any) {
				console.error('❌ Error checking job status:', error);
				return json({ 
					error: 'Failed to check job status',
					details: error instanceof Error ? error.message : 'Unknown error'
				}, { status: 500 });
			}
		}
		
		// Validate required fields for new job
		if (!body.content) {
			return json({ error: 'Content is required' }, { status: 400 });
		}

		const documentId = body.document_id || `doc_${Date.now()}`;
		
		// Prepare job data
		const jobData: DocumentProcessingJobData = {
			documentId: documentId,
			content: body.content,
			documentType: body.document_type || 'evidence',
			caseId: body.case_id,
			filePath: body.file_path,
			options: {
				extractEntities: body.extract_entities ?? true,
				generateSummary: body.generate_summary ?? true,
				assessRisk: body.assess_risk ?? true,
				generateEmbedding: body.generate_embedding ?? true,
				storeInDatabase: body.store_in_database ?? true,
				useGemma3Legal: body.use_gemma3_legal ?? true
			}
		};

		console.log(`🔄 Queuing document for processing: ${documentId}`);

		if (USE_QUEUE) {
			try {
				// Add job to queue
				const priority = body.priority || 0;
				const { jobId: queueJobId, estimated } = await queueDocumentProcessing(jobData, priority);
				
				// Get current queue statistics
				const queueStats = await getQueueStats();
				
				console.log(`✅ Document queued successfully: ${documentId}`);
				console.log(`📊 Job ID: ${queueJobId}, Estimated: ${estimated}s`);
				console.log(`📈 Queue stats: ${queueStats.waiting} waiting, ${queueStats.active} active`);
				
				return json({
					success: true,
					queued: true,
					document_id: documentId,
					job_id: queueJobId,
					estimated_seconds: estimated,
					queue_stats: queueStats,
					status_url: `/api/legal-ai/process-document?job_id=${queueJobId}`,
					message: 'Document queued for processing',
					timestamp: new Date().toISOString()
				});
				
			} catch (queueError) {
				console.error('❌ Queue error, falling back to direct processing:', queueError);
				// Fall through to direct processing
			}
		}

		// Direct processing fallback (when queue is disabled or failed)
		console.log(`🔄 Processing document directly via Go server: ${documentId}`);
		
		try {
			const response = await fetch(`${GO_SERVER_URL}/process-document`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					document_id: documentId,
					content: body.content,
					document_type: body.document_type || 'evidence',
					case_id: body.case_id,
					options: {
						extract_entities: jobData.options.extractEntities,
						generate_summary: jobData.options.generateSummary,
						assess_risk: jobData.options.assessRisk,
						generate_embedding: jobData.options.generateEmbedding,
						store_in_database: jobData.options.storeInDatabase,
						use_gemma3_legal: jobData.options.useGemma3Legal
					}
				}),
				signal: AbortSignal.timeout(120000) // 2 minute timeout
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`❌ Go server error (${response.status}):`, errorText);
				
				return json({ 
					error: `Go server error: ${response.status}`,
					details: errorText 
				}, { status: response.status });
			}

			const result: DocumentProcessResponse = await response.json();
			
			console.log(`✅ Document processed successfully: ${result.document_id}`);
			console.log(`📊 Processing time: ${result.processing_time}`);
			
			return json({
				success: true,
				queued: false,
				data: result,
				processed_by: 'go-legal-ai-server-direct',
				timestamp: new Date().toISOString()
			});

		} catch (fetchError) {
			console.error('❌ Direct processing error:', fetchError);
			return json({ 
				error: 'Processing failed',
				details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
			}, { status: 503 });
		}

	} catch (error: any) {
		console.error('❌ API endpoint error:', error);
		return json({ 
			error: 'Internal server error',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

/**
 * Get Go server health status
 */
export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${GO_SERVER_URL}/health`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
		});

		if (!response.ok) {
			return json({ 
				error: 'Go server health check failed',
				status: response.status 
			}, { status: 503 });
		}

		const healthData = await response.json();
		
		return json({
			success: true,
			go_server_status: healthData,
			sveltekit_status: 'healthy',
			integration_status: 'connected',
			timestamp: new Date().toISOString()
		});

	} catch (error: any) {
		console.error('❌ Go server health check failed:', error);
		return json({ 
			error: 'Go server unreachable',
			details: error instanceof Error ? error.message : 'Unknown error',
			go_server_url: GO_SERVER_URL
		}, { status: 503 });
	}
};