<!--
  Demo page for the Comprehensive Upload Analytics system
  Shows integration with contextual AI prompting, user analytics, and performance monitoring
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import ComprehensiveUploadAnalytics from '$lib/components/ComprehensiveUploadAnalytics.svelte';

  // Demo configuration
  let demoConfig = $state({
    caseId: 'case-2024-001',
    userId: 'user-demo-123',
    maxFiles: 5,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
    enableAnalytics: true,
    enableAIPrompts: true,
    expertiseLevel: 'associate' as const
  });

  let showConfiguration = $state(false);

  function updateConfig(key: string, value: any) {
    demoConfig = {
      ...demoConfig,
      [key]: value
    };
  }

  function resetToDefaults() {
    demoConfig = {
      caseId: 'case-2024-001',
      userId: 'user-demo-123',
      maxFiles: 5,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
      enableAnalytics: true,
      enableAIPrompts: true,
      expertiseLevel: 'associate'
    };
  }
</script>

<svelte:head>
  <title>Upload Analytics Demo - Legal AI Platform</title>
  <meta name="description" content="Demo of comprehensive upload analytics with contextual AI prompting and user behavior analysis" />
</svelte:head>

<main class="demo-page">
  <header class="demo-header">
    <div class="header-content">
      <h1>🚀 Comprehensive Upload Analytics Demo</h1>
      <p class="header-description">
        Experience our intelligent document upload system with contextual AI prompting,
        real-time user analytics, and performance monitoring.
      </p>

      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-icon">🤖</span>
          <span class="stat-label">AI-Powered</span>
          <span class="stat-value">Contextual Prompts</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📊</span>
          <span class="stat-label">Real-time</span>
          <span class="stat-value">User Analytics</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⚡</span>
          <span class="stat-label">Performance</span>
          <span class="stat-value">Monitoring</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Configuration Panel -->
  <section class="config-section">
    <div class="config-header">
      <button
        class="config-toggle"
        onclick={() => showConfiguration = !showConfiguration}
      >
        {showConfiguration ? '🔽' : '▶️'} Demo Configuration
      </button>

      {#if showConfiguration}
        <button class="btn-reset" onclick={resetToDefaults}>
          Reset to Defaults
        </button>
      {/if}
    </div>

    {#if showConfiguration}
      <div class="config-panel">
        <div class="config-grid">
          <div class="config-item">
            <label for="caseId">Case ID</label>
            <input
              id="caseId"
              type="text"
              bind:value={demoConfig.caseId}
              placeholder="e.g., case-2024-001"
            />
          </div>

          <div class="config-item">
            <label for="userId">User ID</label>
            <input
              id="userId"
              type="text"
              bind:value={demoConfig.userId}
              placeholder="e.g., user-demo-123"
            />
          </div>

          <div class="config-item">
            <label for="maxFiles">Max Files</label>
            <input
              id="maxFiles"
              type="number"
              bind:value={demoConfig.maxFiles}
              min="1"
              max="20"
            />
          </div>

          <div class="config-item">
            <label for="expertiseLevel">Expertise Level</label>
            <select
              id="expertiseLevel"
              bind:value={demoConfig.expertiseLevel}
            >
              <option value="paralegal">Paralegal</option>
              <option value="associate">Associate</option>
              <option value="senior">Senior</option>
              <option value="partner">Partner</option>
            </select>
          </div>

          <div class="config-item checkbox-item">
            <label>
              <input
                type="checkbox"
                bind:checked={demoConfig.enableAnalytics}
              />
              Enable User Analytics
            </label>
          </div>

          <div class="config-item checkbox-item">
            <label>
              <input
                type="checkbox"
                bind:checked={demoConfig.enableAIPrompts}
              />
              Enable AI Prompts
            </label>
          </div>
        </div>

        <div class="config-advanced">
          <h4>Allowed File Types</h4>
          <div class="file-types">
            {#each ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as type}
              <label class="file-type-option">
                <input
                  type="checkbox"
                  checked={demoConfig.allowedTypes.includes(type)}
                  onchange={(e) => {
                    if (e.target.checked) {
                      demoConfig.allowedTypes = [...demoConfig.allowedTypes, type];
                    } else {
                      demoConfig.allowedTypes = demoConfig.allowedTypes.filter(t => t !== type);
                    }
                  }}
                />
                {type.split('/')[1] || type}
              </label>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </section>

  <!-- Feature Highlights -->
  <section class="features-section">
    <h2>Key Features Demonstrated</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🧠</div>
        <h3>Contextual AI Prompting</h3>
        <ul>
          <li>Pre-upload suggestions based on user behavior</li>
          <li>Real-time insights during processing</li>
          <li>Post-upload recommendations for next steps</li>
          <li>Confidence scoring for AI suggestions</li>
        </ul>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📈</div>
        <h3>User Analytics</h3>
        <ul>
          <li>Typing speed and pattern analysis</li>
          <li>Click behavior tracking</li>
          <li>Scroll depth and engagement metrics</li>
          <li>Upload history and success patterns</li>
        </ul>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚙️</div>
        <h3>Pipeline Orchestration</h3>
        <ul>
          <li>XState v5 machine orchestration</li>
          <li>Real-time progress tracking</li>
          <li>Error handling and retry logic</li>
          <li>Performance monitoring</li>
        </ul>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>Production Ready</h3>
        <ul>
          <li>Mock AI services for development</li>
          <li>Easy production AI replacement</li>
          <li>Comprehensive error handling</li>
          <li>TypeScript type safety</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Demo Component -->
  <section class="demo-component">
    <h2>Live Demo</h2>
    <div class="demo-wrapper">
      <ComprehensiveUploadAnalytics
        caseId={demoConfig.caseId}
        userId={demoConfig.userId}
        maxFiles={demoConfig.maxFiles}
        allowedTypes={demoConfig.allowedTypes}
        enableAnalytics={demoConfig.enableAnalytics}
        enableAIPrompts={demoConfig.enableAIPrompts}
        expertiseLevel={demoConfig.expertiseLevel}
      />
    </div>
  </section>

  <!-- Technical Details -->
  <section class="technical-section">
    <h2>Technical Implementation</h2>
    <div class="technical-grid">
      <div class="tech-card">
        <h3>🏗️ Architecture</h3>
        <ul>
          <li><strong>State Management:</strong> XState v5 machines</li>
          <li><strong>Frontend:</strong> Svelte 5 with TypeScript</li>
          <li><strong>Backend:</strong> SvelteKit with Drizzle ORM</li>
          <li><strong>Database:</strong> PostgreSQL with pgvector</li>
          <li><strong>Auth:</strong> Lucia authentication</li>
        </ul>
      </div>

      <div class="tech-card">
        <h3>🤖 AI Integration</h3>
        <ul>
          <li><strong>Mock Services:</strong> Development-ready AI mocks</li>
          <li><strong>Production Ready:</strong> Easy Ollama/CUDA replacement</li>
          <li><strong>Contextual Prompts:</strong> Timing-based suggestions</li>
          <li><strong>User Analysis:</strong> Behavior pattern recognition</li>
        </ul>
      </div>

      <div class="tech-card">
        <h3>📊 Analytics</h3>
        <ul>
          <li><strong>Real-time Tracking:</strong> User interaction metrics</li>
          <li><strong>Engagement Scoring:</strong> Performance calculations</li>
          <li><strong>Behavior Patterns:</strong> Usage analysis</li>
          <li><strong>Upload History:</strong> Success rate tracking</li>
        </ul>
      </div>

      <div class="tech-card">
        <h3>🚀 Performance</h3>
        <ul>
          <li><strong>Pipeline Status:</strong> Real-time progress</li>
          <li><strong>Error Handling:</strong> Comprehensive retry logic</li>
          <li><strong>Optimization:</strong> Efficient state management</li>
          <li><strong>Monitoring:</strong> Performance metrics</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Usage Instructions -->
  <section class="instructions-section">
    <h2>How to Use This Demo</h2>
    <div class="instructions-list">
      <div class="instruction-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h4>Configure Settings</h4>
          <p>Adjust the demo configuration above to test different scenarios and user types.</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h4>Upload Files</h4>
          <p>Drag and drop files or click to select. Watch for contextual AI prompts before upload.</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h4>Monitor Progress</h4>
          <p>Observe real-time progress tracking and AI insights during processing.</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number">4</div>
        <div class="step-content">
          <h4>Review Results</h4>
          <p>See AI analysis results, suggested next steps, and user analytics insights.</p>
        </div>
      </div>
    </div>
  </section>
</main>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #333;
  }

  .demo-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 3rem 2rem;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header-content h1 {
    font-size: 3rem;
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-description {
    font-size: 1.25rem;
    color: #6b7280;
    margin: 0 0 2rem 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .header-stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-weight: 600;
    color: #374151;
  }

  .config-section {
    background: white;
    margin: 2rem;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .config-toggle {
    background: none;
    border: none;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .config-panel {
    padding: 2rem;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-item.checkbox-item {
    flex-direction: row;
    align-items: center;
  }

  .config-item label {
    font-weight: 500;
    color: #374151;
  }

  .config-item input, .config-item select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .config-item input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .config-advanced h4 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .file-types {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .file-type-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .features-section, .technical-section {
    background: white;
    margin: 2rem;
    padding: 3rem 2rem;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .features-section h2, .technical-section h2 {
    text-align: center;
    font-size: 2.5rem;
    margin: 0 0 3rem 0;
    color: #374151;
  }

  .features-grid, .technical-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .feature-card, .tech-card {
    background: #f9fafb;
    padding: 2rem;
    border-radius: 1rem;
    border: 1px solid #e5e7eb;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .feature-card:hover, .tech-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  }

  .feature-icon {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 1rem;
  }

  .feature-card h3, .tech-card h3 {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
    color: #374151;
    text-align: center;
  }

  .feature-card ul, .tech-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .feature-card li, .tech-card li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
    color: #6b7280;
  }

  .feature-card li:last-child, .tech-card li:last-child {
    border-bottom: none;
  }

  .tech-card li strong {
    color: #374151;
  }

  .demo-component {
    background: white;
    margin: 2rem;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .demo-component h2 {
    text-align: center;
    font-size: 2.5rem;
    margin: 0 0 2rem 0;
    color: #374151;
  }

  .demo-wrapper {
    max-width: 1200px;
    margin: 0 auto;
  }

  .instructions-section {
    background: white;
    margin: 2rem;
    padding: 3rem 2rem;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .instructions-section h2 {
    text-align: center;
    font-size: 2.5rem;
    margin: 0 0 3rem 0;
    color: #374151;
  }

  .instructions-list {
    max-width: 800px;
    margin: 0 auto;
  }

  .instruction-step {
    display: flex;
    gap: 2rem;
    margin-bottom: 3rem;
    align-items: flex-start;
  }

  .step-number {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .step-content h4 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  .step-content p {
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
  }

  .btn-reset {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-reset:hover {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    .demo-page {
      margin: 0;
    }

    .demo-header {
      padding: 2rem 1rem;
    }

    .header-content h1 {
      font-size: 2rem;
    }

    .header-stats {
      gap: 1.5rem;
    }

    .config-section, .features-section, .technical-section, .demo-component, .instructions-section {
      margin: 1rem;
      padding: 2rem 1rem;
    }

    .config-grid {
      grid-template-columns: 1fr;
    }

    .features-grid, .technical-grid {
      grid-template-columns: 1fr;
    }

    .instruction-step {
      flex-direction: column;
      gap: 1rem;
    }

    .step-number {
      align-self: flex-start;
    }
  }
</style>
