<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');

  const filteredCodes = $derived(
    data.codes.filter(
      (code) =>
        code.codeTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.codeAbbrev.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="state-laws-page">
  <header class="page-header">
    <a href="/laws" class="back-link">← Back to Jurisdictions</a>
    <h1>{data.state} Statutes</h1>
    <p>{data.codes.length} code{data.codes.length !== 1 ? 's' : ''}</p>
  </header>

  {#if data.error}
    <div class="error-message">
      <p>{data.error}</p>
    </div>
  {:else}
    <div class="search-section">
      <input
        type="text"
        placeholder="Search codes..."
        bind:value={searchQuery}
        class="search-input"
      />
    </div>

    <div class="codes-list">
      {#each filteredCodes as code (code.id)}
        <a href="/laws/{data.state.toLowerCase()}/{code.id}" class="code-card">
          <div class="code-header">
            <h2>{code.codeAbbrev}</h2>
            <span class="badge">{code.sectionCount} sections</span>
          </div>
          <p class="code-title">{code.codeTitle}</p>
          {#if code.codeEdition}
            <p class="code-edition">Edition: {code.codeEdition}</p>
          {/if}
        </a>
      {/each}
    </div>

    {#if filteredCodes.length === 0}
      <div class="empty-state">
        <p>No codes found matching "{searchQuery}"</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .state-laws-page {
    padding: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: #0066cc;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #0052a3;
  }

  .page-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #1a1a1a;
  }

  .page-header p {
    margin: 0;
    color: #666;
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

  .codes-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .code-card {
    display: block;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }

  .code-card:hover {
    border-color: #0066cc;
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);
    transform: translateX(4px);
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .code-header h2 {
    font-size: 1.25rem;
    margin: 0;
    color: #1a1a1a;
    font-family: monospace;
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

  .code-title {
    margin: 0.5rem 0 0 0;
    color: #1a1a1a;
    font-weight: 500;
  }

  .code-edition {
    margin: 0.25rem 0 0 0;
    color: #999;
    font-size: 0.875rem;
  }

  .error-message {
    padding: 1.5rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    color: #856404;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #999;
  }
</style>
