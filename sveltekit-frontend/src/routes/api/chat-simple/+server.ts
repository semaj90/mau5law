// Simple Ollama Chat Endpoint (no database)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const OLLAMA_URL = 'http://localhost:11434';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return json({ error: 'Messages array required' }, { status: 400 });
    }

    const lastUserMessage = messages.filter((msg: any) => msg.role === 'user').pop();
    if (!lastUserMessage) {
      return json({ error: 'No user message found' }, { status: 400 });
    }

    console.log('🚀 Sending to Ollama:', lastUserMessage.content);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma3-legal:latest',
        prompt: lastUserMessage.content,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const result = await response.json();

    return json({
      success: true,
      message: result.response || 'No response from Ollama',
      metadata: {
        model: 'gemma3-legal:latest',
        eval_count: result.eval_count,
        eval_duration: result.eval_duration,
        tokensPerSecond: result.eval_count ? Math.round(result.eval_count / (result.eval_duration / 1e9)) : 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Chat error:', error);
    return json(
      {
        error: 'Failed to process chat request',
        details: error.message,
      },
      { status: 500 }
    );
  }
};
