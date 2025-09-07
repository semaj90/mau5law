/**
 * Legal Job Status API
 * 
 * Provides real-time status updates for individual legal processing jobs
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unifiedLegalOrchestrationService } from '$lib/services/unified-legal-orchestration-service.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { jobId } = params;

		if (!jobId) {
			return json({ error: 'Job ID is required' }, { status: 400 });
		}

		// Initialize service if needed
		await unifiedLegalOrchestrationService.initialize();

		// Get current job status
		const statusStore = unifiedLegalOrchestrationService['stateManager'].createJobStatusStore(jobId);
		
		// Get current status value (this is a one-time read, not a subscription)
		let currentStatus: any = null;
		const unsubscribe = statusStore.subscribe(status => {
			currentStatus = status;
		});
		
		// Immediately unsubscribe since we only want current value
		unsubscribe();

		if (!currentStatus) {
			return json({ error: 'Job not found' }, { status: 404 });
		}

		return json({
			success: true,
			jobId,
			status: currentStatus,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Job status error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { jobId } = params;
		const body = await request.json();

		if (!jobId) {
			return json({ error: 'Job ID is required' }, { status: 400 });
		}

		const { action } = body;

		// Initialize service if needed
		await unifiedLegalOrchestrationService.initialize();

		switch (action) {
			case 'cancel':
				// TODO: Implement job cancellation
				return json({ 
					success: true, 
					message: 'Job cancellation requested',
					jobId 
				});

			case 'retry':
				// TODO: Implement job retry
				return json({ 
					success: true, 
					message: 'Job retry requested',
					jobId 
				});

			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}

	} catch (error) {
		console.error('Job action error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};