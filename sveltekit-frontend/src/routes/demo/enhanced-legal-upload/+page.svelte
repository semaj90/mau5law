<!--
  Enhanced Legal Upload Analytics Demo
  Showcasing production integration with enhanced-bits UI, Ollama AI, and full legal workflow
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import EnhancedLegalUploadAnalytics from '$lib/components/EnhancedLegalUploadAnalytics.svelte';
  import {
    Button,
    Card,
    Dialog,
    Select
  } from '$lib/components/ui/enhanced-bits';

  // Demo configuration state
  let demoConfig = $state({
    mode: 'detective' as 'standard' | 'detective' | 'evidence-board',
    expertiseLevel: 'associate' as 'paralegal' | 'associate' | 'senior' | 'partner',
    practiceArea: 'litigation',
    urgency: 'high' as 'low' | 'medium' | 'high' | 'critical',
    enableAI: true,
    enableAnalytics: true,
    showAdvanced: false
  });

  // Mock user session (in production this would come from Lucia auth)
  let mockUser = $state({
    id: 'user-123',
    name: 'Sarah Chen',
    role: 'associate',
    barNumber: 'CA-789012',
    firmId: 'firm-456'
  });

  // Mock case data
  let mockCase = $state({
    id: 'case-2024-001',
    title: 'Thompson v. Acme Industries',
    type: 'Personal Injury',
    practiceArea: 'litigation',
    urgency: 'high',
    clientId: 'client-789'
  });

  // System status
  let systemStatus = $state({
    ollama: false,
    database: false,
    auth: true,
    embeddings: false
  });

  let showSystemDialog = $state(false);
  let showConfigDialog = $state(false);

  onMount(async () => {
    await checkSystemStatus();
  });

  async function checkSystemStatus() {
    try {
      // Check Ollama
      const ollamaResponse = await fetch('/api/ai/ollama/health');
      systemStatus.ollama = ollamaResponse.ok;

      // Check Database
      const dbResponse = await fetch('/api/database/legal-documents');
      systemStatus.database = dbResponse.ok;

      // Check embeddings capability
      if (systemStatus.ollama) {
        const modelsResponse = await fetch('http://localhost:11434/api/tags');
        if (modelsResponse.ok) {
          const models = await modelsResponse.json();
          systemStatus.embeddings = models.models?.some((m: any) =>
            m.name.includes('embed') || m.name.includes('mxbai')
          ) || false;
        }
      }
    } catch (error) {
      console.warn('System status check failed:', error);
    }
  }

  function getStatusColor(status: boolean) {
    return status ? 'bg-green-500' : 'bg-red-500';
  }

  function getUrgencyColor(urgency: string) {
    switch (urgency) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  }
</script>

<svelte:head>
  <title>Enhanced Legal Upload Analytics - Production Demo</title>
  <meta name="description" content="Advanced legal document upload with AI analysis, Ollama integration, and enhanced-bits UI" />
</svelte:head>

