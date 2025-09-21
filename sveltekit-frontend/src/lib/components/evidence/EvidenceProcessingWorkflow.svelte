
<script lang="ts">
  // Svelte 5 runes are auto-imported

  import 'nes.css/css/nes.min.css';
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
  import { onMount, onDestroy,   } from "svelte";
  import type { IFrame } from '@stomp/stompjs';

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

  // Svelte props (exported)
  interface Props {
    evidenceId?: string;
    autoStart?: boolean;
    neuralSpriteEnabled?: boolean;
    onCompleted?: ((result: unknown) => void) | undefined;
    onError?: ((error: string) => void) | undefined;
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
  }: Props = $props();

  // Events now handled via props in Svelte 5
  // 

  // xState actor for client-side state management
  const actor = createActor(evidenceProcessingMachine);

  // Prepare initial snapshot with safe context access (actor may not have started yet)
  const rawSnapshot = (actor.getSnapshot && (actor.getSnapshot() as any)) || null;
  const initialSnapshot: unknown = rawSnapshot || {
    context: ,
    value: 'idle',
    matches: (_: string) => false
  };

  // Local snapshot (augmented)
  let currentState: EvidenceActorState = {
    ...initialSnapshot,
    context: {
      ...(initialSnapshot.context || ),
      streamingUpdates: initialSnapshot?.context?.streamingUpdates || [],
      errors: initialSnapshot?.context?.errors || [],
      processingTimeMs: initialSnapshot?.context?.processingTimeMs || 0
    }
  } as EvidenceActorState;

  // SSE (existing path)
  let eventSource: EventSource | null = null;

  // ---- RabbitMQ (optional real-time transport) ------------------
  // Requires: npm i @stomp/stompjs and RabbitMQ Web STOMP plugin enabled
  interface RabbitMQConfig {
    url: string;
    exchange: string;
    routingKey: string;
    queue?: string;
  }

  // Enable if runtime provides a WS URL or endpoint hints at amqp
  let useRabbitMQ = !!import.meta.env?.VITE_RABBITMQ_WS_URL || endpoint?.startsWith('amqp');
  let rabbitConfig: RabbitMQConfig = {
    url: import.meta.env.VITE_RABBITMQ_WS_URL || 'ws://localhost:15674/ws',
    exchange: 'evidence.processing',
    routingKey: evidenceId
  };

  let rabbitClient: unknown = null;
  let rabbitSubscription: unknown = null;

  async function connectRabbitMQ() {
    if (!useRabbitMQ || typeof window === 'undefined') return;
    try {
      const { Client } = await import('@stomp/stompjs');
      rabbitClient = new Client({
        brokerURL: rabbitConfig.url,
        reconnectDelay: 4000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => });

      rabbitClient.onConnect = () => {
        const destination = `/exchange/${rabbitConfig.exchange}/${rabbitConfig.routingKey}`;
        rabbitSubscription = rabbitClient.subscribe(destination, (msg: unknown) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.currentState && data.context) {
              updateClientFromServer(data);
            } else if (data.type === 'streaming_update') {
              currentState.context.streamingUpdates = [
                ...(currentState.context.streamingUpdates || []),
                data.payload
              ];
            } else if (data.type === 'error') {
              actor.send({ type: 'ANALYSIS_ERROR', error: data.message || 'RabbitMQ error' });
            }
          } catch (e) {
            console.error('RabbitMQ message parse error', e);
          }
        });
      };

      rabbitClient.onStompError = (frame: IFrame) => {
        actor.send({
          type: 'ANALYSIS_ERROR',
          error: frame.headers['message'] || 'RabbitMQ STOMP error'
        });
      };

      rabbitClient.onWebSocketClose = () => {
        if (!eventSource) {
          console.warn('RabbitMQ closed, falling back to SSE');
          useRabbitMQ = false;
        }
      };

      rabbitClient.activate();
    } catch (e) {
      console.warn('RabbitMQ unavailable, using SSE only:', e);
      useRabbitMQ = false;
    }
  }

  function disconnectRabbitMQ() {
    try {
      rabbitSubscription?.unsubscribe();
      rabbitClient?.deactivate();
    } catch rabbitSubscription = null;
    rabbitClient = null;
  }

  // Kick off RabbitMQ connection early (non-blocking)
  if (typeof window !== 'undefined') {
    queueMicrotask(connectRabbitMQ);
    window.addEventListener('beforeunload', disconnectRabbitMQ);
  }

  // UI state
  let dragOver = false;
  let selectedFile: File | null = null;
  let neuralSpriteConfig = {
    enable_compression: neuralSpriteEnabled,
    predictive_frames: 3,
    ui_layout_compression: false,
    target_compression_ratio: 50
  };

  // Reactive values with safe fallbacks
  // Derived replacements
  let progress = 0;
  let currentStepName: string = 'idle';
  let isProcessing = false;
  let canCancel = false;
  let hasError = false;
  let isCompleted = false;
  let isCancelled = false;

  function recomputeDerived() {
    try {
      progress = getProcessingProgress(currentState.context) || 0;
    } catch { progress = 0; }
    try {
      currentStepName = getCurrentStep(currentState.context) || 'idle';
    } catch { currentStepName = 'idle'; }
    const matches = (s: string) => typeof currentState.matches === 'function' ? currentState.matches(s) : false;
    isProcessing =
      matches('uploading') ||
      matches('analyzing') ||
      matches('generatingGlyph') ||
      matches('embeddingPNG') ||
      matches('storingInMinIO');
    canCancel = isProcessing;
    hasError = matches('error');
    isCompleted = matches('completed');
    isCancelled = matches('cancelled');
  }
  // Initial compute
  recomputeDerived();

  // Initialize actor subscription
  $effect(() => {
    actor.start();

    // Subscribe to state changes
    const subscription = actor.subscribe((state: unknown) => {
      currentState = state as EvidenceActorState;
      recomputeDerived();

      if (typeof currentState.matches === 'function' && currentState.matches('completed')) {
        onCompleted?.(currentState.context);
        onCompleted?.(currentState.context);
        disconnectStream();
      }
      if (typeof currentState.matches === 'function' && currentState.matches('error')) {
        const msg = (currentState.context.errors || []).join(', ');
        onError?.(msg);
        onError?.(msg);
      }
    });

    // Auto-start if enabled
    if (autoStart && selectedFile) {
      startProcessing();
    }

    return () => {
      subscription?.unsubscribe && subscription.unsubscribe();
      disconnectStream();
    };
  });

  onDestroy(() => {
    actor?.stop && actor.stop();
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
      const response = await fetch(endpoint, {
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
      eventSource = new EventSource(`${endpoint}?evidenceId=${encodeURIComponent(evidenceId)}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection_established') {
            console.log('🔗 Streaming connection established for', evidenceId);
            return;
          }

          // Streaming progress update
          if (data.type === 'streaming_update' && data.payload) {
            currentState.context.streamingUpdates = [
              ...(currentState.context.streamingUpdates || []),
              data.payload
            ];
          }

          // Full state sync from server
          if (data.currentState && data.context) {
            updateClientFromServer(data);
          }
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          console.error('Failed to parse SSE data:', e);
        }
      };

      eventSource.onerror = (ev: Event) => {
        console.error('SSE connection error:', ev);
        actor.send({ type: 'ANALYSIS_ERROR', error: 'Connection lost' });
        disconnectStream();
      };
    } catch (err) {
      const message = err instanceof Error ? err.message: String(err);
      console.error('Failed to start processing:', err);
      actor.send({ type: 'ANALYSIS_ERROR', error: message });
    }
  }

  function updateClientFromServer(serverData: unknown) {
    const { currentState: serverState, context: serverContext } = serverData;

    // Sync client state with server state
    if (serverState !== currentState.value) {
      // Map server events to client events based on state transitions
      if (serverState === 'analyzing' && !(currentState.matches && currentState.matches('analyzing'))) {
        actor.send({ type: 'START_ANALYSIS' });
      }

      // Update context with server context
      currentState = { ...currentState, context: { ...serverContext } } as EvidenceActorState;
      recomputeDerived();
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
      await fetch(`${endpoint}?evidenceId=${encodeURIComponent(evidenceId)}`, {
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

  // Helper handlers moved out of markup to avoid inline-expression parsing issues
  function openPortableArtifact() {
    const url = currentState.context.portableArtifact?.enhancedPngUrl;
    if (url) window.open(url, '_blank');
  }

  function openMinioStorage() {
    const url = currentState.context.minioStorage?.storageUrl;
    if (url) window.open(url, '_blank');
  }
</script>

<div class="w-full max-w-4xl mx-auto nes-container">
  <div class="yorha-panel-header">
    <h3 class="nes-text is-primary flex items-center gap-2">
      🏛️ Legal Evidence Processing Workflow
      <span class="text-sm font-normal text-gray-600">
        {evidenceId}
      </span>
    </h3>
    <p class="text-sm text-gray-600">
      Real-time streaming workflow with Neural Sprite optimization and portable artifact generation
    </p>
  </div>

  <div class="yorha-panel-content space-y-6">
    <!-- File Upload Section -->
    {#if !selectedFile && !isProcessing && !isCompleted}
      <div
        role="button"
        tabindex="0"
        aria-label="Drop files here to upload or click to select files"
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300"
        class:border-blue-500={dragOver}
        class:bg-blue-50={dragOver}
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

          <!-- wrap the input inside the label to avoid separate id/for and potential attribute duplication -->
          <label class="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded bg-white border">
            <input
              type="file"
              onchange={handleFileSelect}
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              class="hidden"
            />
            <span class="text-sm">Select a file</span>
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
          <button type="button" class="bits-btn" onclick={resetWorkflow}>
            Change File
          </button>
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
              <label for="compression-ratio" class="text-sm text-gray-600 w-32">Compression:</label>
              <input
                id="compression-ratio"
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
              <label for="predictive-frames" class="text-sm text-gray-600 w-32">Pred. Frames:</label>
              <input
                id="predictive-frames"
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
        <button type="button" onclick={startProcessing} class="px-8 py-3 bits-btn">
          🚀 Start Processing Workflow
        </button>
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
            <button type="button" class="bits-btn" onclick={cancelProcessing}>
              Cancel Processing
            </button>
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
          <button type="button" class="bits-btn" onclick={retryProcessing}>
            Retry
          </button>
          <button type="button" class="bits-btn" onclick={resetWorkflow}>
            Reset
          </button>
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
                <!-- ensure each element has unique attributes and no duplicate handlers -->
                <button
                  type="button"
                  class="bits-btn px-4 py-2"
                  onclick={openPortableArtifact}
                >
                  📦 Download Portable Artifact
                </button>

                {#if currentState.context.minioStorage}
                  <button
                    type="button"
                    class="bits-btn"
                    onclick={openMinioStorage}
                  >
                    🗄️ View in Archive
                  </button>
                {/if}
              </div>

              {#if currentState.context.portableArtifact?.compressionRatio}
                <div class="text-sm text-gray-600">
                  Neural Sprite Compression: {currentState.context.portableArtifact.compressionRatio}:1 ratio
                </div>
              {/if}
            </div>
          {/if}

          <div class="flex justify-center">
            <button type="button" class="bits-btn" onclick={resetWorkflow}>
              Process Another Evidence
            </button>
          </div>
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
          <div class="flex justify-center">
            <button type="button" class="bits-btn" onclick={resetWorkflow}>
              Start New Workflow
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>