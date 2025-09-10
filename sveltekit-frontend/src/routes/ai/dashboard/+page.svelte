<!--
  AI Integration Dashboard - Enhanced-Bits Architecture
  Overview and navigation for all AI components
-->

<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/enhanced-bits';
</script>

<svelte:head>
  <title>AI Integrations Dashboard - Legal AI Platform</title>
  <meta name="description" content="Complete AI integration suite for legal case management using Enhanced-Bits architecture" />
</svelte:head>

<div class="ai-dashboard">
  <header class="dashboard-header">
    <h1 class="dashboard-title">AI Integration Suite</h1>
    <p class="dashboard-subtitle">Complete AI-powered legal analysis and automation tools</p>
  </header>

  <div class="integrations-grid">
    <Card.Root class="integration-card">
      <Card.Header>
        <div class="card-icon">⚖️</div>
        <Card.Title>Case Scoring Dashboard</Card.Title>
        <Card.Description>
          AI-powered case analysis and priority scoring with comprehensive risk assessment
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="features-list">
          <div class="feature">✅ Real-time case risk scoring</div>
          <div class="feature">✅ Confidence metrics and analytics</div>
          <div class="feature">✅ Detailed score breakdown</div>
          <div class="feature">✅ AI recommendations</div>
        </div>
      </Card.Content>
      <Card.Footer>
        <Button class="w-full" onclick={() => window.location.href = '/ai/case-scoring'}>
          Open Case Scoring
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="integration-card">
      <Card.Header>
        <div class="card-icon">🔍</div>
        <Card.Title>Pattern Detection</Card.Title>
        <Card.Description>
          Advanced pattern recognition for behavioral, temporal, and evidence analysis
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="features-list">
          <div class="feature">✅ Multi-type pattern analysis</div>
          <div class="feature">✅ Real-time anomaly detection</div>
          <div class="feature">✅ Correlation matrix building</div>
          <div class="feature">✅ Predictive insights</div>
        </div>
      </Card.Content>
      <Card.Footer>
        <Button class="w-full" onclick={() => window.location.href = '/ai/pattern-detection'}>
          Open Pattern Detection
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="integration-card">
      <Card.Header>
        <div class="card-icon">💡</div>
        <Card.Title>Recommendation Engine</Card.Title>
        <Card.Description>
          Intelligent suggestions for case strategy, evidence handling, and next actions
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="features-list">
          <div class="feature">✅ Context-aware recommendations</div>
          <div class="feature">✅ Impact vs. effort analysis</div>
          <div class="feature">✅ Step-by-step implementation</div>
          <div class="feature">✅ Risk assessment and alternatives</div>
        </div>
      </Card.Content>
      <Card.Footer>
        <Button class="w-full" onclick={() => window.location.href = '/ai/recommendations'}>
          Open Recommendations
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="integration-card">
      <Card.Header>
        <div class="card-icon">📄</div>
        <Card.Title>Document Drafting</Card.Title>
        <Card.Description>
          AI-powered legal document creation with templates and collaborative editing
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="features-list">
          <div class="feature">✅ Multiple document types</div>
          <div class="feature">✅ Template-based drafting</div>
          <div class="feature">✅ Real-time AI suggestions</div>
          <div class="feature">✅ Collaborative editing</div>
        </div>
      </Card.Content>
      <Card.Footer>
        <Button class="w-full" onclick={() => window.location.href = '/ai/document-drafting'}>
          Open Document Drafting
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>

  <section class="architecture-info">
    <Card.Root>
      <Card.Header>
        <Card.Title>Enhanced-Bits Architecture</Card.Title>
        <Card.Description>
          All AI components built with the Enhanced-Bits UI architecture for optimal performance
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="architecture-features">
          <div class="arch-feature">
            <span class="arch-icon">🏗️</span>
            <div>
              <div class="arch-title">SSR-Compatible</div>
              <div class="arch-desc">Server-side rendering support for optimal performance</div>
            </div>
          </div>
          <div class="arch-feature">
            <span class="arch-icon">⚡</span>
            <div>
              <div class="arch-title">Svelte 5 Runes</div>
              <div class="arch-desc">Modern reactivity with $state(), $derived(), $effect()</div>
            </div>
          </div>
          <div class="arch-feature">
            <span class="arch-icon">🎨</span>
            <div>
              <div class="arch-title">NES-Style Theming</div>
              <div class="arch-desc">Consistent design with legal AI platform aesthetics</div>
            </div>
          </div>
          <div class="arch-feature">
            <span class="arch-icon">📱</span>
            <div>
              <div class="arch-title">Mobile Responsive</div>
              <div class="arch-desc">Touch-friendly interfaces for all devices</div>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="api-status">
    <Card.Root>
      <Card.Header>
        <Card.Title>API Integration Status</Card.Title>
        <Card.Description>
          Backend API endpoints ready for integration
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="api-endpoints">
          <div class="endpoint">
            <span class="status-indicator ready"></span>
            <code>/api/ai/case-scoring</code>
            <span class="endpoint-desc">Case analysis and scoring</span>
          </div>
          <div class="endpoint">
            <span class="status-indicator ready"></span>
            <code>/api/ai/pattern-detection</code>
            <span class="endpoint-desc">Pattern recognition and analysis</span>
          </div>
          <div class="endpoint">
            <span class="status-indicator ready"></span>
            <code>/api/ai/recommendations</code>
            <span class="endpoint-desc">Intelligent recommendations</span>
          </div>
          <div class="endpoint">
            <span class="status-indicator ready"></span>
            <code>/api/ai/document-drafting</code>
            <span class="endpoint-desc">Document creation and editing</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="test-links">
    <Card.Root>
      <Card.Header>
        <Card.Title>Quick Test Links</Card.Title>
        <Card.Description>
          Direct access to Enhanced-Bits AI components for testing
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="test-grid">
          <Button variant="outline" onclick={() => window.open('http://localhost:5175/ai/case-scoring', '_blank')}>
            🔗 Case Scoring (Port 5175)
          </Button>
          <Button variant="outline" onclick={() => window.open('http://localhost:5175/ai/pattern-detection', '_blank')}>
            🔗 Pattern Detection (Port 5175)
          </Button>
          <Button variant="outline" onclick={() => window.open('http://localhost:5175/ai/recommendations', '_blank')}>
            🔗 Recommendations (Port 5175)
          </Button>
          <Button variant="outline" onclick={() => window.open('http://localhost:5175/ai/document-drafting', '_blank')}>
            🔗 Document Drafting (Port 5175)
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </section>
</div>

