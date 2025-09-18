<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import {
    GemmaEmbeddingDemo,
    EmbeddingForm,
    EmbeddingSearch,
    Button,
    Card
  } from '$lib/components/ui/enhanced-bits';
  import { Database, Search, Activity, Brain, Zap } from 'lucide-svelte';

  // Demo state
  let activeDemo = $state<'complete' | 'form' | 'search'>('complete');
  let stats = $state({
    totalDemos: 3,
    activeComponents: 5,
    apiIntegrations: 2
  });

  // Handle component interactions
  function handleEmbeddingSuccess(result: any) {
    console.log('Embedding created:', result);
  }

  function handleEmbeddingError(error: string) {
    console.error('Embedding error:', error);
  }

  function handleSearchResult(result: any) {
    console.log('Search result selected:', result);
  }

  // Reactive demo description
  let demoDescription = $derived(() => {
    switch (activeDemo) {
      case 'complete':
        return 'Full-featured demo with tabbed interface, stats, and real-time activity monitoring';
      case 'form':
        return 'Standalone embedding generation form with Gemma API and WASM fallback';
      case 'search':
        return 'Semantic search interface with similarity scoring and result ranking';
      default:
        return '';
    }
  });
</script>

<svelte:head>
  <title>Gemma + Enhanced-Bits Demo | Legal AI Platform</title>
  <meta name="description" content="Complete demonstration of enhanced-bits UI library integration with Gemma 512-dimensional embeddings and pgvector similarity search." />
</svelte:head>

