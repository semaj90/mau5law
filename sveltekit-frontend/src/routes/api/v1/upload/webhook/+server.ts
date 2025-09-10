import type { RequestHandler } from './$types.js';

/*
 * Upload Completion Webhook - MinIO → Ingestion Pipeline Trigger
 * Triggers document processing workflow after successful upload
 */

import { json } from '@sveltejs/kit';
import { redisService } from '$lib/server/redis-service';
import { minioService } from '$lib/server/storage/minio-service';
import { db } from '$lib/server/db/client';
import { evidence, documents } from '$lib/db/schema';
import crypto from 'crypto';
import { URL } from 'url';

export interface WebhookEvent {
  eventName: string;
  bucket: string;
  objectName: string;
  objectSize: number;
  contentType: string;
  uploadId?: string;
  caseId?: string;
  metadata?: Record<string, any>;
}

export interface IngestionJob {
  id: string;
  uploadId: string;
  bucket: string;
  objectName: string;
  fileName: string;
  contentType: string;
  contentLength: number;
  caseId?: string;
  evidenceType?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  metadata?: Record<string, any>;
}

// Local helper to safely parse values that may be strings or already-parsed objects
function parseMaybeString<T = any>(val: unknown): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return (val as unknown) as T;
    }
  }
  return (val as T);
}

