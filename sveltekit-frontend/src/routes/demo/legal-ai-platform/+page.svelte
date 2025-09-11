<script lang="ts">
  import type { PageData } from './$types.js';
  import { onMount } from 'svelte';
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
    OrchestratedDialog,
    type LegalEvidenceItem,
    getConfidenceClass,
    getPriorityClass,
    formatAnalysisDate
  } from '$lib/components/ui/orchestrated';
  // Icons for the showcase
  import { 
    Brain, Database, Search, Zap, Shield, Settings,
    FileText, Scale, Sparkles, TrendingUp, Clock,
    CheckCircle, AlertCircle, Eye, ChevronRight,
    Activity, BarChart3, Cpu, HardDrive
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  // Svelte 5 runes for demo interactions
  let selectedDemo = $state<string>('overview');
  let isRunningDemo = $state<boolean>(false);
  let demoResults = $state<any>(null);
  let realTimeStats = $state(data.platformStats);

  // Live demo functions
  async function runRAGDemo() {
    isRunningDemo = true;
    demoResults = null;
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Contract breach and damages liability analysis',
          limit: 5
        })
      });
      const result = await response.json();
      demoResults = result;
    } catch (error) {
      console.error('RAG demo failed:', error);
      demoResults = { error: 'Demo failed to run' };
    } finally {
      isRunningDemo = false;
    }
  }

  async function runVectorSearchDemo() {
    isRunningDemo = true;
    demoResults = null;
    try {
      const response = await fetch('/api/unified/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'intellectual property infringement precedents',
          mode: 'semantic',
          filters: { limit: 3 }
        })
      });
      const result = await response.json();
      demoResults = result;
    } catch (error) {
      console.error('Vector search demo failed:', error);
      demoResults = { error: 'Demo failed to run' };
    } finally {
      isRunningDemo = false;
    }
  }

  function navigateToCase(caseId: string) {
    goto(`/cases/${caseId}`);
  }

  function navigateToRAG(caseId: string) {
    goto(`/cases/${caseId}/rag`);
  }

  // Simulate live updates for the demo
  onMount(() => {
    const interval = setInterval(() => {
      realTimeStats = {
        ...realTimeStats,
        totalAnalyses: realTimeStats.totalAnalyses + Math.floor(Math.random() * 3),
        avgProcessingTime: realTimeStats.avgProcessingTime + Math.floor(Math.random() * 100) - 50
      };
    }, 5000);
    return () => clearInterval(interval);
  });

  // System health status colors
  function getHealthColor(status: boolean): string {
    return status ? 'text-green-600' : 'text-red-600';
  }

  function getHealthBg(status: boolean): string {
    return status ? 'bg-green-100' : 'bg-red-100';
  }
</script>

