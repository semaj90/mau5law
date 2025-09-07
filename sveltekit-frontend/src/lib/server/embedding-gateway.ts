import type { BackendId } from '$lib/types/pipeline';

export interface EmbedGatewayOptions {
  model?: string;
  tags?: string[];
}

export interface EmbedGatewayResult {
  embedding: number[];
  backend: BackendId;
  model: string;
}

// Backend-agnostic embedding gateway: tries FastAPI -> vLLM -> Ollama -> Go
export async function getEmbeddingViaGate(
  fetchFn: typeof fetch,
  text: string,
  opts: EmbedGatewayOptions = {}
): Promise<EmbedGatewayResult> {
  const model =
    opts.model ||
    process.env.EMBED_MODEL ||
    process.env.PUBLIC_EMBED_MODEL ||
    process.env.EMBED_MODEL_DEFAULT ||
    process.env.PUBLIC_EMBED_MODEL_DEFAULT ||
    'nomic-embed-text';

  // FastAPI
  const fastApiUrl = process.env.FASTAPI_URL || process.env.PUBLIC_FASTAPI_URL;
  if (fastApiUrl) {
    try {
      const resp = await fetchFn(`${fastApiUrl.replace(/\/$/, '')}/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, model, tags: opts.tags || [] })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data?.embedding)) {
          return { embedding: data.embedding, backend: 'fastapi', model };
        }
      }
    } catch {}
  }

  // vLLM / OpenAI compatible
  const vllmUrl = (process.env.VLLM_ENDPOINT || process.env.PUBLIC_VLLM_ENDPOINT || '').replace(/\/$/, '');
  if (vllmUrl) {
    try {
      const vResp = await fetchFn(`${vllmUrl}/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, input: text })
      });
      if (vResp.ok) {
        const vJson = await vResp.json();
        const emb: number[] | undefined = vJson?.data?.[0]?.embedding as number[] | undefined;
        if (Array.isArray(emb) && emb.length > 0) {
          return { embedding: emb, backend: 'vllm', model };
        }
      }
    } catch {}
  }

  // Ollama
  try {
    const ollamaUrl = (process.env.OLLAMA_URL || process.env.PUBLIC_OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
    const oResp = await fetchFn(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });
    if (oResp.ok) {
      const oJson = await oResp.json();
      const emb: number[] | undefined = (oJson?.embedding as number[] | undefined) ?? (oJson?.data?.[0]?.embedding as number[] | undefined);
      if (Array.isArray(emb) && emb.length > 0) {
        return { embedding: emb, backend: 'ollama', model };
      }
    }
  } catch {}

  // Go bridge
  try {
    const goReq = {
      operation: 'vectorize',
      documentId: `doc:${Date.now()}`,
      data: [] as number[],
      options: { timeout: 5000 }
    };
    const goResp = await fetchFn('/api/tensor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(goReq)
    });
    if (goResp.ok) {
      const goJson = await goResp.json();
      const emb = goJson?.data?.result?.embeddings as number[] | undefined;
      if (Array.isArray(emb) && emb.length > 0) {
        return { embedding: emb, backend: 'go', model };
      }
    }
  } catch {}

  throw new Error('No embedding backend available');
}

// Simple batch wrapper to align with sample endpoint usage
export async function embedText(fetchFn: typeof fetch, texts: string[], model?: string): Promise<{ embeddings: number[][]; backend: BackendId; model: string }>{
  let backend: BackendId = 'unknown';
  let lastModel = model || process.env.EMBED_MODEL || process.env.PUBLIC_EMBED_MODEL || 'nomic-embed-text';
  const out: number[][] = [];
  for (const t of texts) {
    const res = await getEmbeddingViaGate(fetchFn, t, { model });
    backend = res.backend; // last write wins; heterogeneous batches not expected here
    lastModel = res.model;
    out.push(res.embedding);
  }
  return { embeddings: out, backend, model: lastModel };
}
