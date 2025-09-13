<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { errorHandler } from '$lib/utils/browser-performance';
  import type { StartupStatus } from '$lib/services/multi-library-startup';
  import { createFeedbackStore, setFeedbackStore } from '$lib/stores/feedback-store.svelte';
  import { aiRecommendationEngine } from '$lib/services/ai-recommendation-engine';
  import type { FeedbackTrigger } from '$lib/types/feedback';
  import type { Snippet } from 'svelte';
  import { chrCache } from '$lib/gpu/chrrom-cache';

  // Import unified layout system
  import UnifiedLayout from '$lib/components/layout/UnifiedLayout.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  // GPU metrics batcher for performance monitoring
  import { initGpuMetricsBatcher, cleanupGpuMetricsBatcher } from '$lib/services/gpuMetricsBatcher';

  // Global GPU integration with NES memory architecture
  import { gpuIntegrationService } from '$lib/services/gpu-integration-service';

  // Svelte 5 children prop
  interface Props {
    children?: Snippet;
    data?: any;
  }

  const { children, data } = $props<{ children?: Snippet; data?: any }>();

  let startupStatus = $state<StartupStatus | null>(null);
  let showStartupLog = $state(false);
  let currentFeedbackTrigger = $state<FeedbackTrigger | null>(null);
  let showFeedback = $state(false);
  let session = $state<any>(null);
  let mounted = $state(false);
  let gpuEnabled = $state(false);
  let nesQuantizationActive = $state(false);

  // Create feedback store and set context immediately (must be synchronous)
  const feedbackStore = createFeedbackStore();
  setFeedbackStore(feedbackStore);

  let store = $state<ReturnType<typeof createFeedbackStore>>(feedbackStore);

  onMount(() => {
    if (!browser) return;
    mounted = true;

    (async () => {
  // Open a single SSE connection to hydrate CHR cache globally
  try { chrCache.connect('/api/chrrom/push'); } catch {}

      // Service worker registration
      if ('serviceWorker' in navigator) {
        try {
          // In dev, register lightweight SW at /sw.js; in prod, use SvelteKit's service-worker
          const swPath = import.meta.env.DEV ? '/sw.js' : '/service-worker.js';
          const reg = await navigator.serviceWorker.register(swPath);
          console.log('🛡️ Service worker registered:', reg.scope);
        } catch (e) {
          console.warn('Service worker registration failed:', e);
        }
      }

      console.log('🚀 Initializing YoRHa Legal AI Platform...');

      try {
        const { multiLibraryStartup } = await import('$lib/services/multi-library-startup');
        startupStatus = await multiLibraryStartup.initialize();

        if (store) {
          const userId = 'user_' + Date.now();
            session = store.initializeSession(userId);
          store.trackInteraction('platform_initialization', {
            services: startupStatus?.services || {},
            initTime: startupStatus?.initTime || 0
          });
        }

        if (startupStatus?.initialized) {
          console.log('✅ YoRHa Legal AI Platform Ready');
          showStartupLog = true;
          setTimeout(() => { showStartupLog = false; }, 4000);

          // Initialize GPU metrics batcher after successful platform startup
          initGpuMetricsBatcher();

          // Initialize GPU integration with NES memory architecture
          try {
            gpuEnabled = await gpuIntegrationService.initializeAppGPU();
            const integrationStatus = gpuIntegrationService.getIntegrationStatus();
            nesQuantizationActive = integrationStatus.nesQuantizationActive;
            
            console.log(`🎮 GPU Integration: ${gpuEnabled ? '✓' : '✗'} | NES Quantization: ${nesQuantizationActive ? '✓' : '✗'}`);
            
            // Register layout component for GPU acceleration
            gpuIntegrationService.registerComponent({
              componentId: 'app-layout',
              requiresGPU: false,
              nesColorQuantization: true,
              lodAcceleration: false,
              pixelEffects: false,
              priority: 'critical'
            });
          } catch (error) {
            console.warn('GPU integration failed in layout:', error);
          }

          if (session) {
            await aiRecommendationEngine.generateEnhancedRecommendations(
              {
                userId: session.userId,
                sessionId: session.id,
                deviceType: store?.userContext?.deviceType || 'desktop',
                userType: 'attorney'
              },
              'platform startup',
              'general'
            );
          }
          const compatibilityReport = errorHandler.getCompatibilityReport();
          console.log('🎯 Browser Performance Report:', compatibilityReport);
        }
      } catch (error) {
        console.error('❌ Platform initialization failed:', error);
        store?.trackInteraction('platform_error', { error: (error as Error)?.message ?? String(error) });
      }
    })();

    return () => {
      store?.clearSession();
      cleanupGpuMetricsBatcher();
    };
  });

  // Feedback handlers (use Svelte event handlers with e.detail)
  async function handleFeedbackSubmitted(event: CustomEvent) {
    const data: any = event.detail;
    const success = await store?.submitFeedback(
      data.interactionId,
      data.rating,
      data.feedback,
      currentFeedbackTrigger?.type || 'response_quality'
    );

    if (success) {
      console.log('✅ Feedback submitted successfully');
      // Generate updated recommendations based on feedback
      await aiRecommendationEngine.generateEnhancedRecommendations(
        store?.userContext || {
          userId: '',
          sessionId: '',
          deviceType: 'desktop',
          userType: 'attorney'
        },
        'feedback provided',
        'user_experience'
      );
    }

    showFeedback = false;
    currentFeedbackTrigger = null;
  }

  function handleFeedbackError(event: CustomEvent) {
    console.error('❌ Feedback submission failed:', event.detail ?? event);
    showFeedback = false;
    currentFeedbackTrigger = null;
  }

  function handleFeedbackClosed() {
    showFeedback = false;
    currentFeedbackTrigger = null;
    store?.cancelFeedback();
  }
