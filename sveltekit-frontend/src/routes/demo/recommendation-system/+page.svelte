<!-- Recommendation System Demo - Gaming CSS Modals Integration -->
<script lang="ts">
  import { $state, $derived } from 'svelte';
  import { onMount, onDestroy } from 'svelte';
  import RecommendationContainer from '$lib/components/ui/gaming/RecommendationContainer.svelte';
  import { recommendationOrchestrator, recommendations } from '$lib/services/recommendation-orchestrator';
  import Button from '$lib/components/ui/button/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  // State for demo
  let currentConsole = $state('n64');
  let isDetectiveMode = $state(false);
  let showRecommendations = $state(true);
  let simulatedActivity = $state('active');
  
  // Mock recommendations for demo
  let mockRecommendations = $state([
    {
      id: 'demo-detective-1',
      type: 'detective' as const,
      title: 'Evidence Pattern Detected',
      description: 'Cross-reference analysis found 3 documents with matching timestamps. Investigation recommended.',
      confidence: 0.89,
      priority: 'high' as const,
      action: () => console.log('Opening pattern analysis...')
    },
    {
      id: 'demo-legal-1', 
      type: 'legal' as const,
      title: 'Legal Precedent Found',
      description: 'Similar case from 2019 with 87% match. Review for applicable precedents.',
      confidence: 0.87,
      priority: 'medium' as const,
      action: () => console.log('Opening legal precedent...')
    },
    {
      id: 'demo-evidence-1',
      type: 'evidence' as const,
      title: 'OCR Processing Complete',
      description: 'Document.pdf processed with 94% confidence. 3 suspicious terms flagged.',
      confidence: 0.94,
      priority: 'critical' as const,
      action: () => console.log('Opening OCR results...')
    },
    {
      id: 'demo-ai-1',
      type: 'ai' as const,
      title: 'AI Analysis Ready',
      description: 'NES-RL agent suggests running relationship mapping on uploaded contacts.',
      confidence: 0.76,
      priority: 'low' as const,
      action: () => console.log('Starting relationship mapping...')
    }
  ]);

  // Console options for demo
  const consoleOptions = [
    { value: 'nes', label: 'NES (8-bit)', description: 'Classic pixelated retro style' },
    { value: 'snes', label: 'SNES (16-bit)', description: 'Enhanced colors and smoother styling' },
    { value: 'n64', label: 'N64 (64-bit)', description: 'Modern 3D styling with gradients' },
    { value: 'ps1', label: 'PlayStation 1', description: 'Minimalist industrial design' },
    { value: 'ps2', label: 'PlayStation 2', description: 'Futuristic blue styling' },
    { value: 'yorha', label: 'YoRHa Mode', description: 'NieR:Automata inspired cyberpunk' }
  ];

  // Demo activity simulator
  let activityTimer: number;
  
  function simulateActivity(activity: 'active' | 'idle' | 'typing') {
    simulatedActivity = activity;
    
    // Add contextual recommendations based on activity
    if (activity === 'idle') {
      const idleRec = {
        id: `idle-${Date.now()}`,
        type: 'ai' as const,
        title: 'Idle Detection',
        description: 'User has been idle for 2 minutes. Should I run background analysis?',
        confidence: 0.85,
        priority: 'medium' as const,
        action: () => console.log('Running background analysis...')
      };
      
      mockRecommendations = [...mockRecommendations, idleRec];
      
      // Remove after 10 seconds
      setTimeout(() => {
        mockRecommendations = mockRecommendations.filter(r => r.id !== idleRec.id);
      }, 10000);
    }
  }

  function toggleDetectiveMode() {
    isDetectiveMode = !isDetectiveMode;
    
    if (isDetectiveMode) {
      // Add detective-specific recommendations
      const detectiveRecs = [
        {
          id: `detective-${Date.now()}-1`,
          type: 'detective' as const,
          title: 'Case Analysis Ready',
          description: 'All evidence uploaded. Ready to generate case summary and timeline.',
          confidence: 0.95,
          priority: 'high' as const,
          action: () => console.log('Generating case analysis...')
        },
        {
          id: `detective-${Date.now()}-2`,
          type: 'evidence' as const,
          title: 'Missing Evidence Check',
          description: 'Potential evidence gap detected between 2:00-4:00 PM. Search for additional sources?',
          confidence: 0.72,
          priority: 'medium' as const,
          action: () => console.log('Searching for missing evidence...')
        }
      ];
      
      mockRecommendations = [...mockRecommendations, ...detectiveRecs];
    } else {
      // Remove detective recommendations
      mockRecommendations = mockRecommendations.filter(r => 
        !r.id.includes('detective-') || r.type !== 'detective'
      );
    }
  }

  function addCriticalAlert() {
    const criticalRec = {
      id: `critical-${Date.now()}`,
      type: 'ai' as const,
      title: 'SECURITY ALERT',
      description: 'Suspicious login attempt detected from unknown IP address. Immediate action required.',
      confidence: 0.99,
      priority: 'critical' as const,
      action: () => console.log('Opening security dashboard...')
    };
    
    mockRecommendations = [...mockRecommendations, criticalRec];
  }

  function clearRecommendations() {
    mockRecommendations = [];
  }

  function resetDemo() {
    clearRecommendations();
    mockRecommendations = [
      {
        id: 'demo-detective-1',
        type: 'detective',
        title: 'Evidence Pattern Detected',
        description: 'Cross-reference analysis found 3 documents with matching timestamps.',
        confidence: 0.89,
        priority: 'high',
        action: () => console.log('Opening pattern analysis...')
      },
      {
        id: 'demo-legal-1',
        type: 'legal',
        title: 'Legal Precedent Found', 
        description: 'Similar case from 2019 with 87% match. Review for applicable precedents.',
        confidence: 0.87,
        priority: 'medium',
        action: () => console.log('Opening legal precedent...')
      }
    ];
  }

  onMount(() => {
    // Update detective context for demo
    recommendationOrchestrator.updateDetectiveContext({
      evidenceCount: 12,
      pendingTasks: ['OCR Processing', 'Pattern Analysis'],
      timeInMode: 1800000 // 30 minutes
    });
    
    return () => {
      if (activityTimer) clearInterval(activityTimer);
    };
  });