<div class="demo-page">
  <!-- Page Header -->
  <header class="page-header">
    <Card
      title="🎮 Enhanced-Bits × Gemma Integration Demo"
      nesStyle={true}
      variant="legal"
    >
      {#snippet children()}
        <div class="header-content">
          <p class="nes-text">
            <Brain class="inline-icon" />
            Complete demonstration of our custom enhanced-bits UI library integrated with
            Gemma 512-dimensional embeddings, PostgreSQL pgvector similarity search,
            and WASM fallback architecture for the legal AI platform.
          </p>

          <div class="tech-stack">
            <div class="tech-item">
              <span class="nes-text is-primary">🚀 SvelteKit 2 + Svelte 5</span>
            </div>
            <div class="tech-item">
              <span class="nes-text is-success">🧠 Gemma 512D Embeddings</span>
            </div>
            <div class="tech-item">
              <span class="nes-text is-warning">🔍 pgvector Similarity</span>
            </div>
            <div class="tech-item">
              <span class="nes-text is-error">⚡ WASM Fallback</span>
            </div>
          </div>

          <div class="demo-stats">
            <div class="stat">
              <Database class="inline-icon" />
              <span class="nes-text">Demos: {stats.totalDemos}</span>
            </div>
            <div class="stat">
              <Activity class="inline-icon" />
              <span class="nes-text">Components: {stats.activeComponents}</span>
            </div>
            <div class="stat">
              <Zap class="inline-icon" />
              <span class="nes-text">APIs: {stats.apiIntegrations}</span>
            </div>
          </div>
        </div>
      {/snippet}
    </Card>
  </header>

  <!-- Demo Navigation -->
  <nav class="demo-nav">
    <div class="nav-buttons">
      <Button
        variant={activeDemo === 'complete' ? 'legal' : 'default'}
        nesStyle={true}
        onclick={() => activeDemo = 'complete'}
      >
        <Brain class="inline-icon" />
        Complete Demo
      </Button>

      <Button
        variant={activeDemo === 'form' ? 'legal' : 'default'}
        nesStyle={true}
        onclick={() => activeDemo = 'form'}
      >
        <Database class="inline-icon" />
        Embedding Form
      </Button>

      <Button
        variant={activeDemo === 'search' ? 'legal' : 'default'}
        nesStyle={true}
        onclick={() => activeDemo = 'search'}
      >
        <Search class="inline-icon" />
        Semantic Search
      </Button>
    </div>

    <div class="nav-description">
      <p class="nes-text is-primary">{demoDescription}</p>
    </div>
  </nav>

  <!-- Demo Content -->
  <main class="demo-content">
    {#if activeDemo === 'complete'}
      <GemmaEmbeddingDemo
        variant="legal"
        showAdvancedSearch={true}
      />
    {/if}

    {#if activeDemo === 'form'}
      <Card
        title="Standalone Embedding Form"
        nesStyle={true}
        variant="evidence"
      >
        {#snippet children()}
          <EmbeddingForm
            variant="legal"
            showRecentEmbeddings={true}
            onSuccess={handleEmbeddingSuccess}
            onError={handleEmbeddingError}
          />
        {/snippet}
      </Card>
    {/if}

    {#if activeDemo === 'search'}
      <Card
        title="Standalone Semantic Search"
        nesStyle={true}
        variant="dark"
      >
        {#snippet children()}
          <EmbeddingSearch
            variant="legal"
            showAdvanced={true}
            onResultSelect={handleSearchResult}
          />
        {/snippet}
      </Card>
    {/if}
  </main>

  <!-- Implementation Details -->
  <footer class="implementation-details">
    <Card
      title="🔧 Implementation Architecture"
      nesStyle={true}
      variant="dark"
    >
      {#snippet children()}
        <div class="arch-grid">
          <div class="arch-section">
            <h4 class="nes-text is-primary">Frontend Stack</h4>
            <ul class="nes-list is-disc">
              <li>SvelteKit 2 with Svelte 5 runes ($state, $derived, $effect)</li>
              <li>Enhanced-bits custom UI library with NES.css styling</li>
              <li>TypeScript with strict type checking</li>
              <li>Lucide icons for consistent visual language</li>
            </ul>
          </div>

          <div class="arch-section">
            <h4 class="nes-text is-success">AI Integration</h4>
            <ul class="nes-list is-disc">
              <li>Gemma API for 512-dimensional embedding generation</li>
              <li>WASM worker fallback for client-side processing</li>
              <li>Real-time embedding creation and storage</li>
              <li>Semantic similarity search with pgvector</li>
            </ul>
          </div>

          <div class="arch-section">
            <h4 class="nes-text is-warning">Database Layer</h4>
            <ul class="nes-list is-disc">
              <li>PostgreSQL 17 with pgvector extension</li>
              <li>Drizzle ORM for type-safe database operations</li>
              <li>Optimized vector similarity queries</li>
              <li>JSONB metadata storage for legal contexts</li>
            </ul>
          </div>

          <div class="arch-section">
            <h4 class="nes-text is-error">API Design</h4>
            <ul class="nes-list is-disc">
              <li>RESTful endpoints with Zod validation</li>
              <li>Graceful degradation and error handling</li>
              <li>Health monitoring and status reporting</li>
              <li>Optimized for legal AI workloads</li>
            </ul>
          </div>
        </div>

        <div class="code-example">
          <h4 class="nes-text is-primary">Key Features Demonstrated:</h4>
          <div class="feature-list">
            <div class="feature">
              <span class="nes-badge is-success">✨</span>
              <span class="nes-text">Gemma API with automatic WASM fallback</span>
            </div>
            <div class="feature">
              <span class="nes-badge is-primary">🔍</span>
              <span class="nes-text">Real-time semantic similarity search</span>
            </div>
            <div class="feature">
              <span class="nes-badge is-warning">📊</span>
              <span class="nes-text">Live activity monitoring and stats</span>
            </div>
            <div class="feature">
              <span class="nes-badge is-error">🎮</span>
              <span class="nes-text">NES.css styled legal AI interface</span>
            </div>
          </div>
        </div>
      {/snippet}
    </Card>
  </footer>
</div>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .page-header {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .tech-stack {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1rem;
    border: 2px solid #333;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
  }

  .tech-item {
    text-align: center;
    padding: 0.5rem;
  }

  .demo-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #666;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .demo-nav {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .nav-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .nav-description {
    text-align: center;
    padding: 1rem;
    border: 1px solid #333;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
  }

  .demo-content {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    min-height: 600px;
  }

  .implementation-details {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .arch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .arch-section {
    padding: 1.5rem;
    border: 2px solid #333;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
  }

  .arch-section h4 {
    margin-bottom: 1rem;
  }

  .code-example {
    padding: 1.5rem;
    border: 2px solid #444;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
  }

  .feature-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .inline-icon {
    width: 1rem;
    height: 1rem;
    display: inline;
    vertical-align: text-bottom;
    margin-right: 0.25rem;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .demo-page {
      padding: 1rem;
    }

    .tech-stack {
      grid-template-columns: 1fr;
    }

    .demo-stats {
      flex-direction: column;
      align-items: center;
    }

    .nav-buttons {
      flex-direction: column;
    }

    .arch-grid {
      grid-template-columns: 1fr;
    }

    .feature-list {
      grid-template-columns: 1fr;
    }
  }

  /* Dark theme enhancements */
  :global(body) {
    background: #0a0a0f;
    color: #ffffff;
  }

  /* NES.css overrides for better dark theme */
  :global(.nes-container.is-dark) {
    background-color: rgba(0, 0, 0, 0.3);
    border-color: #444;
  }

  :global(.nes-text.is-primary) {
    color: #66b3ff;
  }

  :global(.nes-text.is-success) {
    color: #4caf50;
  }

  :global(.nes-text.is-warning) {
    color: #ff9800;
  }

  :global(.nes-text.is-error) {
    color: #f44336;
  }
</style>