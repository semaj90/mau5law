#!/usr/bin/env ts-node

import * as fs from 'node:fs';
import fetch from 'node-fetch';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'embeddinggemma:latest';
const INPUT = process.env.CODEMOD_EMBED_FILE ?? 'logs/codemod-memories-embedded.jsonl';

interface EmbeddedCodemodMemory {
  id: string;
  timestamp?: string;
  errorKey: string;
  code: string;
  message: string;
  count: number;
  priority?: string;
  framework?: string;
  source?: string;
  content: string;
  tags: string[];
  langextract?: any;
  embedding_model?: string;
  embedding: number[];
}

function loadMemories(path: string): EmbeddedCodemodMemory[] {
  if (!fs.existsSync(path)) {
    throw new Error(`Embedded memories file not found: ${path}`);
  }

  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  const out: EmbeddedCodemodMemory[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const mem = JSON.parse(line);
    if (!Array.isArray(mem.embedding) || mem.embedding.length === 0) continue;
    out.push(mem);
  }

  return out;
}

async function embedQuery(text: string): Promise<number[]> {
  const body = {
    model: EMBED_MODEL,
    prompt: text,
  };

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embed error: ${res.status} ${res.statusText} ${t}`);
  }

  const data = await res.json();
  if (!data.embedding) {
    throw new Error('No embedding returned from Ollama');
  }

  return data.embedding;
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('Usage: npx tsx tools/query-codemod-memories.ts "<query text>"');
    process.exit(1);
  }

  console.log(`🔍 Query: ${query}`);
  console.log(`📥 Loading embedded memories from ${INPUT} ...`);
  const memories = loadMemories(INPUT);
  console.log(`   Loaded ${memories.length} memories`);

  console.log('🧠 Embedding query...');
  const qVec = await embedQuery(query);

  const scored = memories
    .map((m) => ({
      memory: m,
      score: cosineSim(qVec, m.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log('\n🏆 Top matches:\n');
  for (const { memory, score } of scored) {
    console.log(`• [${memory.code}] ${memory.message} (score=${score.toFixed(4)})`);
    console.log(`  occurrences: ${memory.count}, priority: ${memory.priority ?? 'n/a'}`);
    console.log(`  tags: ${memory.tags.join(', ')}`);
    if (memory.langextract?.topics) {
      console.log(`  topics: ${memory.langextract.topics.join(', ')}`);
    }
    console.log();
  }
}

// ESM-friendly: tsx will treat this as the entrypoint, so we just call main().
main().catch((err) => {
  console.error('❌ Query failed:', err);
  process.exit(1);
});