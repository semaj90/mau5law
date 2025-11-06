#!/usr/bin/env npx tsx
/**
 * Phase48 – Code Graph Embedder
 * -------------------------------------
 * 1. Runs after `npx svelte-check --output json`
 * 2. Uses Gemma3-Legal / embeddinggemma:latest to vectorize diagnostics
 * 3. Publishes payloads to Redis → picked up by the QUIC Bridge → GPU Analyzer
 */

import fs from "fs/promises";
import path from "node:path";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const OLLAMA_URL = process.env.OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434";
const SVELTECHECK_PATH = path.resolve(".cache/sveltecheck.json");

/** Embedding client with Gemma3 + fallback */
async function embedText(text: string, model = "embeddinggemma:latest") {
  const endpoint = `${OLLAMA_URL}/api/embeddings`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.embedding && Array.isArray(json.embedding)) return json.embedding;
    if (json.data && json.data[0]?.embedding) return json.data[0].embedding;
    throw new Error("Invalid embedding response");
  } catch (err) {
    console.warn(`[phase48] ⚠️ embedding fallback (${err}) → returning zero-vec`);
    return Array(768).fill(0); // still publish, to trigger graph node creation
  }
}

async function main() {
  console.log("[phase48] 🧩 Embedding Svelte-check diagnostics...");
  const raw = await fs.readFile(SVELTECHECK_PATH, "utf8");
  const json = JSON.parse(raw);
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  const diagnostics = json.diagnostics ?? [];
  console.log(`[phase48] Found ${diagnostics.length} diagnostics`);

  for (const diag of diagnostics) {
    const text = `${diag.code}: ${diag.message} (${diag.file}:${diag.start?.line})`;
    const vec = await embedText(text);
    const payload = {
      id: `ts-error:${diag.code}:${diag.file}`,
      vector: vec,
      metadata: {
        code: diag.code,
        file: diag.file,
        line: diag.start?.line ?? null,
        severity: diag.severity,
        message: diag.message,
        created_at: new Date().toISOString(),
      },
    };
    await redis.publish("ai:embedding:new", JSON.stringify(payload));
    console.log(`[phase48] → published ${payload.id}`);
  }

  await redis.quit();
  console.log("[phase48] ✅ Published all diagnostics to Redis → Phase47 pipeline");
}

main().catch((err) => {
  console.error("[phase48] Fatal:", err);
  process.exit(1);
});
