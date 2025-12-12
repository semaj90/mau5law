<!-- src/routes/admin/rag-health/+page.svelte -->

<script lang="ts">
  import type { RagHealthResponse } from '$lib/server/rag/rag-types';

  let data: RagHealthResponse | null = null;
  let err = '';
  let loading = false;

  async function load() {
    loading = true;
    err = '';

    try {
      const r = await fetch('/api/admin/rag-health');
      if (!r.ok) {
        err = await r.text();
        return;
      }
      data = await r.json();
    } catch (error) {
      err = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  // Load data on component mount
  load();

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  }

  function getHealthPercentage(): number {
    if (!data?.global) return 0;
    const { total_chunks, indexed_chunks } = data.global;
    return total_chunks > 0 ? Math.round((indexed_chunks / total_chunks) * 100) : 0;
  }
</script>

<svelte:head>
  <title>RAG Health Dashboard</title>
</svelte:head>

<div class="container">
  <header>
    <h1>RAG Health Dashboard</h1>
    <button on:click={load} disabled={loading} class="refresh-btn">
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </header>

  {#if err}
    <div class="error">
      <h3>Error</h3>
      <pre>{err}</pre>
    </div>
  {:else if data}
    <div class="dashboard">
      <!-- Global Health Section -->
      <section class="global-health">
        <h2>Global Health</h2>
        <div class="metrics">
          <div class="metric">
            <span class="label">Total Chunks:</span>
            <span class="value">{data.global.total_chunks.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="label">Indexed Chunks:</span>
            <span class="value">{data.global.indexed_chunks.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="label">Missing Index:</span>
            <span class="value">{data.global.missing_index_rows.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="label">Last Indexed:</span>
            <span class="value">{formatDate(data.global.last_indexed_at)}</span>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-label">
            Indexing Progress: {getHealthPercentage()}%
          </div>
          <progress
            max={data.global.total_chunks}
            value={data.global.indexed_chunks}
            class="health-progress"
          ></progress>
        </div>
      </section>

      <!-- Per-Document Health Section -->
      <section class="per-doc-health">
        <h2>Per Document Status (Worst First)</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Expected Chunks</th>
                <th>Indexed</th>
                <th>Last Indexed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each data.perDoc as row}
                {@const isComplete = row.chunk_count && row.indexed_chunks >= row.chunk_count}
                <tr class:incomplete={!isComplete}>
                  <td class="filename">{row.filename}</td>
                  <td>{row.chunk_count ?? 'Unknown'}</td>
                  <td>{row.indexed_chunks}</td>
                  <td>{formatDate(row.last_indexed_at)}</td>
                  <td>
                    <span class="status" class:complete={isComplete} class:incomplete={!isComplete}>
                      {isComplete ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Failed Chunks Section -->
      {#if data.failedChunks.length > 0}
        <section class="failed-chunks">
          <h2>Failed Chunks Sample ({data.failedChunks.length} shown)</h2>
          <div class="failed-list">
            {#each data.failedChunks as chunk}
              <div class="failed-item">
                <strong>{chunk.filename}</strong>
                — Page {chunk.page_number ?? '?'}
                — Chunk {chunk.chunk_id.slice(0, 8)}...
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {:else if loading}
    <div class="loading">Loading health data...</div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    margin: 0;
    color: #333;
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #005a9e;
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #fee;
    border: 1px solid #fcc;
    padding: 1rem;
    border-radius: 4px margin-bottom: 1rem;
  }

  .error h3 {
    margin-top: 0;
    color: #c33;
  }

  .error pre {
    white-space: pre-wrap;
    font-size: 0.9rem;
  }

  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .global-health {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }

  .label {
    font-weight: 500;
    color: #495057;
  }

  .value {
    font-weight: 600;
    color: #212529;
  }

  .progress-section {
    margin-top: 1rem;
  }

  .progress-label {
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #495057;
  }

  .health-progress {
    width: 100%;
    height: 20px;
  }

  .per-doc-health {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    overflow: hidden;
  }

  .per-doc-health h2 {
    margin: 0;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
  }

  th {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057;
  }

  .filename {
    font-family: monospace;
    font-size: 0.9rem;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr.incomplete {
    background: #fff3cd;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .status.complete {
    background: #d4edda;
    color: #155724;
  }

  .status.incomplete {
    background: #f8d7da;
    color: #721c24;
  }

  .failed-chunks {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .failed-chunks h2 {
    margin-top: 0;
    color: #856404;
  }

  .failed-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .failed-item {
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: monospace;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6c757d;
  }

  h2 {
    margin-bottom: 1rem;
    color: #333;
  }
</style>