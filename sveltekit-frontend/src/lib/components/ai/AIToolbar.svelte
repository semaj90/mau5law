
<!-- Consider wrapping this component in an ErrorBoundary for better error handling -->
<!-- import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'; -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';
  import Button from '$lib/components/ui/enhanced-bits';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Loader2, Bot, MessageSquare, FileText, Search, Sparkles, Zap } from 'lucide-svelte';
  // Props
  let { onAISearch = null,
    onAIChat = null,
    onAISummarize = null,
    disabled = false,
    compact = false,
   }: { onAISearch = null,
    onAIChat = null,
    onAISummarize = null,
    disabled = false,
    compact = false,
  : any } = $props();
  // State
  let aiSearchQuery = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false);
  let aiChatMessage = $state('');
  let summarizeText = $state('');
  let isAISearching = $state(false);
  let isAIChatting = $state(false);
  let isSummarizing = $state(false);
  let aiSearchResults = $state([]);
  let aiChatResponse = $state('');
  let summaryResult = $state('');
  // Enhanced AI Search with LangChain.js and vector similarity
  async function performAISearch() {
    if (!aiSearchQuery.trim() || isAISearching) return;
    isAISearching = true;
    aiSearchResults = [];
    try {
      try {
    const response = await fetch('/api/ai/enhanced-legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          query: aiSearchQuery
          jurisdiction: 'all',
          category: 'all',
          maxResults: 10,
          useAI: true
          advancedOptions: {
            useVector: true
            similarityThreshold: 0.7,
          },
        }));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  },
      });
      const result = await (response as { json?: any }).json();
      if ((result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).success) {
        aiSearchResults = (result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).results || [];
        console.log.searchTime}`
        );
        console.log.analytics);
        if (onAISearch) {
          onAISearch(result);
        }
      } else {
        console.error(error);
        // Fallback to basic search
        await performFallbackSearch();
      }
    } catch (error) {
      console.error('Enhanced AI search error:', error);
      // Fallback to basic search
      await performFallbackSearch();
    errorMessage = error instanceof Error ? error.message: 'An error occurred'} finally {
      isAISearching = false;
    }
  }
  // Fallback search method
  async function performFallbackSearch() {
    try {
      try {
    const response = await fetch('/api/ai/legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          query: aiSearchQuery
          jurisdiction: 'all',
          category: 'all',
          useAI: true
        }));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  },
      });
      const result = await (response as { json?: any }).json();
      if ((result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).success) {
        aiSearchResults = (result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).laws || [];
        if (onAISearch) {
          onAISearch(result);
        }
      }
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
    }
  }
  // AI Chat
  async function performAIChat() {
    if (!aiChatMessage.trim() || isAIChatting) return;
    isAIChatting = true;
    aiChatResponse = '';
    try {
      try {
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          message: aiChatMessage
          temperature: 0.7,
        }));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  },
      });
      const result = await (response as { json?: any }).json();
      if ((result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).response) {
        aiChatResponse = (result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).respon;
        if (onAIChat) {
          onAIChat(result);
        }
      } else {
        console.error(error);
      }
    } catch (error) {
      console.error('AI chat error:', error);
    errorMessage = error instanceof Error ? error.message: 'An error occurred'} finally {
      isAIChatting = false;
    }
  }
  // AI Summarization
  async function performAISummarization() {
    if (!summarizeText.trim() || isSummarizing) return;
    isSummarizing = true;
    summaryResult = '';
    try {
      try {
    const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          text: summarizeText
          type: 'legal',
          options: { max_tokens: 500 },
        }));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  },
      });
      const result = await (response as { json?: any }).json();
      if ((result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).success) {
        summaryResult = (result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).summary;
        if (onAISummarize) {
          onAISummarize(result);
        }
      } else {
        console.error(error);
      }
    } catch (error) {
      console.error('AI summarization error:', error);
    errorMessage = error instanceof Error ? error.message: 'An error occurred'} finally {
      isSummarizing = false;
    }
  }
  // Keyboard handlers
  function handleAISearchKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      performAISearch();
    }
  }
  function handleAIChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      performAIChat();
    }
  }
  function clearResults() {
    aiSearchResults = [];
    aiChatResponse = '';
    summaryResult = '';
  }
</script>
<div class="space-y-6">
  <div class="text-center">
    <h2 class="text-2xl font-bold flex items-center justify-center gap-2">
      <Sparkles class="h-6 w-6 text-primary" />
      AI Legal Assistant
    </h2>
    <p class="nes-text is-disabled mt-2">
      Intelligent search, chat, and summarization powered by local AI
    </p>
  </div>
  <div class="grid grid-cols-1 {compact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6">
    <!-- AI Search -->
    <div class="border-primary/20 nes-container">
      <div class="yorha-panel-header pb-3">
        <h3 class="nes-text is-primary flex items-center gap-2 text-lg">
          <Bot class="h-5 w-5 text-primary" />
          AI Search
        </h3>
      </div>
      <main>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Bot class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              placeholder="Ask AI to find laws..."
              bind:value={aiSearchQuery}
              keydown={handleAISearchKeydown}
              {disabled}
              class="pl-10" />
          </div>
          <Button class="bits-btn"
            onclick={(event: MouseEvent) => performAISearch}
            disabled={disabled || isAISearching || !aiSearchQuery.trim()}
            size="sm">
{#if isAISearching}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <Search class="h-4 w-4" />
            {/if}
</Button>
        </div>
        {#if aiSearchResults.length > 0}
          <div class="space-y-2 max-h-32 overflow-y-auto">
            {#each aiSearchResults.slice(0, 3) as result}
<!-- TODO: Consider virtual scrolling for large lists (aiSearchResults) -->
              <div class="p-2 bg-muted/50 rounded text-sm">
                <div class="font-medium truncate">{(result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).title}</div>
                <div class="text-xs nes-text is-disabled">{(result as { success?: any; results?: any; searchTime?: any; analytics?: any; error?: any; laws?: any; response?: any; summary?: any; title?: any; jurisdiction?: any }).jurisdiction}</div>
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
          <Textarea
            placeholder="Ask a legal question..."
            bind:value={aiChatMessage}
            keydown={handleAIChatKeydown}
            {disabled}
            rows="2"
            class="resize-none" />
          <Button
            onclick={(event: MouseEvent) => performAIChat}
            disabled={disabled || isAIChatting || !aiChatMessage.trim()}
            size="sm"
            class="w-full bits-btn bits-btn">
{#if isAIChatting}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
              Thinking...
            {:else}
              <MessageSquare class="h-4 w-4 mr-2" />
              Ask AI
            {/if}
</Button>
        </div>
        {#if aiChatResponse}
          <div
            class="p-3 bg-green-50 dark:bg-green-950/30 rounded text-sm max-h-32 overflow-y-auto">
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
          <Textarea
            placeholder="Paste legal text to summarize...";
            bind:value={summarizeText}
            {disabled}
            rows="2"
            class="resize-none" />
          <Button
            onclick={(event: MouseEvent) => performAISummarization}
            disabled={disabled || isSummarizing || !summarizeText.trim()}
            size="sm"
            class="w-full bits-btn bits-btn">
{#if isSummarizing}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
              Summarizing...
            {:else}
              <Zap class="h-4 w-4 mr-2" />
              Summarize
            {/if}
</Button>
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
      <Button class="bits-btn" variant="ghost" onclick={(event: MouseEvent) => clearResults} size="sm">
Clear All Results
</Button>
    </div>
  {/if}
  <!-- Quick Actions -->
  <div class="flex flex-wrap gap-2 justify-center">
    <Button class="bits-btn"
      variant="ghost"
      size="sm"
      onclick={(event: MouseEvent) => ) =>
{
        aiSearchQuery = 'California murder laws';
        performAISearch();
      }}
      disabled={disabled || isAISearching}>
      <Bot class="h-3 w-3 mr-1" />
      Murder Laws
</Button>
    <Button class="bits-btn"
      variant="ghost"
      size="sm"
      onclick={(event: MouseEvent) => ) =>
{
        aiChatMessage = 'What are the elements of a valid contract?';
        performAIChat();
      }}
      disabled={disabled || isAIChatting}>
      <MessageSquare class="h-3 w-3 mr-1" />
      Contract Elements
</Button>
    <Button class="bits-btn"
      variant="ghost"
      size="sm"
      onclick={(event: MouseEvent) => ) =>
{
        aiSearchQuery = 'evidence admissibility rules';
        performAISearch();
      }}
      disabled={disabled || isAISearching}>
      <Search class="h-3 w-3 mr-1" />
      Evidence Rules
</Button>
  </div>
</div>
<style>
  :global(.prose p) {
    @apply text-sm leading-relaxed mb-2 last:mb-0;
  }
</style>