<script lang="ts">
</script>
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
    OrchestratedDialog,
    type LegalEvidenceItem,
    getConfidenceClass,
    getPriorityClass,
    formatAnalysisDate
  } from '$lib/components/ui/orchestrated';
  
  // Icons for multi-modal analysis
  import { 
    Brain, Zap, Eye, BarChart3, Target, Sparkles, Settings,
    FileText, Scale, Search, Activity, Clock, CheckCircle,
    AlertTriangle, TrendingUp, Layers, Network, Cpu, Database
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  
  // Svelte 5 runes for hybrid analysis state
  let selectedDocument = $state<any>(null);
  let selectedAnalysisTypes = $state<Set<string>>(new Set(['semantic_similarity', 'entity_extraction']);
  let analysisResults = $state<any>(null);
  let isAnalyzing = $state(false);
  let comparisonMode = $state(false);
  let selectedDocuments = $state<Set<string>>(new Set();
  let visualizationMode = $state<'graph' | 'timeline' | 'heatmap'>('graph');
  let currentTab = $state<'analysis' | 'comparison' | 'batch' | 'visualization'>('analysis');

  // Derived state for analysis capabilities
  let availableAnalyses = $derived(
    Object.entries(data.analysisCapabilities).map(([key, capability]) => ({
      id: key,
      ...capability
    }))
  );

  // Analysis progress tracking
  let analysisProgress = $state(0);
  let processingSteps = $state<string[]>([]);

  // Multi-modal analysis functions
  async function runHybridAnalysis() {
    if (!selectedDocument || selectedAnalysisTypes.size === 0) return;
    
    isAnalyzing = true;
    analysisProgress = 0;
    processingSteps = [];
    analysisResults = null;

    // Simulate progressive analysis steps
    const steps = Array.from(selectedAnalysisTypes);
    for (let i = 0; i < steps.length; i++) {
      processingSteps = [...processingSteps, `Processing ${steps[i]}...`];
      analysisProgress = ((i + 1) / steps.length) * 100;
      await new Promise(resolve => setTimeout(resolve, 800);
    }

    // Submit the actual analysis
    const formData = new FormData();
    formData.append('documentId', selectedDocument.id);
    formData.append('analysisTypes', JSON.stringify(Array.from(selectedAnalysisTypes));
    formData.append('includeVisualization', 'true');

    try {
      const response = await fetch('?/analyzeDocument', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        analysisResults = result.results;
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      isAnalyzing = false;
      analysisProgress = 0;
      processingSteps = [];
    }
  }

  function toggleAnalysisType(analysisType: string) {
    if (selectedAnalysisTypes.has(analysisType)) {
      selectedAnalysisTypes.delete(analysisType);
    } else {
      selectedAnalysisTypes.add(analysisType);
    }
    selectedAnalysisTypes = new Set(selectedAnalysisTypes);
  }

  function toggleDocumentSelection(documentId: string) {
    if (selectedDocuments.has(documentId)) {
      selectedDocuments.delete(documentId);
    } else {
      selectedDocuments.add(documentId);
    }
    selectedDocuments = new Set(selectedDocuments);
  }

  function getAnalysisTypeColor(type: string): string {
    const colorMap = {
      'semantic_similarity': 'bg-blue-100 text-blue-800',
      'entity_extraction': 'bg-green-100 text-green-800',
      'sentiment_analysis': 'bg-purple-100 text-purple-800',
      'risk_assessment': 'bg-red-100 text-red-800',
      'precedent_matching': 'bg-orange-100 text-orange-800',
      'compliance_check': 'bg-yellow-100 text-yellow-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  }

  function getRiskLevelColor(level: string): string {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';  
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format analysis confidence
  function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Navigation helper
  function navigateToDocument(docId: string) {
    goto(`/documents/${docId}`);
  }
</script>

<svelte:head>
  <title>Hybrid Legal Analysis - Multi-Modal AI Processing</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
      <Layers class="w-10 h-10 text-primary" />
      Hybrid Legal Analysis
    </h1>
    <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
      Multi-modal AI-powered legal document analysis combining semantic search, 
      entity extraction, risk assessment, and precedent matching
    </p>
    <div class="flex justify-center gap-2 mt-6">
      <Badge variant="secondary" class="gap-1">
        <Brain class="w-3 h-3" />
        Multi-Modal AI
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Network class="w-3 h-3" />
        Vector Analysis  
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Cpu class="w-3 h-3" />
        Real-Time Processing
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Database class="w-3 h-3" />
        Legal Intelligence
      </Badge>
    </div>
  </div>

  <!-- Analysis Mode Tabs -->
  <div class="flex justify-center mb-8">
    <div class="flex space-x-1 bg-muted p-1 rounded-lg">
      {#each [
        { id: 'analysis', label: 'Single Analysis', icon: Target },
        { id: 'comparison', label: 'Document Comparison', icon: BarChart3 },
        { id: 'batch', label: 'Batch Processing', icon: Layers },
        { id: 'visualization', label: 'Data Visualization', icon: Eye }
      ] as tab}
        <button
          onclick={() => currentTab = tab.id}
          class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                 {currentTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          {@render tab.icon({ class: "w-4 h-4" })}
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Single Document Analysis -->
  {#if currentTab === 'analysis'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Document Selection -->
      <OrchestratedCard.CaseFile>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <FileText class="w-5 h-5" />
            Document Selection
          </Card.Title>
          <Card.Description>
            Choose a document for comprehensive multi-modal analysis
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid gap-3 max-h-96 overflow-y-auto">
            {#each data.sampleDocuments as document}
              <button
                onclick={() => selectedDocument = document}
                class="p-4 border rounded-lg text-left transition-all hover:shadow-md 
                       {selectedDocument?.id === document.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}"
              >
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-medium">{document.title}</h3>
                  <div class="flex gap-1">
                    <Badge variant="outline" class="text-xs capitalize">{document.type}</Badge>
                    <Badge variant="outline" class="text-xs {getPriorityClass(document.priority)}">
                      {document.priority}
                    </Badge>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground line-clamp-2">{document.content}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  {#each document.tags as tag}
                    <Badge variant="secondary" class="text-xs">{tag}</Badge>
                  {/each}
                </div>
                {#if document.lastAnalyzed}
                  <p class="text-xs text-muted-foreground mt-2">
                    Last analyzed: {formatAnalysisDate(new Date(document.lastAnalyzed))}
                  </p>
                {/if}
              </button>
            {/each}
          </div>
        </CardContent>
      </OrchestratedCard.CaseFile>

      <!-- Analysis Configuration -->
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Settings class="w-5 h-5" />
            Analysis Configuration
          </Card.Title>
          <Card.Description>
            Select analysis types and run multi-modal processing
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Available Analysis Types -->
          <div class="space-y-3">
            <h4 class="font-medium">Analysis Types</h4>
            <div class="grid gap-3">
              {#each availableAnalyses as analysis}
                <label class="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selectedAnalysisTypes.has(analysis.id)}
                    onchange={() => toggleAnalysisType(analysis.id)}
                    class="rounded border-gray-300"
                  />
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-medium">{analysis.name}</span>
                      <div class="flex gap-2 text-xs text-muted-foreground">
                        <span>{formatConfidence(analysis.accuracy)} accuracy</span>
                        <span>{analysis.avgTime}ms avg</span>
                      </div>
                    </div>
                    <p class="text-sm text-muted-foreground">{analysis.description}</p>
                  </div>
                </label>
              {/each}
            </div>
          </div>

          <!-- Analysis Controls -->
          <div class="border-t pt-4">
            <OrchestratedButton.AnalyzeEvidence
              onclick={runHybridAnalysis}
              disabled={!selectedDocument || selectedAnalysisTypes.size === 0 || isAnalyzing}
              class="w-full gap-2"
            >
              {#if isAnalyzing}
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Analyzing... ({analysisProgress.toFixed(0)}%)
              {:else}
                <Brain class="w-4 h-4" />
                Run Hybrid Analysis
              {/if}
            </OrchestratedButton.AnalyzeEvidence>

            {#if isAnalyzing && processingSteps.length > 0}
              <div class="mt-4 space-y-2">
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-primary h-2 rounded-full transition-all duration-300"
                    style="width: {analysisProgress}%"
                  ></div>
                </div>
                <div class="text-sm text-muted-foreground space-y-1">
                  {#each processingSteps as step}
                    <div class="flex items-center gap-2">
                      <Activity class="w-3 h-3 animate-pulse" />
                      {step}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </CardContent>
      </OrchestratedCard.Analysis>
    </div>

    <!-- Analysis Results -->
    {#if analysisResults}
      <OrchestratedCard.AIInsight>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <BarChart3 class="w-5 h-5" />
            Analysis Results
          </Card.Title>
          <Card.Description>
            Multi-modal analysis completed with {formatConfidence(analysisResults.confidence)} confidence
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Overall Results Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold {getConfidenceClass(analysisResults.confidence)}">
                {formatConfidence(analysisResults.confidence)}
              </p>
              <p class="text-sm text-muted-foreground">Overall Confidence</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{selectedAnalysisTypes.size}</p>
              <p class="text-sm text-muted-foreground">Analysis Types</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{analysisResults.processingSteps?.length || 0}</p>
              <p class="text-sm text-muted-foreground">Processing Steps</p>
            </div>
          </div>

          <!-- Detailed Results by Analysis Type -->
          <div class="space-y-4">
            {#each Object.entries(analysisResults.results) as [analysisType, result]}
              <div class="border rounded-lg p-4">
                <div class="flex items-center gap-2 mb-3">
                  <Badge class={getAnalysisTypeColor(analysisType)}>{analysisType.replace('_', ' ')}</Badge>
                  {#if result.confidence}
                    <Badge variant="outline">{formatConfidence(result.confidence)} confidence</Badge>
                  {/if}
                </div>

                {#if analysisType === 'semantic_similarity' && result.similarDocuments}
                  <div class="space-y-2">
                    <h5 class="font-medium">Similar Documents</h5>
                    {#each result.similarDocuments as doc}
                      <div class="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span class="text-sm">{doc.title}</span>
                        <Badge variant="outline">{formatConfidence(doc.similarity)} similarity</Badge>
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if analysisType === 'entity_extraction' && result.entities}
                  <div class="space-y-2">
                    <h5 class="font-medium">Extracted Entities ({result.entityCount})</h5>
                    <div class="flex flex-wrap gap-2">
                      {#each result.entities as entity}
                        <Badge variant="secondary" class="gap-1">
                          {entity.text}
                          <span class="text-xs opacity-70">({entity.type})</span>
                        </Badge>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if analysisType === 'risk_assessment' && result.riskScore !== undefined}
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="font-medium">Risk Assessment</span>
                      <Badge class={getRiskLevelColor(result.riskLevel)}>
                        {result.riskLevel} risk
                      </Badge>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        class="h-2 rounded-full {result.riskScore > 0.7 ? 'bg-red-500' : result.riskScore > 0.4 ? 'bg-yellow-500' : 'bg-green-500'}"
                        style="width: {result.riskScore * 100}%"
                      ></div>
                    </div>
                    {#if result.riskFactors}
                      <div class="space-y-1">
                        <h6 class="text-sm font-medium">Risk Factors:</h6>
                        {#each result.riskFactors as factor}
                          <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle class="w-3 h-3" />
                            {factor}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4 border-t">
            <Button variant="outline" onclick={() => analysisResults = null}>
              Clear Results
            </Button>
            <Button variant="outline" onclick={() => currentTab = 'visualization'}>
              <Eye class="w-4 h-4 mr-2" />
              View Visualization
            </Button>
            <Button onclick={() => goto('/dashboard/search')}>
              <Search class="w-4 h-4 mr-2" />
              Search Similar
            </Button>
          </div>
        </CardContent>
      </OrchestratedCard.AIInsight>
    {/if}
  {/if}

  <!-- Document Comparison Tab -->
  {#if currentTab === 'comparison'}
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <BarChart3 class="w-5 h-5" />
          Document Comparison
        </Card.Title>
        <Card.Description>
          Compare multiple documents using advanced similarity analysis
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="grid gap-3">
          {#each data.sampleDocuments as document}
            <label class="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selectedDocuments.has(document.id)}
                onchange={() => toggleDocumentSelection(document.id)}
                class="rounded border-gray-300"
              />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{document.title}</span>
                  <Badge variant="outline" class="text-xs capitalize">{document.type}</Badge>
                </div>
                <p class="text-sm text-muted-foreground line-clamp-1">{document.content}</p>
              </div>
            </label>
          {/each}
        </div>
        
        <Button 
          disabled={selectedDocuments.size < 2}
          class="w-full gap-2"
        >
          <BarChart3 class="w-4 h-4" />
          Compare Selected Documents ({selectedDocuments.size})
        </Button>
      </CardContent>
    </OrchestratedCard.Analysis>
  {/if}

  <!-- Recent Analyses -->
  <OrchestratedCard.Analysis>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Clock class="w-5 h-5" />
        Recent Hybrid Analyses
      </Card.Title>
      <Card.Description>
        Latest multi-modal analysis results and performance metrics
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-3">
        {#each data.recentAnalyses as analysis}
          <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <Badge variant="outline" class="text-xs">Doc: {analysis.documentId}</Badge>
                <div class="flex gap-1">
                  {#each analysis.analysisTypes as type}
                    <Badge class={getAnalysisTypeColor(type) + ' text-xs'}>{type}</Badge>
                  {/each}
                </div>
              </div>
              <div class="text-sm text-muted-foreground">
                {formatAnalysisDate(new Date(analysis.timestamp))} • 
                Processed in {analysis.processingTime}ms
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if analysis.results.overallScore}
                <Badge class={getConfidenceClass(analysis.results.overallScore)}>
                  {formatConfidence(analysis.results.overallScore)}
                </Badge>
              {/if}
              <Button variant="ghost" size="sm" onclick={() => navigateToDocument(analysis.documentId)}>
                <Eye class="w-3 h-3" />
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </CardContent>
  </OrchestratedCard.Analysis>
</div>

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>