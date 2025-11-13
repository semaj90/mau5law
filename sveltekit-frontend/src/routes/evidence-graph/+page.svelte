<script lang="ts">
  import EvidenceCanvas from "./EvidenceCanvas.svelte";
</script>

<svelte:head>
  <title>Evidence Graph (GPU) - YoRHa Legal AI</title>
  <meta name="description" content="WebGPU-accelerated evidence visualization and case similarity analysis" />
</svelte:head>

<div class="evidence-graph-page">
  <div class="page-header">
    <h1 class="neon-title">⚡ Evidence Graph (GPU)</h1>
    <p class="subtitle">WebGPU-accelerated case similarity analysis and evidence clustering</p>
  </div>

  <EvidenceCanvas />
</div>

<style>
  .evidence-graph-page {
    @apply min-h-screen bg-yorha-dark p-6;
  }

  .page-header {
    @apply mb-8 text-center;
  }

  .neon-title {
    @apply text-4xl font-bold text-neon-green mb-2;
    text-shadow: 0 0 10px rgba(0, 255, 128, 0.5);
  }

  .subtitle {
    @apply text-gray-400 text-lg;
  }
</style>