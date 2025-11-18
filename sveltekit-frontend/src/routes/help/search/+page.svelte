<script lang="ts">
  import Search from 'lucide-svelte/icons/search';
  import AlertCircle from 'lucide-svelte/icons/alert-circle';

  let query = '';
  let results: Array<{
    id: string;
    title: string;
    description: string;
    ranking: {
      bm25: number;
      semantic: number;
      precedent: number;
      contradiction: number;
      fused: number;
    };
  }> = [];
  let disclaimer = '';
  let loading = false;
  let errorMessage = '';

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      errorMessage = 'Enter a query to begin.';
      results = [];
      disclaimer = '';
      return;
    }

    loading = true;
    errorMessage = '';

    try {
      const response = await fetch('/help/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        errorMessage = data?.error ?? 'Search failed.';
        results = [];
        disclaimer = '';
        return;
      }

      const data = await response.json();
      disclaimer = data.disclaimer ?? '';
      results = data.results ?? [];
    } catch (err) {
      console.error(err);
      errorMessage = 'Search service unavailable.';
      results = [];
      disclaimer = '';
    } finally {
      loading = false;
    }
  }
</script>

<section class="hero">
  <h1>YoRHa Intelligence Search</h1>
  <p>Hybrid BM25 + Gemma embeddings with Phoenix Wright contradiction detection.</p>

  <div class="search-box">
    <Search class="icon" />
    <input
      placeholder="Search cases, evidence, or help knowledge base…"
      bind:value={query}
      on:keydown={(event) => event.key === 'Enter' && runSearch()}
    />
    <button class="run" on:click={runSearch} disabled={loading}>
      {loading ? 'Scanning…' : 'Execute Search'}
    </button>
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}
</section>

<section class="results">
  {#if results.length}
    <p class="meta">Showing {results.length} results for <strong>{query}</strong></p>

    <div class="grid">
      {#each results as result}
        <article class="card">
          <header>
            <h2>{result.title}</h2>
            <span class="score">{result.ranking.fused.toFixed(3)}</span>
          </header>

          <p class="description">{result.description}</p>

          <dl>
            <div>
              <dt>BM25</dt>
              <dd>{result.ranking.bm25.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Semantic</dt>
              <dd>{result.ranking.semantic.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Precedent</dt>
              <dd>{result.ranking.precedent.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Contradiction</dt>
              <dd>{result.ranking.contradiction.toFixed(3)}</dd>
            </div>
          </dl>

          {#if result.ranking.contradiction > 0.6}
            <div class="contradiction">
              <AlertCircle class="alert-icon" />
              <span>Potential contradiction detected</span>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}

  {#if disclaimer}
    <div class="disclaimer">
      {disclaimer}
    </div>
  {/if}
</section>

<style>
  :global(body) {
    background-color: #050505;
    color: #f8f8f8;
    font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
  }

  .hero {
    padding: 4rem 8vw 2rem;
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hero h1 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .hero p {
    margin-top: 0.5rem;
    color: #a0a0a0;
  }

  .search-box {
    margin-top: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
  }

  .search-box .icon {
    width: 24px;
    height: 24px;
    color: #d0d0d0;
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.1rem;
    outline: none;
  }

  .search-box .run {
    padding: 0.75rem 1.5rem;
    border-radius: 999px;
    border: none;
    font-weight: 600;
    background: linear-gradient(90deg, #00ffd1, #0073ff);
    color: #050505;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .search-box .run[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    margin-top: 1rem;
    color: #ff6b6b;
    font-weight: 600;
  }

  .results {
    padding: 3rem 8vw 5rem;
    background: #090909;
    min-height: 50vh;
  }

  .meta {
    margin-bottom: 1.5rem;
    color: #b0b0b0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(0, 255, 209, 0.5);
  }

  .card header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .score {
    font-family: 'Fira Code', monospace;
    color: #00ffd1;
  }

  .description {
    color: #c8c8c8;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 0;
  }

  dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #7a7a7a;
  }

  dd {
    margin: 0;
    font-family: 'Fira Code', monospace;
  }

  .contradiction {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.75rem;
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    color: #ff4d6d;
    background: rgba(255, 77, 109, 0.12);
    font-size: 0.85rem;
  }

  .alert-icon {
    width: 16px;
    height: 16px;
  }

  .disclaimer {
    margin-top: 3rem;
    padding: 1.25rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.03);
    color: #a0a0a0;
    line-height: 1.6;
    font-size: 0.9rem;
  }
</style>
