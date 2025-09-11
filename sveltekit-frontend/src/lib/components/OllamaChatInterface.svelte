<!-- OllamaChatInterface.svelte - Svelte 5 + SvelteKit 2.0 Enhanced AI Chat -->
<script lang="ts">
  import TokenUsageManager from "$lib/components/TokenUsageManager.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import type { ChatRequest, ChatResponse } from "$routes/api/ai/chat/+server";
  import {
    AlertCircle,
    Brain,
    CheckCircle,
    Loader2,
    MessageSquare,
    RefreshCw,
    Send,
    Settings,
    Zap,
  } from "lucide-svelte";
  import { onMount, tick } from "svelte";

  // Props
  interface Props {
    caseId?: string;
    model?: string;
    useRAG?: boolean;
    className?: string;
  }

  let {
    caseId = undefined,
    model = "gemma3-legal",
    useRAG = true,
    className = "",
  }: Props = $props();

  // Reactive state using Svelte 5 runes
  let message = $state("");
  let isLoading = $state(false);
  let showSettings = $state(false);
  let temperature = $state(0.7);
  let streamMode = $state(false);

  // Chat history and UI state
  let chatHistory = $state<
    Array<{
      id: string;
      type: "user" | "assistant";
      content: string;
      timestamp: Date;
      performance?: ChatResponse["performance"];
      suggestions?: string[];
      relatedCases?: string[];
    }>
  >([]);

  let chatContainer: HTMLElement;
  let tokenManager: TokenUsageManager;
  let ollamaStatus = $state<"unknown" | "healthy" | "unhealthy">("unknown");
  let availableModels = $state<string[]>([]);

  // Error and success states
  let errorMessage = $state("");
  let successMessage = $state("");

  // Reactive computations
  let canSend = $derived(message.trim().length > 0 && !isLoading);
  let messageCount = $derived(chatHistory.length);
  let lastResponse = $derived(
    chatHistory.find((msg) => msg.type === "assistant" && msg.performance)
  );

  // Initialize component
  onMount(async () => {
    await checkOllamaHealth();
    await loadAvailableModels();

    // Auto-scroll setup
    return () => {
      // Cleanup if needed
    };
  });

  // Health check function
  async function checkOllamaHealth() {
    try {
      const response = await fetch("/api/chat", { method: "GET" });
      const data = await response.json();

      ollamaStatus = data.status === "healthy" ? "healthy" : "unhealthy";

      if (data.models) {
        availableModels = data.models.map((m: any) => m.name);
      }
    } catch (error) {
      ollamaStatus = "unhealthy";
      console.error("Health check failed:", error);
    }
  }

  async function loadAvailableModels() {
    // Models are loaded in health check
  }

  // Send message function
  async function sendMessage() {
    if (!canSend) return;

    const userMessage = message.trim();
    const messageId = Date.now().toString();

    // Add user message to history
    chatHistory.push({
      id: messageId,
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Clear input and set loading
    message = "";
    isLoading = true;
    errorMessage = "";

    try {
      const chatRequest: ChatRequest = {
        message: userMessage,
        model,
        temperature,
        stream: streamMode,
        caseId,
        useRAG,
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          model,
          stream: streamMode,
          sessionId: caseId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (streamMode) {
        await handleStreamingResponse(response, messageId);
      } else {
        await handleNormalResponse(response, messageId);
      }

      // Auto-scroll to bottom
      await tick();
      scrollToBottom();
    } catch (error) {
      console.error("Chat error:", error);
      errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Add error message to chat
      chatHistory.push({
        id: Date.now().toString(),
        type: "assistant",
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date(),
      });
    } finally {
      isLoading = false;
    }
  }

  async function handleNormalResponse(response: Response, messageId: string) {
    const data: ChatResponse = await response.json();

    chatHistory.push({
      id: messageId + "_response",
      type: "assistant",
      content: data.response,
      timestamp: new Date(),
      performance: data.performance,
      suggestions: data.suggestions,
      relatedCases: data.relatedCases,
    });

    // Record token usage in TokenUsageManager
    if (tokenManager && data.performance) {
      tokenManager.recordTokenUsage({
        promptTokens: data.performance.promptTokens || 0,
        responseTokens: data.performance.tokens || 0,
        model: model,
        prompt: chatHistory[chatHistory.length - 2]?.content || "",
        response: data.response,
        processingTime: data.performance.duration || 0,
      });
    }
  }

  async function handleStreamingResponse(
    response: Response,
    messageId: string
  ) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let assistantMessageIndex = chatHistory.length;

    // Add placeholder message
    chatHistory.push({
      id: messageId + "_response",
      type: "assistant",
      content: "",
      timestamp: new Date(),
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        chatHistory[assistantMessageIndex].content += chunk;

        // Auto-scroll during streaming
        await tick();
        scrollToBottom();
      }
    } finally {
      reader.releaseLock();
    }
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function selectSuggestion(suggestion: string) {
    message = suggestion;
  }

  function clearChat() {
    chatHistory = [];
    errorMessage = "";
    successMessage = "";
  }

  function exportChat() {
    const chatData = {
      timestamp: new Date().toISOString(),
      model,
      caseId,
      messages: chatHistory,
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-ai-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Reactive effects
  $effect(() => {
    if (ollamaStatus === "healthy") {
      successMessage = "AI service is ready";
      setTimeout(() => (successMessage = ""), 3000);
    }
  });
</script>

<!-- Chat Interface -->
<div class="ollama-chat-interface {className}">
  <!-- Header with Status -->
  <Card class="mb-4">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <CardTitle class="flex items-center gap-2">
          <Brain class="w-5 h-5" />
          Legal AI Assistant
          <Badge
            variant={ollamaStatus === "healthy" ? "default" : "destructive"}
          >
            {ollamaStatus}
          </Badge>
        </CardTitle>

        <div class="flex items-center gap-2">
          <!-- Model Selector -->
          <select bind:value={model} class="text-sm border rounded px-2 py-1">
            {#each availableModels as modelName}
              <option value={modelName}>{modelName}</option>
            {/each}
          </select>

          <!-- Settings Toggle -->
          <Button class="bits-btn"
            variant="ghost"
            size="sm"
            onclick={() => (showSettings = !showSettings)}
          >
            <Settings class="w-4 h-4" />
          </Button>

          <!-- Health Check -->
          <Button class="bits-btn"
            variant="ghost"
            size="sm"
            onclick={checkOllamaHealth}
            disabled={isLoading}
          >
            <RefreshCw class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- Performance Metrics -->
      {#if lastResponse?.performance}
        <div class="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <Zap class="w-3 h-3 inline mr-1" />
            {lastResponse.performance.duration}ms
          </span>
          <span>
            {lastResponse.performance.tokens} tokens
          </span>
          <span>
            {lastResponse.performance.tokensPerSecond.toFixed(1)} tok/s
          </span>
        </div>
      {/if}
    </CardHeader>

    <!-- Advanced Settings -->
    {#if showSettings}
      <CardContent class="pt-0 border-t">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium" for="temperature">Temperature</label><input id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              bind:value={temperature}
              class="w-full"
            />
            <span class="text-xs text-muted-foreground">{temperature}</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" bind:checked={streamMode} id="stream-mode" />
            <label for="stream-mode" class="text-sm">Stream responses</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" bind:checked={useRAG} id="use-rag" />
            <label for="use-rag" class="text-sm">Enhanced RAG</label>
          </div>
        </div>
      </CardContent>
    {/if}
  </Card>

  <!-- Token Usage Manager -->
  <TokenUsageManager
    bind:this={tokenManager}
    currentModel={model}
    class="mb-4"
    data-testid="token-usage-manager"
  />

  <!-- Status Messages -->
  {#if errorMessage}
    <div
      class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-red-600" />
      <span class="text-red-800">{errorMessage}</span>
    </div>
  {/if}

  {#if successMessage}
    <div
      class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
    >
      <CheckCircle class="w-4 h-4 text-green-600" />
      <span class="text-green-800">{successMessage}</span>
    </div>
  {/if}

  <!-- Chat History -->
  <Card class="flex-1 mb-4">
    <ScrollArea class="h-[600px] p-6" bind:viewport={chatContainer}>
      {#if chatHistory.length === 0}
        <div class="text-center text-muted-foreground py-8">
          <MessageSquare class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Start a conversation with the Legal AI Assistant</p>
          <p class="text-sm mt-2">
            Ask about legal procedures, case analysis, or research questions
          </p>
        </div>
      {:else}
        {#each chatHistory as msg}
          <div class="mb-8 {msg.type === 'user' ? 'text-right' : 'text-left'}">
            <!-- Timestamp -->
            <div class="text-xs text-muted-foreground mb-2 px-2 {msg.type === 'user' ? 'text-right' : 'text-left'}">
              {msg.timestamp.toLocaleTimeString()} • {msg.timestamp.toLocaleDateString()}
            </div>
            
            <div
              class="inline-block max-w-[85%] {msg.type === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md shadow-md'
                : 'bg-gray-50 text-gray-900 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm'} px-6 py-4"
              data-testid={msg.type === "assistant"
                ? "chat-response"
                : "chat-message"}
            >
              <div class="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</div>

              <!-- Performance Info for Assistant Messages -->
              {#if msg.type === "assistant" && msg.performance}
                <div class="text-xs opacity-60 mt-3 pt-2 border-t border-gray-300">
                  <span class="font-mono">{msg.performance.duration}ms</span> • 
                  <span class="font-mono">{msg.performance.tokens} tokens</span> • 
                  <span class="font-mono">{msg.performance.tokensPerSecond?.toFixed(1)} tok/s</span>
                </div>
              {/if}
            </div>

            <!-- Suggestions -->
            {#if msg.suggestions && msg.suggestions.length > 0}
              <div class="mt-3 flex flex-wrap gap-2">
                {#each msg.suggestions as suggestion}
                  <Button class="bits-btn"
                    variant="outline"
                    size="sm"
                    onclick={() => selectSuggestion(suggestion)}
                    class="text-xs"
                  >
                    {suggestion}
                  </Button>
                {/each}
              </div>
            {/if}

            <!-- Related Cases -->
            {#if msg.relatedCases && msg.relatedCases.length > 0}
              <div class="mt-2">
                <p class="text-xs text-muted-foreground mb-1">Related Cases:</p>
                <div class="flex flex-wrap gap-1">
                  {#each msg.relatedCases as caseTitle}
                    <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{caseTitle}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}

      <!-- Loading Indicator -->
      {#if isLoading}
        <div class="flex items-center gap-2 text-muted-foreground">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>AI is thinking...</span>
        </div>
      {/if}
    </ScrollArea>
  </Card>

  <!-- Input Area -->
  <div class="flex gap-3 p-4 bg-white border-t border-gray-200 rounded-b-lg">
    <div class="flex-1">
      <Input
        bind:value={message}
        placeholder="Type your legal question here..."
        keypress={handleKeyPress}
        disabled={isLoading || ollamaStatus !== "healthy"}
        class="h-12 text-[15px] px-4 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
        data-testid="chat-input"
      />
    </div>

    <Button
      onclick={sendMessage}
      disabled={!canSend || ollamaStatus !== "healthy"}
      class="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium bits-btn bits-btn"
      data-testid="send-button"
    >
      {#if isLoading}
        <Loader2 class="w-5 h-5 animate-spin mr-2" />
        <span>Sending...</span>
      {:else}
        <Send class="w-5 h-5 mr-2" />
        <span>Send</span>
      {/if}
    </Button>

    <!-- Additional Actions -->
    <Button class="bits-btn"
      variant="outline"
      onclick={clearChat}
      disabled={chatHistory.length === 0}
    >
      Clear
    </Button>

    <Button class="bits-btn"
      variant="outline"
      onclick={exportChat}
      disabled={chatHistory.length === 0}
    >
      Export
    </Button>
  </div>

  <!-- Chat Stats -->
  {#if messageCount > 0}
    <div class="mt-4 text-xs text-muted-foreground text-center">
      {messageCount} messages • Model: {model}
      {#if caseId}
        • Case: {caseId}{/if}
    </div>
  {/if}
</div>

<style>
  .ollama-chat-interface {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 64rem;
    margin-left: auto;
    margin-right: auto;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 1rem;
  }

  .ollama-chat-interface :global(.scroll-area) {
    max-height: 24rem;
    overflow-y: auto;
  }

  /* Custom scrollbar */
  .ollama-chat-interface :global(.scroll-area::-webkit-scrollbar) {
    width: 0.5rem;
  }

  .ollama-chat-interface :global(.scroll-area::-webkit-scrollbar-track) {
    background-color: #f5f5f5;
  }

  .ollama-chat-interface :global(.scroll-area::-webkit-scrollbar-thumb) {
    background-color: #d1d5db;
    border-radius: 0.25rem;
  }

  .ollama-chat-interface :global(.scroll-area::-webkit-scrollbar-thumb:hover) {
    background-color: #9ca3af;
  }
</style>

