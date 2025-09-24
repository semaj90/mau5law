/**
 * SvelteKit Ingestion Job Status API
 *
 * GET /api/ingest/{jobId}
 *
 * Check the status of a queued ingestion job.
 * Jobs are tracked by the worker pool and database.
 */

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { sharedWorkerPool } from '$lib/server/ingest/worker-pool-simple.js'
import { db, userDocuments } from '$lib/server/index.js'
import { eq, and, like } from 'drizzle-orm'

interface JobStatusResponse {
  success: boolean
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'not-found'
  documentId?: number
  progress?: {
    stage?: string
    percentage?: number
  }
  result?: {
    content?: string
    contentType?: string
    embeddings?: any
    metadata?: any
  }
  error?: string
  createdAt?: string
  completedAt?: string
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { jobId } = params

    if (!jobId) {
      throw error(400, 'Job ID is required')
    }

    // First check worker pool for active/queued jobs
    const workerStats = sharedWorkerPool.getStats()
    const activeJobs = workerStats.activeJobs || []
    const queuedJobs = workerStats.queueSize || 0

    // Check if job is currently active
    const activeJob = activeJobs.find((job: any) => job.id === jobId)
    if (activeJob) {
      return json({
        success: true,
        jobId,
        status: 'processing',
        progress: {
          stage: activeJob.stage || 'processing',
          percentage: activeJob.progress || 0
        }
      } as JobStatusResponse)
    }

    // Check database for completed jobs
    // Jobs are stored with source containing the jobId
    const documents = await db
      .select({
        id: userDocuments.id,
        source: userDocuments.source,
        content: userDocuments.content,
        contentType: userDocuments.contentType,
        embedding: userDocuments.embedding,
        metadata: userDocuments.metadata,
        createdAt: userDocuments.createdAt
      })
      .from(userDocuments)
      .where(like(userDocuments.source, `%${jobId}%`)
      .limit(1)

    if (documents.length > 0) {
      const doc = documents[0]
      let metadata: any = {}

      try {
        metadata = JSON.parse(doc.metadata || '{}')
      } catch {
        // Ignore JSON parse errors
      }

      return json({
        success: true,
        jobId,
        status: 'completed',
        documentId: doc.id,
        result: {
          content: doc.content?.substring(0, 1000), // Truncate for API response
          contentType: doc.contentType,
          embeddings: doc.embedding ? 'generated' : 'none',
          metadata
        },
        createdAt: doc.createdAt?.toISOString(),
        completedAt: metadata.completedAt || doc.createdAt?.toISOString()
      } as JobStatusResponse)
    }

    // Check if job might be queued (if queue size > 0 and no active match)
    if (queuedJobs > 0) {
      return json({
        success: true,
        jobId,
        status: 'queued',
        progress: {
          stage: 'queued',
          percentage: 0
        }
      } as JobStatusResponse)
    }

    // Job not found
    return json({
      success: true,
      jobId,
      status: 'not-found',
      error: 'Job not found in queue or database'
    } as JobStatusResponse)

  } catch (err) {
    console.error('Job status check error:', err)

    return json({
      success: false,
      jobId: params.jobId || 'unknown',
      status: 'failed',
      error: err instanceof Error ? err.message: String(err)
    } as JobStatusResponse, { status: 500 })
  }
}