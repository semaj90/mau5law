<script lang="ts">
  import { onMount } from 'svelte';
  import { embedText } from '$lib/ai/tensor-client';

  let input = 'Contracts and liabilities in commercial agreements.';
  let result: any = null;
  let error: string | null = null;
  let busy = false;

  async function run() {
    busy = true; error = null; result = null;
    try {
      result = await embedText(input, { simdParse: true });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    // Pre-warm
    setTimeout(() => run(), 50);
  });
</script>

<section class="max-w-3xl mx-auto p-6 space-y-4">
  <h1 class="text-2xl font-bold">Tensor Demo</h1>
  <p class="text-sm opacity-80">Embeds text via /api/ai/tensor then asks the Service Worker to SIMD-parse the tensor.</p>

  <textarea bind:value={input} rows="4" class="w-full p-3 border rounded bg-black/20"></textarea>
  <button class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50" onclick={run} disabled={busy}>
    {busy ? 'Working…' : 'Run'}
  </button>

  {#if error}
    <pre class="text-red-400 whitespace-pre-wrap">{error}</pre>
  {/if}
  {#if result}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h3 class="font-semibold mb-2">Embedding</h3>
        <pre class="text-xs max-h-48 overflow-auto">{JSON.stringify(result.embedding?.slice?.(0, 16))} … ({result.embedding?.length})</pre>
      </div>
      <div>
        <h3 class="font-semibold mb-2">SIMD Meta</h3>
        <pre class="text-xs">{JSON.stringify(result.tensorMeta, null, 2)}</pre>
      </div>
    </div>
  {/if}
</section>

<style>
  :global(body) { background: #0b0d10; color: #e5e7eb; }
  textarea { outline: none; }
  button { outline: none; }
  pre { background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 0.5rem; }
</style>

