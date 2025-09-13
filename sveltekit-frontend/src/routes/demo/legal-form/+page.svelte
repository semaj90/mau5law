<script lang="ts">
  import LegalCaseForm from '$lib/components/forms/LegalCaseForm.svelte';
  import { CardBits } from '$lib/components/ui/bits-ui';
</script>

<svelte:head>
  <title>Legal Case Form Demo - bits-ui Integration</title>
  <link href="https://unpkg.com/nes.css@2.3.0/css/nes.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css?family=Press Start+2P" rel="stylesheet">
</svelte:head>

<div class="demo-container">
  <div class="demo-header">
    <h1 class="demo-title">⚖️ Legal Case Form Demo</h1>
    <p class="demo-description">
      A comprehensive form built with bits-ui components, demonstrating complex form patterns,
      validation, multi-step navigation, and professional legal AI theming.
    </p>
  </div>

  <div class="demo-features">
    <CardBits variant="outlined" padding="md" class="feature-card">
      <h3 class="feature-title">🎯 Key Features</h3>
      <ul class="feature-list">
        <li>✅ Svelte 5 runes for reactive state management</li>
        <li>📋 Multi-step form with tab navigation</li>
        <li>🔍 Real-time validation with error messaging</li>
        <li>📊 Dynamic progress tracking</li>
        <li>♿ Accessibility-first design patterns</li>
        <li>📱 Fully responsive layout</li>
        <li>🎮 Gaming-inspired styling integration</li>
        <li>💡 Contextual tooltips and help text</li>
      </ul>
    </CardBits>

    <CardBits variant="outlined" padding="md" class="feature-card">
      <h3 class="feature-title">🧩 Components Used</h3>
      <ul class="component-list">
        <li><code>ButtonBits</code> - Action buttons with states</li>
        <li><code>InputBits</code> - Text inputs with validation</li>
        <li><code>SelectBits</code> - Dropdown selections</li>
        <li><code>TabsBits</code> - Multi-step navigation</li>
        <li><code>TooltipBits</code> - Contextual help</li>
        <li><code>CardBits</code> - Content containers</li>
      </ul>
    </CardBits>
  </div>

  <div class="form-demo">
    <LegalCaseForm />
  </div>

  <div class="demo-footer">
    <CardBits variant="filled" padding="lg" class="footer-card">
      <h3 class="footer-title">🚀 Integration Complete</h3>
      <p class="footer-text">
        This form demonstrates the seamless integration of bits-ui components with
        Svelte 5 runes, professional legal AI theming, and gaming-inspired aesthetics.
        All components maintain accessibility standards while providing a modern,
        engaging user experience.
      </p>
      <div class="tech-stack">
        <span class="tech-badge">Svelte 5</span>
        <span class="tech-badge">bits-ui</span>
        <span class="tech-badge">TypeScript</span>
        <span class="tech-badge">Legal AI Theme</span>
        <span class="tech-badge">NES.css</span>
        <span class="tech-badge">N64 Styling</span>
      </div>
    </CardBits>
  </div>
</div>

<style>
  .demo-container {
    min-height: 100vh;
    padding: 2rem;
    background: linear-gradient(135deg, #0f172a, #1e293b, #334155);
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .demo-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #f59e0b;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .demo-description {
    font-size: 1.1rem;
    color: #e2e8f0;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .demo-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }

  .feature-card {
    background: rgba(30, 41, 59, 0.8) !important;
    border: 2px solid #f59e0b !important;
  }

  .feature-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f59e0b;
    margin-bottom: 1rem;
  }

  .feature-list,
  .component-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .feature-list li,
  .component-list li {
    padding: 0.5rem 0;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(245, 158, 11, 0.1);
  }

  .feature-list li:last-child,
  .component-list li:last-child {
    border-bottom: none;
  }

  .component-list code {
    background: rgba(245, 158, 11, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #fbbf24;
    font-weight: 600;
  }

  .form-demo {
    margin: 3rem 0;
  }

  .demo-footer {
    margin-top: 3rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .footer-card {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1)) !important;
    border: 2px solid #f59e0b !important;
    text-align: center;
  }

  .footer-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f59e0b;
    margin-bottom: 1rem;
  }

  .footer-text {
    color: #e2e8f0;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .tech-stack {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .tech-badge {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    .demo-container {
      padding: 1rem;
    }

    .demo-title {
      font-size: 2rem;
    }

    .demo-features {
      grid-template-columns: 1fr;
    }

    .tech-stack {
      justify-content: center;
    }

    .tech-badge {
      font-size: 0.8rem;
      padding: 0.4rem 0.8rem;
    }
  }
</style>