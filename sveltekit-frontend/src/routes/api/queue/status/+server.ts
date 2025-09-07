
import { URL } from "url";
import { getQueueStats, getJobStatus, cancelJob, clearCompletedJobs } from "$lib/services/queue-service";
import type { RequestHandler } from './$types';


/*
 * Get overall queue statistics
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const jobId = url.searchParams.get('job_id');
		
		if (jobId) {
			// Get specific job status
			const jobStatus = await getJobStatus(jobId);
			return json({
				success: true,
				job: jobStatus,
				timestamp: new Date().toISOString()
			});
		}
		
		// Get overall queue stats
		const stats = await getQueueStats();
		
		return json({
			success: true,
			queue_stats: stats,
			healthy: stats.active >= 0, // Basic health check
			timestamp: new Date().toISOString()
		});
		
	} catch (error: any) {
		console.error('❌ Queue status error:', error);
		return json({ 
			success: false,
			error: 'Failed to get queue status',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

/*
 * Cancel a job or clear completed jobs
 */
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const jobId = url.searchParams.get('job_id');
		const action = url.searchParams.get('action'); // 'clear_completed'
		
		if (jobId) {
			// Cancel specific job
			const cancelled = await cancelJob(jobId);
			
			if (cancelled) {
				return json({
					success: true,
					message: `Job ${jobId} cancelled`,
					timestamp: new Date().toISOString()
				});
			} else {
				return json({
					success: false,
					error: `Job ${jobId} not found or could not be cancelled`
				}, { status: 404 });
			}
		}
		
		if (action === 'clear_completed') {
			// Clear completed jobs
			const clearedCount = await clearCompletedJobs();
			
			return json({
				success: true,
				message: `Cleared ${clearedCount} completed jobs`,
				cleared_count: clearedCount,
				timestamp: new Date().toISOString()
			});
		}
		
		return json({
			success: false,
			error: 'No valid action specified. Use job_id to cancel job or action=clear_completed'
		}, { status: 400 });
		
	} catch (error: any) {
		console.error('❌ Queue delete operation error:', error);
		return json({ 
			success: false,
			error: 'Delete operation failed',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};