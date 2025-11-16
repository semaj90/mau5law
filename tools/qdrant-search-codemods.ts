// tools/qdrant-search-codemods.ts
import fetch from 'node-fetch';

const QUERY = process.argv.slice(2).join(' ');
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'embeddinggemma:latest';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION ?? 'codemod_memories';

if (!QUERY) {
  console.error('Usage: tsx tools/qdrant-search-codemods.ts "How to fix TS1005 in SvelteKit"');
  process.exit(1);
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

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

async function qdrantSearch(vector: number[], topK: number) {
  const body = {
    vector,
    limit: topK,
    with_payload: true,
  };

  const res = await fetch(
    `${QDRANT_URL}/collections/${COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Qdrant search error: ${res.status} ${res.statusText} ${t}`);
  }

  const data = (await res.json()) as { result?: any[] };
  return data.result ?? [];
}

async function main() {
  console.log(`🔍 Qdrant search in collection "${COLLECTION}" for query: "${QUERY}"`);
  const qVec = await embedQuery(QUERY);

  const neighbors = await qdrantSearch(qVec, 5);
  if (!neighbors.length) {
    console.log('⚠️ No matches returned from Qdrant.');
    return;
  }

  for (const n of neighbors) {
    const p = n.payload ?? {};
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Score:    ${n.score.toFixed(4)}`);
    console.log(`Code:     ${p.code}`);
    console.log(`Message:  ${p.message}`);
    console.log(`Count:    ${p.count}`);
    console.log(`Priority: ${p.priority ?? '(none)'}`);
    console.log(`Framework:${p.framework ?? '(none)'}`);
    console.log(`Tags:     ${(p.tags ?? []).join(', ')}`);
    console.log(`Excerpt:\n${(p.content ?? '').slice(0, 400)}\n...`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal error in qdrant-search-codemods:', err);
    process.exit(1);
  });
}