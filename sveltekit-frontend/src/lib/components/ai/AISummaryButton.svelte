<script lang="ts">
  interface Props {
    text?: string;
    onsummary?: () => void;
  }

  // Receive props (Svelte 5 runes)
  let { text = "", onsummary }: Props = $props();

  let summary = $state("");
  let loading = $state(false);

  async function getSummary(input: string) {
    if (!input) return;
    try {
      loading = true;
      const res = await fetch("/api/ai/ollama-gemma3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Summarize: ${input}` })
      });
      const data = await res.json();
      summary = data.response ?? "";
      onsummary?.();
    } catch (e) {
      console.error("Summary failed", e);
    } finally {
      loading = false;
    }
  }
</script>

<button
  class="space-y-4"
  onclick={() => getSummary(text)}
  disabled={loading}
>
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

