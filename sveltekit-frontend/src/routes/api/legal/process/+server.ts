/**
 * Unified Legal Processing API
 * 
 * Provides endpoints for legal document processing through the unified orchestration service
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalOrchestrationService } from '$lib/services/unified-legal-orchestration-service.js';
import { readBodyFastWithMetrics } from '$lib/simd/simd-json-integration.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Use SIMD-accelerated JSON parsing for legal document payloads
		const body = await readBodyFastWithMetrics(request);
		
		const {
			documentId,
			content,
			processingPipeline = ['document-analysis', 'entity-extraction', 'legal-classification'],
			priority = 1,
			metadata = {},
			evidenceCanvasId,
			analysisType = 'legal'
		} = body;

		if (!content) {
			return json({ error: 'Content is required' }, { status: 400 });
		}

		// Process the legal document
		const result = await unifiedLegalOrchestrationService.processLegalDocument({
			documentId,
			content,
			processingPipeline,
			priority,
			metadata,
			evidenceCanvasId,
			analysisType
		});

		// Convert status stores to serializable format
		const jobStatuses: Record<string, any> = {};
		for (const [jobId, store] of result.statusStores) {
			jobStatuses[jobId] = {
				subscriptionEndpoint: `/api/legal/status/${jobId}`
			};
		}

		return json({
			success: true,
			jobIds: result.jobIds,
			jobStatuses,
			aggregateStatusEndpoint: `/api/legal/status/aggregate/${result.jobIds.join(',')}`,
			processingMetrics: result.processingMetrics
		});

	} catch (error) {
		console.error('Legal processing error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};