<script lang="ts">
  import {
    ButtonBits,
    CardBits,
    InputBits,
    DialogBits,
    DropdownBits,
    SelectBits,
    TabsBits,
    TooltipBits
  } from '$lib/components/ui/bits-ui';

  // Svelte 5 state
  let inputValue = $state('');
  let dialogOpen = $state(false);
  let dropdownOpen = $state(false);
  let selectedValue = $state('');
  let activeTab = $state('features');

  // Sample data
  const selectOptions = [
    { value: 'primary', label: '🎯 Primary Action' },
    { value: 'secondary', label: '⚙️ Secondary Action' },
    { value: 'warning', label: '⚠️ Warning Action' },
    { value: 'success', label: '✅ Success Action' }
  ];

  const tabItems = [
    { value: 'features', label: '🎮 Features' },
    { value: 'components', label: '🧩 Components' },
    { value: 'styling', label: '🎨 Styling' }
  ];
</script>

<svelte:head>
  <link href="https://unpkg.com/nes.css@2.3.0/css/nes.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css?family=Press+Start+2P" rel="stylesheet">
</svelte:head>

<div class="nes-container with-title is-centered game-showcase">
  <p class="title">🎮 Professional bits-ui + NES.css Showcase</p>

  <div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <div class="nes-container is-dark with-title">
      <p class="title">Welcome to the Future of Legal Gaming UI!</p>
      <p class="showcase-description">
        Professional Svelte 5 components built with bits-ui primitives,
        enhanced with retro NES.css styling for the ultimate legal AI experience.
      </p>
      <div class="nes-text is-success feature-list">
        <p>✓ bits-ui v2.9.6 (Svelte 5 compatible)</p>
        <p>✓ Professional legal AI theme integration</p>
        <p>✓ Retro gaming aesthetics with NES.css</p>
        <p>✓ Full accessibility compliance</p>
      </div>
    </div>

    <!-- Button Showcase -->
    <section class="component-section">
      <h2 class="nes-text is-primary section-title">🎯 Professional Button Components</h2>

      <div class="nes-container">
        <div class="button-showcase">
          <TooltipBits content="Professional primary action button with NES styling">
            <ButtonBits variant="primary" class="nes-btn-enhanced">🎮 Primary Action</ButtonBits>
          </TooltipBits>

          <TooltipBits content="Secondary action with retro gaming aesthetics">
            <ButtonBits variant="secondary" class="nes-btn-enhanced">⚙️ Secondary</ButtonBits>
          </TooltipBits>

          <TooltipBits content="Ghost variant with transparent background">
            <ButtonBits variant="ghost" class="nes-btn-enhanced">👻 Ghost Mode</ButtonBits>
          </TooltipBits>

          <TooltipBits content="Loading state with professional animation">
            <ButtonBits loading class="nes-btn-enhanced">🔄 Loading...</ButtonBits>
          </TooltipBits>

          <ButtonBits variant="success" class="nes-btn-enhanced">✅ Success</ButtonBits>
          <ButtonBits variant="warning" class="nes-btn-enhanced">⚠️ Warning</ButtonBits>
          <ButtonBits variant="destructive" class="nes-btn-enhanced">💥 Destructive</ButtonBits>
        </div>
      </div>
    </section>

    <!-- Input & Select Showcase -->
    <section class="component-section">
      <h2 class="nes-text is-success section-title">📝 Input & Selection Components</h2>

      <div class="nes-container with-title">
        <p class="title">Legal Document Input</p>

        <div class="input-grid">
          <div class="nes-field">
            <InputBits
              label="🏛️ Case Title"
              placeholder="Enter case title..."
              bind:value={inputValue}
              description="Professional input with legal AI theming"
              class="nes-input-enhanced"
            />
          </div>

          <div class="nes-field">
            <SelectBits
              label="⚖️ Legal Action Type"
              placeholder="Choose action type..."
              options={selectOptions}
              bind:selected={selectedValue}
              description="Select from available legal actions"
              class="nes-select-enhanced"
            />
          </div>

          <div class="nes-field">
            <InputBits
              variant="filled"
              label="📄 Document ID"
              placeholder="DOC-2024-001"
              description="Filled variant with professional styling"
              class="nes-input-enhanced"
            />
          </div>

          <div class="nes-field">
            <InputBits
              variant="outlined"
              label="🔍 Search Query"
              placeholder="Search legal documents..."
              description="Outlined variant for search functionality"
              success
              class="nes-input-enhanced"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Tabs Showcase -->
    <section class="component-section">
      <h2 class="nes-text is-warning section-title">📂 Advanced Tab Navigation</h2>

      <div class="nes-container">
        <TabsBits
          tabs={tabItems}
          bind:value={activeTab}
          variant="pills"
          size="md"
          class="nes-tabs-enhanced"
        >
          {#if activeTab === 'features'}
            <div class="nes-container is-rounded tab-content">
              <h3 class="nes-text is-primary">🎮 Gaming-Enhanced Features</h3>
              <div class="feature-grid">
                <div class="nes-badge"><span class="is-success">✓ Svelte 5 Runes</span></div>
                <div class="nes-badge"><span class="is-primary">✓ bits-ui Primitives</span></div>
                <div class="nes-badge"><span class="is-warning">✓ NES.css Styling</span></div>
                <div class="nes-badge"><span class="is-error">✓ Accessibility</span></div>
              </div>
              <div class="nes-text">
                <p>Experience the perfect fusion of modern web development with retro gaming aesthetics.</p>
              </div>
            </div>
          {:else if activeTab === 'components'}
            <div class="nes-container is-rounded tab-content">
              <h3 class="nes-text is-primary">🧩 Available Components</h3>
              <div class="component-list">
                <div class="nes-container is-dark component-item">
                  <p>🎯 ButtonBits - Professional button with gaming flair</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>📝 InputBits - Enhanced input with validation</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>🎴 CardBits - Flexible card layouts</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>💬 DialogBits - Modal dialogs with transitions</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>📋 SelectBits - Dropdown selection</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>📂 TabsBits - Tab navigation</p>
                </div>
                <div class="nes-container is-dark component-item">
                  <p>💡 TooltipBits - Contextual tooltips</p>
                </div>
              </div>
            </div>
          {:else if activeTab === 'styling'}
            <div class="nes-container is-rounded tab-content">
              <h3 class="nes-text is-primary">🎨 Styling Integration</h3>
              <div class="style-demo">
                <div class="nes-container with-title">
                  <p class="title">Color Palette</p>
                  <div class="color-grid">
                    <div class="color-sample primary">Primary</div>
                    <div class="color-sample success">Success</div>
                    <div class="color-sample warning">Warning</div>
                    <div class="color-sample error">Error</div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </TabsBits>
      </div>
    </section>

    <!-- Interactive Showcase -->
    <section class="component-section">
      <h2 class="nes-text is-error section-title">🎲 Interactive Elements</h2>

      <div class="interactive-demo">
        <div class="nes-container is-dark">
          <h3 class="nes-text is-primary">Dialog & Tooltip Demo</h3>

          <div class="demo-controls">
            <TooltipBits content="Open professional dialog with NES.css styling" side="top">
              <ButtonBits
                variant="primary"
                onclick={() => dialogOpen = true}
                class="nes-btn-enhanced"
              >
                🏛️ Open Legal Dialog
              </ButtonBits>
            </TooltipBits>

            <TooltipBits content="Current selection: {selectedValue || 'None'}" side="bottom">
              <div class="nes-badge selection-display">
                <span class="is-primary">Selected: {selectedValue || 'None'}</span>
              </div>
            </TooltipBits>
          </div>

          <div class="status-display">
            <div class="nes-container is-rounded">
              <p>Input Value: <span class="nes-text is-success">"{inputValue || 'Empty'}"</span></p>
              <p>Selected Action: <span class="nes-text is-warning">{selectedValue || 'None'}</span></p>
              <p>Active Tab: <span class="nes-text is-primary">{activeTab}</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer-section">
      <div class="nes-container is-dark with-title">
        <p class="title">🏁 Legal AI Gaming Complete!</p>
        <p>Professional components meet retro aesthetics for the ultimate legal tech experience.</p>
        <div class="footer-stats">
          <span class="nes-text is-success">Components: 8</span> |
          <span class="nes-text is-warning">Framework: Svelte 5</span> |
          <span class="nes-text is-primary">Style: bits-ui + NES.css</span> |
          <span class="nes-text is-error">Accessibility: ✓</span>
        </div>
      </div>
    </footer>
  </div>

  <!-- Dialog Component -->
  <DialogBits bind:open={dialogOpen} size="lg">
    <div class="nes-container dialog-nes-content">
      <h3 class="nes-text is-primary">🏛️ Legal AI Achievement Unlocked!</h3>
      <div class="dialog-body">
        <div class="nes-container is-rounded">
          <p>You've successfully integrated professional bits-ui components with retro NES.css styling!</p>
          <div class="achievement-list">
            <div class="nes-text is-success">🎮 Modern + Retro Fusion</div>
            <div class="nes-text is-warning">⚖️ Legal AI Integration</div>
            <div class="nes-text is-primary">🔧 Professional Development</div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <ButtonBits variant="ghost" onclick={() => dialogOpen = false}>Cancel</ButtonBits>
        <ButtonBits variant="primary" onclick={() => dialogOpen = false}>Awesome!</ButtonBits>
      </div>
    </div>
  </DialogBits>
</div>

<style>
  /* NES.css + N64 Gaming CSS Integration */
  :global(body) {
    font-family: "Press Start 2P", cursive;
    background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
    color: #e94560;
    min-height: 100vh;
    padding: 1rem;
  }

  /* N64-inspired color scheme */
  :root {
    --n64-primary: #4a90e2;
    --n64-secondary: #7ed321;
    --n64-warning: #f5a623;
    --n64-error: #d0021b;
    --n64-success: #50e3c2;
    --n64-dark: #1a1a2e;
    --n64-light: #e94560;
  }

  .game-showcase {
    background: linear-gradient(45deg, var(--n64-dark), #16213e);
    border: 4px solid var(--n64-primary);
    box-shadow: 0 0 20px rgba(74, 144, 226, 0.3);
  }

  .showcase-description {
    color: var(--n64-light);
    text-align: center;
    margin: 1rem 0;
    text-shadow: 2px 2px 0px var(--n64-dark);
  }

  .feature-list p {
    margin: 0.5rem 0;
    padding: 0.25rem;
    background: rgba(74, 144, 226, 0.1);
    border-left: 3px solid var(--n64-success);
  }

  /* Component sections */
  .component-section {
    margin: 2rem 0;
  }

  .section-title {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 0px #000;
  }

  /* Button enhancements */
  .button-showcase {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  :global(.nes-btn-enhanced) {
    transition: all 0.2s ease;
    border: 3px solid var(--n64-primary) !important;
    background: linear-gradient(135deg, var(--n64-primary), var(--n64-secondary)) !important;
    color: white !important;
    text-shadow: 1px 1px 0px #000;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.3),
      inset 0 2px 0 rgba(255, 255, 255, 0.2);
  }

  :global(.nes-btn-enhanced:hover) {
    transform: translateY(-2px);
    box-shadow:
      0 6px 12px rgba(0, 0, 0, 0.4),
      inset 0 2px 0 rgba(255, 255, 255, 0.3);
  }

  :global(.nes-btn-enhanced:active) {
    transform: translateY(0);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 2px 0 rgba(255, 255, 255, 0.1);
  }

  /* Input enhancements */
  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin: 1rem 0;
  }

  :global(.nes-input-enhanced input),
  :global(.nes-select-enhanced select) {
    background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
    border: 3px solid var(--n64-primary) !important;
    color: var(--n64-light) !important;
    text-shadow: 1px 1px 0px #000;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :global(.nes-input-enhanced input:focus),
  :global(.nes-select-enhanced select:focus) {
    border-color: var(--n64-success) !important;
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 8px rgba(80, 227, 194, 0.5);
  }

  /* Tabs enhancements */
  :global(.nes-tabs-enhanced) {
    background: rgba(26, 26, 46, 0.8);
    border: 2px solid var(--n64-primary);
    border-radius: 8px;
    padding: 1rem;
  }

  .tab-content {
    background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(126, 211, 33, 0.1));
    border: 2px solid var(--n64-success);
    margin-top: 1rem;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .component-list {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .component-item {
    background: linear-gradient(90deg, var(--n64-dark), #16213e) !important;
    border-left: 4px solid var(--n64-primary) !important;
  }

  /* N64 Color Demos */
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .color-sample {
    padding: 1rem;
    text-align: center;
    border: 2px solid #000;
    text-shadow: 1px 1px 0px #000;
  }

  .color-sample.primary {
    background: var(--n64-primary);
  }

  .color-sample.success {
    background: var(--n64-success);
  }

  .color-sample.warning {
    background: var(--n64-warning);
  }

  .color-sample.error {
    background: var(--n64-error);
  }

  /* Interactive demo */
  .interactive-demo {
    margin: 2rem 0;
  }

  .demo-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    margin: 1rem 0;
  }

  .selection-display {
    padding: 0.5rem !important;
  }

  .status-display {
    margin: 1rem 0;
  }

  .status-display p {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: rgba(74, 144, 226, 0.1);
    border-left: 3px solid var(--n64-primary);
  }

  /* Dialog enhancements */
  .dialog-nes-content {
    background: linear-gradient(135deg, var(--n64-dark), #16213e) !important;
    border: 4px solid var(--n64-primary) !important;
    color: var(--n64-light) !important;
  }

  .dialog-body {
    margin: 1rem 0;
  }

  .achievement-list {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  /* Footer */
  .footer-section {
    margin-top: 3rem;
    text-align: center;
  }

  .footer-stats {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: var(--n64-light);
  }

  /* N64 Gaming Animations */
  @keyframes n64-glow {
    0%, 100% {
      box-shadow: 0 0 5px var(--n64-primary);
    }
    50% {
      box-shadow: 0 0 20px var(--n64-primary), 0 0 30px var(--n64-success);
    }
  }

  @keyframes n64-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .game-showcase {
    animation: n64-glow 3s ease-in-out infinite;
  }

  :global(.nes-btn-enhanced:hover) {
    animation: n64-pulse 0.5s ease-in-out;
  }

  /* N64 Controller Style Border */
  :global(.nes-container) {
    border-image: linear-gradient(45deg, var(--n64-primary), var(--n64-success), var(--n64-warning), var(--n64-error)) 1;
    border-width: 3px;
  }

  /* Responsive N64 Gaming Design */
  @media (max-width: 768px) {
    .button-showcase {
      grid-template-columns: 1fr;
    }

    .input-grid {
      grid-template-columns: 1fr;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .color-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .demo-controls {
      flex-direction: column;
      align-items: stretch;
    }
  }

  /* High contrast N64 mode for accessibility */
  @media (prefers-contrast: high) {
    :root {
      --n64-primary: #0066ff;
      --n64-secondary: #00ff00;
      --n64-warning: #ffaa00;
      --n64-error: #ff0000;
      --n64-success: #00ffaa;
      --n64-dark: #000000;
      --n64-light: #ffffff;
    }
  }

  /* Reduced motion for N64 animations */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
