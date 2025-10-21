<!-- Demo Showcase - Overview of All Available Demos -->
<script lang="ts">
  // Demo showcase data
  const demoCategories = [
    {
      name: 'AI & Processing',
      icon '🤖',
      demos: [
        {
          slug: 'ai-assistant',
          name: 'AI Legal Assistant',
          description 'Intelligent legal research and document analysis with Gemma embeddings',
          features: ['Legal Research', 'Document Analysis', 'Case Recommendations'],
          status: 'active',
          complexity: 'high',
        },
        {
          slug: 'cuda-streaming',
          name: 'CUDA Streaming',
          description 'Real-time GPU-accelerated document processing pipeline',
          features: ['GPU Processing', 'Real-time Streaming', 'CUDA Integration'],
          status: 'active',
          complexity: 'high',
        },
        {
          slug: 'vector-search',
          name: 'Vector Intelligence',
          description 'Semantic search using vector embeddings and similarity matching',
          features: ['Vector Embeddings', 'Semantic Search', 'Similarity Scoring'],
          status: 'active',
          complexity: 'medium',
        },
      ],
    },
    {
      name: 'Legal Workflow',
      icon '⚖️',
      demos: [
        {
          slug: 'evidence-canvas',
          name: 'Evidence Canvas',
          description 'Interactive evidence organization and case visualization',
          features: ['Evidence Management', 'Visual Organization', 'Case Building'],
          status: 'active',
          complexity: 'medium',
        },
        {
          slug: 'legal-research',
          name: 'Legal Research',
          description 'Advanced legal document search with precedent matching',
          features: ['Document Search', 'Precedent Analysis', 'Legal Citations'],
          status: 'active',
          complexity: 'medium',
        },
      ],
    },
    {
      name: 'Performance & UI',
      icon '🎮',
      demos: [
        {
          slug: 'webgpu',
          name: 'WebGPU Acceleration',
          description 'Hardware-accelerated computing for legal AI processing',
          features: ['WebGPU Computing', 'Shader Programs', 'GPU Optimization'],
          status: 'active',
          complexity: 'high',
        },
        {
          slug: 'gaming-ui',
          name: 'Gaming UI System',
          description 'YoRHa-inspired aesthetic with professional legal functionality',
          features: ['Gaming Aesthetics', 'Professional UI', 'Theme System'],
          status: 'active',
          complexity: 'low',
        },
        {
          slug: 'performance',
          name: 'Performance Dashboard',
          description 'Real-time system performance monitoring and optimization',
          features: ['Performance Metrics', 'Real-time Monitoring', 'System Health'],
          status: 'active',
          complexity: 'medium',
        },
      ],
    },
  ];

  // Get status styling
  function getStatusClass(status: string) {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'beta':
        return 'status-beta';
      case 'coming-soon':
        return 'status-coming-soon';
      default:
        return 'status-unknown';
    }
  }

  // Get complexity styling
  function getComplexityClass(complexity: string) {
    switch (complexity) {
      case 'low':
        return 'complexity-low';
      case 'medium':
        return 'complexity-medium';
      case 'high':
        return 'complexity-high';
      default:
        return 'complexity-unknown';
    }
  }
</script>

<svelte:head>
  <title>Demo Showcase - Legal AI Platform</title>
  <meta
    name="description"
    content="Explore all available demos of the Legal AI Platform featuring gaming-inspired UI and professional legal tools"
  />
</svelte:head>

