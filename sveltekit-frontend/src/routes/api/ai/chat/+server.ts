import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chat as ollamaChat, type ChatMessage } from '$lib/server/ai/ollama-client';
import { db } from '$lib/server/db';
import { cases } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';

type IncomingMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const caseId: string | undefined = body.caseId;
		const model: string | undefined = body.model;
		const messages: IncomingMessage[] = Array.isArray(body.messages) ? body.messages : [];

		if (!messages.length) {
			return json({ success: false, error: 'messages array required' }, { status: 400 });
		}

		// simple validation of messages
		if (!messages.every((m) => m && typeof m.role === 'string' && typeof m.content === 'string')) {
			return json({ success: false, error: "Each message must have 'role' and 'content' strings" }, { status: 400 });
		}

		// optionally fetch case context
		let contextPrefix = '';
		if (caseId) {
			try {
				const found = await db
					.select({
						id: cases.id,
						title: cases.title,
						status: cases.status,
						priority: cases.priority,
						caseNumber: cases.caseNumber
					})
					.from(cases)
					.where(eq(cases.id, caseId))
					.limit(1);
				if (found && found.length > 0) {
					const c = found[0];
					contextPrefix = `Case Context\n- Title: ${c.title}\n- Status: ${c.status}\n- Priority: ${c.priority}\n- Case #: ${c.caseNumber || 'N/A'}\n`;
				}
			} catch (e) {
				// keep chat functional even if DB is unavailable
				contextPrefix = '';
			}
		}

		// system message to instruct the model
		const sys: ChatMessage = {
			role: 'system',
			content:
				'You are YoRHa Legal AI. Provide concise, accurate legal assistance. When a case context is provided, ground your answers in it.'
		};

		// augment only user messages with context to avoid duplicating assistant/system messages
		const userAugmented = contextPrefix
			? messages.map((m) => (m.role === 'user' ? { ...m, content: `${contextPrefix}\n${m.content}` } : m))
			: messages;

		// call Ollama chat client
		const response = await ollamaChat([sys, ...userAugmented], { model: model || 'gemma3-legal:latest' });
		const reply = response?.choices?.[0]?.message?.content ?? '';

		return json({ success: true, reply, model: model || 'gemma3-legal:latest' });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[AI Chat] Error:', message);
		return json({ success: false, error: message }, { status: 500 });
	}
};
    const headerMs = event?.request?.headers?.get?.('x-simulate-latency-ms');
    if (headerMs) {
      const parsed = Math.max(0, Math.min(30000, Number.parseInt(headerMs, 10) || 0));
      if (parsed > 0) return parsed;
    }

    // finally env
    const envVal = process?.env?.SIMULATE_LATENCY_MS;
    if (envVal) {
      const parsed = Math.max(0, Math.min(30000, Number.parseInt(envVal, 10) || 0));
      if (parsed > 0) return parsed;
    }
  } catch {
    // fallthrough to 0
  }
  return 0;
}
// --- End added: latency simulation helpers ---

