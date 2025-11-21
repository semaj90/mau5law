<script lang="ts">
  import type { PageData } from '../../routes/laws/$types';

  let { data, onSelectStatute } = $props<{
    data: PageData;
    onSelectStatute: (statute: any) => void;
  }>();

  let expandedTitle: string | null = $state(null);

  function toggleTitle(title: string) {
    expandedTitle = expandedTitle === title ? null : title;
  }
</script>

<nav class="sidebar">
  <div class="sidebar-header">
    <h2>⚖️ U.S. Code</h2>
    <p>Titles 18 & 28</p>
  </div>

  <div class="sidebar-content">
    <!-- Title 18 -->
    <div class="title-group">
      <button
        class="title-toggle"
        onclick={() => toggleTitle('18')}
        class:expanded={expandedTitle === '18'}
      >
        <span class="toggle-icon">▶</span>
        <span class="title-name">Title 18</span>
        <span class="count">({data.stats.title18Count})</span>
      </button>

      {#if expandedTitle === '18'}
        <div class="statute-list">
          {#each data.title18 as statute (statute.id)}
            <button
              class="statute-item"
              onclick={() => onSelectStatute(statute)}
              title={statute.title}
            >
              <span class="statute-section">{statute.section}</span>
              <span class="statute-title">{statute.title?.replace(/18 U\.S\.C\.\s+/, '')}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Title 28 -->
    <div class="title-group">
      <button
        class="title-toggle"
        onclick={() => toggleTitle('28')}
        class:expanded={expandedTitle === '28'}
      >
        <span class="toggle-icon">▶</span>
        <span class="title-name">Title 28</span>
        <span class="count">({data.stats.title28Count})</span>
      </button>

      {#if expandedTitle === '28'}
        <div class="statute-list">
          {#each data.title28 as statute (statute.id)}
            <button
              class="statute-item"
              onclick={() => onSelectStatute(statute)}
              title={statute.title}
            >
              <span class="statute-section">{statute.section}</span>
              <span class="statute-title">{statute.title?.replace(/28 U\.S\.C\.\s+/, '')}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="sidebar-footer">
    <small>Total: {data.stats.totalStatutes} statutes</small>
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    border-right: 1px dotted #ccc;
    background-color: #fafafa;
    overflow-y: auto;
    padding: 0;
  }

  .sidebar-header {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    background-color: #fafafa;
    z-index: 10;
  }

  .sidebar-header h2 {
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
  }

  .sidebar-header p {
    font-size: 0.8rem;
    color: #666;
    margin: 0;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
  }

  .title-group {
    border-bottom: 1px dotted #e0e0e0;
  }

  .title-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a1a1a;
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .title-toggle:hover {
    background-color: #f0f0f0;
  }

  .toggle-icon {
    display: inline-block;
    transition: transform 0.2s;
    font-size: 0.7rem;
    width: 1rem;
  }

  .title-toggle.expanded .toggle-icon {
    transform: rotate(90deg);
  }

  .title-name {
    flex: 1;
  }

  .count {
    font-size: 0.75rem;
    color: #999;
  }

  .statute-list {
    background-color: #fafafa;
  }

  .statute-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 1rem 0.5rem 2rem;
    text-align: left;
    font-size: 0.8rem;
    color: #666;
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 2px solid transparent;
  }

  .statute-item:hover {
    background-color: #f5f5f5;
    color: #1a1a1a;
    border-left-color: #0066cc;
  }

  .statute-section {
    font-family: var(--font-mono);
    font-weight: 600;
    color: #0066cc;
  }

  .statute-title {
    font-size: 0.75rem;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-footer {
    padding: 1rem;
    border-top: 1px dotted #e0e0e0;
    text-align: center;
    color: #999;
    font-size: 0.75rem;
  }

  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
  }
</style>
