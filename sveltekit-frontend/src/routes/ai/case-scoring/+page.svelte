<!--
  Case Scoring Test Page - Enhanced-Bits Architecture
  Testing the CaseScoringDashboard with Enhanced-Bits UI components
-->

<script lang="ts">
  import CaseScoringDashboard from '$lib/components/ai/CaseScoringDashboard.svelte';
</script>

<svelte:head>
  <title>Case Scoring Dashboard - Legal AI Platform</title>
  <meta name="description" content="AI-powered case analysis and priority scoring dashboard using Enhanced-Bits architecture" />
</svelte:head>

<div class="page-container">
  <CaseScoringDashboard />
</div>

<style>
  .page-container {
    min-height: 100vh;
    background: #f8fafc;
  }
</style>