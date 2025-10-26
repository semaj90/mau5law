<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { Badge } from '$lib/components/ui/badge';
  import { Search, Bot, Sparkles, FileText, Users, Clock, Tags } from 'lucide-svelte';
  import { onMount } from "svelte";
  import Fuse from 'fuse.js';
  interface Props {
    selectedNode?: unknown;
    caseId?: string;
    evidenceList?: unknown[];
    ondispatch?: (payload: any) => void;
  }
  let {
    selectedNode = null,
    caseId = '',
    evidenceList = [],
    ondispatch = undefined
  }: Props = $props();
  let isProcessing = $state(false);
  let processingStatus = $state('');
  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);
  let fuse = $state<Fuse<any> | null>(null);
  let aiInsights = $state({
    connections: [],
    similarEvidence: [],
    timeline: [],
    suggestedActions: [],
  });

  // safe alias for template usage to avoid 'unknown' property errors
  let selectedNodeAny: any = null;
  $effect(() => {
    selectedNodeAny = selectedNode as any;
  });

  // Initialize search index when evidence list changes
  $effect(() => {
    if (evidenceList.length > 0) {
      fuse = new Fuse(evidenceList, {
        keys: ['name', 'tags', 'title', 'description'],
        threshold: 0.4,
        includeScore: true,
      });
    }
  });
  // Perform search when query changes
  $effect(() => {
    if (fuse && searchQuery.trim()) {
      const results = fuse.search(searchQuery);
      searchResults = results.map(r => ({ ...r.item, score: r.score })).slice(0, 10);
    } else {
      searchResults = [];
    }
  });
  function clearSearch() {
    searchQuery = '';
    searchResults = [];
  }
  async function analyzeWithAI() {
    if (!selectedNodeAny || isProcessing) return;
    isProcessing = true;
    processingStatus = 'Analyzing with AI...';
    try {
      const response = await fetch('/api/ai/analyze-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          evidence: selectedNodeAny,
          analysisType: 'comprehensive'
        })
      });
      if (response.ok) {
        const analysis = await response.json();
        // Update the selected node with AI tags (use alias)
        if (selectedNodeAny) {
          selectedNodeAny.aiTags = analysis.tags ?? analysis.tag;
          selectedNodeAny.aiSummary = analysis.summary;
        }
        // Update insights
        aiInsights = {
          connections: analysis.connections || [],
          similarEvidence: analysis.similarEvidence || [],
          timeline: analysis.timeline || [],
          suggestedActions: analysis.suggestedActions || []
        };
        ondispatch?.(analysis);
        processingStatus = 'Analysis complete!';
      } else {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      processingStatus = 'Analysis failed. Please try again.';
    } finally {
      isProcessing = false;
      setTimeout(() => processingStatus = '', 3000);
    }
  }
  async function generateInsights() {
    if (!caseId || isProcessing) return;
    isProcessing = true;
    processingStatus = 'Generating insights...';
    try {
      const response = await fetch('/api/ai/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          evidenceId: selectedNodeAny?.id,
          context: evidenceList
        })
      });
      if (response.ok) {
        const insights = await response.json();
        aiInsights = insights;
        processingStatus = 'Insights generated!';
      } else {
        throw new Error(`Insight generation failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Insight generation error:', error);
      processingStatus = 'Failed to generate insights.';
    } finally {
      isProcessing = false;
      setTimeout(() => processingStatus = '', 3000);
    }
  }
  function selectEvidence(item: unknown) {
    ondispatch?.({ id: (item as { id?: unknown }).id });
  }
  function selectConnection(connection: unknown) {
    ondispatch?.({ connection });
  }
</script>
<div class="ai-assistant-panel space-y-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
  <!-- Header -->
  <div class="flex items-center gap-3">
    <Bot class="w-6 h-6 text-blue-600 dark:text-blue-400" />
    <h2 class="text-xl font-bold text-gray-900 dark:text-white">AI Assistant</h2>
    {#if processingStatus}
      <div class="flex items-center gap-2 text-sm">
        <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span class="text-blue-600 dark:text-blue-400">{processingStatus}</span>
      </div>
    {/if}
  </div>

  <!-- Search Section -->
  <div class="nes-container">
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary flex items-center gap-2">
        <Search class="w-5 h-5" />
        Evidence Search
      </h3>
    </div>
    <div class="yorha-panel-content space-y-4">
      <div class="flex gap-2">
        <!-- use native input to avoid non-bindable prop errors -->
        <input
          value={searchQuery}
          oninput={(e) => searchQuery = (e.target as HTMLInputElement).value}
          placeholder="Search evidence by name, tags, or description..."
          class="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        />
        {#if searchQuery}
          <!-- native button instead of custom Button component -->
          <button class="bits-btn px-3 py-2 rounded text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800" onclick={clearSearch} disabled={isProcessing}>
            Clear
          </button>
        {/if}
      </div>

      {#if searchResults.length > 0}
        <div class="space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Found {searchResults.length} results
          </p>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {#each searchResults as result}
              <button
                onclick={() => selectEvidence(result)}
                class="w-full text-left p-3 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {(result as any).name || (result as any).title || 'Unknown'}
                    </p>
                    {#if (result as any).description}
                      <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {(result as any).description}
                      </p>
                    {/if}
                    {#if (result as any).tags && (result as any).tags.length > 0}
                      <div class="flex flex-wrap gap-1 mt-2">
                        {#each (result as any).tags.slice(0, 3) as tag}
                          <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{tag}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  {#if (result as any).score !== undefined}
                    <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{Math.round(((result as any).score ?? 0) * 100)}% match</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Selected Evidence Analysis -->
  {#if selectedNode}
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary flex items-center gap-2">
          <FileText class="w-5 h-5" />
          Evidence Analysis
        </h3>
      </div>
      <div class="yorha-panel-content space-y-4">
        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p class="font-medium text-gray-900 dark:text-white">
            {selectedNodeAny?.name || selectedNodeAny?.title || 'Selected Evidence'}
          </p>
          {#if selectedNodeAny?.description}
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {selectedNodeAny?.description}
            </p>
          {/if}
        </div>
        <div class="flex gap-2">
          <!-- native button in place of custom Button -->
          <button onclick={analyzeWithAI} disabled={isProcessing} class="flex-1 bits-btn px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            <Sparkles class="w-4 h-4 mr-2 inline-block" />
            {isProcessing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
          <button class="bits-btn px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-transparent" onclick={generateInsights} disabled={isProcessing}>
            Generate Insights
          </button>
        </div>

        <!-- AI Analysis Results -->
        {#if selectedNodeAny?.aiTags}
          <div class="space-y-3 p-4 border border-gray-200 dark:border-gray-600 rounded-md">
            <h4 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot class="w-4 h-4" />
              AI Analysis Results
            </h4>
            {#if selectedNodeAny?.aiSummary}
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary:</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  {selectedNodeAny?.aiSummary}
                </p>
              </div>
            {/if}
            {#if selectedNodeAny?.aiTags?.tags && selectedNodeAny.aiTags.tags.length > 0}
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Tags:</p>
                <div class="flex flex-wrap gap-2">
                  {#each selectedNodeAny.aiTags.tags as tag}
                    <!-- removed variant prop to satisfy Badge typing; fallback to simple span if Badge signature differs -->
                    <Badge>
                      <Tags class="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bot class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">No AI analysis available yet</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- AI Insights -->
  {#if aiInsights.connections.length > 0 || aiInsights.similarEvidence.length > 0 || aiInsights.suggestedActions.length > 0}
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary flex items-center gap-2">
          <Sparkles class="w-5 h-5" />
          AI Insights
        </h3>
      </div>
      <div class="yorha-panel-content space-y-4">
        {#if aiInsights.connections.length > 0}
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Users class="w-4 h-4" />
              Connections
            </h4>
            <div class="space-y-2">
              {#each aiInsights.connections as connection}
                <button
                  onclick={() => selectConnection(connection)}
                  class="w-full text-left p-3 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <p class="font-medium text-gray-900 dark:text-white">
                    {connection.entity}
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-300">
                    {connection.description}
                  </p>
                </button>
              {/each}
            </div>
          </div>
        {/if}
        {#if aiInsights.similarEvidence.length > 0}
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText class="w-4 h-4" />
              Similar Evidence
            </h4>
            <div class="space-y-2">
              {#each aiInsights.similarEvidence as similar}
                <button
                  onclick={() => selectEvidence(similar)}
                  class="w-full text-left p-3 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <p class="font-medium text-gray-900 dark:text-white">
                    {similar.name}
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-300">
                    {similar.reason}
                  </p>
                </button>
              {/each}
            </div>
          </div>
        {/if}
        {#if aiInsights.suggestedActions.length > 0}
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock class="w-4 h-4" />
              Suggested Actions
            </h4>
            <div class="space-y-2">
              {#each aiInsights.suggestedActions as action}
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {action.title}
                  </p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    {action.description}
                  </p>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !selectedNode}
    <div class="text-center py-12 text-gray-500 dark:text-gray-400">
      <FileText class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium mb-2">No evidence selected</p>
      <p class="text-sm">Select an evidence item to begin AI analysis</p>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>