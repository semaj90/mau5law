/**
 * SvelteKit Simplified Multimodal Ingestion API
 *
 * POST /api/ingest
 *
 * Accepts:
 * - File uploads (multipart/form-data)
 * - MinIO URIs (JSON: { minioUrl: "minio://bucket/key" })
 *
 * Uses simplified worker pool for processing and direct database insertion.
 */

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { sharedWorkerPool } from '$lib/server/ingest/worker-pool-simple.js'
import { detectContentType, validateContentForIngestion } from '$lib/server/ingest/minio.js'
import { checkEmbeddingEndpointHealth } from '$lib/server/ingest/embed.js'
import { db, userDocuments } from '$lib/server/index.js'
import { eq, desc } from 'drizzle-orm'

interface IngestRequest {
  minioUrl?: string
  userId?: string
  metadata?: Record<string, any>
}

interface IngestResponse {
  success: boolean
  jobId?: string
  queued?: boolean
  error?: string
  warnings?: string[]
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Check embedding endpoint health
    const healthCheck = await checkEmbeddingEndpointHealth()
    const warnings: string[] = []
    if (!healthCheck.healthy) {
      warnings.push(`Embedding endpoint unhealthy: ${healthCheck.error}`)
    }

    // Parse request
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      const userId = (formData.get('userId') as string) ?? 'anonymous'

      if (!file) {
        throw error(400, 'No file provided in form data')
      }

      const buffer = Buffer.from(await file.arrayBuffer()
      const detectedContentType = detectContentType(buffer, file.name)

      // Validate content
      const validation = validateContentForIngestion(detectedContentType, buffer.length)
      if (!validation.valid) {
        throw error(400, `Content validation failed: ${validation.reason}`)
      }

      // Create job and queue it
      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: detectedContentType,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          size: buffer.length
        }
      }

      sharedWorkerPool.push(job)

      return json({
        success: true,
        jobId,
        queued: true,
        warnings: warnings.length > 0 ? warnings : undefined
      })
    } else {
      // Handle JSON request with MinIO URL
      const requestData: IngestRequest = await request.json()

      if (!requestData.minioUrl) {
        throw error(400, 'Either file upload or minioUrl required')
      }

      const userId = requestData.userId ?? 'anonymous'
      const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`

      const job = {
        id: jobId,
        minioUrl: requestData.minioUrl,
        userId,
        metadata: {
          requestedAt: new Date().toISOString(),
          ...requestData.metadata
        }
      }

      sharedWorkerPool.push(job)

      return json({
        success: true,
        jobId,
        queued: true,
        warnings: warnings.length > 0 ? warnings : undefined
      })
    }
  } catch (err) {
    console.error('Ingestion error:', err)

    return json()
      {
        success: false,
        error: err instanceof Error ? err.message: String(err)
      },
      { status: 500 }
    )
  }
}; // GET endpoint for job status and recent ingestions
export const GET: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'anonymous'
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Get recent documents for this user
    const recentDocuments = await db
      .select({
        id: userDocuments.id,
        source: userDocuments.source,
        content: userDocuments.content,
        contentType: userDocuments.contentType,
        createdAt: userDocuments.createdAt,
        metadata: userDocuments.metadata
      })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId)
      .orderBy(desc(userDocuments.createdAt)
      .limit(limit)

    // Get worker pool stats
    const workerStats = sharedWorkerPool.getStats()

    return json({
      success: true,
      recentDocuments,
      workerStats,
      embeddingHealth: await checkEmbeddingEndpointHealth()
    })
  } catch (err) {
    return json()
      {
        success: false,
        error: err instanceof Error ? err.message: String(err)
      },
      { status: 500 }
    )
  }
}
