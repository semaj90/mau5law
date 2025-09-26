<!-- Dynamic Demo Page - Showcase Individual Demos -->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  // Get current demo slug from URL parameters
  let demoSlug = $derived($page.params.slug);

  // Demo component mapping
  const demoComponents = {
    'webgpu': () => import('$lib/components/demo/WebGPUAccelerationDemo.svelte'),
    'cuda-streaming': () => import('../../cuda-streaming/+page.svelte'),
    'ai-assistant': () => import('../../ai-assistant/+page.svelte'),
    'evidence-canvas': () => import('../../evidence-canvas/+page.svelte'),
    'legal-research': () => import('../../legal/research/+page.svelte'),
    'vector-search': () => import('$lib/components/demo/VectorIntelligenceDemo.svelte'),
    'gaming-ui': () => import('$lib/components/demo/GamingCacheDemo.svelte'),
    'performance': () => import('../../optimization-dashboard/+page.svelte')
  };

  // Component loading state
  let currentComponent = $state(null);
  let loading = $state(true);
  let error = $state(null);

  // Load demo component dynamically
  async function loadDemoComponent(slug: string) {
    loading = true;
    error = null;

    try {
      const componentLoader = demoComponents[slug];
      if (componentLoader) {
        const module = await componentLoader();
        currentComponent = module.default;
      } else {
        error = `Demo "${slug}" not found`;
        currentComponent = null;
      }
    } catch (err) {
      error = `Failed to load demo: ${err.message}`;
      currentComponent = null;
    } finally {
      loading = false;
    }
  }

  // Load component when slug changes
  $effect(() => {
    if (demoSlug) {
      loadDemoComponent(demoSlug);
    }
  });

  onMount(() => {
    if (demoSlug) {
      loadDemoComponent(demoSlug);
    }
  });

  // Demo metadata
  const demoMetadata = {
    'webgpu': {
      title: 'WebGPU Acceleration Demo',
      description: 'Hardware-accelerated computing for legal AI processing',
      tags: ['WebGPU', 'CUDA', 'Performance']
    },
    'cuda-streaming': {
      title: 'CUDA Streaming Processing',
      description: 'Real-time GPU-accelerated document processing',
      tags: ['CUDA', 'Streaming', 'GPU']
    },
    'ai-assistant': {
      title: 'AI Legal Assistant',
      description: 'Intelligent legal research and document analysis',
      tags: ['AI', 'Legal', 'Assistant']
    },
    'evidence-canvas': {
      title: 'Evidence Canvas Editor',
      description: 'Interactive evidence organization and visualization',
      tags: ['Evidence', 'Canvas', 'Visualization']
    },
    'legal-research': {
      title: 'Legal Research Platform',
      description: 'Advanced legal document search and analysis',
      tags: ['Research', 'Legal', 'Search']
    },
    'vector-search': {
      title: 'Vector Intelligence Search',
      description: 'Semantic search using vector embeddings',
      tags: ['Vector', 'Search', 'AI']
    },
    'gaming-ui': {
      title: 'Gaming-Inspired UI',
      description: 'YoRHa aesthetic with professional legal functionality',
      tags: ['Gaming', 'UI', 'YoRHa']
    },
    'performance': {
      title: 'Performance Dashboard',
      description: 'Real-time system performance monitoring',
      tags: ['Performance', 'Metrics', 'Monitoring']
    }
  };

  let metadata = $derived(demoMetadata[demoSlug] || { title: 'Unknown Demo', description: '', tags: [] });
</script>

<svelte:head>
  <title>{metadata.title} - Legal AI Demo</title>
  <meta name="description" content={metadata.description} />
</svelte:head>

