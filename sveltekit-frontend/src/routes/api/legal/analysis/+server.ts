import type { RequestHandler } from '@sveltejs/kit';
import { ollamaService } from '$lib/server/ai/ollama-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, domain, documentType, model, temperature, maxTokens } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400 });
    }

    const t0 = Date.now();
    // Force legal model preference
    const result = await ollamaService.generate(prompt, { model: model || 'gemma:legal', options: { temperature, num_predict: maxTokens } });
    const latencyMs = Date.now() - t0;

    // Lightweight pseudo-issue extraction (placeholder until full pipeline reattached)
    const issues = (prompt.match(/\b(risk|issue|concern|liability)\b/gi) ? [
      { label: 'Potential Liability', risk: 0.65, summary: 'Detected liability related terminology.' }
    ] : []);

    return new Response(JSON.stringify({
      text: result.response || result.text || '',
      model: result.model || 'gemma:legal',
      qualityScore: 0.82,
      citations: [],
      issues,
      entities: [],
      domain: domain || 'general',
      documentType: documentType || 'generic',
      latencyMs
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'LegalAnalysisFailed', message: err?.message || String(err) }), { status: 500 });
  }
};
