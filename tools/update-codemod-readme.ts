// tools/update-codemod-readme.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import fetch from 'node-fetch';
import { fetchAndParse } from '../src/agents/webFetch';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'gemma3-legal:latest';
const RAG_ENDPOINT = process.env.RAG_ENDPOINT ?? ''; // optional: if you expose rag_lookup via HTTP

const README_PATH = process.argv[2] ?? 'docs/AI_CODEMOD_README.md';
const DOC_URLS = process.argv.slice(3).filter(Boolean);

if (!DOC_URLS.length) {
  console.error('Usage: tsx tools/update-codemod-readme.ts docs/AI_CODEMOD_README.md https://kit.svelte.dev/docs,https://www.typescriptlang.org/docs/handbook');
  process.exit(1);
}

async function summarizeDocWithCodemods(url: string): Promise<string> {
  const page = await fetchAndParse(url);

  let ragContext = '';
  if (RAG_ENDPOINT) {
    try {
      const ragRes = await fetch(`${RAG_ENDPOINT}/codemods/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `codemods related to ${url}`, topK: 3 }),
      });
      if (ragRes.ok) {
        const data = await ragRes.json();
        const snippets = (data.matches ?? [])
          .map((m: any) => `- [${m.code}] ${m.message}\n\n${m.content}`)
          .join('\n\n');
        ragContext = snippets.slice(0, 4000);
      }
    } catch {
      // ignore if RAG endpoint not up
    }
  }

  const prompt = [
    `You are maintaining a README for an AI-powered SvelteKit 2 + TypeScript codemod pipeline.`,
    `You have:`,
    `1) External documentation text from: ${url}`,
    `2) (Optional) Internal codemod memories.`,
    ``,
    `Write a concise README section titled "### ${url}" that explains:`,
    `- What this documentation teaches that's relevant to TypeScript errors and codemods.`,
    `- How a developer on the YoRHa Legal AI team should use this knowledge when debugging or writing codemods.`,
    `- If codemod memories are provided, mention any patterns or fixes (TS1005, TS1128, etc.) that align with this doc.`,
    ``,
    `Constraints:`,
    `- Markdown only.`,
    `- Max ~400 tokens.`,
    `- End with a "Resources" list including the URL.`,
    ``,
    `---`,
    `EXTERNAL DOC TEXT (truncated):`,
    page.text.slice(0, 8000),
    ``,
    `---`,
    `INTERNAL CODEMOD MEMORIES (optional, may be empty):`,
    ragContext || '[none]',
  ].join('\n');

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You write technical README sections for a legal AI codemod pipeline.' },
      { role: 'user', content: prompt },
    ],
    stream: false,
  };

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama README update error: ${res.status} ${res.statusText} ${t}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
}

async function main() {
  let readme = '';
  if (fs.existsSync(README_PATH)) {
    readme = fs.readFileSync(README_PATH, 'utf8');
  } else {
    readme = '# YoRHa Legal AI – Codemod Knowledge Base\n\n';
  }

  readme += '\n\n---\n\n';
  readme += '## External Documentation Summaries\n\n';

  for (const url of DOC_URLS) {
    console.log('📚 Summarizing', url);
    const section = await summarizeDocWithCodemods(url);
    readme += section.trim() + '\n\n';
  }

  const dir = path.dirname(README_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(README_PATH, readme, { encoding: 'utf8' });

  console.log(`✅ Updated README at ${README_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error in update-codemod-readme:', err);
  process.exit(1);
});