<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!--
  AiAssistant.svelte
  - Production-ready, context7-compliant, SvelteKit 5, XState, Loki.js, and global store integration
  - Handles: streaming, memoization, global state, evidence source highlighting, and save-to-DB
  - Backend: expects /api/ai/process-evidence (LangChain, Ollama, pg_vector, Neo4j, Redis, Docker)
-->
<script lang="ts">
</script>
  import { getContext, onMount } from 'svelte';

  // UI components (Svelte 5 + melt v0.39.0 compatible)
  import Button from '$lib/components/ui/button/Button.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { aiGlobalStore, aiGlobalActions } from '$lib/stores/ai';
  import { legalCaseStore, legalCaseActions } from '$lib/stores/legal-case';

  // Type definition for AI store context
  interface AIStoreContext {
    loading?: boolean;
    error?: string;
    summary?: string;
    stream?: string;
    sources?: Array<{
      id?: string;
      title?: string;
    }>;
  }

  interface AIStore {
    context: AIStoreContext
  }

  // Get user from context (SSR-safe)
  const getUser = getContext('user');
  const user = typeof getUser === 'function' ? getUser() : undefined;

  interface Props {
    contextItems?: any[];
    caseId?: string;
    evidenceText?: string;
  }

  let {
    contextItems = [],
    caseId = '',
    evidenceText = ''
  } = $props();

  // Use the global AI store (XState-based, memoized, streaming-ready)
  // Access store state via $aiGlobalStore, send actions via aiGlobalActions.send
  // The actorRef is not directly used in the component's script, but can be accessed via aiGlobalStore if needed.
  // const { snapshot, send, actorRef } = useAIGlobalStore(); // Old usage

  onMount(() => {
    // getSummaryCache(); // Uncomment and use this if you need to initialize cache on client
  });

  // Trigger summary
  function handleSummarize() {
    if (!user?.id) return;
    aiGlobalActions.summarize(caseId, contextItems, user?.id || '');
  }

  // Generate embeddings for evidence
  function handleGenerateEmbedding() {
    if (!evidenceText || !caseId || !user?.id) return;
    legalCaseActions.generateEmbedding({
      caseId,
      evidenceText,
      userId: user.id
    });
  }

  // Search for related evidence using embeddings
  function handleSearchRelatedEvidence() {
    if (!evidenceText || !caseId || !user?.id) return;
    legalCaseActions.searchRelatedEvidence({
      caseId,
      query: evidenceText,
      userId: user.id,
      limit: 10
    });
  }

    // Save summary to DB using the comprehensive summaries API
    async function saveSummary() {
      if (!(($aiGlobalStore as AIStore).context.summary) || !caseId || !user?.id) return;
      try {
        const response = await fetch('/api/summaries', {
          method: 'POST',
          body: JSON.stringify({
            type: 'case',
            targetId: caseId,
            depth: 'comprehensive',
            includeRAG: true,
            includeUserActivity: false,
            enableStreaming: false,
            userId: user.id
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success) {
          // Optionally show a success notification here
          console.log('Summary saved successfully');
        } else {
          console.error('Failed to save summary:', result.error);
        }
      } catch (error) {
        console.error('Error saving summary:', error);
      }
    }
  </script>

  <Card class="nier-card p-6">
    <div class="nier-header mb-4">
      <h3 class="nier-title text-lg font-bold mb-2">AI Evidence Summary</h3>
    <div class="flex gap-2 flex-wrap">
      <Button
        onclick={handleSummarize}
        disabled={!user || $aiGlobalStore.context.loading}
        variant="primary"
        class="relative overflow-hidden transition-all duration-300 hover:translate-y--0.5 hover:shadow-lg bits-btn bits-btn"
      >
        {!user ? 'Sign in to Summarize' : ($aiGlobalStore.context.loading ? 'Summarizing...' : 'Summarize Evidence')}
      </Button>
      <Button
        onclick={saveSummary}
        disabled={!$aiGlobalStore.context.summary || $aiGlobalStore.context.loading}
        variant="primary"
        class="relative overflow-hidden transition-all duration-300 hover:translate-y--0.5 hover:shadow-lg bits-btn bits-btn"
      >
        Save Summary
      </Button>
      {#if evidenceText}
        <Button
          onclick={handleGenerateEmbedding}
          disabled={!user || $legalCaseStore.context.generatingEmbedding}
          variant="secondary"
          class="relative overflow-hidden transition-all duration-300 hover:translate-y--0.5 hover:shadow-lg bits-btn bits-btn"
        >
          {$legalCaseStore.context.generatingEmbedding ? 'Generating...' : 'Find Related Evidence'}
        </Button>
        <Button
          onclick={handleSearchRelatedEvidence}
          disabled={!user || $legalCaseStore.context.searchingRelatedEvidence}
          variant="outline"
          class="relative overflow-hidden transition-all duration-300 hover:translate-y--0.5 hover:shadow-lg bits-btn bits-btn"
        >
          {$legalCaseStore.context.searchingRelatedEvidence ? 'Searching...' : 'Semantic Search'}
        </Button>
      {/if}
    </div>
  </div>

  <div class="nier-content">
    {#if $aiGlobalStore.context.loading}
      <div class="nier-loading">
        <span class="nier-text-muted">Summarizing evidence...</span>
        <!-- Streaming output (if supported) -->
        {#if $aiGlobalStore.context.stream}
          <pre class="nier-code mt-2">{$aiGlobalStore.context.stream}</pre>
        {/if}
      </div>
    {:else if $aiGlobalStore.context.error}
      <div class="nier-error p-3 rounded">
        <span class="text-red-600">{$aiGlobalStore.context.error}</span>
      </div>
    {:else if $aiGlobalStore.context.summary}
      <div class="nier-summary">
        <pre class="nier-code whitespace-pre-wrap">{$aiGlobalStore.context.summary}</pre>
        <!-- Top 3 evidence sources (if available) -->
        {#if $aiGlobalStore.context.sources && $aiGlobalStore.context.sources.length > 0}
          <div class="nier-sources mt-4 pt-4 border-t border-gray-200">
            <h4 class="nier-subtitle font-semibold mb-2">Top Evidence Used:</h4>
            <ol class="nier-list space-y-1">
              {#each $aiGlobalStore.context.sources.slice(0, 3) as item, i}
                <li class="nier-list-item">
                  <span class="nier-badge">{i + 1}</span>
                  {item.title || item.id || `Evidence #${i+1}`}
                </li>
              {/each}
            </ol>
          </div>
        {/if}

        {#if $legalCaseStore.context.relatedEvidence && $legalCaseStore.context.relatedEvidence.length > 0}
          <div class="nier-related-evidence mt-4 pt-4 border-t border-gray-200">
            <h4 class="nier-subtitle font-semibold mb-2">Related Evidence Found:</h4>
            <div class="space-y-2">
              {#each $legalCaseStore.context.relatedEvidence.slice(0, 5) as evidence, i}
                <div class="nier-evidence-item p-3 bg-gray-50 rounded border">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="nier-badge">{i + 1}</span>
                    <span class="font-medium">{evidence.title || `Evidence #${evidence.id}`}</span>
                    <span class="nier-similarity-score ml-auto text-sm text-gray-600">
                      {Math.round(evidence.similarity * 100)}% match
                    </span>
                  </div>
                  {#if evidence.snippet}
                    <p class="text-sm text-gray-700 line-clamp-2">{evidence.snippet}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="nier-empty">
        <span class="nier-text-muted">No summary yet.</span>
        {#if $legalCaseStore.context.relatedEvidence && $legalCaseStore.context.relatedEvidence.length > 0}
          <div class="nier-related-evidence mt-4 pt-4 border-t border-gray-200">
            <h4 class="nier-subtitle font-semibold mb-2">Related Evidence Found:</h4>
            <div class="space-y-2">
              {#each $legalCaseStore.context.relatedEvidence.slice(0, 5) as evidence, i}
                <div class="nier-evidence-item p-3 bg-gray-50 rounded border">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="nier-badge">{i + 1}</span>
                    <span class="font-medium">{evidence.title || `Evidence #${evidence.id}`}</span>
                    <span class="nier-similarity-score ml-auto text-sm text-gray-600">
                      {Math.round(evidence.similarity * 100)}% match
                    </span>
                  </div>
                  {#if evidence.snippet}
                    <p class="text-sm text-gray-700 line-clamp-2">{evidence.snippet}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Loading states for embedding operations -->
    {#if $legalCaseStore.context.generatingEmbedding}
      <div class="nier-embedding-status mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <div class="flex items-center gap-2">
          <div class="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="text-blue-700">Generating embeddings for evidence analysis...</span>
        </div>
      </div>
    {/if}

    {#if $legalCaseStore.context.searchingRelatedEvidence}
      <div class="nier-search-status mt-4 p-3 bg-green-50 rounded border border-green-200">
        <div class="flex items-center gap-2">
          <div class="animate-pulse h-4 w-4 bg-green-600 rounded-full"></div>
          <span class="text-green-700">Searching for related evidence using semantic similarity...</span>
        </div>
      </div>
    {/if}
  </div>
</Card>

<style>
  /* Nier.css inspired styles */
  :global(.nier-card) {
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid #000;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  }

  :global(.nier-title) {
    letter-spacing: 0.05em;
    text-transform: uppercase
  }

  :global(.nier-button) {
    position: relative
    overflow: hidden
    transition: all 0.3s ease;
  }

  :global(.nier-button\:hover) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  :global(.nier-code) {
    background: #f4f4f4;
    border: 1px solid #ddd;
    padding: 1rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  :global(.nier-error) {
    background: rgba(255, 0, 0, 0.05);
    border: 2px solid #ff0000;
  }

  :global(.nier-badge) {
    display: inline-flex;
    align-items: center
    justify-content: center
    width: 24px;
    height: 24px;
    background: #000;
    color: #fff;
    border-radius: 50%;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  :global(.nier-text-muted) {
    color: #666;
    font-style: italic
  }

  :global(.nier-list-item) {
    display: flex;
    align-items: center;
    padding: 0.5rem 0;
  }

  :global(.nier-evidence-item) {
    transition: all 0.2s ease;
  }

  :global(.nier-evidence-item:hover) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(.nier-similarity-score) {
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }

  :global(.line-clamp-2) {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

