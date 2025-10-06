<script lang="ts">
  import { aiStore } from '../stores/canvas';
  import Dialog from './Dialog.svelte';
  import { Sparkles } from 'lucide-svelte';
  import { onDestroy } from 'svelte';

  let dialogOpen = false;
  let isGenerating = false;

  const unsubscribe = aiStore.subscribe((state) => {
    dialogOpen = !!state?.dialogOpen;
    isGenerating = !!state?.isGenerating;
  });

  onDestroy(unsubscribe);

  function toggleDialog() {
    aiStore.update((state) => ({ ...state, dialogOpen: !state.dialogOpen }));
  }

  function handleAIRequest(event: CustomEvent<any>) {
    // e(vent as CustomEvent).detail contains the payload from the Dialog custom event
    const payload = e(vent as CustomEvent).detail;
    // forward or handle payload via the store
    aiStore.update((state) => ({ ...state, lastRequest: payload }));
  }
</script>

<!-- Floating Action Button -->
<button
  class="ai-fab-button"
  class:generating={isGenerating}
  onclick={toggleDialog}
  aria-label="Open AI Assistant"
  title="AI Assistant"
>
  <span class="fab-glow" aria-hidden="true"></span>
  <span class="fab-icon" aria-hidden="true">
    {#if isGenerating}
      <!-- simple spinner that uses the existing @keyframes spin -->
      <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M22 12a10 10 0 00-10-10" stroke-linecap="round"></path>
      </svg>
    {:else}
      <Sparkles size={24} />
    {/if}
  </span>
</button>
<!-- AI Dialog -->
{#if dialogOpen}
  <Dialog.Root title="AI Assistant" open={dialogOpen} close={toggleDialog} airequest={handleAIRequest} />
{/if}

<style>
  .ai-fab-button {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--pico-primary) 0%, #7c3aed 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    color: white;
    overflow: hidden;
    position: relative;
  }
  .ai-fab-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
  .ai-fab-button:active {
    transform: translateY(-1px) scale(1.02);
  }
  .ai-fab-button.generating {
    animation: pulse 2s infinite;
  }
  .fab-icon {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fab-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .ai-fab-button:hover .fab-glow {
    opacity: 1;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 12px 40px rgba(124, 58, 237, 0.4);
    }
  }
  /* Responsive */
  @media (max-width: 768px) {
    .ai-fab-button {
      bottom: 1.5rem;
      right: 1.5rem;
      width: 56px;
      height: 56px;
    }
    .fab-icon :global(svg) {
      width: 20px;
      height: 20px;
    }
  }
</style>
