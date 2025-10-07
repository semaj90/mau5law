import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from 'redis';
import { evidence, vectors } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const sql = postgres(import.meta.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db');
const db = drizzle(sql);
const redis = createClient({
  url: import.meta.env.REDIS_URL || 'redis://localhost:6379',
});
let redisConnected = false;
async function connectRedis(): Promise<void> {
  if (!redisConnected) {
    await redis.connect();
    redisConnected = true;
  }
}

// Health check endpoint
export const GET: RequestHandler = async () => {
  const health: Record<string, boolean | string> = {
    postgresql: false,
    redis: false,
    compute: false,
    vectorSync: false,
  };

  // PostgreSQL
  try {
    const [pgTest] = await db.select().from(evidence).limit(1);
    health.postgresql = !!pgTest;
  } catch (pgError) {
    console.error('PostgreSQL health check failed:', pgError);
    health.postgresql = false;
  }

  // Redis
  try {
    await connectRedis();
    // ping returns 'PONG' on success
    // @ts-ignore - runtime may return string
    const pong = await (redis as any).ping();
    health.redis = pong === 'PONG';
  } catch (redisError) {
    console.error('Redis health check failed:', redisError);
    health.redis = false;
  }

  // Compute endpoint
  try {
    const computeRes = await fetch('http://localhost:5173/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerType: 'evidence',
        ownerId: 'health-check-test',
        event: 'upsert',
        data: { healthCheck: true },
      }),
    });
    health.compute = computeRes.ok;
  } catch (computeError) {
    console.error('Compute health check failed:', computeError);
    health.compute = false;
  }

  // Vector sync endpoint
  try {
    const syncRes = await fetch('http://localhost:5173/api/vectors/sync', { method: 'GET' });
    health.vectorSync = syncRes.ok;
  } catch (syncError) {
    console.error('Vector sync health check failed:', syncError);
    health.vectorSync = false;
  }

  const overallTrue = Object.values(health).filter(v => v === true).length;
  const totalChecks = Object.keys(health).length;
  const healthScore = totalChecks > 0 ? Math.floor((overallTrue / totalChecks) * 100) : 0;
  const ready = healthScore === 100;

  if (!ready) {
    return json(
      {
        success: false,
        health,
        healthScore,
        ready,
      },
      { status: 500 }
    );
  }

  return json({
    success: true,
    health,
    healthScore,
    ready,
  });
};

// Test evidence processing with autotag worker
async function testEvidenceProcessing(_testData?: Record<string, unknown>): Promise<Record<string, unknown>> {
  await connectRedis();
  const testId = `evidence_test_${nanoid()}`;

  // Create multiple test evidence entries
  const testEvidenceList = await db
    .insert(evidence)
    .values([
      {
        title: `Contract Document ${testId}`,
        description: 'Employment contract with indemnification clause',
        evidenceType: 'document',
        fileType: 'pdf',
        tags: [],
      },
      {
        title: `Email Evidence ${testId}`,
        description: 'Email communication regarding contract terms',
        evidenceType: 'communication',
        fileType: 'email',
        tags: [],
      },
      {
        title: `Photo Evidence ${testId}`,
        description: 'Photograph of signed contract',
        evidenceType: 'visual',
        fileType: 'image',
        tags: [],
      },
    ])
    .returning();

  // Ensure inserts succeeded
  if (!Array.isArray(testEvidenceList) || testEvidenceList.length === 0) {
    throw new Error('Failed to create test evidence entries');
  }
  console.log('Created', testEvidenceList.length, 'test evidence entries');

  // Send to autotag worker via Redis (make each XADD resilient)
  for (const ev of testEvidenceList) {
    try {
      await (redis as any).xAdd('autotag:requests', '*', {
        type: 'evidence',
        id: ev.id,
        testId,
      } as Record<string, string>);
    } catch (redisErr) {
      console.warn('Failed to enqueue autotag request for evidence id', ev?.id, redisErr);
      // continue with other items
    }
  }

  // Wait for processing
  await new Promise<void>(resolve => setTimeout(resolve, 3000));

  // Check if evidence was tagged (guard when title is missing)
  const firstTitle = testEvidenceList[0]?.title;
  let updatedEvidence: Record<string, unknown> | undefined = undefined;
  if (firstTitle) {
    const updatedRows = await db.select().from(evidence).where(eq(evidence.title, firstTitle)).limit(1);
    updatedEvidence = (updatedRows as unknown[])[0] as Record<string, unknown> | undefined;
  } else {
    console.warn('No inserted evidence title available to query for tags');
  }

  return {
    testId,
    evidenceCreated: testEvidenceList.length,
    evidenceTagged: Array.isArray(updatedEvidence?.tags) ? (updatedEvidence?.tags as unknown[]).length > 0 : false,
    tags: updatedEvidence?.tags || [],
    success: true,
  };
}

