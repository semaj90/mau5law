<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Badge } from '$lib/components/ui/badge';
  import { Progress } from '$lib/components/ui/progress';
  import { Textarea } from '$lib/components/ui/textarea';
  
  // Icons
  import { 
    Cpu, Zap, Brain, Activity, Settings, Play, Square, RefreshCw,
    FileText, Search, BarChart3, Clock, CheckCircle, AlertTriangle,
    Monitor, Database, Network, Sparkles, Eye, Target, Layers
  } from 'lucide-svelte';

  // Svelte 5 runes
  let gpuStatus = $state('idle'); // idle, loading, processing, complete, error
  let processingStage = $state('Initializing GPU...');
  let progress = $state(0);
  let legalQuery = $state('');
  let results = $state(null);
  let isGpuAvailable = $state(false);
  let gpuInfo = $state(null);
  let benchmarkResults = $state(null);
  let selectedModel = $state('gemma3-legal-8b');
  let vectorDimensions = $state(768);
  let batchSize = $state(32);
  let processingTime = $state(0);
  let currentTab = $state('processor'); // processor, benchmarks, monitor, settings

  // GPU processing metrics
  let gpuMetrics = $state({
    utilization: 0,
    memory: 0,
    temperature: 0,
    powerDraw: 0,
    clockSpeed: 0
  });

  // Available models
  let models = [
    { id: 'gemma3-legal-8b', name: 'Gemma 3 Legal 8B', size: '8B', type: 'Legal Specialist' },
    { id: 'mixtral-legal-7b', name: 'Mixtral Legal 7B', size: '7B', type: 'Multi-Modal' },
    { id: 'llama3-legal-70b', name: 'Llama 3 Legal 70B', size: '70B', type: 'Comprehensive' },
    { id: 'embedding-gemma', name: 'Embedding Gemma', size: '2B', type: 'Embeddings' }
  ];

  // Processing stages for legal analysis
  let processingStages = [
    'Initializing CUDA kernels...',
    'Loading legal model weights...',
    'Preprocessing document text...',
    'Computing vector embeddings...',
    'Running semantic similarity...',
    'Extracting legal entities...',
    'Performing precedent analysis...',
    'Generating legal insights...',
    'Finalizing results...'
  ];

  onMount(async () => {
    await checkGpuAvailability();
    if (isGpuAvailable) {
      startGpuMonitoring();
    }
  });

  async function checkGpuAvailability() {
    try {
      // Check WebGPU availability
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          isGpuAvailable = true;
          gpuInfo = {
            vendor: 'NVIDIA/AMD/Intel',
            model: 'RTX 4090 / RX 7900 XTX',
            memory: '24GB VRAM',
            compute: 'CUDA 12.0 / ROCm 5.7'
          };
        }
      }
      
      // Fallback check via API
      const response = await fetch('/api/v1/gpu/status');
      if (response.ok) {
        const data = await response.json();
        isGpuAvailable = data.available;
        gpuInfo = data.info;
      }
    } catch (error) {
      console.error('GPU check failed:', error);
      isGpuAvailable = false;
    }
  }

  function startGpuMonitoring() {
    setInterval(() => {
      // Simulate GPU metrics updates
      gpuMetrics = {
        utilization: Math.max(0, Math.min(100, gpuMetrics.utilization + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, gpuMetrics.memory + (Math.random() - 0.5) * 5)),
        temperature: Math.max(30, Math.min(85, gpuMetrics.temperature + (Math.random() - 0.5) * 3)),
        powerDraw: Math.max(50, Math.min(400, gpuMetrics.powerDraw + (Math.random() - 0.5) * 20)),
        clockSpeed: Math.max(1000, Math.min(2500, gpuMetrics.clockSpeed + (Math.random() - 0.5) * 50))
      };
    }, 2000);
  }

  async function processLegalQuery() {
    if (!legalQuery.trim() || !isGpuAvailable) return;
    
    gpuStatus = 'processing';
    progress = 0;
    processingTime = Date.now();
    results = null;
    
    // Simulate processing stages
    for (let i = 0; i < processingStages.length; i++) {
      processingStage = processingStages[i];
      progress = ((i + 1) / processingStages.length) * 100;
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Update GPU utilization during processing
      gpuMetrics.utilization = Math.min(100, 60 + Math.random() * 35);
    }
    
    processingTime = Date.now() - processingTime;
    
    // Generate mock results
    results = {
      query: legalQuery,
      confidence: 0.87 + Math.random() * 0.12,
      processingTime,
      insights: [
        {
          type: 'Precedent Match',
          content: 'Similar case found: Smith v. Johnson (2019) - 94% similarity',
          confidence: 0.94,
          source: 'Federal Case Database'
        },
        {
          type: 'Legal Entity',
          content: 'Identified contract clauses: Force Majeure, Indemnification',
          confidence: 0.91,
          source: 'NER Model'
        },
        {
          type: 'Risk Assessment',
          content: 'Medium litigation risk detected - review recommended',
          confidence: 0.78,
          source: 'Risk Analysis Engine'
        }
      ],
      vectors: {
        dimensions: vectorDimensions,
        similarity: 0.847,
        clusters: 3
      },
      performance: {
        tokensProcessed: Math.floor(legalQuery.length * 1.3),
        tokensPerSecond: Math.floor(2847 + Math.random() * 1000),
        gpuUtilization: Math.floor(gpuMetrics.utilization),
        memoryUsage: Math.floor(gpuMetrics.memory)
      }
    };
    
    gpuStatus = 'complete';
    processingStage = 'Analysis complete!';
  }

  async function runBenchmark() {
    gpuStatus = 'processing';
    processingStage = 'Running GPU benchmarks...';
    progress = 0;
    
    const benchmarkTests = [
      'Matrix multiplication performance',
      'Memory bandwidth test',
      'Tensor operations throughput',
      'Model inference latency',
      'Batch processing efficiency'
    ];
    
    for (let i = 0; i < benchmarkTests.length; i++) {
      processingStage = `Running: ${benchmarkTests[i]}`;
      progress = ((i + 1) / benchmarkTests.length) * 100;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    benchmarkResults = {
      overallScore: Math.floor(8500 + Math.random() * 1500),
      tests: [
        { name: 'Matrix Mult (GFLOPS)', result: Math.floor(15000 + Math.random() * 5000), unit: 'GFLOPS' },
        { name: 'Memory Bandwidth', result: Math.floor(800 + Math.random() * 200), unit: 'GB/s' },
        { name: 'Inference Latency', result: Math.floor(2 + Math.random() * 3), unit: 'ms' },
        { name: 'Tokens/Second', result: Math.floor(2500 + Math.random() * 1000), unit: 'tokens/s' }
      ]
    };
    
    gpuStatus = 'complete';
    processingStage = 'Benchmarks complete!';
  }

  function resetProcessor() {
    gpuStatus = 'idle';
    progress = 0;
    results = null;
    processingStage = 'Ready for processing';
    legalQuery = '';
  }

  function getStatusColor(status) {
    switch (status) {
      case 'idle': return 'text-gray-500';
      case 'processing': return 'text-blue-500';
      case 'complete': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  function getUtilizationColor(value) {
    if (value < 30) return 'text-green-500';
    if (value < 70) return 'text-yellow-500';
    return 'text-red-500';
  }
</script>

<svelte:head>
  <title>GPU Legal AI Processing - High-Performance Legal Analysis</title>
  <meta name="description" content="GPU-accelerated legal document analysis using WebGPU and CUDA for real-time processing" />
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
      <Cpu class="w-10 h-10 text-primary" />
      GPU Legal AI Processor
    </h1>
    <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
      High-performance legal document analysis powered by GPU acceleration, 
      WebGPU compute shaders, and specialized legal AI models
    </p>
    <div class="flex justify-center gap-2 mt-4">
      <Badge variant="secondary" class="gap-1">
        <Zap class="w-3 h-3" />
        {isGpuAvailable ? 'GPU Ready' : 'GPU Unavailable'}
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Brain class="w-3 h-3" />
        Legal AI Models
      </Badge>
      <Badge variant="secondary" class="gap-1">
        <Network class="w-3 h-3" />
        Real-Time Processing
      </Badge>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="flex justify-center mb-8">
    <div class="flex space-x-1 bg-muted p-1 rounded-lg">
      {#each [
        { id: 'processor', label: 'AI Processor', icon: Brain },
        { id: 'benchmarks', label: 'GPU Benchmarks', icon: BarChart3 },
        { id: 'monitor', label: 'System Monitor', icon: Monitor },
        { id: 'settings', label: 'Configuration', icon: Settings }
      ] as tab}
        <button
          onclick={() => currentTab = tab.id}
          class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                 {currentTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          <tab.icon class="w-4 h-4" />
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  {#if !isGpuAvailable}
    <Card class="border-yellow-200 bg-yellow-50">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3">
          <AlertTriangle class="w-5 h-5 text-yellow-600" />
          <div>
            <p class="font-medium text-yellow-800">GPU Not Available</p>
            <p class="text-sm text-yellow-700">
              WebGPU or CUDA GPU not detected. Some features will run on CPU with reduced performance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- AI Processor Tab -->
  {#if currentTab === 'processor'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Query Input -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="w-5 h-5" />
            Legal Query Input
          </CardTitle>
          <CardDescription>
            Enter legal text for GPU-accelerated analysis and processing
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Textarea
            bind:value={legalQuery}
            placeholder="Enter legal document text, contract clauses, case details, or legal questions for analysis..."
            class="min-h-32 resize-none"
            disabled={gpuStatus === 'processing'}
          />
          
          <div class="flex gap-2">
            <Button 
              onclick={processLegalQuery}
              disabled={!legalQuery.trim() || gpuStatus === 'processing'}
              class="flex-1 gap-2"
            >
              {#if gpuStatus === 'processing'}
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              {:else}
                <Play class="w-4 h-4" />
                Analyze with GPU
              {/if}
            </Button>
            
            <Button 
              variant="outline" 
              onclick={resetProcessor}
              disabled={gpuStatus === 'processing'}
            >
              <RefreshCw class="w-4 h-4" />
            </Button>
          </div>
          
          <!-- Processing Status -->
          {#if gpuStatus === 'processing' || gpuStatus === 'complete'}
            <div class="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Processing Status</span>
                <Badge class={getStatusColor(gpuStatus)}>
                  {gpuStatus === 'processing' ? 'Processing' : 'Complete'}
                </Badge>
              </div>
              
              <Progress value={progress} class="h-2" />
              
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity class="w-3 h-3 animate-pulse" />
                {processingStage}
              </div>
              
              {#if processingTime > 0}
                <div class="text-xs text-muted-foreground">
                  Processing completed in {processingTime}ms
                </div>
              {/if}
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- GPU Information -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Cpu class="w-5 h-5" />
            GPU System Information
          </CardTitle>
          <CardDescription>
            Current GPU hardware and processing capabilities
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          {#if gpuInfo}
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Graphics Card</span>
                <span class="text-sm font-medium">{gpuInfo.model}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Memory</span>
                <span class="text-sm font-medium">{gpuInfo.memory}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Compute</span>
                <span class="text-sm font-medium">{gpuInfo.compute}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Model</span>
                <span class="text-sm font-medium">{selectedModel}</span>
              </div>
            </div>
          {:else}
            <div class="text-center text-muted-foreground py-8">
              <Cpu class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>GPU information not available</p>
            </div>
          {/if}
          
          <div class="pt-4 border-t">
            <div class="grid grid-cols-2 gap-4 text-center">
              <div>
                <p class="text-2xl font-bold text-primary">{vectorDimensions}</p>
                <p class="text-xs text-muted-foreground">Vector Dimensions</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-primary">{batchSize}</p>
                <p class="text-xs text-muted-foreground">Batch Size</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Results Display -->
    {#if results}
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Target class="w-5 h-5" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            GPU-accelerated legal analysis completed with {Math.round(results.confidence * 100)}% confidence
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Performance Metrics -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-3 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{results.performance.tokensPerSecond.toLocaleString()}</p>
              <p class="text-xs text-muted-foreground">Tokens/Second</p>
            </div>
            <div class="text-center p-3 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{results.processingTime}ms</p>
              <p class="text-xs text-muted-foreground">Processing Time</p>
            </div>
            <div class="text-center p-3 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{results.performance.gpuUtilization}%</p>
              <p class="text-xs text-muted-foreground">GPU Utilization</p>
            </div>
            <div class="text-center p-3 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{Math.round(results.confidence * 100)}%</p>
              <p class="text-xs text-muted-foreground">Confidence</p>
            </div>
          </div>

          <!-- Legal Insights -->
          <div class="space-y-3">
            <h4 class="font-medium flex items-center gap-2">
              <Sparkles class="w-4 h-4" />
              Legal Insights
            </h4>
            {#each results.insights as insight}
              <div class="border rounded-lg p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <Badge variant="outline">{insight.type}</Badge>
                  <Badge class="{Math.round(insight.confidence * 100) > 85 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>
                <p class="text-sm">{insight.content}</p>
                <p class="text-xs text-muted-foreground">Source: {insight.source}</p>
              </div>
            {/each}
          </div>

          <!-- Vector Analysis -->
          <div class="border rounded-lg p-4">
            <h4 class="font-medium mb-3 flex items-center gap-2">
              <Network class="w-4 h-4" />
              Vector Analysis
            </h4>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-lg font-semibold">{results.vectors.dimensions}</p>
                <p class="text-xs text-muted-foreground">Dimensions</p>
              </div>
              <div>
                <p class="text-lg font-semibold">{Math.round(results.vectors.similarity * 1000) / 1000}</p>
                <p class="text-xs text-muted-foreground">Similarity Score</p>
              </div>
              <div>
                <p class="text-lg font-semibold">{results.vectors.clusters}</p>
                <p class="text-xs text-muted-foreground">Clusters Found</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
  {/if}

  <!-- Benchmarks Tab -->
  {#if currentTab === 'benchmarks'}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <BarChart3 class="w-5 h-5" />
          GPU Performance Benchmarks
        </CardTitle>
        <CardDescription>
          Comprehensive GPU performance testing for legal AI workloads
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex gap-3">
          <Button 
            onclick={runBenchmark}
            disabled={gpuStatus === 'processing' || !isGpuAvailable}
            class="gap-2"
          >
            {#if gpuStatus === 'processing'}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Running...
            {:else}
              <Play class="w-4 h-4" />
              Run Benchmarks
            {/if}
          </Button>
        </div>

        {#if gpuStatus === 'processing'}
          <div class="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Progress value={progress} class="h-2" />
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity class="w-3 h-3 animate-pulse" />
              {processingStage}
            </div>
          </div>
        {/if}

        {#if benchmarkResults}
          <div class="space-y-4">
            <div class="text-center p-6 bg-primary/5 rounded-lg border">
              <p class="text-3xl font-bold text-primary">{benchmarkResults.overallScore.toLocaleString()}</p>
              <p class="text-sm text-muted-foreground">Overall GPU Score</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each benchmarkResults.tests as test}
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-sm">{test.name}</span>
                    <Badge variant="secondary">{test.unit}</Badge>
                  </div>
                  <p class="text-2xl font-bold text-primary">{test.result.toLocaleString()}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Monitor Tab -->
  {#if currentTab === 'monitor'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Monitor class="w-5 h-5" />
            GPU Utilization
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm">GPU Usage</span>
              <span class="text-sm font-medium {getUtilizationColor(gpuMetrics.utilization)}">
                {Math.round(gpuMetrics.utilization)}%
              </span>
            </div>
            <Progress value={gpuMetrics.utilization} class="h-2" />
            
            <div class="flex justify-between items-center">
              <span class="text-sm">Memory Usage</span>
              <span class="text-sm font-medium {getUtilizationColor(gpuMetrics.memory)}">
                {Math.round(gpuMetrics.memory)}%
              </span>
            </div>
            <Progress value={gpuMetrics.memory} class="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Activity class="w-5 h-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <p class="text-lg font-semibold">{Math.round(gpuMetrics.temperature)}�C</p>
              <p class="text-xs text-muted-foreground">Temperature</p>
            </div>
            <div>
              <p class="text-lg font-semibold">{Math.round(gpuMetrics.powerDraw)}W</p>
              <p class="text-xs text-muted-foreground">Power Draw</p>
            </div>
            <div>
              <p class="text-lg font-semibold">{Math.round(gpuMetrics.clockSpeed)}MHz</p>
              <p class="text-xs text-muted-foreground">Core Clock</p>
            </div>
            <div>
              <p class="text-lg font-semibold">{gpuStatus}</p>
              <p class="text-xs text-muted-foreground">Status</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}

  <!-- Settings Tab -->
  {#if currentTab === 'settings'}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Settings class="w-5 h-5" />
          GPU Processing Configuration
        </CardTitle>
        <CardDescription>
          Configure GPU settings for optimal legal AI performance
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium mb-2 block" for="ai-model">AI Model</label>
            <select id="ai-model" 
              bind:value={selectedModel} 
              class="w-full p-2 border rounded-md bg-background"
            >
              {#each models as model}
                <option value={model.id}>{model.name} ({model.size}) - {model.type}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label class="text-sm font-medium mb-2 block">Vector Dimensions</label>
            <Input 
              type="number" 
              bind:value={vectorDimensions} 
              min="128" 
              max="4096" 
              step="128"
            />
          </div>
          
          <div>
            <label class="text-sm font-medium mb-2 block">Batch Size</label>
            <Input 
              type="number" 
              bind:value={batchSize} 
              min="1" 
              max="128" 
              step="1"
            />
          </div>
        </div>
        
        <div class="pt-4 border-t">
          <Button class="w-full gap-2">
            <CheckCircle class="w-4 h-4" />
            Apply Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>