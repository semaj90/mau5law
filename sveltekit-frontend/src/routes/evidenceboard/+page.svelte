<script lang="ts">
  import EnhancedEvidenceBoard from '$lib/components/evidence/EnhancedEvidenceBoard.svelte';
  import { onMount } from 'svelte';

  let pageLoaded = $state(false);

  onMount(() => {
    pageLoaded = true;
  });
</script>

<svelte:head>
  <title>Evidence Board - Legal AI Assistant</title>
  <meta name="description" content="AI-powered evidence management with Ollama integration" />
</svelte:head>

{#if pageLoaded}
  <EnhancedEvidenceBoard />
{:else}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Loading Evidence Board...</p>
  </div>
{/if}

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f5f5f5;
    color: #666;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e5e5;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
