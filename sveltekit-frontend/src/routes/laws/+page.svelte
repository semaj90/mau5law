<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedJurisdiction = $state<string | null>(null);

  const filteredJurisdictions = $derived(
    data.jurisdictions.filter((j) =>
      j.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="laws-page">
  <header class="laws-header">
    <h1>Legal Code Library</h1>
    <p>Browse statutes and codes by jurisdiction</p>
  </header>

  <div class="search-section">
    <input
      type="text"
      placeholder="Search jurisdictions..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>

  <div class="jurisdictions-grid">
    {#each filteredJurisdictions as jurisdiction (jurisdiction.jurisdiction)}
      <a
        href="/laws/{jurisdiction.jurisdiction.toLowerCase()}"
        class="jurisdiction-card"
      >
        <div class="card-header">
          <h2>{jurisdiction.jurisdiction}</h2>
          <span class="badge">{jurisdiction.count}</span>
        </div>
        <p class="card-description">
          {jurisdiction.count} statute{jurisdiction.count !== 1 ? 's' : ''}
        </p>
      </a>
    {/each}
  </div>

  {#if filteredJurisdictions.length === 0}
    <div class="empty-state">
      <p>No jurisdictions found matching "{searchQuery}"</p>
    </div>
  {/if}
</div>

<style>
  .laws-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .laws-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .laws-header h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem 0;
    color: #1a1a1a;
  }

  .laws-header p {
    font-size: 1.1rem;
    color: #666;
    margin: 0;
  }

  .search-section {
    margin-bottom: 2rem;
  }

  .search-input {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .jurisdictions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .jurisdiction-card {
    display: block;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }

  .jurisdiction-card:hover {
    border-color: #0066cc;
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .card-header h2 {
    font-size: 1.25rem;
    margin: 0;
    color: #1a1a1a;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #f0f0f0;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #666;
  }

  .card-description {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #999;
  }
</style>
