<script lang="ts">
  import { onMount } from 'svelte';
  import { enhancedUploadStore } from '$lib/stores/enhanced-upload-machine';
  import { recommendationStore } from '$lib/machines/recommendation-routing-machine';
  import { createWorkerPool, type WorkerPoolConfig } from '$lib/workers/legal-ai-worker-pool';
  import { createSIMDJSONCache } from '$lib/utils/simd-json-cache';
  import EnhancedUploadProgress from '$lib/components/upload/EnhancedUploadProgress.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Progress } from '$lib/components/ui/progress';
  import {
    Brain,
    Database,
    Network,
    Zap,
    Eye,
    FileText,
    Settings,
    Activity,
    Upload,
    MessageSquare,
    BarChart3
  } from 'lucide-svelte';

  // Component state
  let selectedFiles = $state<FileList | null>(null);
  let caseId = $state('case_' + Date.now());
  let documentType = $state<'evidence' | 'contract' | 'brief' | 'deposition'>('evidence');
  let isProcessing = $state(false);
  let systemStats = $state<any>({});
  let recommendations = $state<any[]>([]);
  let processedResults = $state<any>({});

  // System components
  let workerPool: any = null;
  let simdCache: any = null;

  // Performance metrics
  let performanceMetrics = $state({
    totalProcessingTime: 0,
    averageSpeed: 0,
    cacheHitRate: 0,
    workerUtilization: 0,
    simdPerformance: 0
  });

  onMount(async () => {
    // Initialize worker pool
    const workerConfig: WorkerPoolConfig = {
      maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 8),
      workerTimeout: 60000,
      queueLimit: 100,
      enableSIMD: true,
      redisCache: true,
      concurrencyLimit: 6
    };

    workerPool = createWorkerPool(workerConfig);
    simdCache = createSIMDJSONCache({
      defaultTTL: 3600,
      compressionEnabled: true,
      enableMetrics: true
    });

    // Start recommendation session
    recommendationStore.send({
      type: 'START_SESSION',
      userId: 'user_' + Date.now(),
      caseId
    });

    // Update system stats periodically
    const statsInterval = setInterval(updateSystemStats, 2000);

    return () => {
      clearInterval(statsInterval);
      workerPool?.terminate();
    };
  });

  function updateSystemStats() {
    if (workerPool) {
      const workerStats = workerPool.getStats();
      const cacheStats = simdCache?.getCacheStats() || {};
      const simdStatus = simdCache?.getSIMDStatus() || {};

      systemStats = {
        workers: workerStats,
        cache: cacheStats,
        simd: simdStatus
      };

      performanceMetrics.workerUtilization = workerStats.totalWorkers > 0
        ? (workerStats.activeWorkers / workerStats.totalWorkers) * 100
        : 0;
      performanceMetrics.cacheHitRate = cacheStats.hitRate * 100 || 0;
    }
  }

  async function handleFileUpload() {
    if (!selectedFiles || selectedFiles.length === 0) return;

    isProcessing = true;
    const startTime = performance.now();

    try {
      // Start enhanced upload machine
      enhancedUploadStore.send({
        type: 'UPLOAD_FILES',
        files: Array.from(selectedFiles),
        caseId,
        documentType
      });

      // Subscribe to upload progress
      const unsubscribe = enhancedUploadStore.subscribe(async (state) => {
        if (state.matches('completed')) {
          const endTime = performance.now();
          performanceMetrics.totalProcessingTime = endTime - startTime;

          // Process results with workers and SIMD
          await processResults(state.context);
          isProcessing = false;
          unsubscribe();
        } else if (state.matches('error')) {
          console.error('Upload failed:', state.context.error);
          isProcessing = false;
          unsubscribe();
        }
      });

      // Generate recommendations in parallel
      recommendationStore.send({
        type: 'ANALYZE_DOCUMENT',
        documentId: 'doc_' + Date.now(),
        documentType
      });

    } catch (error) {
      console.error('Processing failed:', error);
      isProcessing = false;
    }
  }

  async function processResults(context: any) {
    if (!workerPool || !simdCache) return;

    try {
      // Process OCR results with SIMD JSON
      if (context.results?.ocrText) {
        const ocrData = await simdCache.parse(
          JSON.stringify({ text: context.results.ocrText, confidence: context.results.ocrConfidence })
        );

        // Enhance OCR with worker pool
        const enhancedOCR = await workerPool.processOCR(ocrData, {
          language: 'eng+fra',
          confidenceThreshold: 0.8
        });

        processedResults.enhancedOCR = enhancedOCR;
      }

      // Generate embeddings with Gemma3
      if (context.results?.extractedText) {
        const embeddings = await workerPool.generateEmbeddings(
          context.results.extractedText,
          'embeddinggemma:latest',
          { normalize: true, chunkSize: 512 }
        );

        processedResults.embeddings = embeddings;
      }

      // Perform AI analysis
      if (context.results?.extractedText) {
        const analysis = await workerPool.analyzeDocument(
          context.results.extractedText,
          documentType,
          'gemma3:legal-latest'
        );

        processedResults.aiAnalysis = analysis;
      }

      // Generate recommendations
      const recContext = {
        document: {
          text: context.results?.extractedText,
          type: documentType,
          caseId
        },
        user: { preferences: { priority: 'accuracy' } }
      };

      const recs = await workerPool.generateRecommendations(recContext);
      recommendations = recs.data?.recommendations || [];

      // Update performance metrics
      const simdMetrics = simdCache.getMetrics();
      performanceMetrics.simdPerformance = simdMetrics.averageParseTime;
      performanceMetrics.averageSpeed = simdMetrics.totalDataProcessed / simdMetrics.totalParses;

    } catch (error) {
      console.error('Result processing failed:', error);
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFiles = target.files;
  }

  async function testSIMDPerformance() {
    if (!simdCache) return;

    const testData = {
      legal: {
        case: 'Test vs Example',
        parties: ['Plaintiff', 'Defendant'],
        evidence: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          type: 'document',
          description: `Evidence item ${i} with detailed legal content and metadata`
        }))
      }
    };

    const jsonString = JSON.stringify(testData);

    console.time('SIMD JSON Parse');
    await simdCache.parse(jsonString);
    console.timeEnd('SIMD JSON Parse');

    console.time('Native JSON Parse');
    JSON.parse(jsonString);
    console.timeEnd('Native JSON Parse');

    updateSystemStats();
  }
