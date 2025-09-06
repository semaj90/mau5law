
// Minimal ingestion queue (Redis LIST if available else in-memory) + status store.

import { cache } from '$lib/server/cache/redis';
import { randomUUID } from 'crypto';
import type { IngestionJobRequest, IngestionJobStatus } from './embedding-repository';

const MEMORY_QUEUE: string[] = [];
const STATUS_STORE = new Map<string, IngestionJobStatus>();

function nowISO() { return new Date().toISOString(); }

export async function enqueue(job: IngestionJobRequest): Promise<IngestionJobStatus> {
  const jobId = randomUUID();
  const initial: IngestionJobStatus = {
    jobId,
    evidenceId: job.evidenceId,
    status: 'queued',
    model: job.model || 'nomic-embed-text'
  };
  STATUS_STORE.set(jobId, initial);
  try {
    await cache.set(`ingest:payload:${jobId}`, job, 60 * 60 * 1000);
    MEMORY_QUEUE.push(jobId);
  } catch (err: any) {
    console.warn('Queue enqueue failed, fallback memory only:', err);
    MEMORY_QUEUE.push(jobId);
  }
  return initial;
}

export function getStatus(jobId: string): IngestionJobStatus | null {
  return STATUS_STORE.get(jobId) || null;
}

export async function processNext(processor: (payload: IngestionJobRequest, update: (partial: Partial<IngestionJobStatus>) => void) => Promise<void>): Promise<IngestionJobStatus | null> {
  const jobId = MEMORY_QUEUE.shift();
  if (!jobId) return null;
  const status = STATUS_STORE.get(jobId);
  if (!status) return null;
  const payload = await cache.get(`ingest:payload:${jobId}`) as IngestionJobRequest;
  if (!payload || !payload.evidenceId || !payload.textContent) {
    status.status = 'failed';
    status.error = 'Missing or invalid payload';
    return status;
  }
  status.status = 'processing';
  status.startedAt = nowISO();
  STATUS_STORE.set(jobId, status);
  const update = (partial: Partial<IngestionJobStatus>) => {
    Object.assign(status, partial);
    STATUS_STORE.set(jobId, status);
  };
  try {
    await processor(payload, update);
    status.status = 'completed';
    status.completedAt = nowISO();
  } catch (e: any) {
    status.status = 'failed';
    status.error = e instanceof Error ? e.message : String(e);
  }
  STATUS_STORE.set(jobId, status);
  return status;
}
