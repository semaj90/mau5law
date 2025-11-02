<!-- Consider wrapping this component in an ErrorBoundary for better error handling -->
<!-- import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'; -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import {
    MessageSquare,
    Send,
    Bot,
    User,
    Loader2,
    X,
    Copy,
    ThumbsUp,
    ThumbsDown,
  } from 'lucide-svelte';

  // --- Props (using a single $props() call with TypeScript types) ---
  type AISourceContext = { title?: string; description?: string; fullText?: string } | null;
  type Props = {
    open?: boolean;
    context?: AISourceContext;
    title?: string;
    placeholder?: string;
    caseId?: string | null;
    documentId?: string | null;
  };

  let {
    open = $bindable(false),
    context = null,
    title = 'AI Legal Assistant',
    placeholder = 'Ask about legal matters...',
    caseId = null,
    documentId = null
  } = $props() as Props;

  // --- State (unchanged approach using Svelte runes) ---
  let messages = $state([]);
  let currentMessage = $state('');
  let isLoading = $state(false);
  let chatContainer: HTMLElement | null = $state(null);
  let inputElement: HTMLTextAreaElement | null = $state(null);

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages.length > 0 && chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 100);
    }
  });

  // Focus input when dialog opens
  $effect(() => {
    try {
      if (open && inputElement) {
        setTimeout(() => inputElement.focus(), 100);
      }
    } catch (error) {
      console.error('Effect error:', error);
    }
  });

  // Initialize with context message if provided
  $effect(() => {
    try {
      if (open && context && messages.length === 0) {
        addSystemMessage();
      }
    } catch (error) {
      console.error('Effect error:', error);
    }
  });

  function addSystemMessage() {
    if (context) {
      messages = [
        {
          id: Date.now(),
          role: 'system',
          content: `I have context about: ${context.title || 'Legal Document'}. How can I help you understand or analyze this?`,
          timestamp: new Date().toISOString(),
          type: 'context',
        },
      ];
    }
  }

  // --- Fixed sendMessage: valid fetch, JSON parsing, and error handling ---
  async function sendMessage() {
    if (!currentMessage.trim() || isLoading) return;
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    messages = [...messages, userMessage];
    const messageToSend = currentMessage.trim();
    currentMessage = '';
    isLoading = true;

    try {
      let contextText = '';
      if (context) {
        contextText = `Context: ${context.title}\n${context.description || ''}\n${context.fullText || ''}`;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          context: contextText ? [contextText] : undefined,
          caseId,
          documentId,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      let data: { response?: string; performance?: any; suggestions?: string[] } | undefined;
      try {
        data = await response.json();
      } catch (err) {
        console.error('JSON parsing failed:', err);
        throw new Error('Invalid JSON response from AI API');
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data?.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date().toISOString(),
        metadata: data?.performance || undefined,
        suggestions: data?.suggestions || [],
      };
      messages = [...messages, aiMessage];
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        error: true,
      };
      messages = [...messages, errorMessage];
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    messages = [];
    if (context) {
      addSystemMessage();
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  function formatTimestamp(timestamp: string | number) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleSuggestionClick(suggestion: string) {
    currentMessage = suggestion;
    sendMessage();
  }

  async function provideFeedback(messageId: number | string, feedback: 'positive' | 'negative') {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          feedback,
          caseId,
          documentId,
        }),
      });
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  }
</script>

