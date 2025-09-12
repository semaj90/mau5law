<!-- Enhanced AI Chat Component - Svelte 5 Compatible -->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { createDialog } from 'melt-ui';
  import { ChatBubbleIcon, PaperPlaneIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@radix-icons/svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  // Card components removed - using native HTML elements
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Textarea } from '$lib/components/ui/textarea';
  import type { ChatMessage, MessageAnalysis, RAGContext, Recommendation } from '$lib/types/ai-chat';

  // Props using correct Svelte 5 syntax
  let { 
    caseId = $bindable(''),
    userId = $bindable(''),
    enableWebGPU = $bindable(true),
    enableAttentionTracking = $bindable(true),
    showAnalysisPanel = $bindable(true),
    maxMessages = $bindable(100)
  }: {
    caseId?: string;
    userId?: string;
    enableWebGPU?: boolean;
    enableAttentionTracking?: boolean;
    showAnalysisPanel?: boolean;
    maxMessages?: number;
  } = $props();

  // Component state using $state runes
  let chatContainer = $state<HTMLDivElement | null>(null);
  let messageInput = $state<HTMLTextAreaElement | null>(null);
  let isConnected = $state(false);
  let isTyping = $state(false);
  let streamingResponse = $state('');
  let currentAnalysis = $state<MessageAnalysis | null>(null);
  let ragContext = $state<RAGContext | null>(null);
  let userAttention = $state({ focused: true, lastActivity: Date.now() });

  // Chat state
  let messages = $state<ChatMessage[]>([]);
  let sessionId = $state<string>('');
  let currentMessage = $state('');
  let wsConnection = $state<WebSocket | null>(null);

  // WebGPU accelerator state
  let webgpuAccelerator = $state<any>(null);
  let processingMetrics = $state({
    tokensPerSecond: 0,
    gpuUtilization: 0,
    memoryUsage: 0
  });

  // Dialog state for analysis panel
  const {
    elements: { trigger, overlay, content, title, description, close },
    states: { open }
  } = createDialog();

  // Initialize WebSocket connection
  async function initializeConnection() {
    if (!browser) return;

    try {
      wsConnection = new WebSocket(`ws://localhost:5173/ws/chat`);
      wsConnection.onopen = () => {
        isConnected = true;
        console.log('✅ Enhanced AI Chat connected');
      };

      wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsConnection.onclose = () => {
        isConnected = false;
        console.log('❌ Enhanced AI Chat disconnected');
      };

      wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        isConnected = false;
      };
    } catch (error) {
      console.error('Failed to initialize connection:', error);
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
  function handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'message':
        messages = [...messages, data.message];
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
        processingMetrics = data.metrics;
        break;
      case 'stream':
        streamingResponse += data.chunk;
        break;
      case 'stream_complete':
        if (streamingResponse) {
          messages = [...messages, {
            id: Date.now().toString(),
            role: 'assistant',
            content: streamingResponse,
            timestamp: new Date(),
            confidence: data.confidence,
            analysis: currentAnalysis
          }];
          streamingResponse = '';
        }
        isTyping = false;
        break;
    }
  }

  // Send message to AI
  async function sendMessage() {
    if (!currentMessage.trim() || !isConnected || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    messages = [...messages, userMessage];
    const messageToSend = currentMessage;
    currentMessage = '';
    isTyping = true;

    // Send via WebSocket
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({
        type: 'message',
        content: messageToSend,
        sessionId,
        userId,
        caseId,
        enableAnalysis: showAnalysisPanel,
        enableWebGPU
      }));
    }

    // Fallback to HTTP API if WebSocket not available
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      try {
        const response = await fetch('/api/chat-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: messageToSend }]
          })
        });

        const data = await response.json();
        if (response.ok && data.message) {
          messages = [...messages, {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            confidence: data.confidence,
            tokensPerSecond: data.tokensPerSecond
          }];
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        messages = [...messages, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }];
      } finally {
        isTyping = false;
      }
    }

    // Auto-scroll to bottom
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
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
    if (!enableAttentionTracking) return;
    userAttention = {
      focused: document.hasFocus(),
      lastActivity: Date.now()
    };
  }

  // Initialize on mount
  onMount(async () => {
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    await initializeConnection();
    await initializeWebGPU();
    if (enableAttentionTracking) {
      document.addEventListener('visibilitychange', trackUserAttention);
      document.addEventListener('focus', trackUserAttention);
      document.addEventListener('blur', trackUserAttention);
    }
  });

  // Cleanup on destroy
  onDestroy(() => {
    if (wsConnection) {
      wsConnection.close();
    }
    if (enableAttentionTracking) {
      document.removeEventListener('visibilitychange', trackUserAttention);
      document.removeEventListener('focus', trackUserAttention);
      document.removeEventListener('blur', trackUserAttention);
    }
  });
