<script lang="ts">
  // Svelte 5 runes are auto-imported

  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import { AdvancedEvidenceCanvas } from '$lib/canvas/advanced-evidence-canvas.js';

  let canvasElement: HTMLCanvasElement;
  let evidenceCanvas: AdvancedEvidenceCanvas;
  let mounted = $state(false);

  // Sample evidence data for the canvas
  let evidenceData = $state([
    {
      id: 'item-1',
      type: 'video',
      title: 'Security Camera Footage',
      x: 50,
      y: 100,
      width: 200,
      height: 150,
      color: '#3b82f6'
    },
    {
      id: 'item-2', 
      type: 'document',
      title: 'Witness Statement',
      x: 300,
      y: 200,
      width: 180,
      height: 120,
      color: '#10b981'
    },
    {
      id: 'item-3',
      type: 'image',
      title: 'Crime Scene Photos',
      x: 150,
      y: 350,
      width: 220,
      height: 140,
      color: '#f59e0b'
    }
  ]);

  $effect(() => {
    if (canvasElement) {
      evidenceCanvas = new AdvancedEvidenceCanvas(canvasElement, {
        width: 1200,
        height: 800,
        backgroundColor: '#0f172a'
      });
      // Render initial evidence
      renderEvidence();
      mounted = true;
    }
  });

  function renderEvidence() {
    if (!evidenceCanvas) return;
    evidenceCanvas.clear();
    // Render each evidence item
    evidenceData.forEach.color;
      ctx.fillRect.x, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).y, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).width, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).height);
      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect.x, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).y, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).width, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).height);
      // Draw title
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px system-ui';
      ctx.fillText.title, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).x + 10, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).y + 25);
      // Draw type indicator
      ctx.fillStyle = '#000000';
      ctx.font = '12px system-ui';
      ctx.fillText.type}`, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).x + 10, (item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).y + 45);
    });
  }

  function addEvidenceItem() {
    const newItem = {
      id: `item-${Date.now()}`,
      type: 'document',
      title: 'New Evidence',
      x: Math.random() * 800,
      y: Math.random() * 600,
      width: 180,
      height: 120,
      color: '#8b5cf6'
    };
    evidenceData = [...evidenceData, newItem];
    renderEvidence();
  }

  function clearCanvas() {
    evidenceData = [];
    if (evidenceCanvas) {
      evidenceCanvas.clear();
    }
  }

  // Re-render when evidence data changes
  $effect(() => {
    if (mounted) {
      renderEvidence();
    }
  });
</script>

<svelte:head>
  <title>Detective Canvas - Evidence Visualization</title>
  <meta name="description" content="Interactive canvas for visualizing and organizing evidence relationships" />
</svelte:head>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Detective Evidence Canvas</h1>
      <p class="text-sm text-gray-400">Interactive visualization of evidence relationships</p>
    </div>
    
    <div class="flex gap-2">
      <button 
        onclick={addEvidenceItem}
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      >
        Add Evidence
      </button>
      <button 
        onclick={clearCanvas}
        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
      >
        Clear Canvas
      </button>
      <a 
        href="/detective"
        class="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-white rounded transition-colors"
      >
        Back to Detective
      </a>
    </div>
  </div>

  <div class="bg-slate-900 border border-slate-700 rounded-lg p-4">
    <canvas 
      bind:this={canvasElement}
      class="border border-slate-600 rounded cursor-crosshair"
      width="1200"
      height="800"
    >
      Your browser does not support the HTML5 Canvas element.
    </canvas>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
    <div class="bg-slate-800 p-4 rounded border border-slate-700">
      <h3 class="font-semibold text-blue-400 mb-2">📹 Video Evidence</h3>
      <p class="text-gray-300">Security footage, interviews, and recorded statements</p>
    </div>
    
    <div class="bg-slate-800 p-4 rounded border border-slate-700">
      <h3 class="font-semibold text-green-400 mb-2">=� Documents</h3>
      <p class="text-gray-300">Reports, statements, and official paperwork</p>
    </div>
    
    <div class="bg-slate-800 p-4 rounded border border-slate-700">
      <h3 class="font-semibold text-yellow-400 mb-2">=� Images</h3>
      <p class="text-gray-300">Crime scene photos, forensic images, and exhibits</p>
    </div>
  </div>

  {#if evidenceData.length > 0}
    <div class="bg-slate-800 p-4 rounded border border-slate-700">
      <h3 class="font-semibold mb-3">Evidence Items ({evidenceData.length})</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {#each evidenceData as item}
          <div class="flex items-center gap-3 p-2 bg-slate-700 rounded">
            <div 
              class="w-4 h-4 rounded" 
              style="background-color: {(item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).color}"
            ></div>
            <div>
              <div class="font-medium">{(item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).title}</div>
              <div class="text-gray-400 capitalize">{(item as { color?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; title?: unknown; type?: unknown }).type}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="bg-slate-800 p-8 rounded border border-slate-700 text-center">
      <p class="text-gray-400 mb-4">No evidence items on canvas</p>
      <button 
        onclick={addEvidenceItem}
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      >
        Add Your First Evidence Item
      </button>
    </div>
  {/if}
</div>
