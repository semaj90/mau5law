<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { PageData, ActionData } from './$types.js';
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  
  // Enhanced-Bits orchestrated components
  import { 
    Button, 
    Card, 
    Input,
    Badge
  } from '$lib/components/ui/enhanced-bits';
  import { 
    OrchestratedCard,
    OrchestratedButton,
    type LegalEvidenceItem,
    getConfidenceClass,
    formatAnalysisDate
  } from '$lib/components/ui/orchestrated';
  
  // Icons for RAG integration
  import { 
    Brain, Database, Search, Zap, FileText, BarChart3,
    Settings, Clock, TrendingUp, Layers, Network, Cpu,
    BookOpen, Target, Sparkles, Activity, Eye, Plus
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  
  // Svelte 5 runes for RAG integration state
  let currentQuery = $state('');
  let maxResults = $state(5);
  let similarityThreshold = $state(0.7);
  let includeContext = $state(true);
  let isQuerying = $state(false);
  let ragResult = $state<any>(null);
  let selectedTab = $state<'query' | 'knowledge' | 'performance' | 'admin'>('query');
  let newDocTitle = $state('');
  let newDocContent = $state('');
  let newDocType = $state('contract');

  // Derived states
  let canQuery = $derived(!isQuerying && currentQuery.trim().length > 0);
  let totalDocuments = $derived((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats?.totalDocuments || 0);
  let knowledgeBaseHealth = $derived(
    ((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).knowledgeBase?.qualityScore || 0) > 0.85 ? 'excellent' :
    ((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).knowledgeBase?.qualityScore || 0) > 0.7 ? 'good' : 'needs-improvement'
  );

  // RAG query functions
  async function performRAGQuery() {
    if (!canQuery) return;
    
    isQuerying = true;
    ragResult = null;

    const formData = new FormData();
    formData.append('query', currentQuery);
    formData.append('maxResults', maxResults.toString());
    formData.append('similarityThreshold', similarityThreshold.toString());
    formData.append('includeContext', includeContext.toString());

    try {
      const response = await fetch('?/ragQuery', {
        method: 'POST',
        body: formData
      });
      
      const result = await (response as { json?: unknown }).json();
      if ((result as { success?: unknown; result?: unknown }).success) {
        ragResult = (result as { success?: unknown; result?: unknown }).result;
      }
    } catch (error) {
      console.error('RAG query failed:', error);
    } finally {
      isQuerying = false;
    }
  }

  function useDemoQuery(query: string) {
    currentQuery = query;
    performRAGQuery();
  }

  // Formatting functions
  function formatLatency(ms: number): string {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  function formatSimilarity(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  function getDocumentTypeColor(type: string): string {
    const colorMap = {
      'contract': 'bg-blue-100 text-blue-800',
      'case_law': 'bg-green-100 text-green-800',
      'regulation': 'bg-purple-100 text-purple-800',
      'precedent': 'bg-orange-100 text-orange-800',
      'legal_opinion': 'bg-yellow-100 text-yellow-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  }

  function getPerformanceColor(latency: number, threshold: number): string {
    return latency <= threshold ? 'text-green-600' : 
           latency <= threshold * 2 ? 'text-yellow-600' : 'text-red-600';
  }
</script>

<svelte:head>
  <title>RAG Integration - Comprehensive Legal AI System</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
      <Brain class="w-10 h-10 text-primary" />
      RAG Integration
    </h1>
    <p class="text-lg nes-text is-disabled max-w-3xl mx-auto">
      Comprehensive Retrieval-Augmented Generation system showcasing pgvector, embeddings, 
      and advanced legal knowledge retrieval with real-time performance metrics
    </p>
    <div class="flex justify-center gap-2 mt-6">
      <Badge variant="secondary" class="gap-1">
        <Database class="w-3 h-3" />
        {totalDocuments.toLocaleString()} Documents
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Layers class="w-3 h-3" />
        {(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats?.totalVectors?.toLocaleString() || '0'} Vectors
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Sparkles class="w-3 h-3" />
        {(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).modelInfo?.embedding?.model || 'nomic-embed-text'}
      </Badge>
      <Badge 
        variant={knowledgeBaseHealth === 'excellent' ? 'default' : 'secondary'}
        class="gap-1"
      >
        <TrendingUp class="w-3 h-3" />
        {Math.round(((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).knowledgeBase?.qualityScore || 0) * 100)}% Quality
      </Badge>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="flex justify-center mb-8">
    <div class="flex space-x-1 bg-muted p-1 rounded-lg">
      {#each [
        { id: 'query', label: 'RAG Query', icon: Search },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
        { id: 'performance', label: 'Performance', icon: BarChart3 },
        { id: 'admin', label: 'Administration', icon: Settings }
      ] as tab}
        <button
          onclick={() => selectedTab = tab.id}
          class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                 {selectedTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          {@render tab.icon({ class: "w-4 h-4" })}
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- RAG Query Tab -->
  {#if selectedTab === 'query'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Query Interface -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <Search class="w-5 h-5" />
            RAG Query Interface
          </div.Title>
          <div.Description class="nes-container">
            Perform advanced retrieval-augmented generation queries against the legal knowledge base
          </div.Description>
        </div.Header>
        <div.Content class="space-y-6 nes-container">
          <!-- Query Input -->
          <div class="space-y-3">
            <label class="text-sm font-medium" for="legal-query">Legal Query</label><textarea id="legal-query"
              bind:value={currentQuery}
              placeholder="Enter your legal question or search query..."
              class="w-full h-24 p-3 border rounded-md"
              disabled={isQuerying}
            ></textarea>
          </div>

          <!-- Configuration Options -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Max Results</label>
              <Input
                type="number"
                bind:value={maxResults}
                min="1"
                max="20"
                disabled={isQuerying}
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Similarity Threshold</label>
              <Input
                type="number"
                bind:value={similarityThreshold}
                min="0.1"
                max="1"
                step="0.1"
                disabled={isQuerying}
              />
            </div>
          </div>

          <!-- Query Button -->
          <OrchestratedButton.AnalyzeEvidence
            onclick={performRAGQuery}
            disabled={!canQuery}
            class="w-full gap-2"
          >
            {#if isQuerying}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Processing Query...
            {:else}
              <Brain class="w-4 h-4" />
              Execute RAG Query
            {/if}
          </OrchestratedButton.AnalyzeEvidence>

          <!-- Demo Queries -->
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Demo Queries</h4>
            <div class="space-y-2">
              {#each ((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).demoQueries || []) as demoQuery}
                <button
                  onclick={() => useDemoQuery(demoQuery)}
                  class="w-full text-left p-2 text-sm bg-muted hover:bg-muted/80 rounded border nes-text is-disabled hover:text-foreground transition-colors"
                  disabled={isQuerying}
                >
                  {demoQuery}
                </button>
              {/each}
            </div>
          </div>
        </div.Content>
      </OrchestratedCard.Analysis>

      <!-- Query Results -->
      <OrchestratedCard.AIInsight>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <FileText class="w-5 h-5" />
            Query Results
          </div.Title>
          <div.Description class="nes-container">
            Generated response and retrieved source documents
          </div.Description>
        </div.Header>
        <div.Content class="nes-container">
          {#if ragResult}
            <div class="space-y-6">
              <!-- Performance Metrics -->
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 bg-muted/50 rounded-lg">
                  <p class="text-lg font-bold text-primary">{formatLatency(ragResult.processingTime)}</p>
                  <p class="text-xs nes-text is-disabled">Total Time</p>
                </div>
                <div class="text-center p-3 bg-muted/50 rounded-lg">
                  <p class="text-lg font-bold text-primary">{ragResult.sources?.length || 0}</p>
                  <p class="text-xs nes-text is-disabled">Sources</p>
                </div>
                <div class="text-center p-3 bg-muted/50 rounded-lg">
                  <p class="text-lg font-bold text-primary">{formatSimilarity(ragResult.metadata?.avgSimilarity || 0)}</p>
                  <p class="text-xs nes-text is-disabled">Avg Similarity</p>
                </div>
              </div>

              <!-- Generated Answer -->
              <div class="space-y-3">
                <h4 class="font-medium">Generated Response</h4>
                <div class="p-4 bg-muted/30 rounded-lg">
                  <div class="prose prose-sm max-w-none whitespace-pre-wrap">
                    {ragResult.answer}
                  </div>
                </div>
              </div>

              <!-- Retrieved Sources -->
              {#if ragResult.sources?.length > 0}
                <div class="space-y-3">
                  <h4 class="font-medium">Retrieved Sources ({ragResult.sources.length})</h4>
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    {#each ragResult.sources as source, index}
                      <div class="p-3 border rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <Badge variant="outline" class="text-xs">#{index + 1}</Badge>
                            <Badge class={getDocumentTypeColor(source.documentType) + ' text-xs'}>
                              {source.documentType?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Badge variant="outline" class="text-xs">
                            {formatSimilarity(source.similarity)}
                          </Badge>
                        </div>
                        <h5 class="font-medium text-sm mb-1">{source.title}</h5>
                        <p class="text-xs nes-text is-disabled">{source.content}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="text-center py-12 nes-text is-disabled">
              <Brain class="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Execute a RAG query to see results and retrieved sources here.</p>
              <p class="text-sm mt-2">Try one of the demo queries to get started.</p>
            </div>
          {/if}
        </div.Content>
      </OrchestratedCard.AIInsight>
    </div>
  {/if}

  <!-- Knowledge Base Tab -->
  {#if selectedTab === 'knowledge'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Knowledge Base Overview -->
      <OrchestratedCard.Evidence>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <BookOpen class="w-5 h-5" />
            Knowledge Base Overview
          </div.Title>
          <div.Description class="nes-container">
            Current state and statistics of the legal document repository
          </div.Description>
        </div.Header>
        <div.Content class="space-y-4 nes-container">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{totalDocuments.toLocaleString()}</p>
              <p class="text-sm nes-text is-disabled">Total Documents</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats?.totalChunks?.toLocaleString() || '0'}</p>
              <p class="text-sm nes-text is-disabled">Text Chunks</p>
            </div>
          </div>

          <!-- Category Breakdown -->
          {#if (data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).knowledgeBase?.categories}
            <div class="space-y-3">
              <h4 class="font-medium">Document Categories</h4>
              {#each Object.entries((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).knowledgeBase.categories) as [category, stats]}
                <div class="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div class="flex items-center gap-2">
                    <span class="font-medium capitalize">{category}</span>
                    <Badge variant="outline" class="text-xs">{stats.count} docs</Badge>
                  </div>
                  <Badge class={getConfidenceClass(stats.avgConfidence)}>
                    {formatSimilarity(stats.avgConfidence)}
                  </Badge>
                </div>
              {/each}
            </div>
          {/if}
        </div.Content>
      </OrchestratedCard.Evidence>

      <!-- System Information -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <Settings class="w-5 h-5" />
            System Information
          </div.Title>
          <div.Description class="nes-container">
            RAG system architecture and configuration
          </div.Description>
        </div.Header>
        <div.Content class="space-y-4 nes-container">
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-sm nes-text is-disabled">Vector Database:</span>
              <span class="text-sm font-medium">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).ragCapabilities?.vectorDatabase?.provider || 'pgvector'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm nes-text is-disabled">Dimensions:</span>
              <span class="text-sm font-medium">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).ragCapabilities?.vectorDatabase?.dimensions || 768}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm nes-text is-disabled">Embedding Model:</span>
              <span class="text-sm font-medium">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).ragCapabilities?.embeddingModel?.name || 'nomic-embed-text'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm nes-text is-disabled">LLM Model:</span>
              <span class="text-sm font-medium">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).ragCapabilities?.llmModel?.name || 'gemma2:27b'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm nes-text is-disabled">Context Length:</span>
              <span class="text-sm font-medium">{(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).ragCapabilities?.llmModel?.contextLength || 8192} tokens</span>
            </div>
          </div>
        </div.Content>
      </OrchestratedCard.Analysis>
    </div>
  {/if}

  <!-- Performance Tab -->
  {#if selectedTab === 'performance'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Vector Database Performance -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <Database class="w-5 h-5" />
            Vector Database Performance
          </div.Title>
        </div.Header>
        <div.Content class="space-y-4 nes-container">
          {#if (data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats?.queryLatency}
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-3 bg-muted/50 rounded-lg">
                <p class="text-lg font-bold {getPerformanceColor((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats.queryLatency.p50, 50)}">
                  {(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats.queryLatency.p50}ms
                </p>
                <p class="text-xs nes-text is-disabled">P50 Latency</p>
              </div>
              <div class="text-center p-3 bg-muted/50 rounded-lg">
                <p class="text-lg font-bold {getPerformanceColor((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats.queryLatency.p95, 100)}">
                  {(data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).vectorStats.queryLatency.p95}ms
                </p>
                <p class="text-xs nes-text is-disabled">P95 Latency</p>
              </div>
            </div>
          {/if}
        </div.Content>
      </OrchestratedCard.Analysis>

      <!-- Model Performance -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2 nes-container">
            <Cpu class="w-5 h-5" />
            Model Performance
          </div.Title>
        </div.Header>
        <div.Content class="space-y-4 nes-container">
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-primary">{formatLatency((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).modelInfo?.embedding?.avgLatency || 0)}</p>
            <p class="text-sm nes-text is-disabled">Embedding Latency</p>
          </div>
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-primary">{formatLatency((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).modelInfo?.llm?.avgLatency || 0)}</p>
            <p class="text-sm nes-text is-disabled">LLM Latency</p>
          </div>
        </div.Content>
      </OrchestratedCard.Analysis>
    </div>
  {/if}

  <!-- Recent Queries -->
  <OrchestratedCard.Analysis>
    <div.Header class="nes-container">
      <div.Title class="flex items-center gap-2 nes-container">
        <Clock class="w-5 h-5" />
        Recent RAG Queries
      </div.Title>
      <div.Description class="nes-container">
        Latest queries processed by the RAG system with performance metrics
      </div.Description>
    </div.Header>
    <div.Content class="nes-container">
      <div class="space-y-3">
        {#each ((data as { vectorStats?: unknown; knowledgeBase?: unknown; modelInfo?: unknown; demoQueries?: unknown; ragCapabilities?: unknown; recentQueries?: unknown }).recentQueries || []) as query}
          <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
            <div class="flex-1">
              <p class="font-medium text-sm mb-1">{query.query}</p>
              <div class="text-xs nes-text is-disabled">
                {query.resultsFound} results • 
                {formatSimilarity(query.avgSimilarity)} avg similarity • 
                {formatLatency(query.processingTime)}
              </div>
              <div class="text-xs nes-text is-disabled">
                {formatAnalysisDate(new Date(query.timestamp))}
              </div>
            </div>
            <button class="nes-btn" variant="ghost" size="sm" onclick={() => useDemoQuery(query.query)}>
              <Eye class="w-3 h-3" />
            </button>
          </div>
        {/each}
      </div>
    </div.Content>
  </OrchestratedCard.Analysis>
</div>