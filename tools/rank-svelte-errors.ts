// tools/rank-svelte-errors.ts
import * as fs from 'node:fs';

interface SvelteErrorRecord {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  raw: string;
}

interface ErrorCluster {
  key: string;
  code: string;
  message: string;
  count: number;
  examples: SvelteErrorRecord[];
}

const inputJsonl = process.argv[2] ?? '.svelte-errors.jsonl';
const outputJson = process.argv[3] ?? '.svelte-errors-top.json';
const maxErrorTypes = Number(process.argv[4] ?? '100'); // top N
const maxExamplesPerType = Number(process.argv[5] ?? '5');

if (!fs.existsSync(inputJsonl)) {
  console.error(`❌ Input JSONL not found: ${inputJsonl}`);
  process.exit(1);
}

console.log(`📊 Ranking errors from: ${inputJsonl}`);
console.log(`🎯 Will output top ${maxErrorTypes} error types with up to ${maxExamplesPerType} examples each.`);

const clusters = new Map<string, ErrorCluster>();

const lines = fs.readFileSync(inputJsonl, 'utf8').split(/\r?\n/);

for (const line of lines) {
  if (!line.trim()) continue;
  let rec: SvelteErrorRecord;
  try {
    rec = JSON.parse(line);
  } catch (err) {
    continue;
  }

  // 🔥 Skip generated / vendor / build outputs
  const file = rec.file || '';
  if (
    file.startsWith('.svelte-kit/') ||
    file.startsWith('.svelte-kit\\') ||
    file.includes('/.svelte-kit/') ||
    file.includes('\\.svelte-kit\\') ||
    file.startsWith('node_modules/') ||
    file.startsWith('node_modules\\') ||
    file.includes('/node_modules/') ||
    file.includes('\\node_modules\\') ||
    file.startsWith('dist/') ||
    file.startsWith('dist\\') ||
    file.includes('/dist/') ||
    file.includes('\\dist\\') ||
    file.startsWith('.cache/') ||
    file.startsWith('.cache\\') ||
    file.includes('/.cache/') ||
    file.includes('\\.cache\\')
  ) {
    continue;
  }

  // Normalize message (strip file paths, numbers, etc. for better grouping)
  const normalizedMessage = rec.message
    .replace(/'[^']*'/g, "'<value>'") // Replace quoted values
    .replace(/\d+/g, '<number>') // Replace numbers
    .replace(/src\/[^\/]+\/[^\/]+\//g, 'src/<path>/') // Normalize paths
    .trim();

  const key = `${rec.code}::${normalizedMessage}`;
  let cluster = clusters.get(key);
  if (!cluster) {
    cluster = {
      key,
      code: rec.code,
      message: normalizedMessage,
      count: 0,
      examples: [],
    };
    clusters.set(key, cluster);
  }

  cluster.count++;

  if (cluster.examples.length < maxExamplesPerType) {
    cluster.examples.push(rec);
  }
}

const sorted = Array.from(clusters.values()).sort((a, b) => b.count - a.count);
const top = sorted.slice(0, maxErrorTypes);

const result = {
  totalErrorRecords: lines.filter((l) => l.trim()).length,
  distinctErrorTypes: clusters.size,
  topErrorTypes: top,
};

fs.writeFileSync(outputJson, JSON.stringify(result, null, 2), 'utf8');

console.log(`✅ Wrote ranked errors → ${outputJson}`);
console.log(`   📈 Total error records: ${result.totalErrorRecords}`);
console.log(`   🎨 Distinct error types: ${result.distinctErrorTypes}`);
console.log(`   🏆 Top error types: ${top.length}`);

// Show top 5 for quick overview
if (top.length > 0) {
  console.log(`\n🔥 Top 5 Error Patterns:`);
  top.slice(0, 5).forEach((cluster, i) => {
    console.log(`   ${i + 1}. ${cluster.code}: ${cluster.message} (${cluster.count} occurrences)`);
  });
}