/**
 * SvelteKit Ingestion Job Status API
 *
 * GET /api/ingest/{jobId}
 *
 * Check the status of a queued ingestion job.
 * Jobs are tracked by the worker pool and database.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sharedWorkerPool } from '$lib/server/ingest/worker-pool-simple.js';
import { db, userDocuments } from '$lib/server/index.js';
import { eq } from 'drizzle-orm'; // Only 'eq' is needed now for the database query

// Define the structure of an active job in the worker pool
interface WorkerJob {
  id: string;
  stage?: string;
  progress?: number;
  // Add other properties if known, e.g., payload, startTime
}

// Extend the inferred WorkerStats type to include activeJobs.
// This assumes the sharedWorkerPool.getStats() method *does* return activeJobs at runtime,
// but its TypeScript definition is incomplete.
interface WorkerPoolStatsExtended {
  totalWorkers: number;
  busyWorkers: boolean[];
  freeWorkers: boolean[];
  queuedJobs: number; // This is the count of jobs in the queue, not a list of IDs
  pendingCallbacks: number;
  activeJobs: WorkerJob[]; // Add the missing property
}

/**
 * Defines the structure for document metadata, allowing for arbitrary key-value pairs.
 * This replaces 'any' for better type safety while accommodating flexible JSON structures.
 */
type DocumentMetadata = Record<string, unknown>;

interface JobStatusResponse {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'not-found';
  documentId?: number;
  progress?: {
    stage?: string;
    percentage?: number;
  };
  result?: {
    content?: string;
    contentType?: string;
    embeddingStatus?: 'generated' | 'none';
    metadata?: DocumentMetadata;
  };
  error?: string;
  createdAt?: string;
  completedAt?: string; // This remains string as it's an ISO string representation
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { jobId } = params;
    if (!jobId) {
      throw error(400, 'Job ID is required');
    }

    // First check worker pool for active/queued jobs
    const workerStats = sharedWorkerPool.getStats() as WorkerPoolStatsExtended;
    const activeJobs = workerStats.activeJobs || [];

    // Fix: Assume sharedWorkerPool now exposes a method to get specific queued job IDs.
    // This requires modification to '$lib/server/ingest/worker-pool-simple.js'
    // to add a method like `getQueuedJobIds(): string[]`.
    const queuedJobIds = sharedWorkerPool.getQueuedJobIds();

    // Check if job is currently active
    const activeJob = activeJobs.find((job: WorkerJob) => job.id === jobId);
    if (activeJob) {
      return json({
        success: true,
        jobId,
        status: 'processing',
        progress: {
          stage: activeJob.stage || 'processing',
          percentage: activeJob.progress || 0,
        },
      } as JobStatusResponse);
    }

    // Fix: Check if the specific jobId is in the queue.
    if (queuedJobIds.includes(jobId)) {
      return json({
        success: true,
        jobId,
        status: 'queued',
        progress: {
          stage: 'queued',
          percentage: 0,
        },
      } as JobStatusResponse);
    }

    // Check database for completed jobs
    // Fix: Jobs are now stored with a dedicated 'jobId' column for efficient lookup.
    // This requires modification to the 'userDocuments' Drizzle schema in '$lib/server/index.js'
    // to add `jobId: text('job_id').unique(),` and `completedAt: timestamp('completed_at'),`.
    const documents = await db
      .select({
        id: userDocuments.id,
        source: userDocuments.source,
        content: userDocuments.content,
        contentType: userDocuments.contentType,
        embedding: userDocuments.embedding,
        metadata: userDocuments.metadata,
        createdAt: userDocuments.createdAt,
        completedAt: userDocuments.completedAt, // Fix: Include the new 'completedAt' column from the schema
      })
      .from(userDocuments)
      .where(eq(userDocuments.jobId, jobId)) // Fix: Use eq() for a fast, exact match on the dedicated 'jobId' column
      .limit(1);

    if (documents.length > 0) {
      const doc = documents[0];
      let metadata: DocumentMetadata = {};
      try {
        metadata = JSON.parse((doc.metadata as string) || '{}') as DocumentMetadata;
      } catch {
        // Ignore JSON parse errors
      }
      return json({
        success: true,
        jobId,
        status: 'completed',
        documentId: doc.id,
        result: {
          content: (doc.content as string)?.substring(0, 1000),
          contentType: doc.contentType,
          embeddingStatus: doc.embedding ? 'generated' : 'none',
          metadata,
        },
        createdAt: (doc.createdAt as Date)?.toISOString(),
        // Fix: Prioritize the dedicated 'completedAt' column, fall back to 'createdAt' if not available.
        completedAt: (doc.completedAt as Date)?.toISOString() || (doc.createdAt as Date)?.toISOString(),
      } as JobStatusResponse);
    }

    // Job not found in active, queued, or completed states
    return json({
      success: true,
      jobId,
      status: 'not-found',
      error: 'Job not found in queue or database',
    } as JobStatusResponse);
  } catch (err) {
    console.error('Job status check error:', err);
    return json(
      {
        success: false,
        jobId: params.jobId || 'unknown',
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      } as JobStatusResponse,
      { status: 500 }
    );
  }
};