/**
 * AI Service Worker for Multi-Threading LLM Processing
 * Handles parallel AI tasks across multiple LLM providers
 */
/// <reference lib="webworker" />
import type { LLMModel, AITask, AIResponse, WorkerMessage } from '$lib/types/ai-worker.js';
declare const self: DedicatedWorkerGlobalScope;

export interface AIProviderConfig {
  id: string;
  type: 'ollama' | 'llamacpp' | 'autogen' | 'crewai';
  endpoint: string;
  timeout: number;
  retries: number;
}
// UUID helper compatible with Web Workers without Node polyfills
const getUUID = (): string => {
  try {
    // @ts-ignore - randomUUID is available in secure contexts
    const rnd = (self as any)?.crypto?.randomUUID?.();
    if (rnd) return rnd;
  } catch (error) {}
  // Fallback
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class AIServiceWorker {
  private providers: Map<string, AIProviderConfig> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private requestQueue: AITask[] = [];
  private maxConcurrentRequests = 3;
  private activeRequestCount = 0;

  constructor() {
    this.initializeProviders();
    this.setupMessageHandlers();
  }

  private initializeProviders() {
    // Initialize supported AI providers
    this.providers.set('ollama', {
      id: 'ollama',
      type: 'ollama',
      endpoint: 'http://localhost:11434',
      timeout: 30000,
      retries: 2
    });
    this.providers.set('llamacpp', {
      id: 'llamacpp',
      type: 'llamacpp',
      endpoint: 'http://localhost:8000',
      timeout: 15000,
      retries: 3
    });
    this.providers.set('autogen', {
      id: 'autogen',
      type: 'autogen',
      endpoint: 'http://localhost:8001',
      timeout: 45000,
      retries: 1
    });
    this.providers.set('crewai', {
      id: 'crewai',
      type: 'crewai',
      endpoint: 'http://localhost:8002',
      timeout: 60000,
      retries: 1
    });
  }

  private setupMessageHandlers() {
    self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
      const { type, payload, taskId } = event.data; // use local event variable
      try {
        switch (type) {
          case 'PROCESS_AI_TASK':
            await this.processAITask(payload as AITask, taskId);
            break;
          case 'CANCEL_TASK':
            this.cancelTask(taskId);
            break;
          case 'GET_STATUS':
            this.sendStatus();
            break;
          case 'UPDATE_PROVIDER_CONFIG':
            this.updateProviderConfig(payload as Partial<AIProviderConfig>);
            break;
          default:
            console.warn('Unknown message type:', type);
        }
      } catch (error: any) {
        this.sendError(taskId, error as Error);
      }
    });
  }

  private async processAITask(task: AITask, taskId: string) {
    // Add to queue if at max capacity
    if (this.activeRequestCount >= this.maxConcurrentRequests) {
      this.requestQueue.push({ ...task, taskId } as AITask);
      this.sendMessage({
        type: 'TASK_QUEUED',
        taskId,
        payload: { position: this.requestQueue.length }
      });
      return;
    }

    this.activeRequestCount++;
    const abortController = new AbortController();
    this.activeRequests.set(taskId, abortController);

    try {
      this.sendMessage({
        type: 'TASK_STARTED',
        taskId,
        payload: { providerId: task.providerId }
      });
      const result = await this.executeAITask(task, abortController.signal);
      this.sendMessage({
        type: 'TASK_COMPLETED',
        taskId,
        payload: result
      });
    } catch (error: any) {
      if (error && (error.name === 'AbortError' || error.message === 'timeout')) {
        this.sendMessage({
          type: 'TASK_CANCELLED',
          taskId,
          payload: null
        });
      } else {
        this.sendError(taskId, error as Error);
      }
    } finally {
      this.activeRequests.delete(taskId);
      this.activeRequestCount--;
      this.processQueue();
    }
  }

  private async executeAITask(task: AITask, signal: AbortSignal): Promise<AIResponse> {
    const provider = this.providers.get(task.providerId);
    if (!provider) {
      throw new Error(`Provider ${task.providerId} not found`);
    }

    let lastError: Error | null = null;
    // Retry logic
    for (let attempt = 0; attempt <= provider.retries; attempt++) {
      try {
        const response = await this.callProvider(provider, task, signal);
        return response;
      } catch (error: any) {
        lastError = error as Error;
        if (signal.aborted || attempt === provider.retries) {
          break;
        }
        // Wait before retry with exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    throw lastError || new Error('Unknown error during AI task execution');
  }

  private async callProvider(
    provider: AIProviderConfig,
    task: AITask,
    signal: AbortSignal
  ): Promise<AIResponse> {
    const timeoutController = new AbortController();
    const combinedSignal = this.mergeAbortSignals(signal, timeoutController.signal);
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, provider.timeout);

    try {
      switch (provider.type) {
        case 'ollama':
          return await this.callOllama(provider, task, combinedSignal);
        case 'autogen':
          return await this.callAutoGen(provider, task, combinedSignal);
        case 'crewai':
          return await this.callCrewAI(provider, task, combinedSignal);
        case 'llamacpp':
          // If llamacpp needs a dedicated handler, implement similar to ollama
          return await this.callOllama(provider, task, combinedSignal);
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callOllama(
    provider: AIProviderConfig,
    task: AITask,
    signal: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch(`${provider.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: (task as any)?.model ?? 'unknown',
        prompt: task.prompt,
        system: (task as any)?.systemPrompt ?? undefined,
        stream: false,
        options: {
          temperature: (task as any)?.temperature ?? 0.1,
          top_p: (task as any)?.topP ?? 0.9,
          top_k: (task as any)?.topK ?? 40,
          repeat_penalty: (task as any)?.repeatPenalty ?? 1.05
        }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return {
      id: getUUID(),
      content: data.response ?? data.output ?? '',
      providerId: provider.id,
      model: (task as any)?.model ?? 'unknown',
      tokensUsed: data.eval_count || 0,
      responseTime: data.total_duration ? Math.round(data.total_duration / 1000000) : 0,
      metadata: {
        evalCount: data.eval_count,
        evalDuration: data.eval_duration,
        loadDuration: data.load_duration
      }
    };
  }

  private async callAutoGen(
    provider: AIProviderConfig,
    task: AITask,
    signal: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch(`${provider.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agents: (task as any).agents ?? ['assistant'],
        message: task.prompt,
        max_rounds: (task as any).maxRounds ?? 5,
        context: (task as any).context ?? {}
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`AutoGen API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return {
      id: getUUID(),
      content: data.final_response ?? data.output ?? '',
      providerId: provider.id,
      model: 'autogen-agents',
      tokensUsed: data.total_tokens || 0,
      responseTime: Date.now() - ((task as any).timestamp || Date.now()),
      metadata: {
        rounds: data.rounds,
        agents: data.agent_responses,
        conversationId: data.conversation_id
      }
    };
  }

  private async callCrewAI(
    provider: AIProviderConfig,
    task: AITask,
    signal: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch(`${provider.endpoint}/api/crew/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crew_id: (task as any).crewId ?? 'legal-analysis-crew',
        task: task.prompt,
        context: (task as any).context ?? {},
        agents: (task as any).agents ?? ['researcher', 'analyst', 'writer']
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`CrewAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return {
      id: getUUID(),
      content: data.final_output ?? data.output ?? '',
      providerId: provider.id,
      model: 'crewai-agents',
      tokensUsed: data.total_tokens || 0,
      responseTime: Date.now() - ((task as any).timestamp || Date.now()),
      metadata: {
        taskId: data.task_id,
        agents: data.agent_outputs,
        executionTime: data.execution_time
      }
    };
  }

  private processQueue() {
    if (this.requestQueue.length > 0 && this.activeRequestCount < this.maxConcurrentRequests) {
      const task = this.requestQueue.shift();
      if (task && (task as any).taskId) {
        this.processAITask(task, (task as any).taskId);
      }
    }
  }

  private cancelTask(taskId: string) {
    const controller = this.activeRequests.get(taskId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(taskId);
    }
    // Remove from queue if present
    this.requestQueue = this.requestQueue.filter((t) => (t as any).taskId !== taskId);
  }

  private updateProviderConfig(config: Partial<AIProviderConfig>) {
    if (config.id && this.providers.has(config.id)) {
      const existing = this.providers.get(config.id)!;
      this.providers.set(config.id, { ...existing, ...config });
    }
  }

  private sendStatus() {
    this.sendMessage({
      type: 'STATUS_UPDATE',
      taskId: 'status',
      payload: {
        activeRequests: this.activeRequestCount,
        queueLength: this.requestQueue.length,
        providers: Array.from(this.providers.values()),
        maxConcurrent: this.maxConcurrentRequests
      }
    });
  }

  private sendMessage(message: WorkerMessage) {
    self.postMessage(message);
  }

  private sendError(taskId: string, error: Error) {
    this.sendMessage({
      type: 'TASK_ERROR',
      taskId,
      payload: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Merge two AbortSignals into a