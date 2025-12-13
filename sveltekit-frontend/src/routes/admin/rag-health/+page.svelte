<script lang="ts">
  import { onMount } from 'svelte';

  interface GlobalStats {
    total_chunks: number;
    indexed_chunks: number;
    missing_index_rows: number;
    last_indexed_at: string | null;
  }

  interface DocStats {
    id: string;
    filename: string;
    chunk_count: number;
    indexed_chunks: number;
    last_indexed_at: string | null;
  }

  interface FailedChunk {
    chunk_id: string;
    filename: string;
    page_number: number | null;
  }

  interface CacheStats {
    available: boolean;
    keyCount: number;
    memoryUsage?: string;
  }

  let global = $state<GlobalStats | null>(null);
  let perDoc = $state<DocStats[]>([]);
  let failedChunks = $state<FailedChunk[]>([]);
  let cache = $state<CacheStats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let lastRefresh = $state<Date | null>(null);

  async function fetchHealth() {
    loading = true;
    error = null;
    try {
      const res = await fetch('/api/admin/rag-health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      global = data.global;
      perDoc = data.perDoc ?? [];
      failedChunks = data.failedChunks ?? [];
      cache = data.cache;
      lastRefresh = new Date();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchHealth();
  });

  function formatDate(d: string | null): string {
    if (!d) return 'Never';
    return new Date(d).toLocaleString();
  }

  function getIndexProgress(): number {
    if (!global || global.total_chunks === 0) return 100;
    return Math.round((global.indexed_chunks / global.total_chunks) * 100);
  }

  function getDocProgress(doc: DocStats): number {
    if (!doc.chunk_count || doc.chunk_count === 0) return 100;
    return Math.round((doc.indexed_chunks / doc.chunk_count) * 100);
  }
</script>

<svelte:head>
  <title>RAG Health Dashboard</title>
</svelte:head>

<div class="p-6 max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">RAG Health Dashboard</h1>
    <button
      onclick={fetchHealth}
      disabled={loading}
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      Error: {error}
    </div>
  {/if}

  {#if lastRefresh}
    <p class="text-sm text-gray-500 mb-4">Last updated: {lastRefresh.toLocaleString()}</p>
  {/if}

  <!-- Global Stats -->
  {#if global}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow border">
        <div class="text-sm text-gray-500">Total Chunks</div>
        <div class="text-2xl font-bold">{global.total_chunks.toLocaleString()}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow border">
        <div class="text-sm text-gray-500">Indexed Chunks</div>
        <div class="text-2xl font-bold text-green-600">{global.indexed_chunks.toLocaleString()}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow border">
        <div class="text-sm text-gray-500">Missing Index</div>
        <div class="text-2xl font-bold text-red-600">{global.missing_index_rows.toLocaleString()}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow border">
        <div class="text-sm text-gray-500">Last Indexed</div>
        <div class="text-lg font-medium">{formatDate(global.last_indexed_at)}</div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="bg-white p-4 rounded-lg shadow border mb-6">
      <div class="flex justify-between mb-2">
        <span class="text-sm font-medium">Indexing Progress</span>
        <span class="text-sm font-medium">{getIndexProgress()}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div
          class="h-4 rounded-full transition-all duration-300"
          class:bg-green-500={getIndexProgress() === 100}
          class:bg-blue-500={getIndexProgress() < 100}
          style="width: {getIndexProgress()}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Cache Stats -->
  {#if cache}
    <div class="bg-white p-4 rounded-lg shadow border mb-6">
      <h2 class="text-lg font-semibold mb-3">Cache Status</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-gray-500">Status</div>
          <div class="font-medium" class:text-green-600={cache.available} class:text-red-600={!cache.available}>
            {cache.available ? 'Available' : 'Unavailable'}
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-500">Cached Keys</div>
          <div class="font-medium">{cache.keyCount}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">Memory Usage</div>
          <div class="font-medium">{cache.memoryUsage ?? 'N/A'}</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Per-Document Breakdown -->
  {#if perDoc.length > 0}
    <div class="bg-white rounded-lg shadow border mb-6">
      <h2 class="text-lg font-semibold p-4 border-b">Per-Document Status</h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Filename</th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Progress</th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Chunks</th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Last Indexed</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each perDoc.slice(0, 50) as doc}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm truncate max-w-xs" title={doc.filename}>{doc.filename}</td>
                <td class="px-4 py-2">
                  <div class="flex items-center gap-2">
                    <div class="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        class="h-2 rounded-full"
                        class:bg-green-500={getDocProgress(doc) === 100}
                        class:bg-yellow-500={getDocProgress(doc) < 100 && getDocProgress(doc) > 0}
                        class:bg-red-500={getDocProgress(doc) === 0}
                        style="width: {getDocProgress(doc)}%"
                      ></div>
                    </div>
                    <span class="text-xs text-gray-500">{getDocProgress(doc)}%</span>
                  </div>
                </td>
                <td class="px-4 py-2 text-sm">{doc.indexed_chunks}/{doc.chunk_count ?? 0}</td>
                <td class="px-4 py-2 text-sm text-gray-500">{formatDate(doc.last_indexed_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if perDoc.length > 50}
        <div class="p-4 text-sm text-gray-500 border-t">
          Showing 50 of {perDoc.length} documents
        </div>
      {/if}
    </div>
  {/if}

  <!-- Failed Chunks -->
  {#if failedChunks.length > 0}
    <div class="bg-white rounded-lg shadow border">
      <h2 class="text-lg font-semibold p-4 border-b text-red-600">Failed Chunks ({failedChunks.length})</h2>
      <div class="overflow-x-auto max-h-64">
        <table class="w-full">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Chunk ID</th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Filename</th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Page</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each failedChunks.slice(0, 100) as chunk}
              <tr class="hover:bg-red-50">
                <td class="px-4 py-2 text-xs font-mono">{chunk.chunk_id}</td>
                <td class="px-4 py-2 text-sm truncate max-w-xs">{chunk.filename}</td>
                <td class="px-4 py-2 text-sm">{chunk.page_number ?? 'N/A'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if loading && !global}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-500">Loading health data...</span>
    </div>
  {/if}
</div>
