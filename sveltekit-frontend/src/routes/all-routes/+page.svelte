<script lang="ts">
  import RoutesList from '../RoutesList.svelte';
  import type { RoutePageData } from './+page.server';
  export let data: RoutePageData;

  const inv = data.routeInventory;
</script>

<svelte:head>
  <title>All Routes - Legal AI Platform</title>
  <meta name="description" content="Browse all available routes and pages in the Legal AI Platform" />
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <h1>All Routes</h1>
    <p>Browse all available pages and features in the Legal AI Platform</p>
  </header>

  <RoutesList />

  {#if inv}
    <section class="inventory-summary">
      <h2>Route Inventory Snapshot</h2>
      <p class="generated">Generated: {new Date(inv.generated).toLocaleString()}</p>
      <div class="counts-grid">
        <div><strong>Config</strong><span>{inv.counts.config}</span></div>
        <div><strong>File-based</strong><span>{inv.counts.fileBased}</span></div>
        <div><strong>API</strong><span>{inv.counts.api}</span></div>
        <div class="warn"><strong>Config Missing File</strong><span>{inv.counts.configMissingFiles}</span></div>
        <div class="warn"><strong>File Missing Config</strong><span>{inv.counts.filesMissingConfig}</span></div>
      </div>
      {#if inv.configMissingFiles.length || inv.filesMissingConfig.length}
        <details class="diff-block" open>
          <summary>Differences</summary>
          {#if inv.configMissingFiles.length}
            <h3>Config routes without page file ({inv.configMissingFiles.length})</h3>
            <ul>
              {#each inv.configMissingFiles as r}<li>{r}</li>{/each}
            </ul>
          {/if}
          {#if inv.filesMissingConfig.length}
            <h3>File-based routes not in config ({inv.filesMissingConfig.length})</h3>
            <ul>
              {#each inv.filesMissingConfig.slice(0,50) as r}<li>{r}</li>{/each}
            </ul>
            {#if inv.filesMissingConfig.length > 50}
              <p class="truncate-note">Showing first 50 of {inv.filesMissingConfig.length}.</p>
            {/if}
          {/if}
        </details>
      {/if}
      <details class="sample" open>
        <summary>Sample File-based Routes (first {inv.fileRoutesSample.length})</summary>
        <ul>
          {#each inv.fileRoutesSample as fr}
            <li>{fr.route}{fr.title ? ` — ${fr.title}` : ''}</li>
          {/each}
        </ul>
      </details>
    </section>
  {/if}
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
  }

  .inventory-summary { margin-top: 3rem; }
  .inventory-summary h2 { font-size: 1.75rem; margin-bottom: 0.75rem; }
  .counts-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 0.75rem; margin: 1rem 0 1.5rem; }
  .counts-grid div { background:#f3f4f6; padding:0.75rem 0.9rem; border-radius:8px; display:flex; flex-direction:column; gap:0.25rem; }
  .counts-grid div span { font-size:1.25rem; font-weight:600; color:#111827; }
  .counts-grid div.warn { background:#fff7ed; border:1px solid #fdba74; }
  details.diff-block, details.sample { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; }
  details.diff-block summary, details.sample summary { cursor:pointer; font-weight:600; }
  details ul { list-style:disc; padding-left:1.25rem; margin:0.5rem 0 1rem; max-height:260px; overflow:auto; }
  .truncate-note { font-size:0.85rem; color:#6b7280; }
  .generated { font-size:0.8rem; color:#6b7280; }
</style>
