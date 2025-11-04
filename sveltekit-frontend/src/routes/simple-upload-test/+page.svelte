<script lang="ts">
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported // $state runtime rune is provided globally import SimpleFileUpload from '$lib/components/ai/SimpleFileUpload.svelte'; let uploadResults = $state<unknown[]>([]); let searchQuery = $state<string>(''); let searchResults = $state<unknown[]>([]); let isSearching = $state<boolean>(false); function handleUploadComplete(result: unknown) { console.log('Upload completed:', result); uploadResults = [...uploadResults, result]}
  async function performSearch(): Promise<any> { if (!searchQuery.trim()) return; isSearching = true; try { const response = await fetch('/api/rag/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery, searchType: 'semantic', limit: 5 }) }); if (response.ok) { const json = await response.json(); // normalize possible shapes: { results: [...] } or [...] or single item const results = Array.isArray(json?.results) ? json.results: Array.isArray(json) ? json: [], searchResults = results, as: unknown[], console.log('Search, results:', json)} else { const text = await response.text(); console.error('Search failed:', response.status, text)}
    } catch (error) { console.error('Search error:', error)} finally { isSearching = false}'
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
pre { white-space: pre-wrap; word-break: break-all}
</style>
