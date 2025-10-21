<!-- Consider wrapping this component in an ErrorBoundary for better error handling -->
<!-- import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'; -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import Input from '$lib/components/ui/input/Input.svelte';
  import { Loader2, Bot, MessageSquare, FileText, Search, Sparkles, Zap } from 'lucide-svelte';

  // Exported props (clean, typed)
  // Use runes for props in Svelte 5
  let onAISearch: ((res: any) => void) | null = $props<((res: any) => void) | null>(null);
  let onAIChat: ((res: any) => void) | null = $props<((res: any) => void) | null>(null);
  let onAISummarize: ((res: any) => void) | null = $props<((res: any) => void) | null>(null);
  let disabled: boolean = $props<boolean>(false);
  let compact: boolean = $props<boolean>(false);

  // Local state
  let aiSearchQuery: string = '';
  let errorMessage: string = '';
  let isLoading: boolean = false;
  let aiChatMessage: string = '';
  let summarizeText: string = '';
  let isAISearching = false;
  let isAIChatting = false;
  let isSummarizing = false;
  let aiSearchResults: any[] = [];
  let aiChatResponse = '';
  let summaryResult = '';

  // Enhanced AI Search with LangChain.js and vector similarity
  async function performAISearch() {
    if (!aiSearchQuery.trim() || isAISearching) return;
    isAISearching = true;
    aiSearchResults = [];
    errorMessage = '';
    try {
      const payload = {
        query: aiSearchQuery,
        jurisdiction 'all',
        category: 'all',
        maxResults: 10,
        useAI: true,
        advancedOptions: {
          useVector: true,
          similarityThreshold: 0.7
        }
      };
      const response = await fetch('/api/ai/enhanced-legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result?.success) {
        aiSearchResults = result.results || [];
        onAISearch?.(result);
        // optional analytics logging if present
        if (result.searchTime) console.log('AI search time:', result.searchTime);
        if (result.analytics) console.debug('AI analytics:', result.analytics);
      } else {
        // fallback to simple search
        await performFallbackSearch();
      }
    } catch (err) {
      console.error('Enhanced AI search error:', err);
      errorMessage = err instanceof Error ? err.message : String(err);
      await performFallbackSearch();
    } finally {
      isAISearching = false;
    }
  }

  // Fallback search method
  async function performFallbackSearch() {
    try {
      const payload = { query: aiSearchQuery, jurisdiction 'all', category: 'all', useAI: true };
      const response = await fetch('/api/ai/legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      aiSearchResults = result.laws || result.results || [];
      onAISearch?.(result);
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      // keep errorMessage for UI visibility
      errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    }
  }

  // AI Chat
  async function performAIChat() {
    if (!aiChatMessage.trim() || isAIChatting) return;
    isAIChatting = true;
    aiChatResponse = '';
    errorMessage = '';
    try {
      const payload = { message: aiChatMessage, temperature: 0.7 };
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result?.response) {
        aiChatResponse = result.response;
        onAIChat?.(result);
      } else {
        errorMessage = 'No response from AI chat';
        console.error('AI chat error: no response field', result);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isAIChatting = false;
    }
  }

  // AI Summarization
  async function performAISummarization() {
    if (!summarizeText.trim() || isSummarizing) return;
    isSummarizing = true;
    summaryResult = '';
    errorMessage = '';
    try {
      const payload = { text: summarizeText, type: 'legal', options: { max_tokens: 500 } };
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result?.success) {
        summaryResult = result.summary || '';
        onAISummarize?.(result);
      } else {
        errorMessage = 'Summarization failed';
        console.error('AI summarization error', result);
      }
    } catch (err) {
      console.error('AI summarization error:', err);
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isSummarizing = false;
    }
  }

  // Keyboard handlers
  function handleAISearchKeydown(event: KeyboardEvent) {
    if ((event as KeyboardEvent).key === 'Enter' && !(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      performAISearch();
    }
  }
  function handleAIChatKeydown(event: KeyboardEvent) {
    if ((event as KeyboardEvent).key === 'Enter' && !(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      performAIChat();
    }
  }
  function clearResults() {
    aiSearchResults = [];
    aiChatResponse = '';
    summaryResult = '';
    errorMessage = '';
  }
</script>

<div class="space-y-6">
  <div class="text-center">
    <h2 class="text-2xl font-bold flex items-center justify-center gap-2">
      <Sparkles class="h-6 w-6 text-primary" />
      AI Legal Assistant
            <Input
              placeholder="Ask AI to find laws..."
              bind:value={aiSearchQuery}
              onkeydown={handleAISearchKeydown}
              {disabled}
              class="pl-10" />
          </div>
          <button
            type="button"
            class="bits-btn text-sm px-2 py-1"
            onclick={performAISearch}
            disabled={disabled || isAISearching || !aiSearchQuery.trim()}>
            {#if isAISearching}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <Search class="h-4 w-4" />
            {/if}
          </button>
        </div>

        {#if aiSearchResults.length > 0}
          <div class="space-y-2 max-h-32 overflow-y-auto">
            {#each aiSearchResults.slice(0, 3) as result}
              <div class="p-2 bg-muted/50 rounded text-sm">
                <div class="font-medium truncate">{result?.title}</div>
                <div class="text-xs nes-text is-disabled">{result?.jurisdiction}</div>
              </div>
            {/each}
            {#if aiSearchResults.length > 3}
              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">+{aiSearchResults.length - 3} more results</span>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- AI Chat -->
    <div class="border-green-500/20 nes-container">
      <div class="yorha-panel-header pb-3">
        <h3 class="nes-text is-primary flex items-center gap-2 text-lg">
          <MessageSquare class="h-5 w-5 text-green-600" />
          AI Chat
        </h3>
      </div>
      <div class="yorha-panel-content space-y-4">
        <div class="space-y-2">
          <!-- use a small form so submit behavior is explicit and accessible -->
          <form onsubmit|preventDefault={performAIChat} class="space-y-2">
            <textarea
              name="aiChat"
              placeholder="Ask a legal question..."
              bind:value={aiChatMessage}
              onkeydown={(e) => handleAIChatKeydown(e as KeyboardEvent)}
              disabled={disabled}
              rows="2"
              aria-label="Ask a legal question"
              class="resize-none rounded border px-3 py-2 w-full"></textarea>

            <button
              type="submit"
              onclick|preventDefault={() => {}}
              disabled={disabled || isAIChatting || !aiChatMessage.trim()}
              class="w-full bits-btn text-sm px-3 py-2">
              {#if isAIChatting}
                <Loader2 aria-hidden="true" class="h-4 w-4 animate-spin mr-2" />
                Thinking...
              {:else}
                <MessageSquare aria-hidden="true" class="h-4 w-4 mr-2" />
                Ask AI
              {/if}
            </button>
          </form>
        </div>

        {#if aiChatResponse}
          <div class="p-3 bg-green-50 dark:bg-green-950/30 rounded text-sm max-h-32 overflow-y-auto">
            <div class="prose prose-sm max-w-none">
              <p class="whitespace-pre-wrap">{aiChatResponse}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- AI Summarization -->
    <div class="border-blue-500/20 nes-container">
      <div class="yorha-panel-header pb-3">
        <h3 class="nes-text is-primary flex items-center gap-2 text-lg">
          <FileText class="h-5 w-5 text-blue-600" />
          AI Summary
        </h3>
      </div>
      <div class="yorha-panel-content space-y-4">
        <div class="space-y-2">
          <!-- use native textarea for summarization to ensure keyboard events/props behave correctly -->
          <textarea
            placeholder="Paste legal text to summarize..."
            bind:value={summarizeText}
            disabled={disabled}
            rows={2}
            class="resize-none rounded border px-3 py-2 w-full"></textarea>
          <button
            type="button"
            onclick={performAISummarization}
            disabled={disabled || isSummarizing || !summarizeText.trim()}
            class="w-full bits-btn text-sm px-3 py-2">
            {#if isSummarizing}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
              Summarizing...
            {:else}
              <Zap class="h-4 w-4 mr-2" />
              Summarize
            {/if}
          </button>
        </div>

        {#if summaryResult}
          <div class="p-3 bg-blue-50 dark:bg-blue-950/30 rounded text-sm max-h-32 overflow-y-auto">
            <div class="prose prose-sm max-w-none">
              <p class="whitespace-pre-wrap">{summaryResult}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Clear Results Button -->
  {#if aiSearchResults.length > 0 || aiChatResponse || summaryResult}
    <div class="text-center">
      <button type="button" class="bits-btn text-sm px-2 py-1" onclick={clearResults}>
        Clear All Results
      </button>
    </div>
  {/if}

  <!-- Quick Actions -->
  <div class="flex flex-wrap gap-2 justify-center">
    <button type="button"
      class="bits-btn text-sm px-2 py-1"
      onclick={() => { aiSearchQuery = 'California murder laws'; performAISearch(); }}
      disabled={disabled || isAISearching}>
      <Bot class="h-3 w-3 mr-1" />
      Murder Laws
    </button>

    <button
      type="button"
      class="bits-btn text-sm px-2 py-1"
      onclick={() => { aiChatMessage = 'What are the elements of a valid contract?'; performAIChat(); }}
      disabled={disabled || isAIChatting}>
      <MessageSquare class="h-3 w-3 mr-1" />
      Contract Elements
    </button>

    <button
      type="button"
      class="bits-btn text-sm px-2 py-1"
      onclick={() => { aiSearchQuery = 'evidence admissibility rules'; performAISearch(); }}
      disabled={disabled || isAISearching}>
      <Search class="h-3 w-3 mr-1" />
      Evidence Rules
    </button>
  </div>

  <!-- Optional error display -->
  {#if errorMessage}
    <div class="text-center text-sm text-red-600 mt-2">{errorMessage}</div>
  {/if}
</div>

          <Textarea
            placeholder="Paste legal text to summarize..."
            bind:value={summarizeText}
            {disabled}
            rows={2}
            aria-label="Paste legal text to summarize"
            class="resize-none" />
          <Button
            type="button"
            onclick={performAISummarization}
            disabled={disabled || isSummarizing || !summarizeText.trim()}
            size="sm"
            class="w-full bits-btn"
            aria-label="Summarize text">
            {#if isSummarizing}
              <Loader2 aria-hidden="true" class="h-4 w-4 animate-spin mr-2" />
              Summarizing...
            {:else}
              <Zap aria-hidden="true" class="h-4 w-4 mr-2" />
              Summarize
            {/if}
          </Button>