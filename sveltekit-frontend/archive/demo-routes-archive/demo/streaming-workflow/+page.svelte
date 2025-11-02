<script lang="ts">
  import 'nes.css/css/nes.min.css';
  /**
   * Streaming Workflow Demo Page
   *
   * Demonstrates the complete integrated system:
   * - xState workflow orchestration
   * - Real-time SSE streaming
   * - Neural Sprite + PNG embedding
   * - MinIO artifact storage
   */

  import EvidenceProcessingWorkflow from '$lib/components/evidence/EvidenceProcessingWorkflow.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button
  } from '$lib/components/ui/enhanced-bits';
  import { onMount } from 'svelte';

  // Demo state
  let activeSessions = $state<any[]>([]);
  let selectedDemo = $state<'single' | 'multiple' | 'dashboard'>('single');
  let autoRefresh = $state(true);
  let refreshInterval: NodeJS.Timeout | null = null;

  onMount(() => {
    loadActiveSessions();

    if (autoRefresh) {
      refreshInterval = setInterval(loadActiveSessions, 2000);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  async function loadActiveSessions() {
    try {
      const response = await fetch('/api/evidence/process/stream');
      const data = await response.json();
      activeSessions = data.sessions || [];
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    }
  }

  function handleWorkflowCompleted(result: unknown) {
    console.log('Workflow completed:', result);
    loadActiveSessions();
  }

  function handleWorkflowError(error: string) {
    console.error('Workflow error:', error);
  }

  async function cancelSession(evidenceId: string) {
    try {
      await fetch(`/api/evidence/process/stream?evidenceId=${evidenceId}`, {
        method: 'DELETE'
      });
      loadActiveSessions();
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  function getStateEmoji(state: string): string {
    const stateEmojis: Record<string string> = {
      'idle': '⏸️',
      'uploading': '📤',
      'analyzing': '🔍',
      'generatingGlyph': '🎨',
      'embeddingPNG': '📦',
      'storingInMinIO': '🗄️',
      'completed': '✅',
      'error': '❌',
      'cancelled': '⏹️'
    };
    return stateEmojis[state] || '❓';
  }
</script>

<svelte:head>
  <title>Streaming Legal Evidence Processing | YoRHa Legal AI</title>
  <meta name="description" content="Real-time streaming workflow demo with Neural Sprite optimization and portable artifacts">
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
  <div class="text-center space-y-2">
    <h1 class="text-3xl font-bold">🏛️ Streaming Legal Evidence Processing</h1>
    <p class="text-gray-600 max-w-2xl mx-auto">
      Real-time workflow orchestration with xState, Neural Sprite compression, PNG metadata embedding,
      and MinIO artifact storage. Complete D-phase integration demonstration.
    </p>
  </div>

  <!-- Demo Mode Selector -->
  <div class="flex justify-center">
    <div class="flex gap-2 p-1 bg-gray-100 rounded-lg">
      <Button class="bits-btn"
        variant={selectedDemo === 'single' ? 'default' : 'ghost'}
        size="sm"
        onclick={() =>
selectedDemo = 'single'}
      >
        Single Workflow
</Button>
      <Button class="bits-btn"
        variant={selectedDemo === 'multiple' ? 'default' : 'ghost'}
        size="sm"
        onclick={() =>
selectedDemo = 'multiple'}
      >
        Multiple Sessions
</Button>
      <Button class="bits-btn"
        variant={selectedDemo === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onclick={() =>
selectedDemo = 'dashboard'}
      >
        Live Dashboard
</Button>
    </div>
  </div>

  {#if selectedDemo === 'single'}
    <!-- Single Workflow Demo -->
    <div class="max-w-4xl mx-auto">
      <EvidenceProcessingWorkflow
        evidenceId={`demo_${Date.now()}`}
        neuralSpriteEnabled={true}
        onCompleted={handleWorkflowCompleted}
        onError={handleWorkflowError}
      />
    </div>

  {:else if selectedDemo === 'multiple'}
    <!-- Multiple Sessions Demo -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <EvidenceProcessingWorkflow
        evidenceId={`workflow_a_${Date.now()}`}
        neuralSpriteEnabled={true}
        onCompleted={handleWorkflowCompleted}
        onError={handleWorkflowError}
      />
      <EvidenceProcessingWorkflow
        evidenceId={`workflow_b_${Date.now()}`}
        neuralSpriteEnabled={false}
        onCompleted={handleWorkflowCompleted}
        onError={handleWorkflowError}
      />
    </div>

  {:else if selectedDemo === 'dashboard'}
    <!-- Live Dashboard -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Active Sessions Monitor -->
      <div class="lg:col-span-2">
        <div class="nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary flex items-center justify-between">
              📊 Active Processing Sessions
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  bind:checked={autoRefresh}
                  class="rounded"
                />
                <label for="auto-refresh" class="text-sm font-normal">
                  Auto-refresh
                </label>
                <Button class="bits-btn" onclick={loadActiveSessions} variant="outline" size="sm">
Refresh
</Button>
              </div>
            </h3>
          </div>

          <div class="yorha-panel-content">
            {#if activeSessions.length === 0}
              <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">📭</div>
                <p>No active processing sessions</p>
                <p class="text-sm">Start a workflow to see real-time monitoring</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each activeSessions as session}
                  <div class="flex items-center justify-between p-3 border rounded-lg">
                    <div class="flex items-center gap-3">
                      <div class="text-2xl">
                        {getStateEmoji(session.currentState)}
                      </div>
                      <div>
                        <div class="font-medium">
                          {session.evidenceId}
                        </div>
                        <div class="text-sm text-gray-600">
                          {session.currentState} • {session.progress}% • {formatDuration(session.duration)}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <div class="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          class="bg-blue-600 h-2 rounded-full transition-all"
                          style="width: {session.progress}%"
                        ></div>
                      </div>
                      <Button class="bits-btn"
                        onclick={() =>
cancelSession(session.evidenceId)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
</Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Quick Start Panel -->
      <div>
        <div class="nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">🚀 Quick Start</h3>
          </div>

          <div class="yorha-panel-content space-y-4">
            <p class="text-sm text-gray-600">
              Launch new evidence processing workflows with different configurations
            </p>

            <div class="space-y-2">
              <Button class="bits-btn w-full justify-start"
                onclick={() =>
selectedDemo = 'single'}
                variant="outline"
              >
                🧬 Neural Sprite Workflow
</Button>

              <Button class="bits-btn w-full justify-start"
                onclick={() =>
selectedDemo = 'multiple'}
                variant="outline"
              >
                ⚡ Parallel Processing
</Button>
            </div>

            <div class="border-t pt-4">
              <h4 class="font-medium mb-2">System Status</h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Active Sessions:</span>
                  <span class="font-mono">{activeSessions.length}</span>
                </div>
                <div class="flex justify-between">
                  <span>Neural Sprite:</span>
                  <span class="text-green-600">✅ Available</span>
                </div>
                <div class="flex justify-between">
                  <span>PNG Embedding:</span>
                  <span class="text-green-600">✅ Active</span>
                </div>
                <div class="flex justify-between">
                  <span>MinIO Storage:</span>
                  <span class="text-green-600">✅ Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature Showcase -->
        <div class="mt-4 nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">🌟 D-Phase Features</h3>
          </div>

          <div class="yorha-panel-content">
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-green-600">✅</span>
                <div>
                  <div class="font-medium">xState Orchestration</div>
                  <div class="text-gray-600">Complete workflow state management</div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="text-green-600">✅</span>
                <div>
                  <div class="font-medium">Real-time SSE Streaming</div>
                  <div class="text-gray-600">Live progress updates via Server-Sent Events</div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="text-green-600">✅</span>
                <div>
                  <div class="font-medium">Neural Sprite Integration</div>
                  <div class="text-gray-600">AI-powered tensor compression & optimization</div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="text-green-600">✅</span>
                <div>
                  <div class="font-medium">Portable PNG Artifacts</div>
                  <div class="text-gray-600">Self-contained evidence with embedded metadata</div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="text-green-600">✅</span>
                <div>
                  <div class="font-medium">MinIO Cloud Storage</div>
                  <div class="text-gray-600">Scalable artifact storage & indexing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Technical Details -->
  <div class="max-w-4xl mx-auto nes-container">
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary">🔧 Technical Architecture</h3>
    </div>

    <div class="yorha-panel-content">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div class="space-y-2">
          <h4 class="font-medium text-purple-600">🎭 Frontend (Svelte 5)</h4>
          <ul class="space-y-1 text-gray-600">
            <li>• xState v5 actors</li>
            <li>• SSE streaming client</li>
            <li>• Reactive state management</li>
            <li>• Real-time UI updates</li>
          </ul>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-blue-600">🚀 Backend (SvelteKit)</h4>
          <ul class="space-y-1 text-gray-600">
            <li>• Streaming API routes</li>
            <li>• SSE event broadcasting</li>
            <li>• Workflow orchestration</li>
            <li>• Session management</li>
          </ul>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-green-600">🧬 Processing Pipeline</h4>
          <ul class="space-y-1 text-gray-600">
            <li>• Neural Sprite compression</li>
            <li>• Glyph diffusion generation</li>
            <li>• PNG metadata embedding</li>
            <li>• Portable artifact creation</li>
          </ul>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-orange-600">🗄️ Storage & Indexing</h4>
          <ul class="space-y-1 text-gray-600">
            <li>• MinIO object storage</li>
            <li>• PostgreSQL JSONB indexing</li>
            <li>• Full-text search</li>
            <li>• Artifact retrieval</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
