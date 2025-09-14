<script lang="ts">
  import 'nes.css/css/nes.min.css';
  // Minimal search implementation - SSR friendly
</script>

<svelte:head>
  <title>Search - WardenNet Legal</title>
  <meta
    name="description"
    content="Advanced legal search and case discovery"
  />
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Legal Search</h1>
    <p class="mb-4">Advanced search temporarily simplified for SSR compatibility.</p>

    <div class="nes-container is-dark mb-6">
      <h2 class="title text-lg mb-4">Search Legal Database</h2>

      <div class="field mb-4">
        <label for="search-query">Search Query:</label>
        <input type="text" id="search-query" class="nes-input is-dark" placeholder="Enter search terms..." />
      </div>

      <div class="field mb-4">
        <label for="search-type">Search Type:</label>
        <div class="nes-select is-dark">
          <select id="search-type">
            <option value="cases">Cases</option>
            <option value="evidence">Evidence</option>
            <option value="documents">Documents</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <button class="nes-btn is-primary">🔍 Search</button>
      <button class="nes-btn">Advanced Filters</button>
    </div>

    <div class="nes-container is-dark">
      <h3 class="title">Search Results</h3>
      <p class="text-gray-400">No results to display. Enter a search query above.</p>
    </div>
  </main>
</div>