<script lang="ts">
import type { Document } from '$lib/types'; import { onMount } from 'svelte'; let query = $state<string>(''); let results = $state<any[]>([]); let loading = $state<boolean>(false); async function performSearch(): Promise<any> { if (!query.trim()) return; loading = true; try { const response = await fetch('/api/vectors/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, limit: 10 }) }); if (response.ok) { results = await response.json(); }
    } catch (error) { console.error('Search error:', error); } finally { loading = false; }'
  } </script> <div class="container mx-auto"> <h1 class="text-3xl font-bold">Vector Search</h1> <div class="mb-6"> <input type="text"
      bind:value={ query } onkeydown={e => e.key === 'Enter' && performSearch()} placeholder="Enter search query..."
      class="w-full px-4 py-2 border rounded-lg"
    /> <button onclick={ performSearch } disabled={ loading } class="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg"
    > {loading ? 'Searching...': 'Search'} </button> </div> {#if results.length > 0} <div class="space-y-4"> {#each Array.isArray(results) ? results: [] as result} <div class="p-4 border"> <h3 class="font-semibold">{result.title || 'Document'}</h3> <p class="text-sm text-gray-600">{result.content}</p> <span class="text-xs">Similarity: {result.similarity?.toFixed(4)}</span> </div> {/each} </div> {/if} </div>
