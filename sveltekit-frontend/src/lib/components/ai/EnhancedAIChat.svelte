<!-- Enhanced AI Chat Component - Svelte 5 Compatible -->
<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { ChatBubbleIcon, PaperPlaneIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@radix-icons/svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  // bits-ui / enhanced-bits-ui are Svelte-only (no React). UI primitives (Button, Tooltip, Badge, Input, Textarea) are imported later in the file.
  // Card components removed - using native HTML elements
  import Button from '$lib/components/ui/Button.svelte';
  // Use default imports to match other UI components (avoid named/default mismatch)
  import Badge from '$lib/components/ui/badge';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Textarea from '$lib/components/ui/Textarea.svelte';

  import type { ChatMessage, MessageAnalysis, RAGContext } from '$lib/types/ai-chat';

  // Local UI type: ChatMessage plus a required `id` used by the UI (each block key)
  type UIMessage = ChatMessage & { id: string };

  // Replace legacy `export let` with runes-compatible $props() destructuring
  type Props = {
    caseId?: string;
    userId?: string;
    enableWebGPU?: boolean;
    enableAttentionTracking?: boolean;
    showAnalysisPanel?: boolean;
    maxMessages?: number;
  };

  let {
    caseId = '',
    userId = '',
    enableWebGPU = true,
    enableAttentionTracking = true,
    showAnalysisPanel = true,
    maxMessages = 100,
  } = $props<Props>();

  // Component state using $state runes
  let chatContainer = $state<HTMLDivElement | null>(null);
  let messageInput = $state<HTMLTextAreaElement | null>(null);
  let isConnected = $state(false);
  let isTyping = $state(false);
  let streamingResponse = $state('');
  let currentAnalysis = $state<MessageAnalysis | null>(null);
  let ragContext = $state<RAGContext | null>(null);
  let userAttention = $state({ focused: true, lastActivity: Date.now() });
  // Chat state (UI messages require `id`)
  let messages = $state<UIMessage[]>([]);
  let sessionId = $state<string>('');
  let currentMessage = $state('');
  let wsConnection = $state<WebSocket | null>(null);
  // WebGPU accelerator state
  let webgpuAccelerator = $state<any>(null);
  let processingMetrics = $state({
    tokensPerSecond: 0,
    gpuUtilization: 0,
    memoryUsage: 0,
  });
  // Dialog state for analysis panel
  // Melt UI component creation removed - replace with bits-ui declarative components
  // Initialize WebSocket connection
  async function initializeConnection() {
    if (!browser) return;
    try {
      const proto = location && location.protocol === 'https:' ? 'wss' : 'ws';
      const host = location && location.host ? location.host : 'localhost:5173';
      wsConnection = new WebSocket(`${proto}://${host}/ws/chat`);
      wsConnection.onopen = () => {
        isConnected = true;
        console.log('✅ Enhanced AI Chat connected');
      };
      wsConnection.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.warn('Malformed WS message', e);
        }
      };
      wsConnection.onclose = () => {
        isConnected = false;
        console.log('❌ Enhanced AI Chat disconnected');
      };
      wsConnection.onerror = error => {
        console.error('❌ WebSocket error:', error);
        isConnected = false;
      };
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      isConnected = false;
      wsConnection = null;
    }
  }
  // Initialize WebGPU acceleration if enabled
  async function initializeWebGPU() {
    if (!enableWebGPU || !browser) return;
    try {
      // Placeholder for WebGPU initialization
      console.log('🚀 WebGPU acceleration enabled');
      webgpuAccelerator = { initialized: true };
    } catch (error) {
      console.warn('WebGPU not available:', error);
      enableWebGPU = false;
    }
  }
  // Handle WebSocket messages
  function normalizeIncomingMessage(raw: any) {
    // Ensure minimal, well-typed ChatMessage shape for the UI
    const id = raw?.id ?? raw?.messageId ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const role = raw?.role ?? (raw?.sender === 'user' ? 'user' : 'assistant');
    const content = raw?.content ?? raw?.text ?? '';
    const timestamp = raw?.timestamp ? new Date(raw.timestamp) : new Date();
    const confidence = typeof raw?.confidence === 'number' ? raw.confidence : undefined;
    const tokensPerSecond = typeof raw?.tokensPerSecond === 'number' ? raw.tokensPerSecond : undefined;
    return {
      id: String(id),
      role,
      content: String(content),
      timestamp,
      confidence,
      tokensPerSecond,
    } as UIMessage;
  }

  function handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'message':
        messages = [...messages, normalizeIncomingMessage(data.message)];
        break;
      case 'typing':
        isTyping = data.isTyping;
        break;
      case 'analysis':
        currentAnalysis = data.analysis;
        break;
      case 'rag_context':
        ragContext = data.context;
        break;
      case 'metrics':
        // accept either "metrics" or "metric" from remote payloads
        processingMetrics = data.metrics ?? data.metric ?? processingMetrics;
        break;
      case 'stream':
        streamingResponse += data.chunk;
        break;
      case 'stream_complete':
        if (streamingResponse) {
          messages = [
            ...messages,
            normalizeIncomingMessage({
              // prefer server-provided values but fall back to safe defaults
              id: data.id ?? `stream_${Date.now()}`,
              role: 'assistant',
              content: streamingResponse,
              timestamp: data.timestamp ?? new Date().toISOString(),
              confidence: data.confidence,
            }),
          ];
          streamingResponse = '';
        }
        isTyping = false;
        break;
    }
  }

  // Helper to send via HTTP (extracted to avoid duplication)
  async function sendViaHttp(messageToSend: string) {
    try {
      const response = await fetch('/api/chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: messageToSend }] }),
      });

      // Safely parse response body (handle non-JSON or empty bodies without throwing)
      let data: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } else {
        // fallback to text for debugging / plain responses
        try {
          const text = await response.text();
          data = text ? { message: text } : {};
        } catch {
          data = {};
        }
      }

      if (response.ok && data?.message) {
        messages = [
          ...messages,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            confidence: data.confidence,
            tokensPerSecond: data.tokensPerSecond,
          } as UIMessage,
        ];
      } else {
        const serverErr = data?.error ?? data?.message ?? `HTTP ${response.status}`;
        throw new Error(serverErr);
      }
    } catch (error) {
      console.error('Failed to send message via HTTP fallback:', error);
      messages = [
        ...messages,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        } as UIMessage,
      ];
    } finally {
      isTyping = false;
    }
  }

  async function sendMessage() {
    // allow fallback to HTTP when WS is not connected; only block empty messages or when already typing
    if (!currentMessage.trim() || isTyping) return;
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };
    messages = [...messages, userMessage];
    const messageToSend = currentMessage;
    currentMessage = '';
    isTyping = true;

    // Try WebSocket first; if send fails, fall back to HTTP
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        wsConnection.send(
          JSON.stringify({
            type: 'message',
            content: messageToSend,
            sessionId,
            userId,
            caseId,
            enableAnalysis: showAnalysisPanel,
            enableWebGPU: enableWebGPU,
          })
        );
        // leave isTyping state to be updated by server 'typing'/'stream_complete' messages
      } catch (err) {
        console.warn('WebSocket send failed, falling back to HTTP', err);
        await sendViaHttp(messageToSend);
      }
    } else {
      await sendViaHttp(messageToSend);
    }

    // Auto-scroll to bottom
    await tick();
    if (chatContainer) {
      try {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } catch (e) {
        // fallback: no-op
      }
    }
  }

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Clear chat
  function clearChat() {
    messages = [];
    currentAnalysis = null;
    ragContext = null;
    streamingResponse = '';
  }

  // Track user attention if enabled
  function trackUserAttention() {
    if (!enableAttentionTracking || !browser) return;
    userAttention = {
      focused: document.hasFocus(),
      lastActivity: Date.now(),
    };
  }

  // Safe timestamp formatter (handles Date or ISO string)
  function formatTimestamp(ts: Date | string | undefined | null) {
    if (!ts) return '';
    if (typeof ts === 'string') {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
    }
    return (ts as Date).toLocaleTimeString?.() ?? '';
  }

  // Initialize on mount
  $effect(() => {
    (async () => {
      if (!sessionId) {
        // use slice instead of deprecated substr
        sessionId = `session_${Date.now()}_${Math.random().toString().slice(2, 11)}`;
      }
      await initializeConnection();
      await initializeWebGPU();
      if (enableAttentionTracking && browser) {
        document.addEventListener('visibilitychange', trackUserAttention);
        window.addEventListener('focus', trackUserAttention);
        window.addEventListener('blur', trackUserAttention);
      }
    })();
  });
  // Cleanup on destroy
  onDestroy(() => {
    if (wsConnection) {
      try {
        wsConnection.close();
      } catch (e) {
        /* ignore */
      }
    }
    if (enableAttentionTracking) {
      document.removeEventListener('visibilitychange', trackUserAttention);
      window.removeEventListener('focus', trackUserAttention);
      window.removeEventListener('blur', trackUserAttention);
    }
  });
