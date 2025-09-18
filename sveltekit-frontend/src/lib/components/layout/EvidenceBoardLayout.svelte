<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';

  // Props for customization
  let {
    title = 'LEGAL AI COMMAND CENTER',
    caseInfo = '',
    demoMode = true,
    showGrid = true,
    children,
    rightPanel = undefined
  }: {
    title?: string;
    caseInfo?: string;
    demoMode?: boolean;
    showGrid?: boolean;
    children: any;
    rightPanel?: any;
  } = $props();

  // Connection status (matching Evidence Board)
  let isConnected = $state(false);

  onMount(() => {
    // Simulate connection status
    setTimeout(() => {
      isConnected = false; // Keep as "Demo Mode - Server Not Connected" to match screenshot
    }, 1000);
  });
</script>

<!-- Full Evidence Board Layout -->
<div class="min-h-screen bg-gray-100 relative overflow-hidden">
  <!-- Background Grid Pattern (matching Evidence Board) -->
  {#if showGrid}
    <div class="absolute inset-0 bg-grid-pattern opacity-10"></div>
  {/if}

  <!-- Header Bar (matching Evidence Board header) -->
  <div class="relative z-10 p-4 border-b-2 border-gray-300 bg-white">
    <div class="flex items-center justify-between">
      <!-- Title Section -->
      <div class="flex items-center gap-4">
        <h1 class="nes-text is-primary text-2xl font-bold">{title}</h1>
        {#if caseInfo}
          <div class="nes-badge is-splited">
            <span class="is-dark">Case:</span>
            <span class="is-primary">{caseInfo}</span>
          </div>
        {/if}
      </div>

      <!-- Status Section (matching Evidence Board) -->
      <div class="flex items-center gap-4">
        {#if !isConnected}
          <div class="nes-badge is-error">
            <span>🔸 Demo Mode - Server Not Connected</span>
          </div>
        {:else}
          <div class="nes-badge is-success">
            <span>✅ Connected</span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="relative z-10 flex-1 p-4">
    <div class="flex gap-4 h-full">
      <!-- Main Content Panel -->
      <div class="flex-1">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Right Panel (for status/tasks like Evidence Board) -->
      {#if rightPanel}
        <div class="w-80 flex-shrink-0">
          {@render rightPanel()}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .bg-grid-pattern {
    background-image:
      linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  /* NES.css enhancements for Evidence Board look */
  .nes-container.evidence-panel {
    background: white;
    border: 4px solid #212529;
    border-radius: 8px;
    padding: 1rem;
    position: relative;
  }

  .nes-container.evidence-panel::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%),
                linear-gradient(-45deg, #f8f9fa 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #f8f9fa 75%),
                linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
    background-size: 4px 4px;
    background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
    z-index: -1;
  }

  /* Interactive elements styling */
  .evidence-item {
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    border: 2px solid #ccc;
    border-radius: 0.5rem;
  }

  .evidence-item:hover {
    border-color: #007bff;
    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
    transform: translateY(-2px);
  }

  .evidence-item.active {
    border-color: #28a745;
    background: #f8fff9;
  }

  .evidence-item.pending {
    border-color: #ffc107;
    background: #fffbf0;
  }
</style>