<div class="legal-demo-container yorha-theme">
  <!-- Header with System Status -->
  <div class="demo-header">
    <div class="header-content">
      <div class="title-section">
        <h1 class="demo-title">⚖️ Enhanced Legal Upload Analytics</h1>
        <p class="demo-subtitle">Production-Ready Legal AI with Ollama Integration</p>
      </div>

      <div class="status-section">
        <Button
          variant="outline"
          size="sm"
          onclick={() => showSystemDialog = true}
        >
          System Status
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={() => showConfigDialog = true}
        >
          Demo Config
        </Button>
      </div>
    </div>

    <!-- Quick Status Indicators -->
    <div class="status-indicators">
      <div class="status-item">
        <div class="status-dot {getStatusColor(systemStatus.ollama)}"></div>
        <span>Ollama AI</span>
      </div>
      <div class="status-item">
        <div class="status-dot {getStatusColor(systemStatus.database)}"></div>
        <span>Database</span>
      </div>
      <div class="status-item">
        <div class="status-dot {getStatusColor(systemStatus.auth)}"></div>
        <span>Auth</span>
      </div>
      <div class="status-item">
        <div class="status-dot {getStatusColor(systemStatus.embeddings)}"></div>
        <span>Embeddings</span>
      </div>
    </div>
  </div>

  <!-- Context Cards -->
  <div class="context-cards">
    <Card.Root class="context-card user-card">
      <Card.Header>
        <Card.Title>👤 Current User</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="user-info">
          <div class="user-name">{mockUser.name}</div>
          <div class="user-details">
            <span class="role-badge">{mockUser.role}</span>
            <span class="bar-number">Bar: {mockUser.barNumber}</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="context-card case-card">
      <Card.Header>
        <Card.Title>📁 Active Case</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="case-info">
          <div class="case-title">{mockCase.title}</div>
          <div class="case-details">
            <span class="case-type-badge">{mockCase.type}</span>
            <span class={getUrgencyColor(mockCase.urgency)}>
              {mockCase.urgency.toUpperCase()} Priority
            </span>
          </div>
          <div class="case-id">Case ID: {mockCase.id}</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="context-card mode-card">
      <Card.Header>
        <Card.Title>🔧 Current Mode</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="mode-info">
          <div class="mode-badge yorha-badge">
            {demoConfig.mode === 'detective' ? '🕵️ Detective' :
             demoConfig.mode === 'evidence-board' ? '📋 Evidence Board' :
             '📄 Standard'}
          </div>
          <div class="mode-features">
            <span class="feature {demoConfig.enableAI ? 'enabled' : 'disabled'}">
              🤖 AI Analysis
            </span>
            <span class="feature {demoConfig.enableAnalytics ? 'enabled' : 'disabled'}">
              📊 User Analytics
            </span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Production Warning -->
  {#if !systemStatus.ollama || !systemStatus.database}
    <Card.Root class="warning-card">
      <Card.Header>
        <Card.Title class="warning-title">⚠️ Production Services Status</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="warning-content">
          <p>Some production services are not available. The system will use fallback implementations:</p>
          <ul class="service-list">
            {#if !systemStatus.ollama}
              <li class="service-item offline">
                <span class="service-name">🤖 Ollama AI Service</span>
                <span class="service-fallback">→ Mock AI analysis with legal templates</span>
              </li>
            {/if}
            {#if !systemStatus.database}
              <li class="service-item offline">
                <span class="service-name">🗄️ PostgreSQL Database</span>
                <span class="service-fallback">→ Local storage with session persistence</span>
              </li>
            {/if}
            {#if !systemStatus.embeddings}
              <li class="service-item offline">
                <span class="service-name">🔍 Vector Embeddings</span>
                <span class="service-fallback">→ Keyword-based search fallback</span>
              </li>
            {/if}
          </ul>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Enhanced Legal Upload Component -->
  <div class="upload-component-wrapper">
    <EnhancedLegalUploadAnalytics
      caseId={mockCase.id}
      userId={mockUser.id}
      maxFiles={15}
      allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
      enableAnalytics={demoConfig.enableAnalytics}
      enableAIPrompts={demoConfig.enableAI}
      expertiseLevel={demoConfig.expertiseLevel}
      mode={demoConfig.mode}
      legalContext={{
        practiceArea: demoConfig.practiceArea,
        caseType: mockCase.type,
        urgency: demoConfig.urgency
      }}
    />
  </div>

  <!-- Feature Highlights -->
  <div class="feature-highlights">
    <Card.Root class="feature-card">
      <Card.Header>
        <Card.Title>🚀 Production Features</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <h4>Ollama AI Integration</h4>
              <p>Advanced legal document analysis with Gemma 3 (270MB) model</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🗄️</div>
            <div class="feature-text">
              <h4>PostgreSQL + Drizzle ORM</h4>
              <p>Production database with type-safe queries and migrations</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🔐</div>
            <div class="feature-text">
              <h4>Lucia v3 Authentication</h4>
              <p>Secure session management with role-based access control</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🔍</div>
            <div class="feature-text">
              <h4>pgvector Embeddings</h4>
              <p>Semantic search with vector similarity matching</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">⚖️</div>
            <div class="feature-text">
              <h4>Legal-Specific AI</h4>
              <p>Privilege detection, entity extraction, and legal citations</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <div class="feature-text">
              <h4>User Analytics</h4>
              <p>Behavioral analysis and workflow optimization</p>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<!-- System Status Dialog -->
{#if showSystemDialog}
  <Dialog.Root open={showSystemDialog} onOpenChange={(open: boolean) => showSystemDialog = open}>
    <Dialog.Content class="system-status-dialog">
      <Dialog.Header>
        <Dialog.Title>🖥️ System Status</Dialog.Title>
        <Dialog.Description>Production service availability and health</Dialog.Description>
      </Dialog.Header>

      <div class="status-details">
        <div class="status-item-detail">
          <div class="service-header">
            <div class="status-dot {getStatusColor(systemStatus.ollama)}"></div>
            <h4>Ollama AI Service</h4>
            <Badge variant={systemStatus.ollama ? 'success' : 'destructive'}>
              {systemStatus.ollama ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p class="service-description">
            Local AI inference engine for legal document analysis.
            {systemStatus.ollama ? 'Ready for production analysis.' : 'Using fallback mock analysis.'}
          </p>
        </div>

        <div class="status-item-detail">
          <div class="service-header">
            <div class="status-dot {getStatusColor(systemStatus.database)}"></div>
            <h4>PostgreSQL Database</h4>
            <Badge variant={systemStatus.database ? 'success' : 'destructive'}>
              {systemStatus.database ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <p class="service-description">
            Production database with Drizzle ORM for document storage and metadata.
            {systemStatus.database ? 'All operations available.' : 'Using local storage fallback.'}
          </p>
        </div>

        <div class="status-item-detail">
          <div class="service-header">
            <div class="status-dot {getStatusColor(systemStatus.auth)}"></div>
            <h4>Lucia Authentication</h4>
            <Badge variant="success">Active</Badge>
          </div>
          <p class="service-description">
            Session-based authentication with role management. Mock user session active.
          </p>
        </div>

        <div class="status-item-detail">
          <div class="service-header">
            <div class="status-dot {getStatusColor(systemStatus.embeddings)}"></div>
            <h4>Vector Embeddings</h4>
            <Badge variant={systemStatus.embeddings ? 'success' : 'warning'}>
              {systemStatus.embeddings ? 'Available' : 'Limited'}
            </Badge>
          </div>
          <p class="service-description">
            pgvector with embedding models for semantic search.
            {systemStatus.embeddings ? 'Full search capabilities enabled.' : 'Basic search available.'}
          </p>
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => checkSystemStatus()}>
          Refresh Status
        </Button>
        <Button onclick={() => showSystemDialog = false}>Close</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<!-- Demo Configuration Dialog -->
{#if showConfigDialog}
  <Dialog.Root open={showConfigDialog} onOpenChange={(open: boolean) => showConfigDialog = open}>
    <Dialog.Content class="config-dialog">
      <Dialog.Header>
        <Dialog.Title>⚙️ Demo Configuration</Dialog.Title>
        <Dialog.Description>Customize the demo experience</Dialog.Description>
      </Dialog.Header>

      <div class="config-form">
        <div class="config-section">
          <h4>User Settings</h4>
          <div class="form-field">
            <label for="expertise-select">Expertise Level</label>
            <Select.Root bind:value={demoConfig.expertiseLevel}>
              <Select.Trigger id="expertise-select">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="paralegal">Paralegal</Select.Item>
                <Select.Item value="associate">Associate</Select.Item>
                <Select.Item value="senior">Senior Attorney</Select.Item>
                <Select.Item value="partner">Partner</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div class="config-section">
          <h4>Case Context</h4>
          <div class="form-field">
            <label for="practice-area-select">Practice Area</label>
            <Select.Root bind:value={demoConfig.practiceArea}>
              <Select.Trigger id="practice-area-select">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="litigation">Litigation</Select.Item>
                <Select.Item value="corporate">Corporate</Select.Item>
                <Select.Item value="real_estate">Real Estate</Select.Item>
                <Select.Item value="family">Family Law</Select.Item>
                <Select.Item value="criminal">Criminal</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <div class="form-field">
            <label for="urgency-select">Case Urgency</label>
            <Select.Root bind:value={demoConfig.urgency}>
              <Select.Trigger id="urgency-select">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="low">Low</Select.Item>
                <Select.Item value="medium">Medium</Select.Item>
                <Select.Item value="high">High</Select.Item>
                <Select.Item value="critical">Critical</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div class="config-section">
          <h4>Interface Mode</h4>
          <div class="form-field">
            <label for="mode-select">Upload Mode</label>
            <Select.Root bind:value={demoConfig.mode}>
              <Select.Trigger id="mode-select">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="standard">Standard</Select.Item>
                <Select.Item value="detective">Detective Mode</Select.Item>
                <Select.Item value="evidence-board">Evidence Board</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div class="config-section">
          <h4>AI Features</h4>
          <div class="form-field switch-field">
            <Switch
              bind:checked={demoConfig.enableAI}
              id="enable-ai"
            />
            <label for="enable-ai">Enable AI Analysis</label>
          </div>

          <div class="form-field switch-field">
            <Switch
              bind:checked={demoConfig.enableAnalytics}
              id="enable-analytics"
            />
            <label for="enable-analytics">Enable User Analytics</label>
          </div>
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => showConfigDialog = false}>
          Cancel
        </Button>
        <Button onclick={() => showConfigDialog = false}>
          Apply Settings
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  .legal-demo-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f1419 0%, #1a1f29 100%);
    color: #e8e8e8;
    font-family: 'JetBrains Mono', monospace;
  }

  .demo-header {
    padding: 2rem;
    border-bottom: 1px solid #404040;
    background: rgba(24, 24, 24, 0.95);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    margin-bottom: 1rem;
  }

  .demo-title {
    font-size: 2rem;
    font-weight: 600;
    color: #ffd700;
    margin-bottom: 0.5rem;
  }

  .demo-subtitle {
    color: #999;
    font-size: 1.125rem;
  }

  .status-section {
    display: flex;
    gap: 1rem;
  }

  .status-indicators {
    display: flex;
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    justify-content: center;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .status-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }

  .context-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .context-card {
    background: rgba(24, 24, 24, 0.95);
    border: 1px solid #404040;
  }

  .user-info,
  .case-info,
  .mode-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .user-name,
  .case-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #e8e8e8;
  }

  .user-details,
  .case-details {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .bar-number,
  .case-id {
    font-size: 0.875rem;
    color: #999;
    font-family: monospace;
  }

  .mode-badge {
    font-size: 1rem;
    padding: 0.5rem 1rem;
  }

  .mode-features {
    display: flex;
    gap: 1rem;
  }

  .feature {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .feature.enabled {
    background: rgba(81, 207, 102, 0.2);
    color: #51cf66;
  }

  .feature.disabled {
    background: rgba(64, 64, 64, 0.3);
    color: #999;
  }

  .warning-card {
    margin: 0 2rem 2rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid #ff6b6b;
  }

  .warning-title {
    color: #ff6b6b;
  }

  .warning-content p {
    margin-bottom: 1rem;
    color: #e8e8e8;
  }

  .service-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .service-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(24, 24, 24, 0.7);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .service-item.offline {
    border-color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
  }

  .service-name {
    font-weight: 500;
    color: #e8e8e8;
  }

  .service-fallback {
    font-size: 0.875rem;
    color: #999;
    font-style: italic;
  }

  .upload-component-wrapper {
    padding: 0 2rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-highlights {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-card {
    background: rgba(24, 24, 24, 0.95);
    border: 1px solid #404040;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .feature-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
  }

  .feature-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .feature-text h4 {
    color: #ffd700;
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
  }

  .feature-text p {
    color: #999;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .system-status-dialog,
  .config-dialog {
    max-width: 600px;
    background: rgba(24, 24, 24, 0.98);
    border: 1px solid #404040;
    color: #e8e8e8;
  }

  .status-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .status-item-detail {
    padding: 1rem;
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
  }

  .service-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .service-header h4 {
    flex: 1;
    color: #e8e8e8;
    margin: 0;
  }

  .service-description {
    color: #999;
    font-size: 0.875rem;
    line-height: 1.4;
    margin: 0;
  }

  .config-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .config-section h4 {
    color: #ffd700;
    margin: 0;
    font-size: 1.125rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field.switch-field {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .form-field label {
    font-size: 0.875rem;
    color: #e8e8e8;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .status-indicators {
      flex-wrap: wrap;
      gap: 1rem;
    }

    .context-cards {
      grid-template-columns: 1fr;
      padding: 1rem;
    }

    .upload-component-wrapper,
    .feature-highlights {
      padding: 1rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .user-details,
    .case-details {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
