<script lang="ts">
  import { onMount } from 'svelte';

  let stats = $state({ total: 0, pages: 0, endpoints: 0, layouts: 0 });
  let routes = $state<any[]>([]);
  let tagCounts = $state<Record<string, number>>({});
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await fetch('/api/routes/all');
      const data = await res.json();
      stats = data.stats;
      routes = data.routes.slice(0, 50);
      tagCounts = data.stats.byTag;
      loading = false;
    } catch (e) {
      console.error('Failed to load routes:', e);
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Route Discovery Test</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">Route Discovery Test</h1>

  {#if loading}
    <div class="text-center py-8">Loading routes...</div>
  {:else}
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-100 p-4 rounded">
        <div class="text-2xl font-bold text-blue-600">{stats.total}</div>
        <div class="text-sm text-blue-800">Total Routes</div>
      </div>
      <div class="bg-green-100 p-4 rounded">
        <div class="text-2xl font-bold text-green-600">{stats.pages}</div>
        <div class="text-sm text-green-800">Pages</div>
      </div>
      <div class="bg-purple-100 p-4 rounded">
        <div class="text-2xl font-bold text-purple-600">{stats.endpoints}</div>
        <div class="text-sm text-purple-800">API Endpoints</div>
      </div>
      <div class="bg-orange-100 p-4 rounded">
        <div class="text-2xl font-bold text-orange-600">{stats.layouts}</div>
        <div class="text-sm text-orange-800">Layouts</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div>
        <h2 class="text-xl font-semibold mb-4">Sample Routes (first 50)</h2>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each routes as route}
            <div class="p-3 bg-gray-50 rounded border">
              <div class="font-mono text-sm text-blue-600">{route.path}</div>
              <div class="text-xs text-gray-600">
                {route.kind} • {route.tags.join(', ')}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">Tag Distribution</h2>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each Object.entries(tagCounts).sort(([,a], [,b]) => (b as number) - (a as number)) as [tag, count]}
            <div class="flex justify-between p-2 bg-gray-50 rounded">
              <span class="font-mono text-sm">{tag}</span>
              <span class="text-sm font-semibold">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded">
      <h3 class="font-semibold text-green-800">✅ Route Discovery Working!</h3>
      <p class="text-green-700 text-sm mt-1">
        Successfully discovered {stats.total} routes.
      </p>
    </div>
  {/if}

  <div class="mt-4 flex gap-4">
    <a href="/all-routes" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      → View All Routes (Gaming UI)
    </a>
    <a href="/command/routes" class="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
      → NES Command Center
    </a>
  </div>
</div>
