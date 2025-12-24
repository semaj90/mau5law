<!-- @migration-task Error while migrating Svelte code: Unterminated string constant
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unterminated string constant
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unterminated string constant
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unterminated string constant
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
import type { Document } from '$lib/types'; import { onMount } from 'svelte';; let query = $state <string>(''); let results = $state <any[]>([]); let loading = $state <boolean>(false); async function performSearch(): Promise<any> { if (!query.trim()) return; loading = true; try { const response = await fetch('/api/vectors/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, limit: 10 }) }); if (response.ok) { results = await response.json()}
    } catch (error) { console.error('Search error:', error)} finally { loading = false}
'
  }
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
