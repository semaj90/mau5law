<script lang="ts">
  import Sidebar from '$lib/components/laws/Sidebar.svelte';
  import StatuteColumn from '$lib/components/laws/StatuteColumn.svelte';
  import type { PageData } from './$types';

  let { data } = $props<{ data: PageData }>();

  let selectedStatute: any = $state(null);
  let isExplaining = $state(false);

  function handleSelectStatute(statute: any) {
    selectedStatute = statute;
    isExplaining = false;
  }

  async function handleExplain(sectionId: string) {
    try {
      const response = await fetch('/api/chat/explain-statute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          stream: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (selectedStatute) {
          selectedStatute.explanation = result.explanation;
        }
      }
    } catch (error) {
      console.error('Failed to explain statute:', error);
    } finally {
      isExplaining = false;
    }
  }

  function handleViewPDF(title: string) {
    // Open PDF viewer
    window.open(`/api/laws/download-pdf?title=${encodeURIComponent(title)}`, '_blank');
  }

  // Auto-select first statute
  if (!selectedStatute && data.title18.length > 0) {
    selectedStatute = data.title18[0];
  }
</script>

<div class="laws-page">
  <Sidebar {data} onSelectStatute={handleSelectStatute} />

  <main class="columns-container">
    {#if selectedStatute}
      <StatuteColumn
        statute={selectedStatute}
        onExplain={handleExplain}
        onViewPDF={handleViewPDF}
      />
    {:else}
      <div class="empty-state">
        <h2>Select a statute to begin</h2>
        <p>Choose from Title 18 (Crimes) or Title 28 (Judiciary) in the sidebar</p>
      </div>
    {/if}
  </main>

  <aside class="drawer">
    <div class="drawer-content">
      <h3>📊 Statistics</h3>
      <div class="stat-item">
        <span>Total Statutes:</span>
        <strong>{data.stats.totalStatutes}</strong>
      </div>
      <div class="stat-item">
        <span>Title 18:</span>
        <strong>{data.stats.title18Count}</strong>
      </div>
      <div class="stat-item">
        <span>Title 28:</span>
        <strong>{data.stats.title28Count}</strong>
      </div>
    </div>
  </aside>
</div>

<style>
  .laws-page {
    display: contents;
  }

  .columns-container {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background-color: #fff;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    color: #999;
  }

  .empty-state h2 {
    font-family: var(--font-serif);
    color: #1a1a1a;
    margin-bottom: 0.5rem;
  }

  .drawer {
    padding: 1.5rem;
    border-left: 1px dotted #e0e0e0;
    background-color: #fafafa;
    overflow-y: auto;
    min-width: 200px;
  }

  .drawer-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drawer-content h3 {
    font-family: var(--font-serif);
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    padding: 0.5rem;
    border-bottom: 1px dotted #e0e0e0;
  }

  .stat-item span {
    color: #666;
  }

  .stat-item strong {
    color: #0066cc;
    font-family: var(--font-mono);
  }

  @media (max-width: 1024px) {
    .drawer {
      display: none;
    }
  }
</style>
