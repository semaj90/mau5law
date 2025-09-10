
<script lang="ts">
  /**
   * xState-Powered Evidence Processing Workflow Component
   *
   * Real-time streaming workflow orchestration with:
   * - File upload with drag & drop
   * - Live progress tracking via SSE
   * - Neural Sprite configuration
   * - Portable artifact results
   * - Error handling and retry capabilities
   */

  import { createActor } from 'xstate';
  import { evidenceProcessingMachine, type EvidenceProcessingContext, getProcessingProgress, getCurrentStep } from '$lib/state/evidence-processing-machine.ts';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/ui/card.svelte';
  import Button from '$lib/ui/button.svelte';
  import { onMount, onDestroy } from 'svelte';

  // Explicit actor snapshot typing to satisfy accesses to currentState.context / matches
  interface StreamingUpdate {
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    progress?: number;
    message?: string;
  }

  interface PortableArtifactInfo {
    enhancedPngUrl: string;
    compressionRatio?: number;
  }

  interface MinioStorageInfo {
    storageUrl: string;
  }

  interface EvidenceActorState {
    context: EvidenceProcessingContext & {
      streamingUpdates?: StreamingUpdate[];
      errors: string[];
      portableArtifact?: PortableArtifactInfo;
      minioStorage?: MinioStorageInfo;
      processingTimeMs?: number;
    };
    value: string;
    matches: (state: string) => boolean;
  }

  interface Props {
    evidenceId?: string;
    autoStart?: boolean;
    neuralSpriteEnabled?: boolean;
    onCompleted?: (result: any) => void;
    onError?: (error: string) => void;
    sessionId?: string | null;
    endpoint?: string;
  }

  let {
    evidenceId = `evidence_${Date.now()}`,
    autoStart = false,
    neuralSpriteEnabled = true,
    onCompleted,
    onError,
    sessionId = null,
    endpoint = '/api/evidence/process/stream'
  } = $props<Props>();

  // xState actor for client-side state management
  let actor = $state(createActor(evidenceProcessingMachine));
  let currentState = $state<EvidenceActorState>({
    ...actor.getSnapshot(),
    context: {
      ...actor.getSnapshot().context,
      streamingUpdates: [],
      errors: [],
      processingTimeMs: 0
    }
  } as unknown as EvidenceActorState);
  let eventSource: EventSource | null = $state(null);

  // UI state
  let dragOver = $state(false);
  let selectedFile: File | null = $state(null);
  let neuralSpriteConfig = $state({
    enable_compression: neuralSpriteEnabled,
    predictive_frames: 3,
    ui_layout_compression: false,
    target_compression_ratio: 50
  });

  // Reactive values with safe fallbacks
  let progress = $derived(() => {
    try {
      return getProcessingProgress(currentState.context) || 0;
    } catch (e) {
      return 0;
    }
  });
  let currentStep = $derived(() => {
    try {
      return getCurrentStep(currentState.context) || 'idle';
    } catch (e) {
      return 'idle';
    }
  });
  let isProcessing = $derived(
    currentState.matches('uploading') ||
    currentState.matches('analyzing') ||
    currentState.matches('generatingGlyph') ||
    currentState.matches('embeddingPNG') ||
    currentState.matches('storingInMinIO')
  );
  let canCancel = $derived(isProcessing);
  let hasError = $derived(currentState.matches('error'));
  let isCompleted = $derived(currentState.matches('completed'));
  let isCancelled = $derived(currentState.matches('cancelled'));

  // Initialize actor subscription
  onMount(() => {
    actor.start();

    // Subscribe to state changes
    const subscription = actor.subscribe((state: any) => {
      // Cast to typed snapshot shape
      const typed = state as EvidenceActorState;
      currentState = state;

      // Handle completion
      if (typed.matches('completed')) {
        onCompleted?.(typed.context);
        disconnectStream();
      }

      // Handle errors
      if (typed.matches('error')) {
        onError?.(typed.context.errors.join(', '));
      }
    });

    // Auto-start if enabled
    if (autoStart && selectedFile) {
      startProcessing();
    }

    return () => {
      subscription.unsubscribe();
      disconnectStream();
    };
  });

  onDestroy(() => {
    actor?.stop();
    disconnectStream();
  });

  // File handling
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
    }
  }

  function handleFileDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  // Streaming connection management
  async function startProcessing() {
    if (!selectedFile) return;

    try {
      // Start streaming API connection
      const response = await fetch('/api/evidence/process/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId,
          file: {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size
          },
          neuralSpriteConfig: neuralSpriteConfig.enable_compression ? neuralSpriteConfig : undefined
        })
      });

      if (!response.body) {
        throw new Error('No response stream available');
      }

      // Connect to SSE stream
      eventSource = new EventSource(`/api/evidence/process/stream?evidenceId=${evidenceId}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection_established') {
            console.log('🔗 Streaming connection established for', evidenceId);
            return;
          }

          // Update client state based on server state
          if (data.currentState && data.context) {
            updateClientFromServer(data);
          }
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        actor.send({ type: 'ANALYSIS_ERROR', error: 'Connection lost' });
        disconnectStream();
      };

    } catch (error) {
      console.error('Failed to start processing:', error);
      actor.send({ type: 'ANALYSIS_ERROR', error: error.message });
    }
  }

  function updateClientFromServer(serverData: any) {
    const { currentState: serverState, context: serverContext } = serverData;

    // Sync client state with server state
    if (serverState !== currentState.value) {
      // Map server events to client events based on state transitions
      if (serverState === 'analyzing' && !currentState.matches('analyzing')) {
        actor.send({ type: 'START_ANALYSIS' });
      }

      // Update context with server context
      currentState = { ...currentState, context: { ...serverContext } };
    }
  }

  function disconnectStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  async function cancelProcessing() {
    try {
      await fetch(`/api/evidence/process/stream?evidenceId=${evidenceId}`, {
        method: 'DELETE'
      });

      actor.send({ type: 'CANCEL_PROCESSING' });
      disconnectStream();
    } catch (error) {
      console.error('Failed to cancel processing:', error);
    }
  }

  async function retryProcessing() {
    actor.send({ type: 'RETRY_CURRENT_STEP' });
    if (selectedFile) {
      setTimeout(() => startProcessing(), 500);
    }
  }

  function resetWorkflow() {
    actor.send({ type: 'RESET' });
    selectedFile = null;
    disconnectStream();
  }
</script>

<Card class="w-full max-w-4xl mx-auto">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      🏛️ Legal Evidence Processing Workflow
      <span class="text-sm font-normal text-gray-600">
        {evidenceId}
      </span>
    </CardTitle>
    <p class="text-sm text-gray-600">
      Real-time streaming workflow with Neural Sprite optimization and portable artifact generation
    </p>
  </CardHeader>

  <CardContent class="space-y-6">
    <!-- File Upload Section -->
    {#if !selectedFile && !isProcessing && !isCompleted}
      <div
        role="button"
        tabindex="0"
        aria-label="Drop files here to upload or click to select files"
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
        ondrop={handleFileDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
      >
        <div class="space-y-4">
          <div class="text-4xl">📄</div>
          <div>
            <h3 class="text-lg font-medium">Upload Legal Evidence</h3>
            <p class="text-sm text-gray-600 mt-1">
              Drag and drop a file here, or click to select
            </p>
          </div>
          <input
            type="file"
            onchange={handleFileSelect}
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload">
            <Button variant="outline" class="cursor-pointer bits-btn bits-btn">
              Choose File
            </Button>
          </label>
        </div>
      </div>
    {/if}

    <!-- Selected File Display -->
    {#if selectedFile}
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="text-2xl">📄</div>
          <div>
            <div class="font-medium">{selectedFile.name}</div>
            <div class="text-sm text-gray-600">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
            </div>
          </div>
        </div>

        {#if !isProcessing && !isCompleted}
          <Button class="bits-btn" onclick={resetWorkflow} variant="outline" size="sm">
            Change File
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Neural Sprite Configuration -->
    {#if selectedFile && !isProcessing && !isCompleted}
      <div class="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <div class="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="enable-neural-sprite"
            bind:checked={neuralSpriteConfig.enable_compression}
            class="rounded"
          />
          <label for="enable-neural-sprite" class="text-sm font-medium">
            🧬 Enable Neural Sprite Optimization
          </label>
          <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            ADVANCED
          </span>
        </div>

        {#if neuralSpriteConfig.enable_compression}
          <div class="space-y-3 ml-6 border-l-2 border-purple-200 pl-4">
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600 w-32">Compression:</label>
              <input
                type="range"
                min="10"
                max="100"
                bind:value={neuralSpriteConfig.target_compression_ratio}
                class="flex-1"
              />
              <span class="text-sm font-mono w-12 text-center">
                {neuralSpriteConfig.target_compression_ratio}:1
              </span>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600 w-32">Pred. Frames:</label>
              <input
                type="range"
                min="0"
                max="10"
                bind:value={neuralSpriteConfig.predictive_frames}
                class="flex-1"
              />
              <span class="text-sm font-mono w-12 text-center">
                {neuralSpriteConfig.predictive_frames}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="ui-layout-compression"
                bind:checked={neuralSpriteConfig.ui_layout_compression}
                class="rounded"
              />
              <label for="ui-layout-compression" class="text-sm">
                UI Layout Compression Demo
              </label>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Processing Controls -->
    {#if selectedFile && !isProcessing && !isCompleted && !hasError}
      <div class="flex justify-center">
        <Button onclick={startProcessing} class="px-8 py-3 bits-btn bits-btn">
          🚀 Start Processing Workflow
        </Button>
      </div>
    {/if}

    <!-- Processing Progress -->
    {#if isProcessing}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-medium">Processing Evidence</h3>
          <span class="text-sm text-gray-600">{progress}% Complete</span>
        </div>

        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {progress}%"
          ></div>
        </div>

        <!-- Current Step Display -->
        <div class="space-y-2">
          {#each (currentState.context.streamingUpdates || []) as update}
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                {#if update.status === 'completed'}
                  <span class="text-green-600">✅</span>
                {:else if update.status === 'in_progress'}
                  <div class="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                {:else if update.status === 'error'}
                  <span class="text-red-600">❌</span>
                {:else}
                  <span class="text-gray-400">⏳</span>
                {/if}
                <span class="capitalize">{update.step.replace('_', ' ')}</span>
              </div>
              <div class="flex items-center gap-2">
                {#if update.status === 'in_progress'}
                  <span>{update.progress}%</span>
                {/if}
                <span class="text-gray-500">{update.message}</span>
              </div>
            </div>
          {/each}
        </div>

        {#if canCancel}
          <div class="flex justify-center">
            <Button class="bits-btn" onclick={cancelProcessing} variant="outline">
              Cancel Processing
            </Button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Error State -->
    {#if hasError}
      <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-red-600">⚠️</span>
          <h3 class="font-medium text-red-800">Processing Error</h3>
        </div>
        <div class="space-y-1">
          {#each (currentState.context.errors || []) as error}
            <p class="text-sm text-red-700">{error}</p>
          {/each}
        </div>
        <div class="flex gap-2 mt-3">
          <Button class="bits-btn" onclick={retryProcessing} variant="outline" size="sm">
            Retry
          </Button>
          <Button class="bits-btn" onclick={resetWorkflow} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </div>
    {/if}

    <!-- Completion State -->
    {#if isCompleted}
      <div class="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div class="text-center space-y-4">
          <div class="text-4xl">🎉</div>
          <h3 class="text-lg font-medium text-green-800">Processing Complete!</h3>
          <p class="text-sm text-green-700">
            Evidence processed successfully in {Math.round((currentState.context.processingTimeMs || 0) / 1000)}s
          </p>

          <!-- Results Display -->
          {#if currentState.context.portableArtifact}
            <div class="space-y-3">
              <div class="flex items-center justify-center gap-4">
                <Button class="bits-btn px-4 py-2"
                  onclick={() => window.open(currentState.context.portableArtifact?.enhancedPngUrl, '_blank')}
                >
                  📦 Download Portable Artifact
                </Button>

                {#if currentState.context.minioStorage}
                  <Button class="bits-btn"
                    onclick={() => window.open(currentState.context.minioStorage?.storageUrl, '_blank')}
                    variant="outline"
                  >
                    🗄️ View in Archive
                  </Button>
                {/if}
              </div>

              <!-- Neural Sprite Results -->
              {#if currentState.context.portableArtifact?.compressionRatio}
                <div class="text-sm text-gray-600">
                  Neural Sprite Compression: {currentState.context.portableArtifact.compressionRatio}:1 ratio
                </div>
              {/if}
            </div>
          {/if}

          <Button class="bits-btn" onclick={resetWorkflow} variant="outline">
            Process Another Evidence
          </Button>
        </div>
      </div>
    {/if}

    <!-- Cancelled State -->
    {#if isCancelled}
      <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <div class="space-y-2">
          <span class="text-2xl">⏸️</span>
          <h3 class="font-medium text-yellow-800">Processing Cancelled</h3>
          <p class="text-sm text-yellow-700">Workflow was cancelled by user</p>
          <Button class="bits-btn" onclick={resetWorkflow} variant="outline" size="sm">
            Start New Workflow
          </Button>
        </div>
      </div>
    {/if}
  </CardContent>
</Card>
