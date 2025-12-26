#!/usr/bin/env node
/**
 * Phase 81: TSC Error Summarizer
 * Parses tsc output into structured JSON for Qdrant/PG ingestion
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

console.log('🔧 Phase 81: TSC Error Summarizer\n');

const out = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
  shell: true,
  maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large output
});

const text = (out.stdout || '') + (out.stderr || '');
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/tsc-latest.txt', text, 'utf8');

const lines = text.split(/\r?\n/);
const errors = [];

for (const line of lines) {
  // Typical: path(line,col): error TS1234: message
  const m = line.match(/^(.*)\((\d+),(\d+)\): error TS(\d+): (.*)$/);
  if (!m) continue;
  errors.push({
    file: m[1],
    line: Number(m[2]),
    col: Number(m[3]),
    code: `TS${m[4]}`,
    msg: m[5],
  });
}

const byCode = new Map();
const byFile = new Map();

for (const e of errors) {
  byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
  byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1);
}

const top = (m, n) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));

const summary = {
  timestamp: new Date().toISOString(),
  tsErrorCount: errors.length,
  topCodes: top(byCode, 20),
  topFiles: top(byFile, 20),
  sample: errors.slice(0, 50),
};

fs.writeFileSync('reports/tsc-summary.json', JSON.stringify(summary, null, 2), 'utf8');

console.log(`📊 TS errors parsed: ${errors.length}\n`);
console.log('🔝 Top 10 Error Codes:');
summary.topCodes.slice(0, 10).forEach((c, i) => {
  console.log(`   ${i + 1}. ${c.key}: ${c.count} errors`);
});
console.log('\n📁 Top 10 Files:');
summary.topFiles.slice(0, 10).forEach((f, i) => {
  console.log(`   ${i + 1}. ${f.key}: ${f.count} errors`);
});
console.log('\n✅ Written to reports/tsc-summary.json');
process.exit(out.status ?? 1);