<div class="demo-page">
  <!-- Demo Header -->
  <header class="demo-page-header">
    <div class="demo-breadcrumb">
      <a href="/demo/showcase" class="breadcrumb-link">🏠 Demos</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">{demoSlug}</span>
    </div>

    <div class="demo-meta">
      <h1 class="demo-title">{metadata.title}</h1>
      <p class="demo-description">{metadata.description}</p>

      {#if metadata.tags.length > 0}
        <div class="demo-tags">
          {#each metadata.tags as tag}
            <span class="demo-tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <!-- Demo Content -->
  <main class="demo-content">
    {#if loading}
      <div class="demo-loading">
        <div class="loading-spinner"></div>
        <p>Loading {metadata.title}...</p>
      </div>
    {:else if error}
      <div class="demo-error">
        <div class="error-icon">⚠️</div>
        <h2>Demo Load Failed</h2>
        <p>{error}</p>
        <div class="error-actions">
          <button onclick={() => loadDemoComponent(demoSlug)}>🔄 Retry</button>
          <a href="/demo/showcase">← Back to Demos</a>
        </div>
      </div>
    {:else if currentComponent}
      <div class="demo-wrapper">
        <svelte:component this={currentComponent} {data} />
      </div>
    {:else}
      <div class="demo-placeholder">
        <h2>🚧 Demo Under Construction</h2>
        <p>The "{demoSlug}" demo is being prepared.</p>
        <a href="/demo/showcase">← Browse Other Demos</a>
      </div>
    {/if}
  </main>
</div>

<style>
  .demo-page {
    min-height: 100%;
  }

  /* Header */
  .demo-page-header {
    background: var(--nier-bg-secondary);
    border-bottom: 1px solid var(--nier-border-primary);
    padding: 1.5rem;
    margin-bottom: 0;
  }

  .demo-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .breadcrumb-link {
    color: var(--nier-accent-cool);
    text-decoration: none;
  }

  .breadcrumb-link:hover {
    color: var(--nier-accent-warm);
  }

  .breadcrumb-separator {
    color: var(--nier-text-muted);
  }

  .breadcrumb-current {
    color: var(--nier-text-primary);
    font-weight: bold;
    text-transform: uppercase;
  }

  .demo-meta {
    max-width: 800px;
  }

  .demo-title {
    font-size: 2rem;
    font-weight: bold;
    color: var(--nier-accent-warm);
    margin: 0 0 0.5rem 0;
  }

  .demo-description {
    font-size: 1.1rem;
    color: var(--nier-text-secondary);
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .demo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .demo-tag {
    background: var(--nier-accent-cool);
    color: var(--nier-bg-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: bold;
  }

  /* Content */
  .demo-content {
    padding: 0;
  }

  .demo-wrapper {
    background: var(--nier-bg-primary);
  }

  /* Loading State */
  .demo-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    text-align: center;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 3px solid var(--nier-border-muted);
    border-top: 3px solid var(--nier-accent-warm);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error State */
  .demo-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    text-align: center;
    background: var(--nier-bg-secondary);
    border: 2px dashed var(--nier-border-error);
    border-radius: 1rem;
    margin: 2rem;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .demo-error h2 {
    color: var(--nier-text-error);
    margin-bottom: 0.5rem;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .error-actions button,
  .error-actions a {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--nier-border-primary);
    border-radius: 0.5rem;
    text-decoration: none;
    background: var(--nier-bg-primary);
    color: var(--nier-text-primary);
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .error-actions button:hover,
  .error-actions a:hover {
    border-color: var(--nier-accent-warm);
    color: var(--nier-accent-warm);
  }

  /* Placeholder State */
  .demo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    text-align: center;
    background: var(--nier-bg-secondary);
    border: 2px dashed var(--nier-border-muted);
    border-radius: 1rem;
    margin: 2rem;
  }

  .demo-placeholder h2 {
    color: var(--nier-accent-warm);
    margin-bottom: 1rem;
  }

  .demo-placeholder a {
    color: var(--nier-accent-cool);
    text-decoration: none;
    margin-top: 1rem;
  }

  .demo-placeholder a:hover {
    color: var(--nier-accent-warm);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .demo-page-header {
      padding: 1rem;
    }

    .demo-title {
      font-size: 1.5rem;
    }

    .error-actions {
      flex-direction: column;
    }
  }
</style>