<Dialog bind:open>
  <Dialog.Content class="max-w-4xl max-h-[80vh] flex flex-col">
    <!-- Dialog.Header was not provided by the dialog API; use a simple wrapper -->
    <div class="flex-shrink-0">
      <Dialog.Title class="flex items-center gap-2">
        <Bot class="h-5 w-5" />
        {title}
      </Dialog.Title>
      <Dialog.Description>
        Ask questions about legal matters, get case analysis, and receive AI-powered assistance.
        {#if context}
          <br /><strong>Context:</strong> {context.title}
        {/if}
      </Dialog.Description>
    </div>

    <!-- Chat Messages -->
    <div class="flex-1 overflow-hidden">
      <!-- ScrollArea.element is not bindable in this build; use a plain scrollable container -->
      <div bind:this={chatContainer} class="h-[400px] w-full pr-4 overflow-y-auto">
        <div class="space-y-4 px-2">
          {#each messages as message}
            <div class="flex gap-3 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
              {#if message.role !== 'user'}
                <div class="flex-shrink-0">
                  {#if message.type === 'context'}
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <MessageSquare class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Bot class="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  {/if}
                </div>
              {/if}

              <div class="flex-1 max-w-[80%] {message.role === 'user' ? 'order-first' : ''}">
                <!-- Replaced invalid Card/CardContent wrappers with semantic divs -->
                <div class="{message.role === 'user' ? 'bg-primary text-primary-foreground' : ''} {message.error ? 'border-red-200 dark:border-red-800' : ''} nes-container" aria-live="polite" role="alert">
                  <div class="p-3">
                    <div class="prose prose-sm max-w-none {message.role === 'user' ? 'prose-invert' : ''}">
                      <p class="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    <div class="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <div class="flex items-center gap-2">
                        <span class="text-xs opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {#if message.metadata?.tokensPerSecond}
                          <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{Math.round(message.metadata.tokensPerSecond)} tok/s</span>
                        {/if}
                      </div>

                      {#if message.role === 'assistant' && !message.error}
                        <div class="flex items-center gap-1">
                          <button type="button" class="bits-btn" aria-label="Copy message" onclick={() => copyToClipboard(message.content)}>
                            <Copy aria-hidden="true" class="h-3 w-3" />
                          </button>
                          <button type="button" class="bits-btn" aria-label="Thumbs up feedback" onclick={() => provideFeedback(message.id, 'positive')}>
                            <ThumbsUp aria-hidden="true" class="h-3 w-3" />
                          </button>
                          <button type="button" class="bits-btn" aria-label="Thumbs down feedback" onclick={() => provideFeedback(message.id, 'negative')}>
                            <ThumbsDown aria-hidden="true" class="h-3 w-3" />
                          </button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- AI Suggestions -->
                {#if message.suggestions && message.suggestions.length > 0}
                  <div class="mt-2 space-y-1">
                    {#each message.suggestions as suggestion}
                      <button type="button" class="text-xs h-auto py-1 px-2 bits-btn" onclick={() => handleSuggestionClick(suggestion)}>
                        {suggestion}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              {#if message.role === 'user'}
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User class="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              {/if}
            </div>
          {/each}

          {#if isLoading}
            <div class="flex gap-3 justify-start">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Loader2 class="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
                </div>
              </div>
              <div class="flex-1 max-w-[80%]">
                <div class="bg-gray-50 rounded">
                  <div class="p-3">
                    <div class="flex items-center gap-2 nes-text is-disabled">
                      <Loader2 class="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex-shrink-0 border-t pt-4">
      <div class="flex gap-2">
        <!-- Use a textarea + native buttons to avoid ambiguous component imports -->
        <textarea
          bind:this={inputElement}
          bind:value={currentMessage}
          on:input={(e) => (currentMessage = (e.target as HTMLTextAreaElement).value)}
          placeholder={placeholder}
          onkeydown={handleKeydown}
          aria-label="Message input"
          disabled={isLoading}
          class="flex-1 rounded p-2 border"
          rows="2"></textarea>

        <button type="button" class="bits-btn" on:click={() => sendMessage()} disabled={isLoading || !currentMessage.trim()} aria-label="Send message">
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <Send class="h-4 w-4" />
          {/if}
        </button>

        <button type="button" class="bits-btn" on:click={clearChat} aria-label="Clear chat">
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {#if messages.length === 0 && context}
        <div class="mt-3 text-sm nes-text is-disabled">
          <p>You can ask questions like:</p>
          <ul class="list-disc list-inside mt-1 space-y-1">
            <li>"Explain this law in simple terms"</li>
            <li>"What are the key elements to prove?"</li>
            <li>"How does this relate to other laws?"</li>
            <li>"What are common defenses or exceptions?"</li>
          </ul>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog>

<style>
  :global(.prose p) {
    /* @apply text-sm leading-relaxed mb-2 last:mb-0; */
  }
</style>