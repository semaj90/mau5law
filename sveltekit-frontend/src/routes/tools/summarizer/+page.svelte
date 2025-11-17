<script lang="ts">
  import { onMount } from 'svelte';
  import LegalDocumentSummarizer from '$lib // TODO: Verify store subscription is correct for Svelte 5/components/ai/LegalDocumentSummarizer.svelte';

  let summarizerRef: any;

  // Type the event payload later; use 'any' for now to resolve compile issues
  function handleSummaryGenerated(event: CustomEvent<any>) {
    console.log('Summary generated:', event.detail);
  }

  // Optional runtime attachment as a fallback (some components emit events only at runtime)
  onMount(() => {
    // guard against undefined ref and provide cleanup
    if (summarizerRef && typeof summarizerRef.$on // TODO: Verify store subscription is correct for Svelte 5 === 'function') {
      const off = summarizerRef.$on // TODO: Verify store subscription is correct for Svelte 5('summaryGenerated', (e: CustomEvent<any>) =>
        handleSummaryGenerated(e)
      );
      return () => off?.();
    }
  });
</script>

<main class="summarizer-page">
  <!-- Use plain HTML wrappers to avoid component prop typing issues and ensure CSS selectors are used -->
  <div class="card summarizer-card">
    <header class="card-header">
      <h2 class="card-title">Legal Document Summarizer</h2>
    </header>

    <section class="card-content">
      <!-- Bind the component reference and rely on the runtime $on // TODO: Verify store subscription is correct for Svelte 5 listener -->
      <LegalDocumentSummarizer bind:this={summarizerRef} />
    </section>
  </div>
</main>

<style>
  .summarizer-page {
    padding: 2rem;
    font-family: sans-serif;
    max-width: 900px;
    margin: 0 auto;
  }

  .summarizer-card {
    margin-top: 2rem;
    background: var(--card-bg, #fff);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    padding: 1rem;
  }

  .card-header {
    margin-bottom: 0.5rem;
  }
  .card-title {
    font-size: 1.25rem;
    margin: 0;
  }
  .card-content {
    padding-top: 0.5rem;
  }
</style>
