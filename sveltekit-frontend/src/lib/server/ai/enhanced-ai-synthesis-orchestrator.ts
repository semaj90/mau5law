import { logger } from '../logger.js';
import xstateIntegration from '$lib/services/xstate-integration';
import type { McpServerRecord } from '$lib/services/mcp-registry';
import { createMachine } from 'xstate';

// Minimal Document type used in orchestration context
type Document = { id?: string; title?: string; excerpt?: string; [key: string]: any };

type OllamaMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

type ProcessOptions = {
  context?: unknown;
  requestId?: string;
  // mcpRecord: record always takes precedence over options.mcpRecord due to spread order below
  mcpRecord?: McpServerRecord | null;
  timeoutMs?: number;
  streamId?: string;
  [key: string]: unknown;
};

type ProcessResult = {
  synthesis: string;
  sources: Array<{ title: string; excerpt: string; type: string }>;
  confidence: number;
  metadata: {
    processingTime: number;
    model: string;
    tokensUsed: number;
    cacheHit: boolean;
    requestId?: string;
    streamId?: string;
    mcpServer?: string;
    steps: string[];
  };
};

type StreamUpdate =
  | { type: 'stage'; stage: string; detail?: string }
  | { type: 'chunk'; chunk: string }
  | { type: 'complete'; result: ProcessResult };

type ServiceStatusValue = 'healthy' | 'degraded' | 'unhealthy' | 'offline' | 'unknown';

interface ServiceStatus {
  [service: string]: ServiceStatusValue;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  initialized: boolean;
  services: ServiceStatus;
  timestamp: string;
}

const DEFAULT_OLLAMA_MODELS = {
  primary: 'gemma3-legal:latest',
  comparison: 'gemma270:m',
  embeddings: 'embeddinggemma:latest',
};

const FALLBACK_OLLAMA_URL = 'http://docker-desktop:11434';

class EnhancedAISynthesisOrchestrator {
  private readonly ollamaUrl: string;
  private readonly models: typeof DEFAULT_OLLAMA_MODELS;
  private initialized = false;
  private lastMcpRecord: McpServerRecord | null = null;
  private lastFunctionResult: unknown = null;
  private lastError: string | null = null;

  constructor() {
    this.ollamaUrl =
      process.env.OLLAMA_URL ?? (import.meta.env?.OLLAMA_URL as string | undefined) ?? FALLBACK_OLLAMA_URL;
    this.models = { ...DEFAULT_OLLAMA_MODELS };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    logger.info('[Orchestrator] Initializing enhanced AI synthesis orchestrator');
    // In a full build, this is where we would warm caches, load embeddings, etc.
    // For now mark as ready immediately.
    this.initialized = true;
  }

  private composePrompt(query: string, options: ProcessOptions): string {
    const sections: string[] = [];
    sections.push('You are an expert legal analyst.\n');
    if (options.context) {
      sections.push('---\nADDITIONAL CONTEXT:\n');
      sections.push(JSON.stringify(options.context, null, 2));
      sections.push('\n---\n');
    }
    const record = options.mcpRecord ?? this.lastMcpRecord;
    if (record) {
      sections.push('---\nMCP SERVER TOPOLOGY:\n');
      sections.push(JSON.stringify(record, null, 2));
      sections.push('\n---\n');
    }
    sections.push('Please answer the following legal question with citations and cautious reasoning:\n');
    sections.push(query);
    return sections.join('');
  }

