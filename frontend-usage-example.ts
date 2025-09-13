// Frontend Usage Example
// How to use the automated semantic search from your Svelte components

export async function performSemanticSearch(query: string, options = {}) {
  const {
    threshold = 0.8,
    limit = 10,
    filters = {}
  } = options;

  try {
    const response = await fetch('/api/rag/semantic-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        threshold,
        limit,
        filters
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Semantic search error:', error);
    throw error;
  }
}

// Example usage in a Svelte component:
/*
<script lang="ts">
  import { performSemanticSearch } from '$lib/semantic-search';

  let query = '';
  let results = [];
  let loading = false;
  let error = null;

  async function search() {
    if (!query.trim()) return;

    loading = true;
    error = null;

    try {
      const searchResults = await performSemanticSearch(query, {
        threshold: 0.8,
        limit: 20
      });

      results = searchResults.results;
      console.log(`Found ${results.length} results in ${searchResults.metadata.totalTime}`);

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="search-container">
  <input
    bind:value={query}
    placeholder="Search legal documents..."
    on:keydown={(e) => e.key === 'Enter' && search()}
  />
  <button on:click={search} disabled={loading}>
    {loading ? 'Searching...' : 'Search'}
  </button>

  {#if error}
    <div class="error">Error: {error}</div>
  {/if}

  {#if results.length > 0}
    <div class="results">
      {#each results as result}
        <div class="result-item">
          <h3>{result.title}</h3>
          <p class="snippet">{result.snippet}</p>
          <div class="metadata">
            <span class="distance">Similarity: {result.semanticScore}</span>
            <span class="relevance">Relevance: {result.relevanceLevel}</span>
            <span class="type">{result.document_type}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
*/