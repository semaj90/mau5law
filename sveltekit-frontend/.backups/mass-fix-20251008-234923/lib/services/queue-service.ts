import { Queue } from "bullmq";
import Redis from "ioredis";

// Redis connection
const redis = new Redis({
  host: import.meta.env.REDIS_HOST || 'localhost',
  port: parseInt(import.meta.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Document processing queue
export const documentQueue = new Queue('document-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Job types
export interface DocumentProcessingJobData {
  documentId: string;
  content: string;
  documentType: string;
  caseId?: string;
  filePath?: string;
  options: {
    extractEntities?: boolean;
    generateSummary?: boolean;
    assessRisk?: boolean;
    generateEmbedding?: boolean;
    storeInDatabase?: boolean;
    useGemma3Legal?: boolean;
  }
}

// Define a more specific type for detected entities
export interface LegalEntity {
  text: string;
  type: string; // e.g., 'PERSON', 'ORGANIZATION', 'DATE', 'LEGAL_TERM', 'CASE_REFERENCE'
  startOffset?: number; // Optional: starting character index in the document
  endOffset?: number;   // Optional: ending character index in the document
  confidence?: number;  // Optional: confidence score of the detection
  metadata?: Record<string, any>; // Optional: additional entity-specific data
}

export interface DocumentProcessingJobResult {
  success: boolean;
  documentId: string;
  processingTime: string;
  summary?: string;
  entities?: Array<LegalEntity>; // Changed from Array<any>
  riskAssessment?: {
    overall_risk: string;
    risk_score: number;
    risk_factors: string[];
    recommendations: string[];
    confidence: number;
  }
  hasEmbedding: boolean;
  error?: string;
}

// Define a more specific return type for queueDocumentProcessing
interface QueueDocumentProcessingResult {
  jobId: string;
  estimated: number;
}

// Define specific return types for getJobStatus and getQueueStats
interface JobStatusResult {
  status: 'not_found' | 'completed' | 'failed' | 'waiting' | 'active' | 'delayed';
  progress: number;
  error?: string;
  result?: DocumentProcessingJobResult; // For 'completed'
  data?: DocumentProcessingJobData; // For 'waiting', 'active', 'delayed'
}

interface QueueStatsResult {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Add document processing job to queue
 */
export async function queueDocumentProcessing(
  data: DocumentProcessingJobData,
  priority = 0
): Promise<QueueDocumentProcessingResult> {
  const job = await documentQueue.add('process-document', data, {
    priority, // Higher numbers = higher priority
    delay: 0
  });

  // Get queue metrics for estimation
  // BullMQ v5+ uses getJobCounts()
  const jobCounts = await (documentQueue as any).getJobCounts();
  const waitingCount = jobCounts.waiting || 0;
  const activeCount = jobCounts.active || 0;

  // Rough estimation: 30 seconds per job + queue delay
  const estimatedSeconds = (waitingCount * 30) + (activeCount > 0 ? 15 : 0);

  return {
    jobId: job.id as string,
    estimated: estimatedSeconds
  }
}

/**
 * Get job status and result
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  const job: BullJobLike | null = await (documentQueue as any).getJob(jobId);
  if (!job) {
    return { status: 'not_found', error: 'Job not found', progress: 0 }
  }

  const state = await job.getState();
  const progress = await job.progress;

  if (state === 'completed') {
    return {
      status: 'completed',
      progress: 100,
      result: job.returnvalue as DocumentProcessingJobResult
    }
  }

  if (state === 'failed') {
    return {
      status: 'failed',
      progress: progress || 0,
      error: job.failedReason
    }
  }

  return {
    status: state, // 'waiting', 'active', 'delayed'
    progress: progress || 0,
    data: job.data as DocumentProcessingJobData
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStatsResult> {
  // BullMQ v5+ uses getJobCounts()
  const jobCounts = await (documentQueue as any).getJobCounts();

  return {
    waiting: jobCounts.waiting || 0,
    active: jobCounts.active || 0,
    completed: jobCounts.completed || 0,
    failed: jobCounts.failed || 0,
    total: (jobCounts.waiting || 0) + (jobCounts.active || 0) + (jobCounts.completed || 0) + (jobCounts.failed || 0)
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job: BullJobLike | null = await (documentQueue as any).getJob(jobId);
    if,