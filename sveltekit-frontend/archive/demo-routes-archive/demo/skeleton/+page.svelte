<!-- Complete Svelte 5 Skeleton Demo - All Features Integrated -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { embeddingsService } from '$lib/services/embeddings-service';
  import { gpuAIService } from '$lib/services/gpu-ai-service';
  import { evidenceStore } from '$lib/stores/evidence';
  import { showSuccess, showInfo } from '$lib/stores/alerts';

  // Components
  import EvidenceCanvas from '$lib/components/evidence/EvidenceCanvas.svelte';
  import DraggableEvidenceNode from '$lib/components/evidence/DraggableEvidenceNode.svelte';
  import EvidenceCRUDModal from '$lib/components/modals/EvidenceCRUDModal.svelte';
  import GPUAIAssistant from '$lib/components/ai/GPUAIAssistant.svelte';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/enhanced-bits';
  import {
    Brain,
    Database,
    Cpu,
    Zap,
    Upload,
    Search,
    Plus,
    BarChart3,
    Network,
    Sparkles
  } from 'lucide-svelte';

  // Svelte 5 state
  let currentView = $state<'canvas' | 'list'>('canvas');
  let selectedEvidenceIds = $state<string[]>([]);
  let showCRUDModal = $state(false);
  let crudModalMode = $state<'create' | 'edit' | 'view'>('create');
  let editingEvidenceId = $state<string | undefined>();
  let showAIAssistant = $state(true);
  let systemStatus = $state({
    wasm: false,
    webWorkers: 0,
    gpu: false,
    database: false,
    embedding_service: false
  });

  let performanceStats = $state({
    embeddingTime: 0,
    wasmOperations: 0,
    gpuUtilization: 0,
    activeConnections: 0
  });

  let evidenceList = $state<any[]>([]);

  // Demo data
  const demoEvidence = [
    {
      id: 'demo-1',
      title: 'Contract Agreement',
      type: 'document',
      content: 'Software licensing agreement between Company A and Company B for enterprise solutions.',
      x: 100,
      y: 100,
      tags: ['contract', 'software', 'enterprise'],
      metadata: { confidence: 0.95 }
    },
    {
      id: 'demo-2',
      title: 'Email Thread',
      type: 'document',
      content: 'Email correspondence discussing project requirements and deadlines.',
      x: 400,
      y: 150,
      tags: ['email', 'communication', 'requirements'],
      metadata: { confidence: 0.87 }
    },
    {
      id: 'demo-3',
      title: 'Meeting Recording',
      type: 'audio',
      content: 'Recorded discussion about contract terms and implementation timeline.',
      x: 250,
      y: 300,
      tags: ['meeting', 'audio', 'timeline'],
      metadata: { confidence: 0.92 }
    }
  ];

  // Subscribe to evidence store
  $effect(() => {
    const unsubscribe = evidenceStore.subscribe((state) => {
      evidenceList = state.evidence || [];
    });
    return unsubscribe;
  });

  // Initialize system
  onMount(async () => {
    await initializeSystem();
    loadDemoData();
    startPerformanceMonitoring();
  });

  async function initializeSystem() {
    showInfo('Initializing system components...');

    try {
      // Initialize WASM + Web Workers
      await embeddingsService.initialize();
      systemStatus.embedding_service = true;
      systemStatus.webWorkers = embeddingsService.getWorkerStats.totalWorkers;
      systemStatus.wasm = true;

      // Check GPU AI service
      const gpuHealthy = await gpuAIService.healthCheck();
      systemStatus.gpu = gpuHealthy;

      // Database connection (simulated)
      systemStatus.database = true;

      showSuccess('System initialized successfully!');
    } catch (error) {
      console.error('❌ System initialization failed:', error);
    }
  }

  function loadDemoData() {
    // Add demo evidence to store
    demoEvidence.forEach(evidence => {
      evidenceStore.addEvidence(evidence);
    });

    showInfo(`Loaded ${demoEvidence.length} demo evidence items`);
  }

  function startPerformanceMonitoring() {
    setInterval(async () => {
      try {
        // Update GPU status
        const gpuStatus = await gpuAIService.getServerStatus();
        performanceStats.gpuUtilization = gpuStatus.gpu_utilization;

        // Update worker stats
        const workerStats = embeddingsService.getWorkerStats();
        performanceStats.activeConnections = workerStats.pendingRequests;

        // Simulate other metrics
        performanceStats.wasmOperations = Math.floor(Math.random() * 100);
      } catch (error) {
        console.warn('Performance monitoring update failed:', error);
      }
    }, 5000);
  }

  // Evidence management
  function handleCreateEvidence() {
    crudModalMode = 'create';
    editingEvidenceId = undefined;
    showCRUDModal = true;
  }

  function handleEditEvidence(evidenceId: string) {
    crudModalMode = 'edit';
    editingEvidenceId = evidenceId;
    showCRUDModal = true;
  }

  function handleViewEvidence(evidenceId: string) {
    crudModalMode = 'view';
    editingEvidenceId = evidenceId;
    showCRUDModal = true;
  }

  function handleEvidenceSelect(evidenceId: string) {
    if (selectedEvidenceIds.includes(evidenceId)) {
      selectedEvidenceIds = selectedEvidenceIds.filter(id => id !== evidenceId);
    } else {
      selectedEvidenceIds = [...selectedEvidenceIds, evidenceId];
    }
  }

  // Demonstrations
  async function demonstrateWASMEmbeddings() {
    const startTime = performance.now();

    try {
      const sampleText = "This is a demonstration of WASM-powered embedding generation for legal text analysis.";
      const result = await embeddingsService.generateEmbedding(sampleText);

      performanceStats.embeddingTime = performance.now() - startTime;

      showSuccess(`WASM Embeddings: Generated ${result.embedding.length}-dimensional vector in ${performanceStats.embeddingTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ WASM demonstration failed:', error);
    }
  }

  async function demonstrateGPUAnalysis() {
    if (selectedEvidenceIds.length === 0) {
      showInfo('Please select evidence items to demonstrate GPU analysis');
      return;
    }

    try {
      const response = await gpuAIService.findEvidenceConnections(
        selectedEvidenceIds,
        ['Legal case analysis demonstration']
      );

      showSuccess(`GPU Analysis: Found ${response.suggestions?.length || 0} suggestions and ${response.insights?.length || 0} insights`);
    } catch (error) {
      console.error('❌ GPU analysis demonstration failed:', error);
    }
  }

  async function demonstrateBatchProcessing() {
    const texts = evidenceList.map(e => e.content || e.title);
    if (texts.length === 0) return;

    try {
      const startTime = performance.now();
      const result = await embeddingsService.generateBatchEmbeddings(texts);
      const processingTime = performance.now() - startTime;

      showSuccess(`Batch Processing: Generated ${result.count} embeddings in ${processingTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Batch processing demonstration failed:', error);
    }
  }
</script>

<!-- Main Layout -->
<div class="min-h-screen bg-background">
  <!-- Header -->
  <div class="border-b bg-card">
    <div class="container mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold flex items-center gap-3">
            <Sparkles class="w-8 h-8 text-primary" />
            Svelte 5 + WASM + GPU AI Skeleton
          </h1>
          <p class="text-muted-foreground mt-2">
            Complete legal AI platform with drag & drop evidence, WASM embeddings, and GPU acceleration
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant={currentView === 'canvas' ? 'default' : 'outline'}
            onclick={() => currentView = 'canvas'}
          >
            <Network class="w-4 h-4 mr-2" />
            Canvas View
          </Button>

          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            onclick={() => currentView = 'list'}
          >
            <BarChart3 class="w-4 h-4 mr-2" />
            List View
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- System Status Bar -->
  <div class="border-b bg-muted/30">
    <div class="container mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {systemStatus.wasm ? 'bg-green-500' : 'bg-red-500'}"></div>
            <span>WASM: {systemStatus.wasm ? 'Ready' : 'Offline'}</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {systemStatus.webWorkers > 0 ? 'bg-green-500' : 'bg-red-500'}"></div>
            <span>Workers: {systemStatus.webWorkers}</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {systemStatus.gpu ? 'bg-green-500' : 'bg-red-500'}"></div>
            <span>GPU: {systemStatus.gpu ? 'Available' : 'Offline'}</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {systemStatus.database ? 'bg-green-500' : 'bg-red-500'}"></div>
            <span>Database: {systemStatus.database ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>GPU: {performanceStats.gpuUtilization}%</span>
          <span>Active: {performanceStats.activeConnections}</span>
          <span>Evidence: {evidenceList.length}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container mx-auto px-4 py-6">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Evidence Workspace -->
      <div class="lg:col-span-3">
        <Card class="h-[800px]">
          <CardHeader class="border-b">
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2">
                <Database class="w-5 h-5" />
                Evidence Workspace
              </CardTitle>

              <div class="flex items-center gap-2">
                <Button size="sm" onclick={handleCreateEvidence}>
                  <Plus class="w-4 h-4 mr-2" />
                  Add Evidence
                </Button>

                <Button size="sm" variant="outline" onclick={demonstrateWASMEmbeddings}>
                  <Brain class="w-4 h-4 mr-2" />
                  Demo WASM
                </Button>

                <Button size="sm" variant="outline" onclick={demonstrateGPUAnalysis}>
                  <Cpu class="w-4 h-4 mr-2" />
                  Demo GPU
                </Button>

                <Button size="sm" variant="outline" onclick={demonstrateBatchProcessing}>
                  <Zap class="w-4 h-4 mr-2" />
                  Demo Batch
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-0 h-[calc(100%-80px)]">
            {#if currentView === 'canvas'}
              <EvidenceCanvas caseId="demo-case" />
            {:else}
              <div class="p-6">
                <div class="grid gap-4">
                  {#each evidenceList as evidence (evidence.id)}
                    <Card
                      class="cursor-pointer hover:shadow-md transition-shadow"
                      class:ring-2={selectedEvidenceIds.includes(evidence.id)}
                      class:ring-primary={selectedEvidenceIds.includes(evidence.id)}
                      onclick={() => handleEvidenceSelect(evidence.id)}
                    >
                      <CardContent class="p-4">
                        <div class="flex items-center justify-between">
                          <div>
                            <h3 class="font-medium">{evidence.title}</h3>
                            <p class="text-sm text-muted-foreground mt-1">
                              {evidence.content?.substring(0, 100)}...
                            </p>
                            <div class="flex gap-2 mt-2">
                              {#each evidence.tags || [] as tag}
                                <span class="px-2 py-1 text-xs bg-primary/20 rounded-full">
                                  #{tag}
                                </span>
                              {/each}
                            </div>
                          </div>

                          <div class="flex items-center gap-2">
                            <Button size="sm" variant="outline" onclick={() => handleViewEvidence(evidence.id)}>
                              View
                            </Button>
                            <Button size="sm" variant="outline" onclick={() => handleEditEvidence(evidence.id)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  {/each}

                  {#if evidenceList.length === 0}
                    <div class="text-center py-12">
                      <Upload class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 class="text-lg font-medium mb-2">No evidence items</h3>
                      <p class="text-muted-foreground mb-4">Create your first evidence item to get started</p>
                      <Button onclick={handleCreateEvidence}>
                        <Plus class="w-4 h-4 mr-2" />
                        Create Evidence
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- AI Assistant Panel -->
      <div class="lg:col-span-1">
        {#if showAIAssistant}
          <GPUAIAssistant
            caseId="demo-case"
            bind:selectedEvidenceIds
            onSuggestionClick={(suggestion) => console.log('Suggestion:', suggestion)}
            onInsightClick={(insight) => console.log('Insight:', insight)}
          />
        {/if}
      </div>
    </div>

    <!-- Performance Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">Embedding Time</p>
              <p class="text-2xl font-bold">{performanceStats.embeddingTime.toFixed(0)}ms</p>
            </div>
            <Brain class="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">GPU Utilization</p>
              <p class="text-2xl font-bold">{performanceStats.gpuUtilization}%</p>
            </div>
            <Cpu class="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">WASM Operations</p>
              <p class="text-2xl font-bold">{performanceStats.wasmOperations}</p>
            </div>
            <Zap class="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">Active Connections</p>
              <p class="text-2xl font-bold">{performanceStats.activeConnections}</p>
            </div>
            <Network class="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div>

<!-- CRUD Modal -->
<EvidenceCRUDModal
  bind:isOpen={showCRUDModal}
  mode={crudModalMode}
  evidenceId={editingEvidenceId}
  onClose={() => { showCRUDModal = false; }}
  onSave={(evidence) => {
    console.log('Evidence saved:', evidence);
    showCRUDModal = false;
  }}
  onDelete={(evidenceId) => {
    console.log('Evidence deleted:', evidenceId);
    showCRUDModal = false;
  }}
/>

<style>
  :global(.container) {
    max-width: 1400px;
  }
</style>