// POST /api/v1/upload/webhook - Handle MinIO upload completion
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    console.log('📥 POST /api/v1/upload/webhook - Processing upload completion');

    const webhookEvent: WebhookEvent = await request.json();

    // Validate webhook event
    if (!webhookEvent.bucket || !webhookEvent.objectName) {
      return json(
        {
          success: false,
          error: 'Invalid webhook payload',
        },
        { status: 400 }
      );
    }

    console.log(
      `📋 Webhook received: ${webhookEvent.eventName} - ${webhookEvent.bucket}/${webhookEvent.objectName}`
    );

    // Only process object creation events
    if (
      webhookEvent.eventName !== 's3:ObjectCreated:Put' &&
      webhookEvent.eventName !== 's3:ObjectCreated:Post'
    ) {
      return json({
        success: true,
        message: 'Event ignored - not an object creation event',
      });
    }

    // Extract upload metadata from object name or Redis
    let uploadMetadata = null;
    let uploadId = webhookEvent.uploadId;

    // Try to extract upload ID from object name if not provided
    if (!uploadId) {
      const pathParts = webhookEvent.objectName.split('/');
      const fileName = pathParts[pathParts.length - 1];
      // Look for uploadId in Redis by searching for matching object name
      const keys = await redisService.keys('upload:*');
      for (const key of keys) {
        const data = await redisService.get(key);
        if (data) {
          const metadata = parseMaybeString<Record<string, any>>(data);
          if (metadata?.objectName === webhookEvent.objectName) {
            uploadId = metadata.uploadId;
            uploadMetadata = metadata;
            break;
          }
        }
      }
    } else {
      // Get upload metadata from Redis
      const uploadKey = `upload:${uploadId}`;
      const data = await redisService.get(uploadKey);
      if (data) {
        uploadMetadata = parseMaybeString<Record<string, any>>(data);
      }
    }

    if (!uploadMetadata) {
      console.warn(`⚠️ No upload metadata found for ${webhookEvent.objectName}`);
      uploadMetadata = {
        fileName: webhookEvent.objectName.split('/').pop() || 'unknown',
        contentType: webhookEvent.contentType || 'application/octet-stream',
        contentLength: webhookEvent.objectSize || 0,
        bucket: webhookEvent.bucket,
        objectName: webhookEvent.objectName,
        status: 'processing',
      };
    }

    // Create ingestion job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ingestionJob: IngestionJob = {
      id: jobId,
      uploadId: uploadId || crypto.randomUUID(),
      bucket: webhookEvent.bucket,
      objectName: webhookEvent.objectName,
      fileName: uploadMetadata.fileName,
      contentType: uploadMetadata.contentType || webhookEvent.contentType,
      contentLength: uploadMetadata.contentLength || webhookEvent.objectSize,
      caseId: uploadMetadata.caseId,
      evidenceType: uploadMetadata.evidenceType || 'document',
      status: 'queued',
      createdAt: new Date().toISOString(),
      metadata: {
        ...uploadMetadata.metadata,
        clientAddress: getClientAddress(),
        webhookEvent: webhookEvent.eventName,
      },
    };

    // Store job in Redis for tracking
    const jobKey = `ingestion:${jobId}`;
    await (redisService as any).setex(jobKey, 86400, JSON.stringify(ingestionJob)); // keep cast: setex not on typed interface

    // Add to ingestion queue
    await (redisService as any).lpush('ingestion:queue', JSON.stringify(ingestionJob));

    // Update upload status if we have the upload metadata
    if (uploadId && uploadMetadata) {
      const uploadKey = `upload:${uploadId}`;
      uploadMetadata.status = 'processing';
      uploadMetadata.ingestionJobId = jobId;
      uploadMetadata.webhookReceivedAt = new Date().toISOString();
      await (redisService as any).setex(uploadKey, 3600, JSON.stringify(uploadMetadata));
    }

    // If this is a case-related upload, create evidence entry
    if (uploadMetadata.caseId) {
      try {
        const [evidenceEntry] = await db
          .insert(evidence)
          .values({
            caseId: uploadMetadata.caseId,
            title: uploadMetadata.fileName,
            description: `Uploaded file: ${uploadMetadata.fileName}`,
            type: uploadMetadata.evidenceType || 'document',
            filePath: `${webhookEvent.bucket}/${webhookEvent.objectName}`,
            fileSize: uploadMetadata.contentLength,
            mimeType: uploadMetadata.contentType,
            hash: null, // TODO: Calculate file hash
            createdBy: '00000000-0000-0000-0000-000000000001', // TODO: Get from auth
            metadata: {
              bucket: webhookEvent.bucket,
              objectName: webhookEvent.objectName,
              ingestionJobId: jobId,
              uploadId: uploadId,
            },
          })
          .returning();

        // Update job with evidence ID
        ingestionJob.metadata = {
          ...ingestionJob.metadata,
          evidenceId: evidenceEntry.id,
        };
        await (redisService as any).setex(jobKey, 86400, JSON.stringify(ingestionJob));

        console.log(`📋 Evidence entry created: ${evidenceEntry.id}`);
      } catch (dbError) {
        console.error('❌ Failed to create evidence entry:', dbError);
      }
    }

    // Publish events
    await (redisService as any).publish(
      'upload:completed',
      JSON.stringify({
        uploadId,
        jobId,
        bucket: webhookEvent.bucket,
        objectName: webhookEvent.objectName,
        fileName: uploadMetadata.fileName,
        caseId: uploadMetadata.caseId,
        timestamp: Date.now(),
      })
    );

    await (redisService as any).publish(
      'ingestion:job_created',
      JSON.stringify({
        jobId,
        fileName: uploadMetadata.fileName,
        contentType: uploadMetadata.contentType,
        caseId: uploadMetadata.caseId,
        timestamp: Date.now(),
      })
    );

    const response = {
      success: true,
      data: {
        jobId,
        uploadId,
        status: 'queued',
        fileName: uploadMetadata.fileName,
        bucket: webhookEvent.bucket,
        objectName: webhookEvent.objectName,
      },
      metadata: {
        timestamp: Date.now(),
        clientAddress: getClientAddress(),
        webhookEvent: webhookEvent.eventName,
      },
    };

    console.log(`✅ Ingestion job created: ${jobId} for ${uploadMetadata.fileName}`);
    return json(response);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('❌ POST /api/v1/upload/webhook error:', err);
    return json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
};
// GET /api/v1/upload/webhook/jobs - List ingestion jobs
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  try {
    console.log('📋 GET /api/v1/upload/webhook/jobs - Listing ingestion jobs');

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const status = url.searchParams.get('status');
    const caseId = url.searchParams.get('caseId');

    // Get jobs from queue and completed jobs (defensive casts)
    const queuedJobs = await (redisService as any).lrange('ingestion:queue', 0, limit - 1);
    const allJobKeys = await redisService.keys('ingestion:*');

    const jobs: any[] = [];

    // Add queued jobs
    for (const jobData of queuedJobs || []) {
      try {
        const job = parseMaybeString(jobData);
        if ((!status || job.status === status) && (!caseId || job.caseId === caseId)) {
          jobs.push(job);
        }
      } catch (parseError) {
        console.warn('Failed to parse queued job:', parseError);
      }
    }

    // Add stored jobs (completed, failed, etc.)
    for (const jobKey of (allJobKeys || []).filter((k: string) => k.startsWith('ingestion:job_'))) {
      if (jobs.length >= limit) break;

      try {
              const jobData = await redisService.get(jobKey);
        if (jobData) {
          const job = parseMaybeString(jobData);
          if ((!status || job.status === status) && (!caseId || job.caseId === caseId)) {
            // Don't duplicate queued jobs
            if (!jobs.find((j) => j.id === job.id)) {
              jobs.push(job);
            }
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse stored job:', parseError);
      }
    }

    // Sort by creation time (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response = {
      success: true,
      data: {
        jobs: jobs.slice(0, limit),
        count: jobs.length,
        filters: { status, caseId, limit },
      },
      metadata: {
        timestamp: Date.now(),
        clientAddress: getClientAddress(),
      },
    };

    console.log(`✅ Retrieved ${jobs.length} ingestion jobs`);
    return json(response);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('❌ GET /api/v1/upload/webhook/jobs error:', err);
    return json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
};