</script>

<div class="enhanced-ai-chat w-full max-w-6xl mx-auto">
  <!-- Main Chat Interface -->
  <div.Root class="h-[700px] flex flex-col">
    <div.Header class="border-b">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <ChatBubbleIcon class="w-6 h-6 text-primary" />
          <div>
            <div.Title class="text-lg">Enhanced Legal AI Assistant</Card.Title>
            <div.Description class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
                <span class="text-xs">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {#if enableWebGPU && webgpuAccelerator}
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">WebGPU Enabled</span>
              {/if}
            </Card.Description>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          {#if showAnalysisPanel}
            <Tooltip.Root>
              <Tooltip.Trigger asChild >
                {#snippet children({ builder })}
                                <Button 
                    variant="ghost" 
                    size="sm" 
                    builders={[builder]}
                    class="p-2 bits-btn bits-btn"
                  >
                    <MagnifyingGlassIcon class="w-4 h-4" />
                  </Button>
                                              {/snippet}
                            </Tooltip.Trigger>
              <Tooltip.Content>
                <p>View Analysis</p>
              </Tooltip.Content>
            </Tooltip.Root>
          {/if}
          
          <Button class="bits-btn" variant="ghost" size="sm" onclick={clearChat}>
            Clear
          </Button>
        </div>
      </div>
    </Card.Header>

    <!-- Messages Area -->
    <div.Content class="flex-1 overflow-hidden p-0">
      <div 
        bind:this={chatContainer}
        class="h-full overflow-y-auto p-4 space-y-4"
      >
        {#each messages as message}
          <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] p-3 rounded-lg {
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }">
              <div class="text-sm font-medium mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
                <span class="text-xs ml-2">
                  {message.timestamp?.toLocaleTimeString() || ''}
                </span>
              </div>
              <div class="whitespace-pre-wrap">{message.content}</div>
              
              {#if message.role === 'assistant' && message.confidence}
                <div class="flex gap-1 mt-2">
                  <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{Math.round(message.confidence * 100)}%</span>
                  {#if message.tokensPerSecond}
                    <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{Math.round(message.tokensPerSecond)} tok/s</span>
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
    </Card.Content>

    <!-- Input Area -->
    <div class="border-t p-4">
      <div class="flex gap-3">
        <Textarea
          bind:this={messageInput}
          bind:value={currentMessage}
          placeholder="Ask about legal matters..."
          disabled={isTyping || !isConnected}
          onkeydown={handleKeydown}
          class="flex-1 min-h-[40px] max-h-[120px] resize-none"
        />
        <Button 
          onclick={sendMessage}
          disabled={!currentMessage.trim() || isTyping || !isConnected}
          class="self-end bits-btn bits-btn"
        >
          <PaperPlaneIcon class="w-4 h-4" />
        </Button>
      </div>
      
      {#if processingMetrics.tokensPerSecond > 0}
        <div class="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Speed: {processingMetrics.tokensPerSecond} tok/s</span>
          <span>GPU: {processingMetrics.gpuUtilization}%</span>
          <span>Memory: {processingMetrics.memoryUsage}MB</span>
        </div>
      {/if}
    </div>
  </Card.Root>

  <!-- Analysis Dialog -->
  {#if showAnalysisPanel}
    <Dialog.Root bind:open={$open}>
      <Dialog.Content class="max-w-2xl">
        <Dialog.Header>
          <Dialog.Title>Message Analysis</Dialog.Title>
          <Dialog.Description>
            Detailed analysis and context for the current conversation
          </Dialog.Description>
        </Dialog.Header>
        
        <div class="space-y-4">
          {#if currentAnalysis}
            <div>
              <h4 class="font-medium mb-2">Sentiment Analysis</h4>
              <div class="flex gap-2">
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">Sentiment: {currentAnalysis.sentiment || 'Neutral'}</span>
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">Confidence: {Math.round((currentAnalysis.confidence || 0) * 100)}%</span>
              </div>
            </div>
          {/if}
          
          {#if ragContext}
            <div>
              <h4 class="font-medium mb-2">Relevant Context</h4>
              <div class="text-sm text-muted-foreground">
                <p>{ragContext.summary || 'No relevant context found'}</p>
              </div>
            </div>
          {/if}
        </div>
        
        <Dialog.Footer>
          <Button class="bits-btn" variant="outline" onclick={() => ($open = false)}>
            Close
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>

<style>
  .enhanced-ai-chat {
    font-family: system-ui, -apple-system, sans-serif;
  }
</style>