</script>

<!-- Modern Startup Toast Notification -->
{#if mounted && showStartupLog && startupStatus}
  <div class="startup-toast nes-container with-title is-rounded">
    <p class="title">🚀 YoRHa Legal AI Platform</p>
    <p class="startup-message nes-text is-primary">
      Multi-Library Integration Complete
    </p>
    <div class="service-status">
      {#each Object.entries(startupStatus.services) as [service, status]}
        <span class="service-badge nes-badge">
          <span class={status ? 'is-success' : 'is-error'}>
            {status ? '✅' : '❌'} {service.toUpperCase()}
          </span>
        </span>
      {/each}
    </div>
    <p class="init-time nes-text is-disabled">
      Initialized in {startupStatus.initTime}ms
    </p>
  </div>
{/if}

<UnifiedLayout user={data?.user} variant="full">
  {#if children}
    {@render children()}
  {/if}
</UnifiedLayout>

<Footer variant="full" showQuickLinks={true} />

<!-- FeedbackWidget temporarily disabled due to Svelte 5 compatibility issues -->
<!-- TODO: Update FeedbackWidget to use Svelte 5 event patterns -->
{#if false && mounted && currentFeedbackTrigger}
  <FeedbackWidget
    interactionId={currentFeedbackTrigger?.interactionId}
    sessionId={store?.userContext?.sessionId || ''}
    userId={store?.userContext?.userId || ''}
    context={currentFeedbackTrigger?.context}
    show={showFeedback}
    ratingType={currentFeedbackTrigger?.type}
    on:submitted={handleFeedbackSubmitted}
    on:error={handleFeedbackError}
    on:closed={handleFeedbackClosed}
  />
{/if}

<style>
/* Startup Toast Notification */
.startup-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  max-width: 350px;
  background: linear-gradient(135deg, var(--n64-primary, #4a90e2), var(--n64-secondary, #7ed321)) !important;
  animation: slideIn 0.5s ease-out;
}

.startup-toast .title {
  color: white !important;
  font-family: 'Press Start 2P', cursive !important;
  font-size: 0.875rem !important;
  margin-bottom: 1rem !important;
}

.startup-message {
  font-size: 0.625rem !important;
  color: white !important;
  margin-bottom: 1rem !important;
}

.service-status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.service-badge {
  font-size: 0.5rem !important;
}

.init-time {
  font-size: 0.5rem !important;
  text-align: right;
  margin: 0 !important;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Global CSS Variables for Unified Theme */
:global(:root) {
  /* N64/NES Gaming Colors */
  --n64-primary: #4a90e2;
  --n64-secondary: #7ed321;
  --n64-warning: #f5a623;
  --n64-error: #d0021b;
  --n64-success: #50e3c2;
  --n64-dark: #1a1a2e;
  --n64-light: #e94560;

  /* YoRHa/NieR Theme Colors */
  --nier-bg-primary: #0f0f23;
  --nier-bg-secondary: #1a1a2e;
  --nier-bg-tertiary: #16213e;
  --nier-text-primary: #e2e8f0;
  --nier-text-secondary: #94a3b8;
  --nier-text-muted: #64748b;
  --nier-accent-warm: #f59e0b;
  --nier-accent-cool: #3b82f6;
  --nier-border: #334155;

  /* Legal AI Theme */
  --legal-ai-primary: #f59e0b;
  --legal-ai-secondary: #1e293b;
  --legal-ai-accent: #50e3c2;

  /* Color aliases for components */
  --color-primary: var(--legal-ai-primary);
  --color-secondary: var(--legal-ai-secondary);
  --color-accent: var(--legal-ai-accent);
  --color-bg-primary: var(--nier-bg-primary);
  --color-bg-secondary: var(--nier-bg-secondary);
  --color-text-primary: var(--nier-text-primary);
  --color-text-secondary: var(--nier-text-secondary);
  --color-border: var(--nier-border);

  /* Golden Ratio Spacing */
  --golden-base: 1rem;
  --golden-xs: calc(var(--golden-base) / 2.618);
  --golden-sm: calc(var(--golden-base) / 1.618);
  --golden-md: var(--golden-base);
  --golden-lg: calc(var(--golden-base) * 1.618);
  --golden-xl: calc(var(--golden-base) * 2.618);
  --golden-2xl: calc(var(--golden-base) * 4.236);
}

/* Global Typography */
:global(body) {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  background: var(--nier-bg-primary);
  color: var(--nier-text-primary);
  line-height: 1.5;
}

:global(.font-retro) {
  font-family: 'Press Start 2P', cursive !important;
}

/* Global Layout Utilities */
:global(.container) {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Smooth transitions */
:global(*) {
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

/* Focus management */
:global(:focus-visible) {
  outline: 2px solid var(--n64-primary);
  outline-offset: 2px;
}

/* NES/Gaming enhancements */
:global(.nes-enhanced) {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* Scrollbar styling */
:global(*::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:global(*::-webkit-scrollbar-track) {
  background: rgba(26, 26, 46, 0.3);
}

:global(*::-webkit-scrollbar-thumb) {
  background: var(--n64-primary);
  border-radius: 4px;
  border: 1px solid var(--n64-secondary);
}

:global(*::-webkit-scrollbar-thumb:hover) {
  background: var(--n64-secondary);
}

/* Print styles */
@media print {
  :global(body) {
    background: white !important;
    color: black !important;
  }

  .startup-toast {
    display: none !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :global(*) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .startup-toast {
    animation: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  :global(:root) {
    --nier-bg-primary: #000;
    --nier-text-primary: #fff;
    --n64-primary: #00f;
    --n64-secondary: #0f0;
  }
}
</style>