<svelte:head>
  <title>Legal AI Platform - Complete Integration Showcase</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Platform Header -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
      <Brain class="w-10 h-10 text-primary" />
      Legal AI Platform
    </h1>
    <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
      Complete integration showcase featuring Enhanced-Bits orchestrated components, 
      Svelte 5 runes, RAG-powered legal analysis, and real-time vector search
    </p>
    <div class="flex justify-center gap-2 mt-6">
      <Badge variant="secondary" class="gap-1">
        <Sparkles class="w-3 h-3" />
        Enhanced-Bits UI
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Zap class="w-3 h-3" />
        Svelte 5 Runes
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Database class="w-3 h-3" />
        pgvector + RAG
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Shield class="w-3 h-3" />
        Production Ready
      </Badge>
    </div>
  </div>

  <!-- Demo Navigation -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    {#each [
      { id: 'overview', label: 'Platform Overview', icon: Activity },
      { id: 'rag', label: 'RAG Analysis', icon: Brain },
      { id: 'search', label: 'Vector Search', icon: Search },
      { id: 'cases', label: 'Case Management', icon: Scale }
    ] as tab}
      <button
        onclick={() => selectedDemo = tab.id}
        class="p-4 border rounded-lg text-left transition-all hover:shadow-md {selectedDemo === tab.id ? 'bg-primary/5 border-primary' : 'hover:border-primary/50'}"
      >
        <div class="flex items-center gap-3">
          {@render tab.icon({ class: "w-5 h-5" })}
          <span class="font-medium">{tab.label}</span>
        </div>
      </button>
    {/each}
  </div>

  <!-- Platform Overview -->
  {#if selectedDemo === 'overview'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Statistics Cards -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-2xl font-bold text-primary">{realTimeStats.totalCases}</p>
              <p class="text-sm text-muted-foreground">Total Cases</p>
            </div>
            <Scale class="w-8 h-8 text-primary/60" />
          </div>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-2xl font-bold text-primary">{realTimeStats.totalDocuments}</p>
              <p class="text-sm text-muted-foreground">Documents</p>
            </div>
            <FileText class="w-8 h-8 text-primary/60" />
          </div>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-2xl font-bold text-primary">{realTimeStats.totalAnalyses}</p>
              <p class="text-sm text-muted-foreground">AI Analyses</p>
            </div>
            <Brain class="w-8 h-8 text-primary/60" />
          </div>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-2xl font-bold text-primary">{realTimeStats.avgProcessingTime}ms</p>
              <p class="text-sm text-muted-foreground">Avg Response</p>
            </div>
            <Clock class="w-8 h-8 text-primary/60" />
          </div>
        </Card.Content>
      </OrchestratedCard.Analysis>
    </div>

    <!-- System Health -->
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Activity class="w-5 h-5" />
          System Health
        </Card.Title>
        <Card.Description>Real-time status of all platform components</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          {#each [
            { key: 'database', label: 'PostgreSQL', icon: Database },
            { key: 'redis', label: 'Redis Cache', icon: HardDrive },
            { key: 'vectorSearch', label: 'pgvector', icon: Search },
            { key: 'aiModels', label: 'AI Models', icon: Brain },
            { key: 'gpu', label: 'GPU Accel', icon: Cpu }
          ] as service}
            <div class="flex items-center gap-2 p-3 rounded-lg {getHealthBg(data.systemHealth[service.key])}">
              {@render service.icon({ class: "w-4 h-4" })}
              <span class="text-sm font-medium">{service.label}</span>
              {#if data.systemHealth[service.key]}
                <CheckCircle class="w-4 h-4 {getHealthColor(data.systemHealth[service.key])} ml-auto" />
              {:else}
                <AlertCircle class="w-4 h-4 {getHealthColor(data.systemHealth[service.key])} ml-auto" />
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </OrchestratedCard.Analysis>
  {/if}

  <!-- RAG Demo -->
  {#if selectedDemo === 'rag'}
    <OrchestratedCard.AIInsight>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Brain class="w-5 h-5" />
          RAG Analysis Demo
        </Card.Title>
        <Card.Description>
          Retrieval-Augmented Generation for legal document analysis
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex gap-3">
          <OrchestratedButton.AnalyzeEvidence
            onclick={runRAGDemo}
            disabled={isRunningDemo}
            class="gap-2"
          >
            {#if isRunningDemo}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Running Analysis...
            {:else}
              <Brain class="w-4 h-4" />
              Run RAG Demo
            {/if}
          </OrchestratedButton.AnalyzeEvidence>
          
          <Button variant="outline" onclick={() => goto('/dashboard/search')}>
            <Search class="w-4 h-4 mr-2" />
            Open Vector Search
          </Button>
        </div>

        {#if demoResults}
          <div class="p-4 bg-muted/50 rounded-lg">
            <h4 class="font-medium mb-2">Analysis Result:</h4>
            <pre class="text-sm overflow-auto">{JSON.stringify(demoResults, null, 2)}</pre>
          </div>
        {/if}
      </Card.Content>
    </OrchestratedCard.AIInsight>
  {/if}

  <!-- Vector Search Demo -->
  {#if selectedDemo === 'search'}
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Search class="w-5 h-5" />
          Vector Search Demo
        </Card.Title>
        <Card.Description>
          Semantic search across legal documents using pgvector
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex gap-3">
          <OrchestratedButton.SearchSimilar
            onclick={runVectorSearchDemo}
            disabled={isRunningDemo}
            class="gap-2"
          >
            {#if isRunningDemo}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Searching...
            {:else}
              <Search class="w-4 h-4" />
              Run Search Demo
            {/if}
          </OrchestratedButton.SearchSimilar>
          
          <Button variant="outline" onclick={() => goto('/dashboard/search')}>
            <Eye class="w-4 h-4 mr-2" />
            Open Search Dashboard
          </Button>
        </div>

        {#if demoResults}
          <div class="p-4 bg-muted/50 rounded-lg">
            <h4 class="font-medium mb-2">Search Results:</h4>
            <pre class="text-sm overflow-auto max-h-96">{JSON.stringify(demoResults, null, 2)}</pre>
          </div>
        {/if}

        <!-- Search Performance Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div class="text-center">
            <p class="text-2xl font-bold text-primary">{realTimeStats.vectorDimensions}</p>
            <p class="text-sm text-muted-foreground">Vector Dimensions</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-bold text-primary">{realTimeStats.embeddingModel}</p>
            <p class="text-sm text-muted-foreground">Embedding Model</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-primary">{Math.round(realTimeStats.avgProcessingTime)}ms</p>
            <p class="text-sm text-muted-foreground">Avg Response Time</p>
          </div>
        </div>
      </Card.Content>
    </OrchestratedCard.Analysis>
  {/if}

  <!-- Case Management Demo -->
  {#if selectedDemo === 'cases'}
    <div class="space-y-6">
      <OrchestratedCard.CaseFile>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Scale class="w-5 h-5" />
            Sample Cases
          </Card.Title>
          <Card.Description>
            Live case management with integrated RAG analysis
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid gap-4">
            {#each data.sampleCases as caseItem}
              <div class="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div class="flex-1">
                  <h3 class="font-medium">{caseItem.title}</h3>
                  <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span class="capitalize">{caseItem.status}</span>
                    <span>{caseItem.documentsCount} documents</span>
                    <span class={getConfidenceClass(caseItem.confidence)}>
                      {Math.round(caseItem.confidence * 100)}% AI confidence
                    </span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onclick={() => navigateToCase(caseItem.id)}
                  >
                    <Eye class="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <OrchestratedButton.AnalyzeEvidence
                    size="sm"
                    onclick={() => navigateToRAG(caseItem.id)}
                  >
                    <Brain class="w-4 h-4 mr-1" />
                    RAG
                  </OrchestratedButton.AnalyzeEvidence>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </OrchestratedCard.CaseFile>

      <!-- Recent Analyses -->
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <BarChart3 class="w-5 h-5" />
            Recent AI Analyses
          </Card.Title>
          <Card.Description>Latest RAG queries and their performance metrics</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each data.recentAnalyses as analysis}
              <div class="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div class="flex-1">
                  <p class="font-medium text-sm">{analysis.query}</p>
                  <p class="text-xs text-muted-foreground">
                    {formatAnalysisDate(new Date(analysis.timestamp))}
                  </p>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <span class={getConfidenceClass(analysis.confidence)}>
                    {Math.round(analysis.confidence * 100)}%
                  </span>
                  <span class="text-muted-foreground">{analysis.responseTime}ms</span>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </OrchestratedCard.Analysis>
    </div>
  {/if}

  <!-- Platform Actions -->
  <div class="flex justify-center gap-4 pt-8">
    <Button onclick={() => goto('/dashboard/search')} class="gap-2">
      <Search class="w-4 h-4" />
      Open Search Dashboard
    </Button>
    <Button onclick={() => goto('/cases')} variant="outline" class="gap-2">
      <Scale class="w-4 h-4" />
      Manage Cases
    </Button>
    <Button onclick={() => goto('/auth/login')} variant="outline" class="gap-2">
      <Shield class="w-4 h-4" />
      User Authentication
    </Button>
  </div>
</div>