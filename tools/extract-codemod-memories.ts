// tools/extract-codemod-memories.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const LOG_DIR = process.env.AGENT_LOG_DIR ?? path.join(process.cwd(), 'logs');
const LOG_FILE = process.env.CODEMOD_LOG_FILE ?? 'gemma-codemod-runs.jsonl';
const OUTPUT = process.env.CODEMOD_RAG_FILE ?? 'logs/codemod-memories-rag.json';

function main() {
  console.log('🔧 Script loaded, starting execution...');

  const fullPath = path.join(LOG_DIR, LOG_FILE);
  const normalized = path.normalize(fullPath);
  console.log('📂 Reading codemod log from:', normalized);

  if (!fs.existsSync(normalized)) {
    console.error('❌ Codemod log file not found:', normalized);
    process.exit(1);
  }

  console.log('📖 Extracting memories from log file...');

  const lines = fs.readFileSync(normalized, 'utf8').split(/\r?\n/);

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const out = fs.createWriteStream(OUTPUT, { encoding: 'utf8' });

  let memories = 0;
  let totalOccurrences = 0;
  const errorCounts: Record<string, number> = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Only keep successful codemod runs
    if (entry.status && entry.status !== 'ok') continue;

    const code = String(entry.code ?? '');
    const message = String(entry.message ?? '');
    const errorKey = String(entry.errorKey ?? '');
    const count = Number(entry.count ?? 0);
    const rawAnswer = String(entry.rawAnswer ?? '').trim();

    // If no rawAnswer (model output), skip
    if (!rawAnswer || rawAnswer.length < 20) continue;

    // minimal memory object for RAG
    const mem = {
      id: entry.id ?? randomUUID(),
      timestamp: entry.timestamp ?? new Date().toISOString(),
      errorKey,
      code,
      message,
      count,
      content: rawAnswer,          // 👈 this is what we'll embed later
      source: 'gemma-codemod',
      tags: [
        'codemod',
        'svelte-check',
        code,
        errorKey,
      ].filter(Boolean),
    };

    out.write(JSON.stringify(mem) + '\n');
    memories++;
    totalOccurrences += count;
    if (code) {
      errorCounts[code] = (errorCounts[code] ?? 0) + count;
    }
  }

  out.end();

  console.log(`✅ Extracted ${memories} memories`);
  console.log('');
  console.log('📊 Codemod Memory Summary:');
  console.log('Total memories:', memories);
  console.log('Total error occurrences covered:', totalOccurrences);
  console.log('Top error codes:', errorCounts);
  console.log('💾 Saved memories for RAG at:', OUTPUT);
}

if (process.argv[1] && path.normalize(process.argv[1]) === path.normalize(process.argv[1])) {
  // Simple guard so it runs when executed directly
  main();
}