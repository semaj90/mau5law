/**
 * Accessibility Demo Route - Shows enhanced accessibility across all route types
 * Demonstrates how our accessibility features work consistently across 268+ routes
 */

<script lang="ts">
  import { ButtonBits, CardBits, InputBits, DialogBits, BitsUIAccessibilityWrapper } from '$lib/components/ui/bits-ui';
  import AIAccessibilityWrapper from '$lib/components/ui/AIAccessibilityWrapper.svelte';
  import { enhancedRouteAccessibility } from '$lib/services/enhanced-route-accessibility';
  import { accessibilityService } from '$lib/services/accessibility-service';

  let currentRoute = $state('/demo/accessibility-showcase');
  let testInput = $state('');
  let showDialog = $state(false);
  let aiStatus = $state<'idle' | 'processing' | 'completed' | 'error'>('idle');
  let simulatedAIResult = $state<any>(null);

  // Simulate different route types
  const routeSimulations = [
    { type: 'essential', path: '/cases', name: 'Case Management' },
    { type: 'demo', path: '/demo/bits-ui', name: 'Bits UI Demo' },
    { type: 'test', path: '/test/accessibility', name: 'Accessibility Testing' },
    { type: 'legal', path: '/legal/documents', name: 'Legal Documents' },
    { type: 'admin', path: '/admin/users', name: 'User Administration' },
    { type: 'showcase', path: '/showcase/components', name: 'Component Showcase' }
  ];

  let currentSimulation = $state(routeSimulations[0]);

  function simulateRouteChange(simulation: typeof routeSimulations[0]) {
    currentSimulation = simulation;
    currentRoute = simulation.path;

    // Announce route change
    accessibilityService.announceToScreenReader(
      `Simulating navigation to ${simulation.name}. Route type: ${simulation.type}.`
    );

    // Update page context for accessibility
    document.title = `${simulation.name} - Legal AI Platform`;
  }

  function testAIFeatures() {
    aiStatus = 'processing';

    setTimeout(() => {
      aiStatus = 'completed';
      simulatedAIResult = {
        summary: 'Legal document analysis completed successfully',
        confidence: 0.94,
        sections: [
          { title: 'Key Legal Points', content: 'Found 3 critical legal considerations' },
          { title: 'Risk Assessment', content: 'Low risk profile identified' },
          { title: 'Recommendations', content: 'Proceed with standard documentation' }
        ]
      };
    }, 3000);
  }

  function resetAIDemo() {
    aiStatus = 'idle';
    simulatedAIResult = null;
  }

  // Get current route configuration
  let routeConfig = $derived(enhancedRouteAccessibility.getCurrentConfig());
</script>

