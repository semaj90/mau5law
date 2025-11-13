<script lang="ts">
  import { type AISuggestion } from '$lib/evidence-canvas/ai-suggestions-service';
  import type { EvidenceEdge, EvidenceNode } from '$lib/evidence-canvas/case-similarity-service';
  import { CaseSuggestionModal } from '$lib/evidence-canvas/case-suggestion-modal.svelte';
  import { EvidenceCanvas } from '$lib/evidence-canvas/evidence-canvas-core.svelte';
  import { GraphControlPanel } from '$lib/evidence-canvas/graph-control-panel.svelte';
  import { webgpuInitService } from '$lib/evidence-canvas/webgpu-init';
  import { onDestroy, onMount } from 'svelte';

  // Reactive state
  let canvas: EvidenceCanvas;
  let suggestion: AISuggestion | null = null;
  let isLoading = true;
  let error: string | null = null;
  let stats = {
    nodes: 0,
    edges: 0,
    clusters: 0,
    gpuMemory: '0MB',
    processingTime: '0ms'
  };

  // Live update event source
  let eventSource: EventSource | null = null;

  // Control panel state
  let layoutAlgorithm = 'force';
  let showLabels = true;
  let nodeSize = 'adaptive';
  let edgeThreshold = 0.6;

  onMount(async () => {
    try {
      await initializeCanvas();
      await setupLiveUpdates();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize evidence canvas';
      console.error('Evidence canvas initialization failed:', err);
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    if (eventSource) {
      eventSource.close();
    }
  });

  async function initializeCanvas() {
    console.log('🚀 Initializing WebGPU Evidence Canvas...');

    // Initialize WebGPU
    const gpuCapabilities = await webgpuInitService.initialize();
    if (!gpuCapabilities.isSupported) {
      throw new Error('WebGPU not supported. Please use a compatible browser with GPU acceleration.');
    }

    // Fetch evidence data
    const evidenceItems = await fetchEvidence();

    // Analyze case similarity
    const embeddings = await analyzeCaseSimilarity(evidenceItems);

    // Run GPU similarity analysis
    const similarityResults = await runGPUSimilarity(evidenceItems, embeddings);

    // Create nodes and edges
    const { nodes, edges } = createGraphData(evidenceItems, similarityResults);

    // Initialize canvas with data
    await canvas.initialize(nodes, edges);

    // Update stats
    stats = {
      nodes: nodes.length,
      edges: edges.length,
      clusters: similarityResults.clusters?.length || 0,
      gpuMemory: gpuCapabilities.limits?.maxBufferSize ? `${(gpuCapabilities.limits.maxBufferSize / 1024 / 1024).toFixed(0)}MB` : 'Unknown',
      processingTime: `${similarityResults.processingTime || 0}ms`
    };

    console.log('✅ Evidence canvas initialized with', nodes.length, 'nodes and', edges.length, 'edges');
  }

  async function fetchEvidence(): Promise<any[]> {
    // Import dynamically to avoid circular dependencies
    const { fetchEvidence } = await import('$lib/api/evidence');
    return await fetchEvidence();
  }

  async function analyzeCaseSimilarity(items: any[]): Promise<number[][]> {
    // Import dynamically
    const { analyzeCaseSimilarity } = await import('$lib/server/case-similarity');
    return await analyzeCaseSimilarity(items);
  }

  async function runGPUSimilarity(items: any[], embeddings: number[][]): Promise<any> {
    // Import dynamically
    const { runGPUSimilarity } = await import('$lib/webgpu/similarity-gpu');
    return await runGPUSimilarity(items, embeddings);
  }

  function createGraphData(items: any[], similarityResults: any): { nodes: EvidenceNode[], edges: EvidenceEdge[] } {
    const nodes: EvidenceNode[] = items.map((item, i) => ({
      id: item.id || `node_${i}`,
      label: item.title || item.name || `Evidence ${i + 1}`,
      type: item.type || 'evidence',
      x: Math.random() * 1000,
      y: Math.random() * 800,
      size: 20,
      color: getNodeColor(item.type),
      data: item,
      clusterId: similarityResults.clusters?.[i] || null
    }));

    const edges: EvidenceEdge[] = [];
    if (similarityResults.similarityMatrix) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const similarity = similarityResults.similarityMatrix[i][j];
          if (similarity > edgeThreshold) {
            edges.push({
              id: `edge_${i}_${j}`,
              source: nodes[i].id,
              target: nodes[j].id,
              weight: similarity,
              type: similarity > 0.8 ? 'strong' : 'weak'
            });
          }
        }
      }
    }

    return { nodes, edges };
  }

  function getNodeColor(type: string): string {
    const colors = {
      'evidence': '#00ff80',
      'case': '#0080ff',
      'document': '#ff8000',
      'person': '#ff0080',
      'location': '#8000ff',
      'default': '#ffffff'
    };
    return colors[type] || colors.default;
  }

  async function setupLiveUpdates() {
    try {
      eventSource = new EventSource('/agentic/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'patch_applied':
              showToast(`AI applied patch: ${data.summary}`, 'success');
              break;

            case 'cluster_update':
              if (canvas && data.clusterData) {
                canvas.updateClusters(data.clusterData);
                stats.clusters = data.clusterData.length;
              }
              break;

            case 'similarity_alert':
              if (data.similarity > 0.82) {
                showSimilaritySuggestion(data);
              }
              break;

            case 'neo4j_relationship':
              showRelationshipSuggestion(data);
              break;

            case 'ai_pattern':
              showPatternSuggestion(data);
              break;
          }
        } catch (err) {
          console.error('Failed to process live update:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
      };

      console.log('✅ Live updates connected');
    } catch (err) {
      console.warn('⚠️ Live updates not available:', err);
    }
  }

  function showSimilaritySuggestion(data: any) {
    suggestion = {
      id: `similarity_${Date.now()}`,
      type: 'similarity',
      title: 'High Similarity Detected',
      description: `Cases "${data.case1}" and "${data.case2}" show ${Math.round(data.similarity * 100)}% similarity`,
      confidence: data.similarity,
      actions: [
        {
          label: 'View Details',
          action: 'view_similarity',
          data: { case1: data.case1, case2: data.case2 }
        },
        {
          label: 'Merge Cases',
          action: 'merge_cases',
          data: { case1: data.case1, case2: data.case2 }
        }
      ],
      timestamp: new Date()
    };
  }

  function showRelationshipSuggestion(data: any) {
    suggestion = {
      id: `relationship_${Date.now()}`,
      type: 'relationship',
      title: 'New Relationship Discovered',
      description: `Neo4j found connection: ${data.description}`,
      confidence: data.confidence || 0.9,
      actions: [
        {
          label: 'Explore Graph',
          action: 'explore_relationship',
          data: data
        }
      ],
      timestamp: new Date()
    };
  }

  function showPatternSuggestion(data: any) {
    suggestion = {
      id: `pattern_${Date.now()}`,
      type: 'pattern',
      title: 'AI Pattern Detected',
      description: data.description,
      confidence: data.confidence || 0.85,
      actions: [
        {
          label: 'Apply Pattern',
          action: 'apply_pattern',
          data: data
        }
      ],
      timestamp: new Date()
    };
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Simple toast implementation - could be replaced with a proper toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  function handleLayoutChange() {
    if (canvas) {
      canvas.setLayoutAlgorithm(layoutAlgorithm);
    }
  }

  function handleNodeSizeChange() {
    if (canvas) {
      canvas.setNodeSizeMode(nodeSize);
    }
  }

  function handleEdgeThresholdChange() {
    // Recalculate edges based on new threshold
    // This would trigger a re-render with filtered edges
    console.log('Edge threshold changed to:', edgeThreshold);
  }

  function handleSuggestionAction(event: CustomEvent) {
    const { action, data } = event.detail;
    console.log('Suggestion action:', action, data);

    // Handle different action types
    switch (action) {
      case 'view_similarity':
        // Navigate to case comparison view
        break;
      case 'merge_cases':
        // Trigger case merge workflow
        break;
      case 'explore_relationship':
        // Open graph exploration modal
        break;
      case 'apply_pattern':
        // Apply the detected pattern
        break;
    }

    suggestion = null;
  }
</script>

<div class="evidence-canvas-container">
  {#if isLoading}
    <div class="loading-screen">
      <div class="loading-spinner"></div>
      <p>Initializing WebGPU Evidence Canvas...</p>
    </div>
  {:else if error}
    <div class="error-screen">
      <h2>Error Loading Evidence Canvas</h2>
      <p>{error}</p>
      <button on:click={() => window.location.reload()} class="retry-btn">
        Retry
      </button>
    </div>
  {:else}
    <!-- Control Panel -->
    <div class="control-panel">
      <GraphControlPanel
        bind:layoutAlgorithm
        bind:showLabels
        bind:nodeSize
        bind:edgeThreshold
        {stats}
        on:layoutChange={handleLayoutChange}
        on:nodeSizeChange={handleNodeSizeChange}
        on:edgeThresholdChange={handleEdgeThresholdChange}
      />
    </div>

    <!-- Canvas -->
    <div class="canvas-wrapper">
      <EvidenceCanvas bind:this={canvas} />
    </div>

    <!-- AI Suggestion Modal -->
    {#if suggestion}
      <CaseSuggestionModal
        {suggestion}
        on:action={handleSuggestionAction}
        on:close={() => suggestion = null}
      />
    {/if}
  {/if}
</div>

<style>
  .evidence-canvas-container {
    @apply relative w-full h-screen bg-yorha-dark overflow-hidden;
  }

  .loading-screen {
    @apply flex flex-col items-center justify-center h-full text-white;
  }

  .loading-spinner {
    @apply w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin mb-4;
  }

  .error-screen {
    @apply flex flex-col items-center justify-center h-full text-white p-8;
  }

  .error-screen h2 {
    @apply text-2xl text-red-400 mb-4;
  }

  .retry-btn {
    @apply px-6 py-2 bg-neon-green text-black font-bold rounded hover:bg-green-400 transition-colors;
  }

  .control-panel {
    @apply absolute top-4 left-4 z-10;
  }

  .canvas-wrapper {
    @apply w-full h-full;
  }
</style>