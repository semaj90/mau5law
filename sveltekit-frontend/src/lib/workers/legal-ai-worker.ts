/// <reference types="node" />
/**
 * 🧠 RabbitMQ Worker for Legal AI Document Processing
 * Integrates SvelteKit with Go Legal AI Server + shared Redis
 */

import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { evidence } from '$lib/server/db/schema-postgres';
import { redis, ensureRedisReady } from '$lib/server/redis-client';
import { cuidSchema } from '$lib/server/z-schemas';

const GO_SERVER_URL = process.env.GO_SERVER_URL || 'http://localhost:8080';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://legal_admin:123456@localhost:5672';
const QUEUE_NAME = 'legal-ai-processing';
const PREFETCH = 1;

/* -------------------------------------------------------------------------- */
/* 🔹 Minimal Internal Processor Stub                                         */
/* -------------------------------------------------------------------------- */
async function processIncomingJob(jobData: LegalAIJobData): Promise<GoServerResponse> {
  console.log('🔎 Processing job payload:', jobData);

  // Example: store “job received” metadata in Redis for progress tracking
  await ensureRedisReady();
  await redis.hset(`job:${jobData.documentId}`, {
    status: 'processing',
    startedAt: new Date().toISOString(),
  });

  // Example placeholder AI call
  const results = await processDocumentWithGoServer(jobData);

  await updateEvidenceWithResults(jobData.documentId, results);
  await redis.hset(`job:${jobData.documentId}`, {
    status: 'completed',
    finishedAt: new Date().toISOString(),
  });

  return results;
}

/* -------------------------------------------------------------------------- */
/* 🔹 Worker Consumer                                                         */
/* -------------------------------------------------------------------------- */
export async function createLegalAIWorker() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE_NAME, { durable: true });
  await ch.prefetch(PREFETCH);

  console.log(`🔌 Legal AI Worker connected to ${RABBITMQ_URL}, queue "${QUEUE_NAME}"`);

  const onMessage = async (msg: amqp.ConsumeMessage | null) => {
    if (!msg) return;
    const raw = msg.content.toString();

    let job: LegalAIJobData;
    try {
      job = JSON.parse(raw);
      // optional schema validation (CUID-safe)
      cuidSchema.parse(job.documentId);
    } catch (e) {
      console.error('❌ Invalid job payload, dropping:', e);
      ch.ack(msg);
      return;
    }

    const jobId = job.jobId ?? randomUUID();
    console.log(`🔄 Processing job: ${jobId}`);

    try {
      const result = await processIncomingJob(job);
      console.log(`✅ Job completed: ${jobId}`, result);
      ch.ack(msg);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Job failed: ${jobId}:`, errMsg);

      const attempts = (msg.properties.headers?.attempts as number) ?? 0;
      const max = (msg.properties.headers?.maxAttempts as number) ?? 3;

      if (attempts < max) {
        const newHeaders = { ...msg.properties.headers, attempts: attempts + 1 };
        ch.sendToQueue(QUEUE_NAME, Buffer.from(raw), {
          persistent: true,
          headers: newHeaders,
        });
      }
      ch.ack(msg);
    }
  };

  const consumer = await ch.consume(QUEUE_NAME, onMessage, { noAck: false });
  return {
    async close() {
      await ch.cancel(consumer.consumerTag);
      await ch.close();
      await conn.close();
      console.log('🔌 Legal AI Worker closed');
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 🔹 Publisher (enqueue new job)                                             */
/* -------------------------------------------------------------------------- */
export async function addLegalAIJob(
  jobData: LegalAIJobData,
  options?: { priority?: number; delay?: number; attempts?: number }
): Promise<string> {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createConfirmChannel();
  await ch.assertQueue(QUEUE_NAME, { durable: true });

  const jobId = jobData.jobId ?? randomUUID();
  const payload = { ...jobData, jobId };

  const headers = {
    attempts: 0,
    maxAttempts: options?.attempts ?? 3,
  };

  const properties: amqp.Options.Publish = {
    persistent: true,
    priority: options?.priority,
    headers,
  };

  if (options?.delay && options.delay > 0) {
    properties.expiration = String(options.delay);
  }

  return new Promise((resolve, reject) => {
    ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), properties, async err => {
      try {
        await ch.close();
        await conn.close();
      } catch {
        /* ignore */
      }
      if (err) {
        console.error('❌ Failed to publish job:', err);
        return reject(err);
      }
      console.log(`📤 Queued job ${jobId} for "${QUEUE_NAME}"`);
      resolve(jobId);
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 🔹 Go Legal AI Server Integration                                          */
/* -------------------------------------------------------------------------- */
async function processDocumentWithGoServer(jobData: LegalAIJobData): Promise<GoServerResponse> {
  const payload = {
    document_id: jobData.documentId,
    content: jobData.content,
    case_id: jobData.caseId,
    document_type: jobData.documentType,
    options: {
      extract_entities: jobData.options?.extractEntities ?? true,
      generate_summary: jobData.options?.generateSummary ?? true,
      assess_risk: jobData.options?.assessRisk ?? true,
      generate_embedding: jobData.options?.generateEmbedding ?? true,
      store_in_database: jobData.options?.storeInDatabase ?? true,
      use_gemma3_legal: jobData.options?.useGemma3Legal ?? true,
    },
  };

  console.log(`🔄 Sending ${jobData.documentId} to Go server for processing...`);
  const response = await fetch(`${GO_SERVER_URL}/process-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Go server error ${response.status}: ${txt}`);
  }

  return (await response.json()) as GoServerResponse;
}

/* -------------------------------------------------------------------------- */
/* 🔹 Update Evidence Record                                                  */
/* -------------------------------------------------------------------------- */
async function updateEvidenceWithResults(documentId: string, results: GoServerResponse): Promise<void> {
  const updateData: Partial<typeof evidence.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (results.summary) {
    updateData.aiSummary = results.summary;
  }

  if (results.entities?.length) {
    updateData.aiExtractedEntities = JSON.stringify(results.entities);
  }

  updateData.aiProcessingMetadata = JSON.stringify({
    processing_time: results.processing_time,
    processed_at: new Date().toISOString(),
    go_server_metadata: results.metadata,
    success: results.success,
  });

  await db.update(evidence).set(updateData).where(eq(evidence.id, documentId));
  console.log(`✅ Evidence record ${documentId} updated.`);
}

/* -------------------------------------------------------------------------- */
/* 🔹 Types                                                                  */
/* -------------------------------------------------------------------------- */
export interface LegalAIJobData {
  jobId?: string;
  documentId: string;
  caseId?: string;
  content: string;
  documentType: 'evidence' | 'case' | 'legal_document';
  userId: string;
  options?: {
    extractEntities?: boolean;
    generateSummary?: boolean;
    assessRisk?: boolean;
    generateEmbedding?: boolean;
    storeInDatabase?: boolean;
    useGemma3Legal?: boolean;
  };
}

export interface GoServerResponse {
  success: boolean;
  document_id: string;
  summary?: string;
  entities?: LegalEntity[];
  risk_assessment?: RiskAssessment;
  embedding?: number[];
  processing_time: string;
  metadata: Record<string, unknown>;
  error?: string;
}

export interface LegalEntity {
  type: string;
  value: string;
  confidence: number;
  start_pos: number;
  end_pos: number;
}

export interface RiskAssessment {
  overall_risk: string;
  risk_score: number;
  risk_factors: string[];
  recommendations: string[];
  confidence: number;
}
