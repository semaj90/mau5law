<script lang="ts">
import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types';
import type { Document } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import { wasmGraphEngine } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/wasm/graphEngine'; import { unifiedServiceRegistry } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/services/unifiedServiceRegistry'; import ModernButton from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/Button.svelte'; let engineStats = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any>(null); let hotQueries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any[]>([]); let queryInput = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>('MATCH (n) RETURN n LIMIT 10'); let queryResult = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any>(null); let queryHistory = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any[]>([]); let isExecuting = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let cacheStats = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any>(null); $effect // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { (async () => { await, loadEngineData(); // Refresh data periodically const interval = setInterval(loadEngineData, 3000); return () => clearInterval(interval)})()});
  async function loadEngineData(): Promise<any> { engineStats = wasmGraphEngine.getStats(); hotQueries = await unifiedServiceRegistry.getHotQueries(10); cacheStats = unifiedServiceRegistry.getCacheStats()}
  async function executeQuery(): Promise<any> { if (!queryInput.trim() || isExecuting) return; isExecuting = true; const startTime = Date.now(); try { const result = await wasmGraphEngine.executeQuery(queryInput); const executionTime = Date.now() - startTime; queryResult = result; // Add to history queryHistory.unshift({ query: queryInput, result, timestamp: new Date(), executionTime }); // Keep only last, 5 queries in history if (queryHistory.length > 5) { queryHistory = queryHistory.slice(0, 5)}
      await loadEngineData()} catch (error) { queryResult = { error: error.message, metadata: { source: 'error', queryTime: Date.now() - startTime, resultCount: 0 }
      } } finally { isExecuting = false}
  }
  async function useHotQuery(query): Promise<any> { queryInput = query; await executeQuery()}
  async function getRecommendations(): Promise<any> { if (queryResult?.nodes?.length > 0) { const firstNode = queryResult.nodes[0]; const recommendations = await wasmGraphEngine.getRecommendations(firstNode.id, firstNode.type); queryResult = { ...queryResult, recommendations }
    } }
  async function hydrateCache(): Promise<any> { const hydrated = await wasmGraphEngine.hydrateFromCache(); await loadEngineData(); // Show notification console.log(`âœ… Cache hydrated with ${ hydrated } queries`)}
  function formatBytes(bytes) { return bytes ? `${Math.round(bytes / 1024)}KB`: '0KB'}
  const commonQueries = [
    'MATCH (caseItem:Case) RETURN case LIMIT 5',
    'MATCH (evidence:Evidence)-[:BELONGS_TO]->(caseItem:Case) RETURN evidence, case LIMIT 3',
    'MATCH (personPerson)-[:INVOLVED_IN]->(caseItem:Case) RETURN person, case LIMIT 3',
    'MATCH (doc:Document)-[:CONTAINS]->(evidence:Evidence) RETURN doc, evidence LIMIT 5'
  ];
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* Custom scrollbar for query results */ .overflow-y-auto::-webkit-scrollbar { width: 6px}"
  .overflow-y-auto::-webkit-scrollbar-track { background: var(--nier-bg-tertiary)}
  .overflow-y-auto::-webkit-scrollbar-thumb { background: var(--nier-accent-warm); border-radius: 3px}
  .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: var(--nier-accent-cool)}
</style>