</script>

<div class="enhanced-ai-chat w-full max-w-6xl mx-auto">
  <!-- Main Chat Interface -->
  <div class="h-[700px] flex flex-col">
    <div class="chat-header border-b">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <ChatBubbleIcon class="w-6 h-6 text-primary" />
          <div>
            <h3 class="text-lg font-semibold">Enhanced Legal AI Assistant</h3>
            <div class="text-sm text-muted-foreground flex items-center gap-2">
              <div class="flex items-center gap-1">
                <div
                  class={isConnected ? 'w-2 h-2 rounded-full bg-green-500' : 'w-2 h-2 rounded-full bg-red-500'}
                ></div>
                <span class="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {#if enableWebGPU && webgpuAccelerator}
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">WebGPU Enabled</span>
              {/if}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if showAnalysisPanel}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button variant="ghost" size="sm" class="p-2 bits-btn">
                  <MagnifyingGlassIcon class="w-4 h-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>View Analysis</p>
              </Tooltip.Content>
            </Tooltip.Root>
          {/if}

          <Button class="bits-btn" variant="ghost" size="sm" on:click={clearChat} aria-label="Clear chat">Clear</Button>
        </div>
      </div>
    </div>
    <!-- Messages Area -->
    <div class="chat-content flex-1 overflow-hidden p-0">
      <div bind:this={chatContainer} class="h-full overflow-y-auto p-4 space-y-4">
        {#each messages as message (message.id)}
          <div class={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              class={message.role === 'user'
                ? 'max-w-[80%] p-3 rounded-lg bg-primary text-primary-foreground'
                : 'max-w-[80%] p-3 rounded-lg bg-muted'}
            >
              <div class="text-sm font-medium mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
                <span class="text-xs ml-2">{formatTimestamp(message.timestamp)}</span>
              </div>
              <div class="whitespace-pre-wrap">{message.content ?? ''}</div>
              {#if message.role === 'assistant' && message.confidence}
                <div class="flex gap-1 mt-2">
                  <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700"
                    >{Math.round(message.confidence * 100)}%</span
                  >
                  {#if message.tokensPerSecond}
                    <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700"
                      >{Math.round(message.tokensPerSecond)} tok/s</span
                    >
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
        {#if streamingResponse}
          <div class="flex justify-start">
            <div class="max-w-[80%] p-3 rounded-lg bg-muted">
              <div class="text-sm font-medium mb-1 opacity-70">AI Assistant</div>
              <div class="whitespace-pre-wrap">{streamingResponse}</div>
              <div class="w-2 h-4 bg-current animate-pulse inline-block ml-1"></div>
            </div>
          </div>
        {/if}
        {#if isTyping && !streamingResponse}
          <div class="flex justify-start">
            <div class="max-w-[80%] p-3 rounded-lg bg-muted">
              <div class="text-sm font-medium mb-1 opacity-70">AI Assistant</div>
              <div class="flex items-center gap-1">
                <span>Thinking</span>
                <div class="flex gap-1">
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
    <!-- Input Area -->
    <div class="border-t p-4">
      <div class="flex gap-3">
        <Textarea
          bind:this={messageInput}
          bind:value={currentMessage}
          placeholder="Ask about legal matters..."
          disabled={isTyping || !isConnected}
          on:keydown={handleKeydown}
          class="flex-1 min-h-[40px] max-h-[120px] resize-none"
        />
        <Button
          on:click={sendMessage}
          disabled={!currentMessage.trim() || isTyping || !isConnected}
          class="self-end bits-btn bits-btn"
        >
          <PaperPlaneIcon class="w-4 h-4" />
        </Button>
      </div>
      {#if processingMetrics.tokensPerSecond > 0}
        <div class="flex gap-4 mt-2 text-xs nes-text is-disabled">
          <span>Speed: {processingMetrics.tokensPerSecond} tok/s</span>
          <span>GPU: {processingMetrics.gpuUtilization}%</span>
          <span>Memory: {processingMetrics.memoryUsage}MB</span>
        </div>
      {/if}
    </div>
  </div>
  <!-- Analysis Dialog -->
  {#if showAnalysisPanel}
    <Dialog.Root>
      <Dialog.Content class="max-w-2xl">
        <Dialog.Header>
          <Dialog.Title>Message Analysis</Dialog.Title>
          <Dialog.Description>Detailed analysis and context for the current conversation</Dialog.Description>
        </Dialog.Header>
        <div class="space-y-4">
          {#if currentAnalysis}
            <div>
              <h4 class="font-medium mb-2">Sentiment Analysis</h4>
              <div class="flex gap-2">
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700"
                  >Sentiment: {currentAnalysis.sentiment || 'Neutral'}</span
                >
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700"
                  >Confidence: {Math.round((currentAnalysis.confidence || 0) * 100)}%</span
                >
              </div>
            </div>
          {/if}
          {#if ragContext}
            <div>
              <h4 class="font-medium mb-2">Relevant Context</h4>
              <div class="text-sm nes-text is-disabled">
                <p>{ragContext.summary || 'No relevant context found'}</p>
              </div>
            </div>
          {/if}
        </div>
        <Dialog.Footer>
          <Button class="bits-btn" variant="ghost">Close</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>

<style>
  .enhanced-ai-chat {
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }
</style>
