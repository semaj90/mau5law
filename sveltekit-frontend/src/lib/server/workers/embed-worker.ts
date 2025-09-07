/* eslint-disable no-restricted-globals */
import { parentPort, workerData } from 'worker_threads';
import type { ChunkJob, EmbedResult } from '$lib/types/pipeline';
import { getEmbeddingViaGate } from '$lib/server/embedding-gateway';

async function run() {
  const job = workerData as ChunkJob;
  try {
    const res = await getEmbeddingViaGate(fetch as unknown as typeof globalThis.fetch, job.text, {
      model: job.model,
      tags: job.tags
    });
    const out: EmbedResult = {
      docId: job.docId,
      chunkId: job.chunkId,
      embedding: res.embedding,
      model: res.model,
      backend: res.backend,
      cached: false
    };
    parentPort?.postMessage({ ok: true, result: out });
  } catch (e: any) {
    parentPort?.postMessage({ ok: false, error: e?.message || String(e) });
  }
}

void run();
