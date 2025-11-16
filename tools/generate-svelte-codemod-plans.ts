// tools/generate-svelte-codemod-plans.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import fetch from 'node-fetch';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3-legal:latest';

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

interface RankedErrorsFile {
  totalErrorRecords: number;
  distinctErrorTypes: number;
  topErrorTypes: ErrorCluster[];
}

async function callOllamaChat(
  content: string,
  systemPrompt: string,
): Promise<string> {
  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    stream: false,
    options: {
      num_predict: 512,
    },
  };

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error: ${res.status} ${res.statusText} – ${text}`);
  }

  const data = await res.json() as {
    message?: { content?: string };
  };

  const answer = data?.message?.content ?? '';
  if (!answer.trim()) {
    throw new Error('Empty response from Ollama');
  }
  return answer;
}

function ensureLogDir(): string {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function logCodemodEvent(entry: any) {
  const dir = ensureLogDir();
  const file = path.join(dir, 'gemma-codemod-runs.jsonl');
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
}

async function main() {
  const inputPath = process.argv[2] ?? '.svelte-errors-top.json';
  const outputMd = process.argv[3] ?? 'svelte-codemod-plans.md';

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const ranked: RankedErrorsFile = JSON.parse(raw);

  console.log(`📥 Loaded ranked errors from: ${inputPath}`);
  console.log(
    `   total records: ${ranked.totalErrorRecords}, distinct types: ${ranked.distinctErrorTypes}, top types: ${ranked.topErrorTypes.length}`,
  );

  const systemPrompt = `
You are an expert SvelteKit 2 + TypeScript + Svelte 5 (runes) engineer.

You will be given:
- A TypeScript error pattern (error code + message + occurrence count).
- Several example occurrences with file, line and raw code.

Your job is to design a **codemod** (automated code transformation) to fix ALL instances
of this error pattern across a large monorepo.

CRITICAL RULES:
- DO NOT write a long tutorial or general debugging guide.
- DO NOT explain basic TypeScript concepts.
- Focus ONLY on:
  - What pattern to match (AST or text).
  - What exact transformation to apply.
  - 1–2 short before/after code examples.
- Keep the answer under 300 tokens.

Return your answer in this exact Markdown structure:

## Summary
- 1 short bullet: why this error happens in this project.
- 1 short bullet: what kind of code we will rewrite.

## Codemod Strategy
- Bullet list describing:
  - File globs to target (e.g. \`src/lib/**/*.ts\`, \`src/routes/**/*.svelte\`).
  - AST/text pattern to detect.
  - Transformation steps.

## Before / After

\`\`\`ts
// BEFORE
// minimal example showing the broken pattern
\`\`\`

\`\`\`ts
// AFTER
// minimal example showing the fixed pattern
\`\`\`

## Edge Cases
- 1–3 bullets of situations where the codemod should skip or be conservative.
`.trim();

  let md = '';
  md += '# Svelte / TypeScript Codemod Plans (Gemma 3)\n\n';
  md += `- Source: \`${inputPath}\`\n`;
  md += `- Model: \`${OLLAMA_MODEL}\`\n`;
  md += `- Generated: ${new Date().toISOString()}\n\n`;

  for (const cluster of ranked.topErrorTypes) {
    const header = `## Error: ${cluster.code} – ${cluster.message}\n`;
    console.log(`🧠 Analyzing ${cluster.code}: "${cluster.message}" (count=${cluster.count})`);

    // Build user content for this error pattern
    const examplesText = cluster.examples
      .map((ex, idx) => {
        const loc = `${ex.file}:${ex.line}:${ex.column}`;
        return [
          `Example #${idx + 1}: ${loc}`,
          '',
          '```ts',
          ex.raw || '// [no raw line captured]',
          '```',
          '',
        ].join('\n');
      })
      .join('\n');

    const userContent = [
      `Error pattern key: ${cluster.key}`,
      `Error code: ${cluster.code}`,
      `Message: ${cluster.message}`,
      `Total occurrences: ${cluster.count}`,
      '',
      'Example occurrences:',
      '',
      examplesText || '[no examples]',
    ].join('\n');

    let answer: string;
    try {
      answer = await callOllamaChat(userContent, systemPrompt);
    } catch (err: any) {
      console.error(`   ❌ Ollama call failed for ${cluster.key}:`, err?.message ?? err);
      logCodemodEvent({
        timestamp: new Date().toISOString(),
        errorKey: cluster.key,
        code: cluster.code,
        message: cluster.message,
        count: cluster.count,
        status: 'error',
        error: String(err?.message ?? err),
      });
      continue;
    }

    // Log raw interaction for RAG later
    logCodemodEvent({
      timestamp: new Date().toISOString(),
      errorKey: cluster.key,
      code: cluster.code,
      message: cluster.message,
      count: cluster.count,
      examples: cluster.examples,
      model: OLLAMA_MODEL,
      rawPrompt: userContent,
      rawAnswer: answer,
      status: 'ok',
    });

    md += header + '\n';
    md += answer.trim() + '\n\n';
  }

  fs.writeFileSync(outputMd, md, { encoding: 'utf8' });
  console.log(`✅ Wrote codemod plans → ${outputMd}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});