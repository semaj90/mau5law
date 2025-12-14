<script lang="ts">
  import { page } from '$app/stores';
  import '$lib/styles/yorha-ast.css';
  import { onMount } from 'svelte';

  type ASTNode = {
    id: string;
    type: string;
    name: string;
    file: string;
    line: number;
    column: number;
    children: string[];
    imports: string[];
    exports: string[];
    errors: string[];
    deprecated: boolean;
  };

  let routePath = $state($page.url.searchParams.get('route') || '');
  let loading = $state(false);
  let astData = $state<ASTNode[]>([]);
  let selectedNode = $state<ASTNode | null>(null);
  let errorCount = $state(0);
  let deprecatedCount = $state(0);
  let filterType = $state<string>('all');
  let showErrors = $state(false);
  let recommendations = $state<string[]>([]);
  let summary = $state<any>(null);

  let filteredNodes = $derived.by(() => {
    let nodes = astData;

    if (filterType !== 'all') {
      nodes = nodes.filter(n => n.type === filterType);
    }

    if (showErrors) {
      nodes = nodes.filter(n => n.errors.length > 0 || n.deprecated);
    }

    return nodes;
  });

  async function analyzeRoute() {
    if (!routePath) return;

    loading = true;
    try {
      const res = await fetch(`/api/ast/analyze?route=${encodeURIComponent(routePath)}`);
      const data = await res.json();

      astData = data.nodes || [];
      recommendations = data.recommendations || [];
      summary = data.summary || null;
      errorCount = astData.reduce((sum, n) => sum + n.errors.length, 0);
      deprecatedCount = astData.filter(n => n.deprecated).length;
    } catch (e) {
      console.error('Failed to analyze route:', e);
      astData = [];
      recommendations = ['❌ Failed to analyze route. Check console for details.'];
    } finally {
      loading = false;
    }
  }

  function selectNode(node: ASTNode) {
    selectedNode = node;
  }

  function getNodeColor(node: ASTNode): string {
    if (node.errors.length > 0) return '#e76e55';
    if (node.deprecated) return '#f7d51d';
    return '#92cc41';
  }

  onMount(() => {
    if (routePath) {
      analyzeRoute();
    }
  });
</script>

<svelte:head>
  <title>AST ANALYZER - ERROR DETECTION SYSTEM</title>
</svelte:head>

