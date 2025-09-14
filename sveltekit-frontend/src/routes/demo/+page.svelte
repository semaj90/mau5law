<script lang="ts">
  import 'nes.css/css/nes.min.css';
  // Minimal demo hub implementation - SSR friendly
</script>

<svelte:head>
  <title>Demo Hub - WardenNet Legal</title>
  <meta
    name="description"
    content="Legal AI platform demo showcase"
  />
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Demo Hub</h1>
    <p class="mb-4">Legal AI platform demo showcase - temporarily simplified for SSR compatibility.</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="nes-container is-dark">
        <h2 class="title text-lg">Legal AI Complete</h2>
        <p class="mb-4 text-gray-400">Comprehensive legal AI analysis demo</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">Vector Search</h2>
        <p class="mb-4 text-gray-400">Advanced vector-based legal search</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">Real-time Analysis</h2>
        <p class="mb-4 text-gray-400">Live legal document analysis</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">Enhanced RAG</h2>
        <p class="mb-4 text-gray-400">Retrieval-augmented generation for legal queries</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">GPU Inference</h2>
        <p class="mb-4 text-gray-400">High-performance AI inference</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">Component Gallery</h2>
        <p class="mb-4 text-gray-400">UI components showcase</p>
        <button class="nes-btn is-primary">View Demo</button>
      </div>
    </div>

    <div class="mt-8">
      <div class="nes-container is-dark">
        <h3 class="title">Featured Demos</h3>
        <p class="text-gray-400 mb-4">Explore our most popular legal AI demonstrations</p>
        <button class="nes-btn is-success">Browse All Demos</button>
      </div>
    </div>
  </main>
</div>