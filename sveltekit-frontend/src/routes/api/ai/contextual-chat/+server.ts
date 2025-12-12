// src/routes/api/ai/contextual-chat/+server.ts

import { json } from '@sveltejs/kit';
import type { ChatResponse, ChatCitation } from '$lib/server/rag/rag-types';

// Placeholder LLM function - replace with your existing Ollama/Gemma3 integration
async function callLLM(prompt: string): Promise<string> {
  // TODO: Replace with your existing LLM integration
  // This should call your existing Ollama/Gemma3 endpoint
  return `[LLM Integration Placeholder]

This is where your existing Ollama/Gemma3 chat integration should be called.
The prompt has been prepared with retrieved sources and proper instructions.

Prompt preview (first 500 chars):
${prompt.slice(0, 500)}${prompt.length > 500 ? '...' : ''}

To complete this integration, replace this function with your existing chat implementation.`;
}

export async function POST({ request, fetch }) {
  try {
    const body = await request.json();
    const message = String(body.message ?? '').trim();

    if (!message) {
      return json({ error: 'Missing message' }, { status: 400 });
    }

    const jurisdiction = (body.jurisdiction ?? null) as string | null;
    const caseId = (body.caseId ?? null) as string | null;
    const tagIds = (body.tagIds ?? []) as string[];

    // Perform RAG search to find relevant chunks
    const ragRes = await fetch('/api/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        limit: 12,
        scoreThreshold: 0.2,
        jurisdiction,
        caseId,
        tagIds,
      }),
    });

    if (!ragRes.ok) {
      const errorText = await ragRes.text();
      return json({ error: `RAG search failed: ${errorText}` }, { status: 500 });
    }

    const { results } = await ragRes.json();

    // Build structured citations
    const citations: ChatCitation[] = (results ?? []).map((r: any, i: number) => ({
      n: i + 1,
      chunk_id: r.id,
      evidence_id: r.payload?.evidence_id,
      case_id: r.payload?.case_id,
      file_name: r.payload?.file_name,
      page_number: r.payload?.page_number,
      url: r.payload?.url ?? null,
      score: r.finalScore ?? r.score,
      tags: (r.payload?.tags_resolved ?? []).map((t: any) => ({
        namespace: t.namespace,
        name: t.name,
        jurisdiction: t.jurisdiction,
      })),
    }));

    // Build sources block for LLM prompt
    const sourcesBlock = citations.map((c) => {
      const payload = results[c.n - 1]?.payload ?? {};
      const text = payload.text ?? payload.content ?? '';
      const header = `[#${c.n}] ${c.file_name ?? 'Unknown'} (page ${c.page_number ?? '?'})`;
      return `${header}\n${text}`;
    }).join('\n\n');

    // Create prompt for LLM
    const prompt = [
      `You are a legal-domain assistant.`,
      `Use ONLY the SOURCES below. If the sources don't support an answer, say you don't have enough evidence.`,
      `Cite sources using [#] markers that match the source numbers.`,
      `Be precise and accurate. Do not make assumptions beyond what the sources state.`,
      ``,
      `SOURCES:`,
      sourcesBlock,
      ``,
      `QUESTION: ${message}`,
    ].join('\n');

    // Generate response using LLM
    const answer = await callLLM(prompt);

    const response: ChatResponse = {
      answer,
      citations,
    };

    return json(response);
  } catch (error) {
    console.error('Contextual chat error:', error);
    return json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}