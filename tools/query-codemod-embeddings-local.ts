// tools/query-codemod-embeddings-local.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import fetch from 'node-fetch';

const INPUT = process.argv[2] ?? 'logs/codemod-memories-embedded.jsonl';
const QUERY = process.argv.slice(3).join(' ');
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'embeddinggemma:latest';

if (!QUERY) {
  console.error('Usage: tsx tools/query-codemod-embeddings-local.ts logs/codemod-memories-embedded.jsonl "How to fix TS1005 in SvelteKit"');
  process.exit(1);
}

if (!fs.existsSync(INPUT)) {
  console.error('❌ Embedded memories file not found:', INPUT);
  process.exit(1);
}

interface EmbeddedMemory {
  id: string;
  code: string;
  message: string;
  count: number;
  content: string;
  tags: string[];
  embedding: number[];
}

async function embedQuery(text: string): Promise<number[]> {
  console.log('🔄 Calling embedding API...');
  const body = {
    model: EMBED_MODEL,
    prompt: text,
  };

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('API response status:', res.status);

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embed error: ${res.status} ${res.statusText} ${t}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  console.log('Embedding received, length:', data.embedding.length);
  return data.embedding;
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main() {
  console.log('📥 Starting local query...');
  console.log('Input file:', INPUT);
  console.log('Query:', QUERY);

  // Write to file for debugging
  const fs = await import('fs');
  const output = [];
  output.push('📥 Starting local query...');
  output.push('Input file: ' + INPUT);
  output.push('Query: ' + QUERY);

  const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/);

  const memories: EmbeddedMemory[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const mem = JSON.parse(line);
    if (!Array.isArray(mem.embedding)) continue;
    memories.push(mem);
  }

  output.push(`📊 Loaded ${memories.length} memories`);

  // For testing, just show the first few memories
  output.push('\nFirst 3 memories:');
  for (let i = 0; i < Math.min(3, memories.length); i++) {
    const mem = memories[i];
    output.push(`${i+1}. ${mem.code}: ${mem.message} (${mem.embedding.length} dims)`);
  }

  output.push('Skipping full query for now - Ollama not available for testing');

  // Write to file
  fs.writeFileSync('query_debug.txt', output.join('\n'));
  console.log('Output written to query_debug.txt');
}

// Run main if this is the main module
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('query-codemod-embeddings-local.ts')) {
  main().catch((err) => {
    console.error('Fatal error in query-codemod-embeddings-local:', err);
    process.exit(1);
  });
}