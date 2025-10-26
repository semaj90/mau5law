<!-- Evidence Management Layout - Legal AI Evidence Processing -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';

  interface Props {
    data?: unknown;
    children?: Snippet;
  }

  let { data: _data, children }: Props = $props();

  const evidenceRoutes = [
    { name: 'Evidence List', href: '/evidence', icon: '📋' },
    { name: 'Upload Evidence', href: '/evidence/upload', icon: '⬆️' },
    { name: 'Analysis Dashboard', href: '/evidence/analysis', icon: '🔍' },
    { name: 'Evidence Canvas', href: '/evidence/canvas', icon: '🎨' },
    { name: 'Evidence Board', href: '/evidence/board', icon: '📊' },
    { name: 'Workspace', href: '/evidence/workspace', icon: '🗂️' },
    { name: 'Interactive Tools', href: '/evidence/interactive', icon: '⚡' }
  ];

  let currentPath = $derived($page.url.pathname);
</script>

<div class="evidence-layout">
  <header class="evidence-header">
    <div class="evidence-brand">
      <span class="evidence-icon">🧾</span>
      <h1 class="evidence-title">Evidence Management</h1>
      <span class="evidence-badge">Legal AI Platform</span>
    </div>

    <nav class="evidence-nav">
      {#each evidenceRoutes as route}
        <a
          href={route.href}
          class="evidence-nav-item"
          class:active={currentPath === route.href || currentPath.startsWith(`${route.href}/`)}
        >
          <span class="evidence-nav-icon">{route.icon}</span>
          <span class="evidence-nav-text">{route.name}</span>
        </a>
      {/each}
    </nav>
  </header>

  <main class="evidence-content">
    <div class="evidence-container">
      {#if children}
        {@render children()}
      {:else}
        <div class="evidence-placeholder">
          <h2>🧠 Evidence Processing Ready</h2>
          <p>Select an evidence management tool from the navigation above.</p>
        </div>
      {/if}
    </div>
  </main>

  <footer class="evidence-footer">
    <div class="evidence-footer-content">
      <div class="evidence-info">
        <span class="evidence-current">
          Current: <strong>{currentPath}</strong>
        </span>
        <span class="evidence-separator">•</span>
        <span class="evidence-tech">AI-Powered Evidence Analysis</span>
      </div>
      <div class="evidence-controls">
        <a href="/" class="evidence-main-btn">← Main App</a>
      </div>
    </div>
  </footer>
</div>

<style>
  .evidence-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--nier-bg-primary, #0a0a0a);
    color: var(--nier-text-primary, #f0f0f0);
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }

  .evidence-header {
    background: var(--nier-bg-secondary, #1a1a1a);
    border-bottom: 2px solid var(--nier-accent-warm, #d4af37);
    padding: 1rem;
  }

  .evidence-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .evidence-icon {
    font-size: 2rem;
  }

  .evidence-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--nier-accent-warm, #d4af37);
    margin: 0;
  }

  .evidence-badge {
    background: var(--nier-accent-warm, #d4af37);
    color: var(--nier-bg-primary, #0a0a0a);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .evidence-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .evidence-nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--nier-border-primary, #333);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--nier-text-secondary, #d0d0d0);
    background: var(--nier-bg-primary, #0a0a0a);
    transition: all 0.25s ease;
  }

  .evidence-nav-item:hover {
    border-color: var(--nier-accent-warm, #d4af37);
    color: var(--nier-accent-warm, #d4af37);
  }

  .evidence-nav-item.active {
    border-color: var(--nier-accent-cool, #87ceeb);
    color: var(--nier-accent-cool, #87ceeb);
    background: var(--nier-bg-tertiary, #2a2a2a);
    font-weight: bold;
  }

  .evidence-nav-icon {
    font-size: 1.1rem;
  }

  .evidence-nav-text {
    font-size: 0.9rem;
  }

  .evidence-content {
    flex: 1;
    overflow-y: auto;
    background: var(--nier-bg-primary, #0a0a0a);
  }

  .evidence-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100%;
  }

  .evidence-placeholder {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--nier-bg-secondary, #1a1a1a);
    border: 2px dashed var(--nier-border-muted, #444);
    border-radius: 1rem;
  }

  .evidence-placeholder h2 {
    color: var(--nier-accent-warm, #d4af37);
    margin-bottom: 1rem;
  }

  .evidence-footer {
    border-top: 2px solid var(--nier-border-primary, #333);
    background: var(--nier-bg-secondary, #1a1a1a);
    padding: 1rem;
  }

  .evidence-footer-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-betweennn;
    align-items: center;
    gap: 2rem;
  }

  .evidence-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--nier-text-muted, #999);
  }

  .evidence-current strong {
    color: var(--nier-accent-cool, #87ceeb);
    text-transform: uppercase;
  }

  .evidence-controls {
    display: flex;
    gap: 1rem;
  }

  .evidence-main-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--nier-border-primary, #333);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--nier-text-primary, #f0f0f0);
    background: var(--nier-bg-primary, #0a0a0a);
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .evidence-main-btn:hover {
    border-color: var(--nier-accent-warm, #d4af37);
    color: var(--nier-accent-warm, #d4af37);
  }

  @media (max-width: 768px) {
    .evidence-container {
      padding: 1rem;
    }

    .evidence-footer-content {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }

    .evidence-nav {
      justify-content: center;
    }
  }

  .evidence-content::-webkit-scrollbar {
    width: 8px;
  }

  .evidence-content::-webkit-scrollbar-track {
    background: var(--nier-bg-tertiary, #2a2a2a);
  }

  .evidence-content::-webkit-scrollbar-thumb {
    background: var(--nier-accent-warm, #d4af37);
    border-radius: 4px;
  }

  .evidence-content::-webkit-scrollbar-thumb:hover {
    background: var(--nier-accent-cool, #87ceeb);
  }
</style>


