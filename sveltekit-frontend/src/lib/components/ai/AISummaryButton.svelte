<!-- Consider wrapping this component in an ErrorBoundary for better error handling -->
<!-- import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'; -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    text?: string;
    onsummary?: () => void;
  }
  // Receive props (Svelte 5 runes)
  let { text = '', onsummary }: Props = $props();
  let summary = $state('');
  let errorMessage = $state('');
  let loading = $state(false);
  async function getSummary(input: string) {
    if (!input) return;
    loading = true;
    errorMessage = '';
    summary = '';
    try {
      const res = await fetch('/api/ai/ollama-gemma3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Summarize: ${input}` }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      summary = data.response ?? '';
      onsummary?.();
    } catch (e) {
      console.error('Summary failed', e);
      if (e instanceof Error) {
        errorMessage = e.message;
      } else {
        errorMessage = 'An unknown error occurred.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<button type="button" aria-label="Get AI summary" class="space-y-4" onclick={() => getSummary(text)} disabled={loading}>
  {#if loading}
    Summarizing...
  {:else}
    Get AI Summary
  {/if}
</button>
{#if summary}
  <div class="space-y-4">
    <div class="space-y-4">AI Summary</div>
    <div>{summary}</div>
  </div>
{/if}