<div class="yorha-page">
  <!-- Header -->
  <header class="yorha-header">
    <div class="header-left">
      <div class="system-label">AST ANALYZER</div>
      <div class="system-subtitle">Error Detection & Migration System</div>
    </div>
    <div class="header-right">
      <div class="status-indicator active">SYSTEM ACTIVE</div>
      <div class="timestamp">{new Date().toLocaleTimeString()}</div>
    </div>
  </header>

  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="nes-container is-rounded with-title">
        <p class="title">Controls</p>

        <!-- Route Input -->
        <div class="control-group">
          <label for="route-input" class="nes-text">Route Path</label>
          <input
            id="route-input"
            type="text"
            class="nes-input"
            bind:value={routePath}
            placeholder="/example/route"
          />
          <button
            type="button"
            class="nes-btn is-primary"
            onclick={analyzeRoute}
            disabled={loading || !routePath}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        <!-- Filters -->
        <div class="control-group">
          <label for="filter-select" class="nes-text">Filter Type</label>
          <div class="nes-select">
            <select id="filter-select" bind:value={filterType}>
              <option value="all">All Nodes</option>
              <option value="component">Components</option>
              <option value="function">Functions</option>
              <option value="variable">Variables</option>
              <option value="import">Imports</option>
              <option value="export">Exports</option>
            </select>
          </div>
        </div>

        <!-- Show Errors Toggle -->
        <div class="control-group">
          <label>
            <input
              type="checkbox"
              class="nes-checkbox"
              bind:checked={showErrors}
            />
            <span>Show Errors Only</span>
          </label>
        </div>

        <!-- Stats -->
        <div class="stats-box">
          <p class="nes-text is-primary">Statistics</p>
          <div class="stat-row">
            <span>Total Nodes</span>
            <span class="nes-text is-success">{astData.length}</span>
          </div>
          <div class="stat-row">
            <span>Errors</span>
            <span class="nes-text is-error">{errorCount}</span>
          </div>
          <div class="stat-row">
            <span>Deprecated</span>
            <span class="nes-text is-warning">{deprecatedCount}</span>
          </div>
          <div class="stat-row">
            <span>Filtered</span>
            <span class="nes-text is-success">{filteredNodes.length}</span>
          </div>
        </div>

        <!-- Recommendations -->
        {#if recommendations.length > 0}
          <div class="recommendations-box">
            <p class="nes-text is-warning">💡 Recommendations</p>
            <div class="recommendations-list">
              {#each recommendations as rec}
                <div class="recommendation-item">
                  {rec}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button
            type="button"
            class="nes-btn is-error btn-small"
            onclick={() => showErrors = true}
          >
            Show Errors
          </button>
          <button
            type="button"
            class="nes-btn btn-small"
            onclick={() => { showErrors = false; filterType = 'all'; }}
          >
            Reset
          </button>
          <a href="/all-routes" class="nes-btn is-warning btn-small">
            Back to Routes
          </a>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      {#if loading}
        <div class="loading-state">
          <i class="nes-icon is-large heart"></i>
          <p class="nes-text is-primary">Analyzing AST...</p>
        </div>
      {:else if astData.length === 0}
        <div class="empty-state">
          <div class="nes-container is-rounded">
            <p class="nes-text is-primary">No AST Data</p>
            <p>Enter a route path and click "Analyze" to view the AST graph.</p>
          </div>
        </div>
      {:else}
        <!-- AST Graph -->
        <div class="ast-graph">
          <div class="graph-header">
            <h2 class="nes-text is-primary">AST Nodes ({filteredNodes.length})</h2>
          </div>

          <div class="nodes-grid">
            {#each filteredNodes as node (node.id)}
              <button
                onclick={() => selectNode(node)}
                class="node-card nes-container is-rounded"
                class:has-errors={node.errors.length > 0}
                class:is-deprecated={node.deprecated}
                class:is-selected={selectedNode?.id === node.id}
              >
                <div class="node-header">
                  <div
                    class="node-indicator"
                    style="background-color: {getNodeColor(node)}"
                  ></div>
                  <span class="node-type">{node.type}</span>
                </div>
                <div class="node-name">{node.name}</div>
                <div class="node-file">{node.file}</div>
                {#if node.errors.length > 0}
                  <div class="node-errors">
                    <i class="nes-icon is-small close"></i>
                    {node.errors.length} error{node.errors.length > 1 ? 's' : ''}
                  </div>
                {/if}
                {#if node.deprecated}
                  <div class="node-deprecated">
                    ⚠️ Deprecated
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<!-- Node Details Modal -->
{#if selectedNode}
  <div class="modal-overlay" onclick={() => selectedNode = null}>
    <div class="modal-content nes-container is-rounded" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="nes-text is-primary">{selectedNode.name}</h3>
        <button
          type="button"
          class="nes-btn is-error"
          onclick={() => selectedNode = null}
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <!-- Basic Info -->
        <div class="info-section">
          <p class="info-label">Type:</p>
          <p class="info-value">{selectedNode.type}</p>
        </div>

        <div class="info-section">
          <p class="info-label">File:</p>
          <p class="info-value">{selectedNode.file}</p>
        </div>

        <div class="info-section">
          <p class="info-label">Location:</p>
          <p class="info-value">Line {selectedNode.line}, Column {selectedNode.column}</p>
        </div>

        <!-- Imports -->
        {#if selectedNode.imports.length > 0}
          <div class="info-section">
            <p class="info-label">Imports:</p>
            <div class="imports-list">
              {#each selectedNode.imports as imp}
                <span class="nes-badge is-primary">
                  <span>{imp}</span>
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Exports -->
        {#if selectedNode.exports.length > 0}
          <div class="info-section">
            <p class="info-label">Exports:</p>
            <div class="exports-list">
              {#each selectedNode.exports as exp}
                <span class="nes-badge is-success">
                  <span>{exp}</span>
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Errors -->
        {#if selectedNode.errors.length > 0}
          <div class="info-section">
            <p class="info-label nes-text is-error">Errors:</p>
            <div class="errors-list">
              {#each selectedNode.errors as error}
                <div class="nes-container is-rounded error-item">
                  <i class="nes-icon is-small close"></i>
                  {error}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Deprecated Warning -->
        {#if selectedNode.deprecated}
          <div class="nes-container is-rounded is-warning">
            <p class="nes-text is-warning">⚠️ This node uses deprecated APIs</p>
            <p>Consider updating to use Svelte 5 runes and Bits-UI v2</p>
          </div>
        {/if}

        <!-- Children -->
        {#if selectedNode.children.length > 0}
          <div class="info-section">
            <p class="info-label">Children ({selectedNode.children.length}):</p>
            <div class="children-list">
              {#each selectedNode.children as childId}
                <button
                  type="button"
                  class="child-btn"
                  onclick={() => {
                    const child = astData.find(n => n.id === childId);
                    if (child) selectedNode = child;
                  }}
                >
                  {childId}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(135deg, #209cee 0%, #667eea 100%);
    padding: 2rem;
  }

  .header-section {
    margin-bottom: 2rem;
  }

  .subtitle {
    margin-top: 0.5rem;
    opacity: 0.8;
    font-size: 0.875rem;
  }

  .main-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 2rem;
  }

  .sidebar {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .control-group {
    margin-bottom: 1.5rem;
  }

  .control-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .control-group button {
    width: 100%;
    margin-top: 0.5rem;
  }

  .stats-box {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #000;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
  }

  .recommendations-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #fff3cd;
    border: 2px solid #f7d51d;
  }

  .recommendations-list {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recommendation-item {
    font-size: 0.75rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #000;
    line-height: 1.4;
  }

  .quick-actions {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-small {
    font-size: 0.75rem;
    padding: 0.5rem;
  }

  .loading-state,
  .empty-state {
    text-align: center;
    padding: 4rem;
  }

  .loading-state i {
    margin-bottom: 1rem;
  }

  .ast-graph {
    background: white;
    border: 4px solid #000;
    padding: 1.5rem;
  }

  .graph-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #000;
  }

  .nodes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .node-card {
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
  }

  .node-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .node-card.is-selected {
    border-color: #209cee;
    box-shadow: 0 0 0 2px #209cee;
  }

  .node-card.has-errors {
    border-color: #e76e55;
  }

  .node-card.is-deprecated {
    border-color: #f7d51d;
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .node-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .node-type {
    font-size: 0.75rem;
    opacity: 0.7;
    text-transform: uppercase;
  }

  .node-name {
    font-weight: bold;
    margin-bottom: 0.25rem;
    word-break: break-word;
  }

  .node-file {
    font-size: 0.75rem;
    opacity: 0.6;
    margin-bottom: 0.5rem;
  }

  .node-errors,
  .node-deprecated {
    font-size: 0.75rem;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: #f0f0f0;
  }

  .node-errors {
    color: #e76e55;
  }

  .node-deprecated {
    color: #f7d51d;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .modal-content {
    max-width: 800px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    background: white;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #000;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .info-section {
    padding: 0.75rem;
    background: #f7f7f7;
    border: 2px solid #000;
  }

  .info-label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .info-value {
    margin: 0;
    word-break: break-word;
  }

  .imports-list,
  .exports-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .errors-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-item {
    padding: 0.75rem;
    background: #ffe0e0;
    border-color: #e76e55;
  }

  .children-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .child-btn {
    padding: 0.5rem;
    text-align: left;
    background: white;
    border: 2px solid #000;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .child-btn:hover {
    background: #f0f0f0;
    transform: translateX(4px);
  }

  @media (max-width: 1024px) {
    .main-layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
    }

    .nodes-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }
</style>
