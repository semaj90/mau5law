<script lang="ts">
import { onMount } from 'svelte'; let query = ''; let results: unknown[] = []; async function searchDocs(): Promise<any> { const resp = await fetch('/api/rag/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); const json = await resp.json(); results = json.results || []}

  onMount(() => { // optional: initialize client worker for embeddings });
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