</script>

<div class="space-y-6 p-6">
  <!-- Header -->
  <div class="text-center space-y-2">
    <h1 class="text-3xl font-bold flex items-center justify-center gap-2">
      <Brain class="h-8 w-8 text-blue-600" />
      Comprehensive Legal AI Platform
    </h1>
    <p class="text-muted-foreground">
      OCR • AI Assistant • Neo4j • PostgreSQL • pgvector • RAG • XState • RabbitMQ • SIMD • Redis Cache
    </p>
  </div>

  <!-- System Status Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <Activity class="h-4 w-4" />
          Worker Pool
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>Active:</span>
            <span>{systemStats.workers?.activeWorkers || 0}/{systemStats.workers?.totalWorkers || 0}</span>
          </div>
          <Progress value={performanceMetrics.workerUtilization} class="h-2" />
          <div class="text-xs text-muted-foreground">
            Queue: {systemStats.workers?.queuedTasks || 0}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <Database class="h-4 w-4" />
          Redis Cache
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>Hit Rate:</span>
            <span>{performanceMetrics.cacheHitRate.toFixed(1)}%</span>
          </div>
          <Progress value={performanceMetrics.cacheHitRate} class="h-2" />
          <div class="text-xs text-muted-foreground">
            Entries: {systemStats.cache?.memoryEntries || 0}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <Zap class="h-4 w-4" />
          SIMD JSON
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <Badge variant={systemStats.simd?.loaded ? 'default' : 'secondary'}>
            {systemStats.simd?.loaded ? 'Enabled' : 'Fallback'}
          </Badge>
          <div class="text-xs text-muted-foreground">
            {systemStats.simd?.performance || 'No data'}
          </div>
          <Button onclick={testSIMDPerformance} size="sm" variant="outline" class="w-full text-xs">
            Benchmark
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <BarChart3 class="h-4 w-4" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>Avg Speed:</span>
            <span>{performanceMetrics.averageSpeed.toFixed(0)}B/op</span>
          </div>
          <div class="flex justify-between">
            <span>Total Time:</span>
            <span>{(performanceMetrics.totalProcessingTime / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Upload Interface -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Upload class="h-5 w-5" />
        Document Upload & Processing
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Case ID</label>
          <input
            type="text"
            bind:value={caseId}
            class="w-full p-2 border rounded"
            placeholder="Enter case ID"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Document Type</label>
          <select bind:value={documentType} class="w-full p-2 border rounded">
            <option value="evidence">Evidence</option>
            <option value="contract">Contract</option>
            <option value="brief">Legal Brief</option>
            <option value="deposition">Deposition</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Select Files</label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.png,.tiff"
            onchange={handleFileSelect}
            class="w-full p-2 border rounded"
          />
        </div>
      </div>

      <Button
        onclick={handleFileUpload}
        disabled={!selectedFiles || selectedFiles.length === 0 || isProcessing}
        class="w-full"
      >
        {#if isProcessing}
          <Activity class="h-4 w-4 mr-2 animate-spin" />
          Processing...
        {:else}
          <Brain class="h-4 w-4 mr-2" />
          Start Legal AI Processing
        {/if}
      </Button>
    </CardContent>
  </Card>

  <!-- Processing Progress -->
  {#if isProcessing}
    <EnhancedUploadProgress />
  {/if}

  <!-- Results Dashboard -->
  {#if Object.keys(processedResults).length > 0}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- OCR Results -->
      {#if processedResults.enhancedOCR}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Eye class="h-5 w-5" />
              OCR Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="font-medium">Confidence:</span>
                <Badge variant={processedResults.enhancedOCR.confidence > 0.8 ? 'default' : 'secondary'}>
                  {(processedResults.enhancedOCR.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
              <div>
                <h4 class="font-medium mb-2">Extracted Text:</h4>
                <p class="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {processedResults.enhancedOCR.text?.substring(0, 500)}...
                </p>
              </div>
              <div>
                <span class="font-medium">Bounding Boxes:</span>
                <span class="ml-2 text-sm">{processedResults.enhancedOCR.boundingBoxes?.length || 0} words</span>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}

      <!-- AI Analysis -->
      {#if processedResults.aiAnalysis}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Brain class="h-5 w-5" />
              AI Legal Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="font-medium">Confidence:</span>
                <Badge variant={processedResults.aiAnalysis.confidence > 0.7 ? 'default' : 'secondary'}>
                  {(processedResults.aiAnalysis.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
              <div>
                <h4 class="font-medium mb-2">Summary:</h4>
                <p class="text-sm text-muted-foreground">
                  {processedResults.aiAnalysis.summary || 'Analysis in progress...'}
                </p>
              </div>
              {#if processedResults.aiAnalysis.keyPoints?.length > 0}
                <div>
                  <h4 class="font-medium mb-2">Key Points:</h4>
                  <ul class="text-sm space-y-1">
                    {#each processedResults.aiAnalysis.keyPoints.slice(0, 3) as point}
                      <li class="flex items-start gap-2">
                        <span class="text-blue-500 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/if}
    </div>
  {/if}

  <!-- Recommendations -->
  {#if recommendations.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <MessageSquare class="h-5 w-5" />
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each recommendations.slice(0, 5) as rec}
            <div class="border rounded p-3">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium">{rec.title || rec.type}</h4>
                <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                  {rec.priority || 'normal'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                {rec.description || rec.summary}
              </p>
              {#if rec.confidence}
                <div class="mt-2">
                  <Progress value={rec.confidence * 100} class="h-1" />
                  <span class="text-xs text-muted-foreground">
                    Confidence: {(rec.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Feature Overview -->
  <Card>
    <CardHeader>
      <CardTitle>Integrated Technologies</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="flex items-center gap-2">
          <Eye class="h-4 w-4 text-blue-500" />
          <span>OCR Processing</span>
        </div>
        <div class="flex items-center gap-2">
          <Brain class="h-4 w-4 text-purple-500" />
          <span>Gemma3 AI Models</span>
        </div>
        <div class="flex items-center gap-2">
          <Database class="h-4 w-4 text-green-500" />
          <span>Neo4j + PostgreSQL</span>
        </div>
        <div class="flex items-center gap-2">
          <Network class="h-4 w-4 text-orange-500" />
          <span>RabbitMQ Queues</span>
        </div>
        <div class="flex items-center gap-2">
          <Zap class="h-4 w-4 text-yellow-500" />
          <span>SIMD JSON</span>
        </div>
        <div class="flex items-center gap-2">
          <Settings class="h-4 w-4 text-gray-500" />
          <span>XState Machines</span>
        </div>
        <div class="flex items-center gap-2">
          <Activity class="h-4 w-4 text-red-500" />
          <span>Web Workers</span>
        </div>
        <div class="flex items-center gap-2">
          <FileText class="h-4 w-4 text-indigo-500" />
          <span>RAG + pgvector</span>
        </div>
      </div>
    </CardContent>
  </Card>
</div>