<div class="accessibility-demo-container">
  <header class="demo-header">
    <h1>🔧 Enhanced Accessibility Across All Routes</h1>
    <p class="demo-description">
      Demonstrating consistent accessibility across all 268+ routes in the Legal AI platform.
      Our enhanced accessibility system automatically adapts to different route types.
    </p>
  </header>

  <!-- Route Type Simulator -->
  <section class="route-simulator">
    <h2>🗺️ Route Type Simulator</h2>
    <p>Switch between different route types to see how accessibility features adapt:</p>

    <div class="route-buttons">
      {#each routeSimulations as simulation}
        <BitsUIAccessibilityWrapper
          component="button"
          customAriaLabel="Simulate {simulation.name} route"
          keyboardShortcut="Enter"
        >
          <ButtonBits
            variant={currentSimulation === simulation ? 'primary' : 'outline'}
            size="sm"
            on:click={() => simulateRouteChange(simulation)}
          >
            {simulation.name}
          </ButtonBits>
        </BitsUIAccessibilityWrapper>
      {/each}
    </div>

    <!-- Current Route Info -->
    <div class="current-route-info">
      <h3>Current Route: {currentSimulation.name}</h3>
      <dl class="route-details">
        <dt>Route Type:</dt>
        <dd>{currentSimulation.type}</dd>
        <dt>Path:</dt>
        <dd>{currentRoute}</dd>
        <dt>Category:</dt>
        <dd>{routeConfig?.category || 'Loading...'}</dd>
        <dt>Voice Commands:</dt>
        <dd>{routeConfig?.enhancedFeatures.voiceCommands ? 'Enabled' : 'Disabled'}</dd>
        <dt>AI Integration:</dt>
        <dd>{routeConfig?.enhancedFeatures.aiIntegration ? 'Enabled' : 'Disabled'}</dd>
      </dl>
    </div>
  </section>

  <!-- Bits-UI Components Demo -->
  <section class="bits-ui-demo">
    <h2>🧩 Enhanced Bits-UI Components</h2>
    <p>All bits-ui components are automatically enhanced with route-specific accessibility:</p>

    <div class="component-grid">
      <!-- Enhanced Button -->
      <CardBits variant="outlined" class="component-card">
        <h3>Enhanced Buttons</h3>
        <div class="component-examples">
          <BitsUIAccessibilityWrapper
            component="button"
            customAriaLabel="Primary action for {currentSimulation.name}"
          >
            <ButtonBits variant="primary">
              Primary Action
            </ButtonBits>
          </BitsUIAccessibilityWrapper>

          <BitsUIAccessibilityWrapper
            component="button"
            contextualHelp="Secondary actions in {currentSimulation.type} routes"
          >
            <ButtonBits variant="outline">
              Secondary Action
            </ButtonBits>
          </BitsUIAccessibilityWrapper>
        </div>
      </CardBits>

      <!-- Enhanced Input -->
      <CardBits variant="outlined" class="component-card">
        <h3>Enhanced Inputs</h3>
        <div class="component-examples">
          <BitsUIAccessibilityWrapper
            component="input"
            customAriaLabel="Search input for {currentSimulation.name}"
            contextualHelp="Type to search within the current {currentSimulation.type} interface"
          >
            <InputBits
              value={testInput}
              on:input={(e) => (testInput = (e.target as HTMLInputElement)?.value || '')}
              placeholder="Enhanced input with route context..."
            />
          </BitsUIAccessibilityWrapper>
        </div>
      </CardBits>

      <!-- Enhanced Dialog -->
      <CardBits variant="outlined" class="component-card">
        <h3>Enhanced Dialogs</h3>
        <div class="component-examples">
          <BitsUIAccessibilityWrapper
            component="button"
            keyboardShortcut="Alt+D"
          >
            <ButtonBits on:click={() => showDialog = true}>
              Open Dialog (Alt+D)
            </ButtonBits>
          </BitsUIAccessibilityWrapper>
        </div>
      </CardBits>
    </div>
  </section>

  <!-- AI Accessibility Features -->
  {#if routeConfig?.enhancedFeatures.aiIntegration}
    <section class="ai-accessibility-demo">
      <h2>🤖 AI-Specific Accessibility Features</h2>
      <p>AI routes include enhanced accessibility for complex operations:</p>

      <AIAccessibilityWrapper
        operation="Legal Document Analysis"
        status={aiStatus}
        aiResult={simulatedAIResult}
        enableVoiceCommands={true}
        showProgressiveDisclosure={true}
      >
        <div class="ai-demo-controls">
          <BitsUIAccessibilityWrapper
            component="button"
            customAriaLabel="Start AI legal analysis"
            keyboardShortcut="Ctrl+Shift+A"
          >
            <ButtonBits
              variant="primary"
              on:click={testAIFeatures}
              disabled={aiStatus === 'processing'}
            >
              {aiStatus === 'processing' ? 'Analyzing...' : 'Start AI Analysis'}
            </ButtonBits>
          </BitsUIAccessibilityWrapper>

          <BitsUIAccessibilityWrapper component="button">
            <ButtonBits
              variant="outline"
              on:click={resetAIDemo}
            >
              Reset Demo
            </ButtonBits>
          </BitsUIAccessibilityWrapper>
        </div>
      </AIAccessibilityWrapper>
    </section>
  {/if}

  <!-- Accessibility Features Summary -->
  <section class="accessibility-summary">
    <h2>♿ Accessibility Features Active</h2>
    <div class="features-grid">
      <div class="feature-card">
        <h3>🎯 Route-Specific Enhancements</h3>
        <ul>
          <li>Automatic route detection</li>
          <li>Context-aware ARIA labels</li>
          <li>Route-specific keyboard shortcuts</li>
          <li>Adaptive help content</li>
        </ul>
      </div>

      <div class="feature-card">
        <h3>🧩 Bits-UI Integration</h3>
        <ul>
          <li>Enhanced focus indicators</li>
          <li>Automatic role assignment</li>
          <li>Contextual help integration</li>
          <li>Keyboard navigation</li>
        </ul>
      </div>

      <div class="feature-card">
        <h3>🎤 Voice & AI Features</h3>
        <ul>
          <li>Voice command integration</li>
          <li>AI operation announcements</li>
          <li>Progressive disclosure</li>
          <li>Screen reader optimization</li>
        </ul>
      </div>

      <div class="feature-card">
        <h3>🔧 Global Features</h3>
        <ul>
          <li>High contrast mode</li>
          <li>Font size adjustment</li>
          <li>Reduced motion support</li>
          <li>Focus management</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Testing Instructions -->
  <section class="testing-instructions">
    <h2>🧪 Test These Features</h2>
    <div class="instruction-grid">
      <div class="instruction-card">
        <h3>Keyboard Navigation</h3>
        <ul>
          <li><kbd>Tab</kbd> - Navigate between elements</li>
          <li><kbd>Alt+A</kbd> - Open accessibility settings</li>
          <li><kbd>Alt+S</kbd> - Skip to main content</li>
          <li><kbd>F1</kbd> - Contextual help</li>
        </ul>
      </div>

      <div class="instruction-card">
        <h3>Route-Specific Shortcuts</h3>
        <ul>
          <li><kbd>Alt+D</kbd> - Demo navigation (Demo routes)</li>
          <li><kbd>Alt+T</kbd> - Test controls (Test routes)</li>
          <li><kbd>Alt+L</kbd> - Legal actions (Legal routes)</li>
          <li><kbd>Ctrl+Shift+A</kbd> - Admin menu (Admin routes)</li>
        </ul>
      </div>

      <div class="instruction-card">
        <h3>AI Features</h3>
        <ul>
          <li><kbd>Ctrl+Shift+V</kbd> - Toggle voice commands</li>
          <li>Say "help" - Voice command list</li>
          <li>Say "start analysis" - Begin AI operation</li>
          <li>Say "read summary" - Hear results</li>
        </ul>
      </div>

      <div class="instruction-card">
        <h3>Screen Reader Testing</h3>
        <ul>
          <li>NVDA/JAWS/VoiceOver compatible</li>
          <li>Live region announcements</li>
          <li>Proper heading structure</li>
          <li>Descriptive labels</li>
        </ul>
      </div>
    </div>
  </section>
</div>

<!-- Enhanced Dialog Example -->
{#if showDialog}
  <BitsUIAccessibilityWrapper component="dialog">
    <DialogBits bind:open={showDialog}>
      <div class="dialog-content">
        <h2>Enhanced Dialog for {currentSimulation.name}</h2>
        <p>
          This dialog is enhanced with route-specific accessibility features.
          It includes proper focus management, keyboard navigation, and
          screen reader announcements.
        </p>
        <div class="dialog-actions">
          <ButtonBits variant="outline" on:click={() => showDialog = false}>
            Cancel
          </ButtonBits>
          <ButtonBits variant="primary" on:click={() => showDialog = false}>
            Confirm
          </ButtonBits>
        </div>
      </div>
    </DialogBits>
  </BitsUIAccessibilityWrapper>
{/if}

<style>
  .accessibility-demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: var(--font-family-sans);
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .demo-header h1 {
    font-size: 2.5rem;
    color: var(--color-primary);
    margin-bottom: 1rem;
  }

  .demo-description {
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  .route-simulator {
    background: var(--color-bg-secondary);
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 3rem;
  }

  .route-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .current-route-info {
    background: var(--color-bg-tertiary);
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 1.5rem;
  }

  .route-details {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    margin-top: 1rem;
  }

  .route-details dt {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .route-details dd {
    color: var(--color-text-secondary);
  }

  .component-grid,
  .features-grid,
  .instruction-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .component-card,
  .feature-card,
  .instruction-card {
    background: var(--color-bg-secondary);
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }

  .component-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .ai-demo-controls {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
  }

  .dialog-content {
    padding: 2rem;
    text-align: center;
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }

  kbd {
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.2rem 0.4rem;
    font-family: monospace;
    font-size: 0.9rem;
  }

  section {
    margin-bottom: 3rem;
  }

  h2 {
    color: var(--color-primary);
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  h3 {
    color: var(--color-text-primary);
    margin-bottom: 0.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 0.3rem 0;
    color: var(--color-text-secondary);
  }

  li::before {
    content: "✓ ";
    color: var(--color-success);
    font-weight: bold;
    margin-right: 0.5rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .accessibility-demo-container {
      padding: 1rem;
    }

    .component-grid,
    .features-grid,
    .instruction-grid {
      grid-template-columns: 1fr;
    }

    .route-buttons {
      flex-direction: column;
    }

    .ai-demo-controls {
      flex-direction: column;
    }
  }
</style>