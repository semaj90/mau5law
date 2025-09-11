<script lang="ts">
  import { onMount } from 'svelte';
  let items: any[] = $state([]);
  let q = $state('');
  let busy = $state(false);

  async function load(): Promise<void> {
    busy = true;
    try {
      const url = new URL('/api/citations', location.origin);
      if (q) url.searchParams.set('search', q);
      const res = await fetch(url);
      const data = await res.json();
      items = data?.citations || [];
    } catch {
      items = [];
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

<div class="p-6 max-w-4xl mx-auto space-y-4">
  <h1 class="text-2xl font-bold">Citations</h1>
  <div class="flex gap-2">
    <input class="flex-1 border rounded p-2" placeholder="Search citations..." bind:value={q} onkeydown={(e) => e.key==='Enter' && load()} />
  <button class="px-3 py-2 border rounded" onclick={load} disabled={busy}>Search</button>
  </div>
  <ul class="space-y-3">
    {#each items as c}
      <li class="border rounded p-3">
        <div class="text-sm opacity-75">{c.type} — {c.source}</div>
        <div class="font-semibold">{c.title || c.text?.slice(0, 80) || '(untitled)'}{c.title && c.text ? ': ' + c.text.slice(0,120) : ''}</div>
        {#if c.tags?.length}
          <div class="text-xs opacity-80">{c.tags.join(', ')}</div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

