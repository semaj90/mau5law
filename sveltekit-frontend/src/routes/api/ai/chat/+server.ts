// Direct Ollama chat API with SIMD acceleration and Redis-GPU pipeline integration
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { readBodyFast } from '$lib/server/simd-body-parser.js';
import { dev } from '$app/environment';

const DEFAULT_OLLAMA_URL = 'http://localhost:11436';

export const POST: RequestHandler = async (event) => {
  const { request, fetch, url } = event;
  const startTime = performance.now();
  
  try {
    // Parse incoming messages
    const { messages, model = "gemma3-legal:latest", temperature = 0.7 } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return json({ error: "Messages array is required" }, { status: 400 });
    }

    // Get the latest user message for Ollama
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      return json({ error: "Message content is required" }, { status: 400 });
    }

    // Call Ollama API directly
    const ollamaResponse = await fetch(`${DEFAULT_OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: lastMessage.content,
        stream: false,
        options: {
          temperature,
          num_predict: 1024,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      return json(
        { error: "Ollama error", details: errorText },
        { status: 500 }
      );
    }

    const data = await ollamaResponse.json();
    const totalTime = performance.now() - startTime;
    
    if (dev) {
      console.log(`🚀 Chat API completed in ${totalTime.toFixed(2)}ms`);
    }

    return json({
      choices: [{
        message: {
          role: "assistant",
          content: data.response || "No response generated"
        },
        finish_reason: "stop"
      }],
      usage: {
        total_tokens: data.eval_count || 0,
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: (data.eval_count || 0) - (data.prompt_eval_count || 0)
      },
      model: model,
      response_time_ms: totalTime
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return json({ 
      error: "Failed to generate response",
      detail: error.message 
    }, { status: 500 });
  }
};
