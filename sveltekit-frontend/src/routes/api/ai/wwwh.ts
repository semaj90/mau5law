import type { RequestHandler } from '@sveltejs/kit';

import { ollamaService } from "$lib/services/ollama-service";
// Orphaned content: import type { RequestHandler

// POST /api/ai/wwwh
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid text" }),
        { status: 400 },
      );
    }
    const prompt = `Analyze the following text using the WWWH (Who, What, When, How) framework. For each, provide a concise answer.\n\nText:\n"""${text}"""\n\nFormat your response as:\nWho: ...\nWhat: ...\nWhen: ...\nHow: ...`;
    const analysis = await ollamaService.generate(prompt, {
      temperature: 0.3,
      maxTokens: 512,
    });
    return new Response(JSON.stringify({ analysis }), { status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "WWWH analysis failed", details: String(err) }),
      { status: 500 },
    );
  }
};
