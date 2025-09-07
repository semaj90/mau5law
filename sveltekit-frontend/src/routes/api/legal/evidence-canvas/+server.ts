/**
 * Evidence Canvas Processing API
 * 
 * Specialized endpoint for processing evidence canvas data with detective analysis
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalOrchestrationService } from '$lib/services/unified-legal-orchestration-service.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		const {
			canvasId,
			evidenceItems = [],
			analysisType = 'detective'
		} = body;

		if (!canvasId) {
			return json({ error: 'Canvas ID is required' }, { status: 400 });
		}

		if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) {
			return json({ error: 'Evidence items are required' }, { status: 400 });
		}

		// Process evidence canvas
		const result = await unifiedLegalOrchestrationService.processEvidenceCanvas(
			canvasId,
			evidenceItems,
			analysisType as 'detective' | 'forensic'
		);

		// Convert status stores to serializable format
		const jobStatuses: Record<string, any> = {};
		for (const [jobId, store] of result.statusStores) {
			jobStatuses[jobId] = {
				subscriptionEndpoint: `/api/legal/status/${jobId}`
			};
		}

		return json({
			success: true,
			canvasId,
			analysisType,
			jobIds: result.jobIds,
			jobStatuses,
			aggregateStatusEndpoint: `/api/legal/status/aggregate/${result.jobIds.join(',')}`,
			processingMetrics: result.processingMetrics,
			evidenceCount: evidenceItems.length
		});

	} catch (error) {
		console.error('Evidence canvas processing error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};