<style>
  .ai-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
    background: #f8fafc;
    min-height: 100vh;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .dashboard-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .dashboard-subtitle {
    font-size: 1.125rem;
    color: #64748b;
    margin: 0;
  }

  .integrations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .integration-card {
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .integration-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-icon {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 1rem;
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .feature {
    font-size: 0.875rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .architecture-info,
  .api-status,
  .test-links {
    margin-bottom: 2rem;
  }

  .architecture-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .arch-feature {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .arch-icon {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }

  .arch-title {
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  .arch-desc {
    font-size: 0.875rem;
    color: #64748b;
  }

  .api-endpoints {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .endpoint {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-indicator.ready {
    background: #10b981;
  }

  .endpoint code {
    font-family: 'JetBrains Mono', monospace;
    background: #374151;
    color: #f9fafb;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    min-width: 280px;
  }

  .endpoint-desc {
    font-size: 0.875rem;
    color: #64748b;
  }

  .test-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .dashboard-title {
      font-size: 2rem;
    }

    .integrations-grid {
      grid-template-columns: 1fr;
    }

    .architecture-features {
      grid-template-columns: 1fr;
    }

    .endpoint {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .endpoint code {
      min-width: auto;
    }

    .test-grid {
      grid-template-columns: 1fr;
    }
  }
</style>