</script>

<svelte:head>
  <title>Recommendation System Demo - Gaming CSS Modals</title>
  <meta name="description" content="Retro gaming styled recommendation system with NES-RL integration" />
</svelte:head>

<!-- Navigation Bar Simulation -->
<div class="demo-navbar">
  <div class="nav-content">
    <h1>🎮 Legal AI Platform</h1>
    <div class="nav-controls">
      <span class="console-indicator">Console: {consoleOptions.find(c => c.value === currentConsole)?.label}</span>
      <span class="mode-indicator" class:detective={isDetectiveMode}>
        {isDetectiveMode ? '🕵️ Detective Mode' : '📋 Standard Mode'}
      </span>
    </div>
  </div>
</div>

<!-- Recommendation Container (appears under nav) -->
<RecommendationContainer
  {currentConsole}
  bind:showContainer={showRecommendations}
  recommendations={mockRecommendations}
  autoHide={false}
  position="under-nav"
/>

<!-- Demo Content -->
<div class="demo-content">
  <div class="demo-grid">
    <!-- Console Style Selector -->
    <Card.Root class="control-card">
      <Card.Header>
        <Card.Title>🎮 Console Style</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="console-grid">
          {#each consoleOptions as console}
            <button
              class="console-option"
              class:selected={currentConsole === console.value}
              onclick={() => currentConsole = console.value}
            >
              <div class="console-label">{console.label}</div>
              <div class="console-desc">{console.description}</div>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Demo Controls -->
    <Card.Root class="control-card">
      <Card.Header>
        <Card.Title>🎯 Demo Controls</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="demo-controls">
          <Button
            variant={isDetectiveMode ? 'default' : 'outline'}
            onclick={toggleDetectiveMode}
          >
            {isDetectiveMode ? 'Exit Detective Mode' : 'Enter Detective Mode'}
          </Button>
          
          <Button
            variant="outline"
            onclick={() => simulateActivity('idle')}
          >
            Simulate Idle State
          </Button>
          
          <Button
            variant="outline"
            onclick={() => simulateActivity('typing')}
          >
            Simulate Typing
          </Button>
          
          <Button
            variant="destructive"
            onclick={addCriticalAlert}
          >
            Add Critical Alert
          </Button>
        </div>
        
        <div class="utility-controls">
          <Button variant="secondary" onclick={clearRecommendations}>
            Clear All
          </Button>
          <Button variant="secondary" onclick={resetDemo}>
            Reset Demo
          </Button>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Activity Status -->
    <Card.Root class="status-card">
      <Card.Header>
        <Card.Title>📊 System Status</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="status-grid">
          <div class="status-item">
            <label>User Activity:</label>
            <span class="status-value {simulatedActivity}">{simulatedActivity}</span>
          </div>
          <div class="status-item">
            <label>Recommendations:</label>
            <span class="status-value">{mockRecommendations.length}</span>
          </div>
          <div class="status-item">
            <label>Critical:</label>
            <span class="status-value critical">
              {mockRecommendations.filter(r => r.priority === 'critical').length}
            </span>
          </div>
          <div class="status-item">
            <label>Console:</label>
            <span class="status-value">{currentConsole.toUpperCase()}</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Feature Description -->
    <Card.Root class="description-card">
      <Card.Header>
        <Card.Title>🚀 Features</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">🎮</span>
            <div>
              <strong>Multi-Console Styling:</strong>
              Switch between NES, SNES, N64, PlayStation, and YoRHa themes
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🤖</span>
            <div>
              <strong>NES-RL Integration:</strong>
              AI learns user behavior and suggests optimal actions
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🕵️</span>
            <div>
              <strong>Detective Mode:</strong>
              Specialized recommendations for legal investigation workflows
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">⚡</span>
            <div>
              <strong>Real-time Updates:</strong>
              RabbitMQ integration for instant recommendation delivery
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <div>
              <strong>Contextual AI:</strong>
              Recommendations adapt based on current activity and idle detection
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<style>
  .demo-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(135deg, #1e3a8a, #3730a3);
    color: white;
    z-index: 200;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    padding: 0 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .nav-controls {
    display: flex;
    gap: 2rem;
    align-items: center;
    font-size: 0.9rem;
  }

  .console-indicator {
    opacity: 0.8;
  }

  .mode-indicator {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .mode-indicator.detective {
    background: rgba(245, 158, 11, 0.3);
    border: 1px solid #F59E0B;
  }

  .demo-content {
    margin-top: 200px; /* Space for nav + recommendation container */
    padding: 2rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .control-card, .status-card, .description-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .console-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .console-option {
    padding: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .console-option:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .console-option.selected {
    border-color: #60A5FA;
    background: rgba(96, 165, 250, 0.2);
  }

  .console-label {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .console-desc {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .demo-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .utility-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .status-item label {
    font-weight: 500;
    opacity: 0.8;
  }

  .status-value {
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    text-transform: capitalize;
  }

  .status-value.active {
    background: rgba(16, 185, 129, 0.3);
    color: #10B981;
  }

  .status-value.idle {
    background: rgba(245, 158, 11, 0.3);
    color: #F59E0B;
  }

  .status-value.typing {
    background: rgba(59, 130, 246, 0.3);
    color: #3B82F6;
  }

  .status-value.critical {
    background: rgba(239, 68, 68, 0.3);
    color: #EF4444;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .feature-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  /* Global styles for demo */
  :global(body) {
    background: linear-gradient(135deg, #0F172A, #1E293B);
    color: white;
    min-height: 100vh;
  }

  /* Dark theme for cards */
  :global(.demo-content .card) {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }

  :global(.demo-content .card h3) {
    color: white !important;
  }
</style>