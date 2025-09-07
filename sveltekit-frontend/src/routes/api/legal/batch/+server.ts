/**
 * Batch Legal Processing API
 * 
 * Endpoint for processing multiple legal documents in batches
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalOrchestrationService } from '$lib/services/unified-legal-orchestration-service.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		const { documents = [] } = body;

		if (!Array.isArray(documents) || documents.length === 0) {
			return json({ error: 'Documents array is required' }, { status: 400 });
		}

		// Validate document structure
		for (const doc of documents) {
			if (!doc.id || !doc.content) {
				return json({ 
					error: 'Each document must have id and content properties' 
				}, { status: 400 });
			}
		}

		// Process documents in batch
		const results = await unifiedLegalOrchestrationService.batchProcessDocuments(documents);

		// Convert results to serializable format
		const processedDocuments: Record<string, any> = {};
		
		for (const [docId, result] of results) {
			const jobStatuses: Record<string, any> = {};
			for (const [jobId, store] of result.statusStores) {
				jobStatuses[jobId] = {
					subscriptionEndpoint: `/api/legal/status/${jobId}`
				};
			}

			processedDocuments[docId] = {
				jobIds: result.jobIds,
				jobStatuses,
				aggregateStatusEndpoint: `/api/legal/status/aggregate/${result.jobIds.join(',')}`,
				processingMetrics: result.processingMetrics
			};
		}

		return json({
			success: true,
			documentsProcessed: documents.length,
			results: processedDocuments,
			batchId: `batch_${Date.now()}`,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Batch processing error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};