  private async callOllama(messages: OllamaMessage[], model?: string) {
    const chosenModel = model ?? this.models.primary;
    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: chosenModel, messages, stream: false }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${details}`);
    }
    return response.json();
  }

  private makeSources(query: string, record?: McpServerRecord | null) {
    const sources: Array<{ title: string; excerpt: string; type: string }> = [];
    if (record) {
      sources.push({
        title: `${record.name} registry entry`,
        excerpt: record.description ?? 'Multi-core MCP server metadata',
        type: 'mcp-registry',
      });
    }
    sources.push({
      title: 'LangChain knowledge base',
      excerpt: `Seed insights related to "${query.substring(0, 64)}"`,
      type: 'vector-store',
    });
    return sources;
  }

  async process(query: string, options: ProcessOptions = {}): Promise<ProcessResult> {
    await this.ensureInitialized();
    const start = Date.now();
    const requestId = options.requestId;
    const steps: string[] = [];

    const record = options.mcpRecord ?? this.lastMcpRecord;
    if (record) steps.push(`MCP_SERVER_DISCOVERED:${record.name}`);
    const prompt = this.composePrompt(query, { ...options, mcpRecord: record });
    // Track when the prompt has been composed for orchestration diagnostics and step tracing
    steps.push('PROMPT_COMPOSED');
    steps.push('PROMPT_COMPOSED');

    let responseText = 'Unable to generate response.';
    try {
      const data = await this.callOllama([
        { role: 'system', content: 'You are a meticulous legal analyst.' },
        { role: 'user', content: prompt },
      ]);
      responseText = data?.message?.content ?? data?.choices?.[0]?.message?.content ?? responseText;
      steps.push('OLLAMA_COMPLETED');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      steps.push('OLLAMA_FAILED');
      throw error;
    }

    const sources = this.makeSources(query, record);
    const result: ProcessResult = {
      synthesis: responseText,
      sources,
      confidence: 0.78,
      metadata: {
        processingTime: Date.now() - start,
        model: this.models.primary,
        tokensUsed: Math.max(200, Math.round(responseText.length / 4)),
        cacheHit: false,
        requestId,
        streamId: options.streamId as string | undefined,
        mcpServer: record?.name,
        steps,
      },
    };

    return result;
  }

  async *processStream(query: string, options: ProcessOptions = {}): AsyncGenerator<StreamUpdate> {
    await this.ensureInitialized();
    const record = options.mcpRecord ?? this.lastMcpRecord;
    yield { type: 'stage', stage: 'initializing', detail: 'Preparing synthesis pipeline' };
    if (record) {
      yield { type: 'stage', stage: 'mcp-context', detail: `Using MCP server ${record.name}` };
    }
    yield { type: 'stage', stage: 'generating', detail: 'Generating response with Gemma3' };

    const result = await this.process(query, { ...options, streamId: options.streamId });
    const chunks = result.synthesis.split(/(?<=\.)\s+/);
    for (const chunk of chunks) {
      if (chunk.trim().length === 0) continue;
      yield { type: 'chunk', chunk };
    }
    yield { type: 'complete', result };
  }

  async health(): Promise<HealthReport> {
    const services: ServiceStatus = {
      redis: 'unknown',
      postgres: 'unknown',
      neo4j: 'unknown',
      ollama: 'unknown',
      enhancedRAG: 'unknown',
      gpuOrchestrator: 'unknown',
      context7: this.lastMcpRecord ? 'healthy' : 'degraded',
    };

    // Ping Ollama tags endpoint
    try {
      const resp = await fetch(`${this.ollamaUrl}/api/tags`);
      services.ollama = resp.ok ? 'healthy' : 'unhealthy';
    } catch {
      services.ollama = 'offline';
    }

    // Other backends are stubbed for now
    services.redis = 'degraded';
    services.postgres = 'degraded';
    services.neo4j = 'degraded';
    services.enhancedRAG = 'degraded';
    services.gpuOrchestrator = 'degraded';

    const healthyCount = Object.values(services).filter(s => s === 'healthy').length;
    const status: HealthReport = {
      status: healthyCount >= 3 ? 'healthy' : 'degraded',
      initialized: this.initialized,
      services,
      timestamp: new Date().toISOString(),
    };
    return status;
  }

  private emitXStateEvent(event: { type: string; [key: string]: unknown }): boolean {
    try {
      const integration = xstateIntegration as unknown as {
        agentShellActor?: { send?: (evt: unknown) => void };
        aiAssistantActor?: { send?: (evt: unknown) => void };
      };

      if (integration?.agentShellActor?.send) {
        integration.agentShellActor.send(event);
        return true;
      }

      if (integration?.aiAssistantActor?.send) {
        integration.aiAssistantActor.send(event);
        return true;
      }

      return false;
    } catch (error) {
      logger.debug('[Orchestrator] Failed to emit XState event', { error });
      return false;
    }
  }

  handleMcpServerDiscovered(record: McpServerRecord) {
    this.lastMcpRecord = record;
    logger.info('[Orchestrator] Registered MCP server discovery', { name: record.name });
  }

  handleMcpFunctionCalled(payload: unknown) {
    this.lastFunctionResult = payload;
    logger.debug('[Orchestrator] MCP function result stored');
  }

  handleMcpError(
    message: string,
    details: { requestId?: string; stage?: string; error?: unknown } = {}
  ) {
    this.lastError = message;

    const timestamp = new Date().toISOString();
    const logContext: Record<string, unknown> = {
      message,
      timestamp,
      requestId: details.requestId ?? null,
      stage: details.stage ?? null,
      lastMcpServer: this.lastMcpRecord?.name ?? null,
      lastMcpEndpoint: this.lastMcpRecord?.endpoints?.[0]?.url ?? null,
      hasMcpResult: Boolean(this.lastFunctionResult),
    };

    if (details.error instanceof Error) {
      logContext.errorName = details.error.name;
      logContext.errorMessage = details.error.message;
      logContext.errorStack = details.error.stack;
    } else if (typeof details.error !== 'undefined') {
      logContext.error = details.error;
    }

    logger.warn('[Orchestrator] MCP error recorded', logContext);

    const dispatched = this.emitXStateEvent({
      type: 'MCP_ERROR',
      message,
      timestamp,
      context: {
        requestId: details.requestId ?? null,
        stage: details.stage ?? null,
        mcpServer: this.lastMcpRecord?.name ?? null,
        endpoint: this.lastMcpRecord?.endpoints?.[0]?.url ?? null,
        lastResultSummary: this.lastFunctionResult ? 'cached' : null,
        error:
          details.error instanceof Error
            ? { name: details.error.name, message: details.error.message }
            : details.error ?? null,
      },
    });

    if (!dispatched) {
      logger.debug(
        '[Orchestrator] XState integration not available for MCP_ERROR event dispatch'
      );
    }
  }
}

export const aiOrchestrator = new EnhancedAISynthesisOrchestrator();

// --- ADDED TYPES ---
type OrchestrationContext = {
  query: string | null;
  embeddings: number[] | null;
  neo4jResults: Document[] | null;
  pgVectorResults: Document[] | null;
  ragResults: Document[] | null;
  rankedResults: Document[] | null;
  legalBertAnalysis: Document[] | null;
  ollamaResponse: string | null;
  finalSynthesis: string | null;
  error: Error | null;
  context7Results: Document[] | null; // Added for Context7 search results
};
// --```````````````````````````````- END ADDED TYPES ---
export const orchestrationMachine = createMachine<OrchestrationContext>({
  id: 'aiSynthesisOrchestration',
  initial: 'idle',
  context: {
    query: null,
    embeddings: null,
    neo4jResults: null,
    pgVectorResults: null,
    ragResults: null,
    rankedResults: null,
    legalBertAnalysis: null,
    ollamaResponse: null,
    finalSynthesis: null,
    error: null,
    context7Results: null, // Initialize new context property
  },
  states: {
    idle: {
      on: {
        START: 'processing',
      },
    },
    processing: {
      initial: 'checkingCache',
      states: {
        checkingCache: {
          invoke: {
            src: 'checkCache',
            input: ({ event }: { event: { query?: string } }) => ({ query: event.query ?? null }),```````````````````````````````
            onDone: [
              {
                // changed 'guard' -> 'cond' (XState expects 'cond' for transition conditions)
                cond: (ctx: OrchestrationContext) => (ctx.pgVectorResults?.length ?? 0) === 0,
                target: 'queryingPostgres',
              },
              {
                target: 'returningResults',
              },
            ],
            onError: 'queryingPostgres',
          },
        },
        queryingPostgres: {
          invoke: {
            src: 'queryPostgres',
            onDone: [
              {
                target: 'queryingNeo4j',
              },
              {
                target: 'returningResults',
              },
            ],
            onError: 'queryingNeo4j',
          },
        },
        queryingNeo4j: {
          invoke: {
            src: 'queryNeo4j',
            onDone: [
              {
                target: 'callingMcpFunction',
              },
              {
                target: 'returningResults',
              },
            ],
            onError: 'callingMcpFunction',
          },
        },
        callingMcpFunction: {
          invoke: {
            src: 'callMcpFunction',
            onDone: [
              {
                target: 'generatingResponse',
              },
              {
                target: 'returningResults',
              },
            ],
            onError: 'generatingResponse',
          },
        },
        generatingResponse: {
          invoke: {
            src: 'generateResponse',
            onDone: [
              {
                target: 'returningResults',
              },
            ],
            onError: 'returningResults',
          },
        },
        returningResults: {
          type: 'final',
          data: {
            results: ctx => ctx.rankedResults,
          },
        },
      },
    },
  },
});