const basePOSTHandler: RequestHandler = async event => {
  const { request } = event;
  const startTime = performance.now();

  // --- Begin changed: apply simulated latency if requested ---
  const simulatedMs = resolveSimulatedLatency(event);
  if (simulatedMs > 0) {
    if (dev) console.log(`[Chat API] Simulating ${simulatedMs}ms latency for request`);
    await sleep(simulatedMs);
  }
  // --- End changed: apply simulated latency if requested ---

  try {
    const requestData = (await request.json()) as ChatRequestPayload;
    const { messages } = requestData;
    const model = typeof requestData.model === 'string' ? requestData.model : 'auto';
    const resolvedModel = resolveModelAlias(model);
    const temperature = typeof requestData.temperature === 'number' ? requestData.temperature : 0.7;
    const stream = typeof requestData.stream === 'boolean' ? requestData.stream : false;

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!messages.every((m): m is ChatMessage => !!m && typeof m.role === 'string' && typeof m.content === 'string')) {
      return json({ error: "Each message must be an object with 'role' and 'content'" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      return json({ error: 'Last message with content is required' }, { status: 400 });
    }

    // Optionally keep a simple conversation history string array and detect domain (now used)
    const conversationHistory = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`);
    const domain = detectLegalDomain(lastMessage.content) ?? 'unknown';

    // build rich metadata separately and cast when assigning to the typed bridge request
    const metadata = {
      source: 'api',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      model: resolvedModel,
      history: conversationHistory,
      domain,
      // include temperature in metadata so orchestrator receives it without invalidating LLMBridgeRequest shape
      temperature,
      // Add priority to metadata as LLMBridgeRequest does not have a top-level 'priority' property
      priority: stream ? 'realtime' : 'normal',
      // Move useGPU into metadata to satisfy LLMBridgeRequest type
      useGPU: true,
      // Move enableStreaming into metadata to satisfy LLMBridgeRequest type
      enableStreaming: stream,
      // Move maxTokens into metadata to satisfy LLMBridgeRequest type
      maxTokens: requestData.max_tokens ?? 1024,
    };

    // Build bridge request but avoid TypeScript complaint by casting metadata to the expected type
    const bridgeRequest: LLMBridgeRequest = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: 'chat',
      content: lastMessage.content,
      // priority: stream ? 'realtime' : 'normal', // Removed from here to resolve type error
      // useGPU: true, // Removed from here to resolve type error
      // enableStreaming: stream, // This line is removed as it's now in metadata
      // maxTokens: requestData.max_tokens ?? 1024, // Removed from here to resolve type error
      // maxLatency: stream ? 500 : 2000,
      // cast to satisfy the LLMBridgeRequest metadata type while preserving extra fields for orchestrator
      metadata: metadata as unknown as LLMBridgeRequest['metadata'],
    };

    try {
      const result: OrchestratorResult = await llmOrchestratorBridge.processRequest(bridgeRequest);
      if (!result || !result.success) throw new Error(result?.error || 'Orchestrator failed');

      const totalTime = performance.now() - startTime;
      if (dev) console.log(`Chat API completed via orchestrator in ${totalTime.toFixed(2)}ms`);

      // Token estimation (Ollama provides actual counts in response)
      const promptTokens = estimateTokens(lastMessage.content || '');
      const completionTokens = estimateTokens(result.response || '');
      const totalTokens = promptTokens + completionTokens;

      return json({
        choices: [{ message: { role: 'assistant', content: result.response || '' }, finish_reason: 'stop', index: 0 }],
        usage: {
          total_tokens: totalTokens,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        },
        model: result.modelUsed,
        created: Math.floor(Date.now() / 1000),
        id: result.requestId,
        orchestrator: {
          used: result.orchestratorUsed,
          executionMetrics: result.executionMetrics,
        },
        response_time_ms: totalTime,
      });
    } catch (orchestratorError: unknown) {
      console.warn('Orchestrator failed, falling back to direct Ollama:', extractErrorMessage(orchestratorError));
      // pass simulatedMs to ensure fallback respects same artificial latency
      return await fallbackToDirectOllama(lastMessage.content, model, temperature, startTime, simulatedMs);
    }
  } catch (err: unknown) {
    return json({ error: 'Invalid request payload', detail: extractErrorMessage(err) }, { status: 400 });
  }
};

// --- Begin changed: add optional simulated latency parameter to fallback ---
async function fallbackToDirectOllama(
  prompt: string,
  model: string,
  temperature: number,
  startTime: number,
  simulatedLatencyMs = 0
) {
  if (simulatedLatencyMs > 0) {
    if (dev) console.log(`[Ollama fallback] Applying ${simulatedLatencyMs}ms simulated latency`);
    await sleep(simulatedLatencyMs);
  }

  const OLLAMA_TIMEOUT_MS = 15000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const body = {
      model: resolveModelAlias(model === 'auto' ? 'gemma3-legal:latest' : model),
      prompt,
      stream: false,
      options: { temperature, num_predict: 1024, top_k: 40, top_p: 0.9, repeat_penalty: 1.1 },
    };

    const resp = await fetch(`${ollamaConfig.getBaseUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Ollama error: ${text}`);
    }

    const data = (await resp.json()) as Record<string, unknown>;
    const assistantContent =
      typeof data.response === 'string'
        ? data.response
        : typeof data.text === 'string'
          ? data.text
          : 'No response generated';

    const totalTime = performance.now() - startTime;
    // Token estimation (Ollama provides actual counts in response)
    const promptTokens = estimateTokens(prompt || '');
    const completionTokens = estimateTokens(assistantContent || '');
    const totalTokens = promptTokens + completionTokens;

    return json({
      choices: [{ message: { role: 'assistant', content: assistantContent }, finish_reason: 'stop', index: 0 }],
      usage: {
        total_tokens: totalTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      },
      model: resolveModelAlias(model),
      created: Math.floor(Date.now() / 1000),
      id: `ollama_fallback_${Date.now()}`,
      response_time_ms: totalTime,
    });
  } catch (error: unknown) {
    return json(
      {
        error: 'Failed to generate response from Ollama',
        detail: extractErrorMessage(error),
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
// --- End changed: add optional simulated latency parameter to fallback ---

// Optional helper: detect legal domain (now used by main flow)
function detectLegalDomain(content: string): string | undefined {
  const legalKeywords: Record<string, string[]> = {
    contract: ['contract', 'agreement', 'terms', 'clause', 'breach'],
    tort: ['negligence', 'liability', 'damages', 'injury', 'fault'],
    criminal: ['criminal', 'prosecution', 'defendant', 'guilty', 'evidence'],
    corporate: ['corporation', 'shareholder', 'board', 'merger', 'securities'],
    property: ['property', 'real estate', 'title', 'deed', 'mortgage'],
    family: ['divorce', 'custody', 'marriage', 'adoption', 'alimony'],
    employment: ['employment', 'workplace', 'discrimination', 'wage', 'termination'],
  };
  const lower = (content || '').toLowerCase();
  for (const [domain, keywords] of Object.entries(legalKeywords)) {
    if (keywords.some(k => lower.includes(k))) return domain;
  }
  return undefined;
}

// Centralized model alias resolution (local helper)
function resolveModelAlias(model: string): string {
  if (!model) return 'gemma3-legal';
  if (model === 'auto' || model === 'gemma3-legal:latest') return 'gemma3-legal';
  return model;
}

export const POST: RequestHandler = async event => {
  try {
    return await redisOptimized.aiChat(basePOSTHandler)(event);
  } catch (error: unknown) {
    return json(
      {
        error: 'AI chat service unavailable (Redis or internal failure)',
        detail: extractErrorMessage(error),
        code: 'REDIS_FAILURE',
      },
      { status: 503 }
    );
  }
};
