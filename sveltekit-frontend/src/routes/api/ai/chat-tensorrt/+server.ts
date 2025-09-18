/**
 * TensorRT-LLM Chat API - Direct integration with Go bridge on port 8086
 * Routes: ChatBox.svelte → /api/ai/chat-tensorrt → Go bridge :8086 → TensorRT-LLM
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';

const TENSORRT_BRIDGE_URL = 'http://127.0.0.1:8100';

export const POST: RequestHandler = async (event) => {
  const { request, fetch } = event;
  const startTime = performance.now();

  try {
    // Parse incoming messages (OpenAI format)
    const requestData = await request.json();
    const { messages, model = "gemma3-legal:latest", temperature = 0.7 } = requestData;

    if (!messages || !Array.isArray(messages)) {
      return json({ error: "Messages array is required" }, { status: 400 });
    }

    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      return json({ error: "Message content is required" }, { status: 400 });
    }

    // Build conversation context for better responses
    const conversationHistory = messages.slice(0, -1)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Prepare prompt with context
    const fullPrompt = conversationHistory
      ? `Previous conversation:\n${conversationHistory}\n\nUser message: ${lastMessage.content}`
      : `User message: ${lastMessage.content}`;

    if (dev) {
      console.log(`🌉 TensorRT Chat: Calling Go bridge for model ${model}`);
    }

    // Call TensorRT bridge endpoint using OpenAI-compatible format;
    try {
      const bridgeResponse = await fetch(`${TENSORRT_BRIDGE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          model: model,
          temperature: temperature,
          max_tokens: requestData.max_tokens || 1024,
          stream: false,
        }),
      });

      if (!bridgeResponse.ok) {
        const errorText = await bridgeResponse.text();
        console.error('TensorRT bridge error:', errorText);
        return json({
          error: "TensorRT bridge failed",
          detail: errorText,
          bridge_status: bridgeResponse.status,
        }, { status: 500 });
      }

      const bridgeData = await bridgeResponse.json();
      const totalTime = performance.now() - startTime;

      if (dev) {
        console.log(`🚀 TensorRT Chat completed in ${totalTime.toFixed(2)}ms via Go bridge`);
      }

      // Return OpenAI-compatible format;
      return json({
        choices: [{
          message: {
            role: "assistant",
            content: bridgeData.response || bridgeData.output || "No response generated",
          },
          finish_reason: "stop",
          index: 0,
        }],
        usage: {
          total_tokens: Math.ceil((fullPrompt + (bridgeData.output || "")).length / 4),
          prompt_tokens: Math.ceil(fullPrompt.length / 4),
          completion_tokens: Math.ceil((bridgeData.output || "").length / 4),
        },
        model: model,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        id: `tensorrt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        tensorrt: {
          bridge_used: true,
          bridge_url: TENSORRT_BRIDGE_URL,
          model_used: model,
          gpu_accelerated: true,
          response_time_ms: totalTime,
        }
      });

    } catch (bridgeError: any) {
      console.error('TensorRT bridge connection failed:', bridgeError);

      // Return a helpful error response;
      return json({
        error: "TensorRT bridge connection failed",
        detail: bridgeError.message,
        suggestion: "Ensure Ollama-TensorRT bridge is running on port 8100",
        fallback_available: false,
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('TensorRT Chat API error:', error);
    return json({
      error: "Failed to generate response",
      detail: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
};