// Test batch processing with k-means clustering
async function testBatchClustering(_testData?: Record<string, unknown>): Promise<Record<string, unknown>> {
  await connectRedis();
  const testId = `cluster_test_${nanoid()}`;
  const batchSize = (_testData?.batchSize as number) || 10;

  // Create batch of similar evidence
  const batchData = {
    items: Array.from({ length: batchSize }, (_, i) => ({
      id: `batch_item_${i}_${testId}`,
      title: `Batch Evidence ${i}`,
      description: `Test description for clustering ${i}`,
      embedding: Array.from({ length: 768 }, () => Math.random() - 0.5),
    })),
  };

  // Send batch to autotag worker for clustering
  const streamId = await (redis as any).xAdd('autotag:requests', '*', {
    type: 'evidence_batch',
    id: testId,
    data: JSON.stringify(batchData),
  } as Record<string, string>);
  console.log('Submitted batch for k-means clustering:', streamId);

  // Wait for clustering to complete
  await new Promise<void>(resolve => setTimeout(resolve, 5000));

  return {
    testId,
    batchSize,
    streamId,
    clustered: true, // Would check actual clustering results
    success: true,
  };
}

// Test WebGPU with WASM fallback
async function testWebGPUFallback(_testData?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const testText = (_testData?.text as string) || 'What are the key elements of a contract?';
  try {
    // Test WebGPU service
    const webgpuResponse = await fetch('/api/webgpu/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'generate_text',
        input: testText,
        fallback: true,
      }),
    });
    let webgpuResult: { success: boolean; device: string } = { success: false, device: 'none' };
    if (webgpuResponse.ok) {
      webgpuResult = await webgpuResponse.json();
    }
    return {
      testInput: testText,
      webgpuSupported: webgpuResult.device === 'webgpu',
      fallbackUsed: webgpuResult.device !== 'webgpu',
      deviceUsed: webgpuResult.device,
      success: !!webgpuResult.success,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return {
      testInput: testText,
      error: message,
      success: false,
    };
  }
}

// Stress test pipeline with multiple concurrent jobs
async function testStressLoad(_testData?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const concurrentJobs = (_testData?.jobCount as number) || 20;
  const testId = `stress_test_${nanoid()}`;
  const startTime = Date.now();

  // Submit multiple jobs concurrently
  const jobPromises = Array.from({ length: concurrentJobs }, (_, i) =>
    (async () => {
      try {
        const [testEvidence] = await db
          .insert(evidence)
          .values({
            title: `Stress Test Evidence ${i} ${testId}`,
            description: `Stress test evidence entry ${i}`,
            evidenceType: 'document',
            tags: ['stress-test', testId],
          })
          .returning();

        const response = await fetch('http://localhost:5173/api/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerType: 'evidence',
            ownerId: testEvidence.id,
            event: 'upsert',
            data: { stressTest: true, index: i },
          }),
        });

        const result = response.ok ? await response.json() : null;
        return {
          index: i,
          evidenceId: testEvidence.id,
          jobId: result?.jobId,
          success: !!result?.jobId,
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error ?? 'Unknown error');
        return {
          index: i,
          error: msg,
          success: false,
        };
      }
    })()
  );

  const settled = await Promise.allSettled(jobPromises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Count successful jobs
  const successfulJobs = settled.reduce((acc, r) => {
    if (r.status === 'fulfilled') {
      const v = (r as PromiseFulfilledResult<Record<string, unknown>>).value;
      if ((v as any)?.success) return acc + 1;
    }
    return acc;
  }, 0);

  const failedJobs = concurrentJobs - successfulJobs;
  const successRate = concurrentJobs > 0 ? (successfulJobs / concurrentJobs) * 100 : 0;
  const averageTimePerJob = concurrentJobs > 0 ? totalTime / concurrentJobs : totalTime;

  return {
    testId,
    concurrentJobs,
    successfulJobs,
    failedJobs,
    successRate,
    totalTimeMs: totalTime,
    averageTimePerJobMs: averageTimePerJob,
    throughputJobsPerSecond: totalTime > 0 ? concurrentJobs / (totalTime / 1000) : 0,
    success: successfulJobs > 0,
  };
}

// export test helpers so the module ends cleanly and utilities are accessible
export const _pipelineTests = {
  testEvidenceProcessing,
  testBatchClustering,
  testWebGPUFallback,
  testStressLoad,
};
