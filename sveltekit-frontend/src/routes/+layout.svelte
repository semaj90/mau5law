<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import '../app.css';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  // Import enhanced-bits components for better UX
  import { KeyboardProvider } from '$lib/components/ui/enhanced-bits';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  // Enhanced layout state using Svelte 5 runes
  let mounted = $state(false);
  let currentPath = $derived($page.url.pathname);
  let isDemoRoute = $derived(currentPath.startsWith('/demo') || currentPath.startsWith('/showcase'));
  let isAdminRoute = $derived(currentPath.startsWith('/admin'));
  let isEvidenceRoute = $derived(currentPath.startsWith('/evidence'));
  let isAuthRoute = $derived(currentPath.startsWith('/auth') || currentPath.startsWith('/login'));

  // Auto-detect layout variant based on route
  let layoutVariant = $derived(() => {
    if (isAuthRoute) return 'minimal';
    if (isDemoRoute) return 'demo';
    if (isAdminRoute) return 'admin';
    if (isEvidenceRoute) return 'evidence';
    return 'default';
  });

  onMount(() => {
    mounted = true;
  });
</script>

<!-- Enhanced SSR-safe layout with legal AI theming -->
<div class="min-h-screen yorha-app-container" data-layout-variant={layoutVariant}>
  <KeyboardProvider>
    <!-- Main content area with responsive design -->
    <main class="yorha-main-content" class:yorha-auth-layout={isAuthRoute} class:yorha-demo-layout={isDemoRoute}>
      <div class="container mx-auto max-w-7xl px-4 py-6">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </main>

    <!-- Background pattern for legal AI aesthetic -->
    <div class="yorha-bg-pattern" aria-hidden="true"></div>

    <!-- Loading indicator for client-side hydration -->
    {#if browser && !mounted}
      <div class="yorha-loading-overlay">
        <div class="yorha-loading-spinner"></div>
      </div>
    {/if}
  </KeyboardProvider>
</div>

<style>
/* @unocss-include */
/* Enhanced global styles for legal AI platform */
:global(body) {
  font-family: var(--font-gothic, 'JetBrains Mono', 'SF Mono', monospace);
  background: var(--color-nier-bg-primary, #0f0f23);
  color: var(--color-nier-text-primary, #e2e8f0);
  line-height: 1.6;
  margin: 0;
  padding: 0;
  font-feature-settings: 'liga' 1, 'calt' 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Enhanced app container */
.yorha-app-container {
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--color-nier-bg-primary) 0%,
    var(--color-nier-bg-secondary) 100%
  );
  position: relative;
  overflow-x: hidden;
}

/* Main content styling */
.yorha-main-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}

/* Layout variants */
.yorha-auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.yorha-demo-layout {
  background: var(--color-nier-bg-tertiary, rgba(15, 15, 35, 0.95));
}

/* Background pattern */
.yorha-bg-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(90deg, transparent 24%, rgba(58, 55, 47, 0.03) 25%, rgba(58, 55, 47, 0.03) 26%, transparent 27%, transparent 74%, rgba(58, 55, 47, 0.03) 75%, rgba(58, 55, 47, 0.03) 76%, transparent 77%, transparent),
    linear-gradient(0deg, transparent 24%, rgba(58, 55, 47, 0.03) 25%, rgba(58, 55, 47, 0.03) 26%, transparent 27%, transparent 74%, rgba(58, 55, 47, 0.03) 75%, rgba(58, 55, 47, 0.03) 76%, transparent 77%, transparent);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}

/* Loading overlay */
.yorha-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-nier-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.3s ease;
}

.yorha-loading-spinner {
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-nier-border-secondary);
  border-top: 2px solid var(--color-nier-accent-primary);
  border-radius: 50%;
  animation: yorha-spin 1s linear infinite;
}

@keyframes yorha-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Container responsive styling */
:global(.container) {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  :global(.container) {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  :global(.container) {
    max-width: 768px;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  :global(.container) {
    max-width: 1024px;
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@media (min-width: 1280px) {
  :global(.container) {
    max-width: 1280px;
  }
}

@media (min-width: 1536px) {
  :global(.container) {
    max-width: 1536px;
  }
}

/* Enhanced focus management for accessibility */
:global(*:focus-visible) {
  outline: 2px solid var(--color-nier-accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Smooth transitions for route changes */
:global([data-layout-variant]) {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Print styles */
@media print {
  .yorha-bg-pattern,
  .yorha-loading-overlay {
    display: none !important;
  }

  :global(body) {
    background: white !important;
    color: black !important;
  }
}
</style>