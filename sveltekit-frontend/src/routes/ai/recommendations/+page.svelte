<!--
  Recommendations Test Page - Enhanced-Bits Architecture
  Testing the RecommendationEngine with Enhanced-Bits UI components
-->

<script lang="ts">
  import RecommendationEngine from '$lib/components/ai/RecommendationEngine.svelte';
</script>

<svelte:head>
  <title>AI Recommendations - Legal AI Platform</title>
  <meta name="description" content="Intelligent suggestions for case strategy and next actions using Enhanced-Bits architecture" />
</svelte:head>

<div class="page-container">
  <RecommendationEngine />
</div>

<style>
  .page-container {
    min-height: 100vh;
    background: #f8fafc;
  }
</style>