<div class="showcase">
  <!-- Header -->
  <header class="showcase-header">
    <div class="header-content">
      <h1 class="showcase-title">🎮 Legal AI Demo Showcase</h1>
      <p class="showcase-subtitle">
        Explore cutting-edge legal AI technology with gaming-inspired user experience. Each demo showcases different
        aspects of our platform's capabilities.
      </p>
    </div>

    <div class="showcase-stats">
      <div class="stat-item">
        <span class="stat-value">8</span>
        <span class="stat-label">Demos</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">3</span>
        <span class="stat-label">Categories</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">UnoCSS</span>
        <span class="stat-label">CSS Framework</span>
      </div>
    </div>
  </header>

  <!-- Demo Categories -->
  <main class="showcase-content">
    {#each demoCategories as category}
      <section class="demo-category">
        <header class="category-header">
          <span class="category-icon">{category.icon}</span>
          <h2 class="category-title">{category.name}</h2>
          <span class="category-count">{category.demos.length} demos</span>
        </header>

        <div class="demo-grid">
          {#each category.demos as demo}
            <article class="demo-card">
              <header class="demo-card-header">
                <div class="demo-card-title">
                  <h3>{demo.name}</h3>
                  <div class="demo-badges">
                    <span class="status-badge {getStatusClass(demo.status)}">
                      {demo.status}
                    </span>
                    <span class="complexity-badge {getComplexityClass(demo.complexity)}">
                      {demo.complexity}
                    </span>
                  </div>
                </div>
              </header>

              <div class="demo-card-body">
                <p class="demo-description">{demo.description}</p>

                <div class="demo-features">
                  {#each demo.features as feature}
                    <span class="feature-tag">{feature}</span>
                  {/each}
                </div>
              </div>

              <footer class="demo-card-footer">
                <a href="/demo/{demo.slug}" class="demo-launch-btn"> 🚀 Launch Demo </a>
              </footer>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </main>

  <!-- Footer -->
  <footer class="showcase-footer">
    <div class="footer-content">
      <p class="footer-text">
        Built with <strong>SvelteKit 2</strong>, <strong>UnoCSS</strong>, and <strong>WebGPU</strong>
      </p>
      <div class="footer-links">
        <a href="/">← Back to Main App</a>
        <a href="/auth/login">Login to Platform</a>
      </div>
    </div>
  </footer>
</div>

<style>
  .showcase {
    min-height: 100vh;
    background: var(--nier-bg-primary);
  }

  /* Header */
  .showcase-header {
    background: linear-gradient(135deg, var(--nier-bg-secondary), var(--nier-bg-tertiary));
    padding: 3rem 2rem;
    border-bottom: 2px solid var(--nier-accent-warm);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    margin-bottom: 2rem;
  }

  .showcase-title {
    font-size: 3rem;
    font-weight: bold;
    color: var(--nier-accent-warm);
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .showcase-subtitle {
    font-size: 1.2rem;
    color: var(--nier-text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6,
  }

  .showcase-stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .stat-item {
    display: flex;
    flex-direction column;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--nier-accent-cool);
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--nier-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Content */
  .showcase-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }

  /* Categories */
  .demo-category {
    margin-bottom: 4rem;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .category-icon {
    font-size: 2rem;
  }

  .category-title {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--nier-text-primary);
    margin: 0,
  }

  .category-count {
    background: var(--nier-accent-cool);
    color: var(--nier-bg-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: bold;
  }

  /* Demo Grid */
  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  /* Demo Cards */
  .demo-card {
    background: var(--nier-bg-secondary);
    border: 1px solid var(--nier-border-primary);
    border-radius: 1rem;
    overflow: hidden;
    transition all 0.3s ease;
  }

  .demo-card:hover {
    border-color: var(--nier-accent-warm);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .demo-card-header {
    padding: 1.5rem 1.5rem 0 1.5rem;
  }

  .demo-card-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .demo-card-title h3 {
    font-size: 1.3rem;
    font-weight: bold;
    color: var(--nier-accent-warm);
    margin: 0,
  }

  .demo-badges {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0,
  }

  .status-badge,
  .complexity-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .status-active {
    background: #10b981;
    color: white;
  }

  .status-beta {
    background: #f59e0b;
    color: white;
  }

  .status-coming-soon {
    background: #6b7280;
    color: white;
  }

  .complexity-low {
    background: var(--nier-accent-cool);
    color: var(--nier-bg-primary);
  }

  .complexity-medium {
    background: #f59e0b;
    color: white;
  }

  .complexity-high {
    background: #ef4444;
    color: white;
  }

  .demo-card-body {
    padding: 0 1.5rem 1.5rem 1.5rem;
  }

  .demo-description {
    color: var(--nier-text-secondary);
    line-height: 1.5,
    margin: 0 0 1.5rem 0;
  }

  .demo-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .feature-tag {
    background: var(--nier-bg-tertiary);
    color: var(--nier-text-primary);
    border: 1px solid var(--nier-border-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
  }

  .demo-card-footer {
    padding: 0 1.5rem 1.5rem 1.5rem;
  }

  .demo-launch-btn {
    display: block;
    width: 100%;
    padding: 1rem;
    background: var(--nier-accent-warm);
    color: var(--nier-bg-primary);
    text-decoration none;
    text-align: center;
    border-radius: 0.5rem;
    font-weight: bold;
    transition all 0.2s ease;
  }

  .demo-launch-btn:hover {
    background: var(--nier-accent-cool);
    transform: translateY(-1px);
  }

  /* Footer */
  .showcase-footer {
    background: var(--nier-bg-secondary);
    border-top: 1px solid var(--nier-border-primary);
    padding: 2rem;
    margin-top: 3rem;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .footer-text {
    color: var(--nier-text-muted);
    margin: 0,
  }

  .footer-links {
    display: flex;
    gap: 1rem;
  }

  .footer-links a {
    color: var(--nier-accent-cool);
    text-decoration none;
  }

  .footer-links a:hover {
    color: var(--nier-accent-warm);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .showcase-header {
      padding: 2rem 1rem;
    }

    .showcase-title {
      font-size: 2rem;
    }

    .showcase-stats {
      gap: 2rem;
    }

    .showcase-content {
      padding: 2rem 1rem;
    }

    .demo-grid {
      grid-template-columns: 1fr;
    }

    .footer-content {
      flex-direction column;
      text-align: center;
    }
  }
</style>
