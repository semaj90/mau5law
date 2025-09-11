<script lang="ts">
  import type { PageData, ActionData } from './$types.js';
  import { onMount, onDestroy } from 'svelte';
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
  // Icons for CUDA streaming
  import { 
    Cpu, Zap, Play, Square, Settings, TrendingUp, Activity,
    Database, Clock, BarChart3, Thermometer, Power, Memory,
    CheckCircle, AlertCircle, Eye, Download, Upload, Layers
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  // Svelte 5 runes for CUDA streaming state
  let selectedOperation = $state<string>('document_vectorization');
  let inputText = $state('');
  let batchSize = $state(10);
  let useGpu = $state(true);
  let isStreaming = $state(false);
  let currentSession = $state<string | null>(null);
  let streamResults = $state<any[]>([]);
  let processingProgress = $state(0);
  let liveMetrics = $state(data.sessionStats);
  let selectedTab = $state<'streaming' | 'monitoring' | 'results' | 'config'>('streaming');

  // Real-time metrics update
  let metricsInterval: NodeJS.Timeout | null = null;
  let streamingSocket: EventSource | null = null;

  // Derived states
  let gpuStatus = $derived(data.gpuInfo.gpuAvailable ? 'available' : 'unavailable');
  let canStream = $derived(!isStreaming && inputText.trim().length > 0);
  let gpuUtilizationColor = $derived(
    data.gpuInfo.utilization?.gpu > 80 ? 'text-red-600' :
    data.gpuInfo.utilization?.gpu > 50 ? 'text-yellow-600' : 'text-green-600'
  );

  // CUDA streaming functions
  async function startCudaStream() {
    if (!canStream) return;
    isStreaming = true;
    processingProgress = 0;
    streamResults = [];

    const formData = new FormData();
    formData.append('operationType', selectedOperation);
    formData.append('inputData', inputText);
    formData.append('batchSize', batchSize.toString());

    try {
      const response = await fetch('?/startStream', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        currentSession = result.sessionId;
        // Start streaming updates
        startStreamingUpdates(result.sessionId);
      }
    } catch (error) {
      console.error('Failed to start CUDA stream:', error);
      isStreaming = false;
    }
  }

  async function stopCudaStream() {
    if (!currentSession) return;
    const formData = new FormData();
    formData.append('sessionId', currentSession);

    try {
      await fetch('?/stopStream', {
        method: 'POST',
        body: formData
      });
      stopStreamingUpdates();
    } catch (error) {
      console.error('Failed to stop CUDA stream:', error);
    }
  }

  function startStreamingUpdates(sessionId: string) {
    // Simulate real-time streaming updates
    const updateInterval = setInterval(() => {
      processingProgress += Math.random() * 15;
      if (processingProgress >= 100) {
        processingProgress = 100;
        // Add final result
        streamResults = [...streamResults, {
          id: Date.now(),
          operation: selectedOperation,
          input: inputText.slice(0, 100) + '...',
          status: 'completed',
          processingTime: Math.floor(Math.random() * 2000) + 500,
          gpuAccelerated: useGpu,
          results: {
            vectorsGenerated: Math.floor(Math.random() * 500) + 100,
            entitiesExtracted: Math.floor(Math.random() * 20) + 5,
            confidence: 0.85 + Math.random() * 0.1
          }
        }];
        stopStreamingUpdates();
      } else {
        // Add intermediate result
        streamResults = [...streamResults, {
          id: Date.now(),
          operation: `${selectedOperation}_chunk_${streamResults.length + 1}`,
          status: 'processing',
          progress: processingProgress
        }];
      }
    }, 800);

    // Store interval for cleanup
    metricsInterval = updateInterval;
  }

  function stopStreamingUpdates() {
    isStreaming = false;
    currentSession = null;
    processingProgress = 0;
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
  }

  async function processSingleDocument() {
    if (!inputText.trim()) return;
    const startTime = Date.now();
    const formData = new FormData();
    formData.append('documentData', inputText);
    formData.append('processingType', selectedOperation);
    formData.append('useGpu', useGpu.toString());

    try {
      const response = await fetch('?/processDocument', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        streamResults = [...streamResults, {
          id: Date.now(),
          operation: `single_${selectedOperation}`,
          input: inputText.slice(0, 100) + '...',
          status: 'completed',
          processingTime: result.processingTime,
          gpuAccelerated: result.gpuAccelerated,
          results: result.result,
          timestamp: result.timestamp
        }];
      }
    } catch (error) {
      console.error('Single document processing failed:', error);
    }
  }

  // Performance metrics formatting
  function formatMemory(gb: number): string {
    return `${gb.toFixed(1)}GB`;
  }

  function formatUtilization(percent: number): string {
    return `${percent}%`;
  }

  function formatThroughput(docsPerSec: number): string {
    return docsPerSec >= 1000 ? `${(docsPerSec / 1000).toFixed(1)}K/s` : `${docsPerSec}/s`;
  }

  function getOperationIcon(operation: string) {
    switch (operation) {
      case 'document_vectorization': return Database;
      case 'similarity_search': return BarChart3;
      case 'text_embedding': return Layers;
      case 'legal_entity_extraction': return Eye;
      default: return Cpu;
    }
  }

  // Cleanup on destroy
  onDestroy(() => {
    stopStreamingUpdates();
    if (streamingSocket) {
      streamingSocket.close();
    }
  });

  // Auto-refresh metrics
  onMount(() => {
    const refreshInterval = setInterval(() => {
      // Simulate live metrics updates
      liveMetrics = {
        ...liveMetrics,
        throughputCurrent: liveMetrics.throughputCurrent + Math.floor(Math.random() * 20) - 10,
        avgProcessingTime: liveMetrics.avgProcessingTime + Math.floor(Math.random() * 50) - 25,
        queueSize: Math.max(0, liveMetrics.queueSize + Math.floor(Math.random() * 6) - 3)
      };
    }, 3000);
    return () => clearInterval(refreshInterval);
  });
</script>

<svelte:head>
  <title>CUDA Streaming - GPU-Accelerated Legal AI Processing</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
      <Cpu class="w-10 h-10 text-primary" />
      CUDA Streaming
    </h1>
    <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
      GPU-accelerated real-time legal document processing with NVIDIA CUDA and streaming analytics
    </p>
    <div class="flex justify-center gap-2 mt-6">
      <Badge 
        variant={data.gpuInfo.gpuAvailable ? 'default' : 'destructive'}
        class="gap-1"
      >
        <Zap class="w-3 h-3" />
        GPU {data.gpuInfo.gpuAvailable ? 'Available' : 'Unavailable'}
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Memory class="w-3 h-3" />
        {data.gpuInfo.totalMemory} VRAM
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Activity class="w-3 h-3" />
        CUDA {data.gpuInfo.cudaVersion}
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <TrendingUp class="w-3 h-3" />
        {formatThroughput(liveMetrics.throughputCurrent)} Throughput
      </Badge>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="flex justify-center mb-8">
    <div class="flex space-x-1 bg-muted p-1 rounded-lg">
      {#each [
        { id: 'streaming', label: 'Real-Time Streaming', icon: Play },
        { id: 'monitoring', label: 'GPU Monitoring', icon: Activity },
        { id: 'results', label: 'Processing Results', icon: BarChart3 },
        { id: 'config', label: 'Configuration', icon: Settings }
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

  <!-- Real-Time Streaming Tab -->
  {#if selectedTab === 'streaming'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Streaming Controls -->
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Play class="w-5 h-5" />
            Streaming Configuration
          </Card.Title>
          <Card.Description>
            Configure and start GPU-accelerated document processing streams
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Operation Selection -->
          <div class="space-y-3">
            <label class="text-sm font-medium" for="processing-operation">Processing Operation</label>
            <select id="processing-operation" 
              bind:value={selectedOperation}
              class="w-full p-2 border rounded-md"
              disabled={isStreaming}
            >
              {#each data.supportedOperations as operation}
                <option value={operation}>
                  {operation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              {/each}
            </select>
          </div>

          <!-- Input Data -->
          <div class="space-y-3">
            <label class="text-sm font-medium" for="input-data">Input Data</label>
            <textarea id="input-data"
              bind:value={inputText}
              placeholder="Enter legal document text for processing..."
              class="w-full h-32 p-3 border rounded-md"
              disabled={isStreaming}
            ></textarea>
          </div>

          <!-- Configuration Options -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Batch Size</label>
              <Input
                type="number"
                bind:value={batchSize}
                min="1"
                max="100"
                disabled={isStreaming}
              />
            </div>
            <div class="space-y-2">
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  bind:checked={useGpu}
                  disabled={isStreaming || !data.gpuInfo.gpuAvailable}
                  class="rounded"
                />
                <span class="text-sm font-medium">Use GPU Acceleration</span>
              </label>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="flex gap-3">
            <OrchestratedButton.ProcessDocument
              onclick={startCudaStream}
              disabled={!canStream}
              class="flex-1 gap-2"
            >
              {#if isStreaming}
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Streaming...
              {:else}
                <Play class="w-4 h-4" />
                Start Stream
              {/if}
            </OrchestratedButton.ProcessDocument>

            {#if isStreaming}
              <Button 
                variant="destructive" 
                onclick={stopCudaStream}
                class="gap-2"
              >
                <Square class="w-4 h-4" />
                Stop
              </Button>
            {:else}
              <Button 
                variant="outline" 
                onclick={processSingleDocument}
                disabled={!inputText.trim()}
                class="gap-2"
              >
                <Zap class="w-4 h-4" />
                Single Process
              </Button>
            {/if}
          </div>

          <!-- Processing Progress -->
          {#if isStreaming}
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span>Processing Progress</span>
                <span>{processingProgress.toFixed(1)}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-primary h-2 rounded-full transition-all duration-300"
                  style="width: {processingProgress}%"
                ></div>
              </div>
              {#if currentSession}
                <p class="text-xs text-muted-foreground">
                  Session: {currentSession}
                </p>
              {/if}
            </div>
          {/if}
        </Card.Content>
      </OrchestratedCard.Analysis>

      <!-- Live Stream Results -->
      <OrchestratedCard.Evidence>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Activity class="w-5 h-5" />
            Live Stream Results
          </Card.Title>
          <Card.Description>
            Real-time processing results and performance metrics
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#if streamResults.length === 0}
              <div class="text-center py-8 text-muted-foreground">
                <Activity class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active streams. Start processing to see results.</p>
              </div>
            {:else}
              {#each streamResults as result}
                <div class="border rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      {@render getOperationIcon(result.operation)({ class: "w-4 h-4" })}
                      <span class="font-medium text-sm">{result.operation.replace('_', ' ')}</span>
                    </div>
                    <Badge 
                      variant={result.status === 'completed' ? 'default' : 'secondary'}
                      class="text-xs"
                    >
                      {result.status}
                    </Badge>
                  </div>
                  
                  {#if result.input}
                    <p class="text-xs text-muted-foreground mb-2">{result.input}</p>
                  {/if}
                  
                  {#if result.processingTime}
                    <div class="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{result.processingTime}ms</span>
                      <span>{result.gpuAccelerated ? 'GPU' : 'CPU'}</span>
                      {#if result.results?.confidence}
                        <span class={getConfidenceClass(result.results.confidence)}>
                          {Math.round(result.results.confidence * 100)}% confidence
                        </span>
                      {/if}
                    </div>
                  {/if}
                  
                  {#if result.progress !== undefined}
                    <div class="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        class="bg-primary h-1 rounded-full"
                        style="width: {result.progress}%"
                      ></div>
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </Card.Content>
      </OrchestratedCard.Evidence>
    </div>
  {/if}

  <!-- GPU Monitoring Tab -->
  {#if selectedTab === 'monitoring'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- GPU Status -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Cpu class="w-8 h-8 text-primary/60" />
            <Badge variant={data.gpuInfo.gpuAvailable ? 'default' : 'destructive'}>
              {gpuStatus}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">GPU Status</p>
          <p class="text-lg font-medium">{data.gpuInfo.gpuName}</p>
          <p class="text-xs text-muted-foreground">{data.gpuInfo.computeCapability}</p>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <!-- Memory Usage -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Memory class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.gpuInfo.utilization?.memory}%</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Memory Usage</p>
          <p class="text-lg font-medium">{data.gpuInfo.availableMemory}</p>
          <p class="text-xs text-muted-foreground">of {data.gpuInfo.totalMemory}</p>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <!-- Temperature -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Thermometer class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.gpuInfo.temperatureCurrent}°C</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Temperature</p>
          <p class="text-lg font-medium">{data.gpuInfo.temperatureCurrent}°C</p>
          <p class="text-xs text-muted-foreground">Normal operating range</p>
        </Card.Content>
      </OrchestratedCard.Analysis>

      <!-- Power Draw -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Power class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.gpuInfo.powerDraw}W</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Power Draw</p>
          <p class="text-lg font-medium">{data.gpuInfo.powerDraw}W</p>
          <p class="text-xs text-muted-foreground">Current consumption</p>
        </Card.Content>
      </OrchestratedCard.Analysis>
    </div>

    <!-- Performance Metrics -->
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <TrendingUp class="w-5 h-5" />
          Real-Time Performance Metrics
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-primary">{formatThroughput(liveMetrics.throughputCurrent)}</p>
            <p class="text-sm text-muted-foreground">Current Throughput</p>
          </div>
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-primary">{liveMetrics.avgProcessingTime}ms</p>
            <p class="text-sm text-muted-foreground">Avg Processing Time</p>
          </div>
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-primary">{liveMetrics.queueSize}</p>
            <p class="text-sm text-muted-foreground">Queue Size</p>
          </div>
        </div>
      </Card.Content>
    </OrchestratedCard.Analysis>
  {/if}

  <!-- Recent Processing Results -->
  <OrchestratedCard.Analysis>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Clock class="w-5 h-5" />
        Recent Processing Sessions
      </Card.Title>
      <Card.Description>
        Historical GPU processing performance and results
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-3">
        {#each data.recentProcessing as session}
          <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <Badge variant="outline" class="text-xs">{session.operation.replace('_', ' ')}</Badge>
                <Badge 
                  variant={session.gpuAccelerated ? 'default' : 'secondary'}
                  class="text-xs"
                >
                  {session.gpuAccelerated ? 'GPU' : 'CPU'}
                </Badge>
                <Badge 
                  variant={session.status === 'completed' ? 'default' : 'destructive'}
                  class="text-xs"
                >
                  {session.status}
                </Badge>
              </div>
              <div class="text-sm text-muted-foreground">
                {session.documentsProcessed} documents • 
                {session.processingTime}ms • 
                {formatThroughput(session.throughput)} throughput
              </div>
              <div class="text-xs text-muted-foreground">
                {formatAnalysisDate(new Date(session.timestamp))}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye class="w-3 h-3" />
            </Button>
          </div>
        {/each}
      </div>
    </Card.Content>
  </OrchestratedCard.Analysis>
</div>