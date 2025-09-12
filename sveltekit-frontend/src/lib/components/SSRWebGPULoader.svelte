<!-- SSR-Safe WebGPU Component Loader -->
<!-- Prevents hydration mismatches by only loading WebGPU on client-side -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  // Svelte 5 props
  let {
    fallbackComponent = null,
    loadingComponent = null,
    errorComponent = null,
    enableGPUAcceleration = true,
    requireWebGPU = false,
    children
  }: {
    fallbackComponent?: any;
    loadingComponent?: any; 
    errorComponent?: any;
    enableGPUAcceleration?: boolean;
    requireWebGPU?: boolean;
    children?: any;
  } = $props();
  
  // State management
  let isLoading = $state(true);
  let hasWebGPU = $state(false);
  let loadError = $state<string | null>(null);
  let gpuDevice = $state<GPUDevice | null>(null);
  
  // WebGPU availability check
  let webGPUSupported = $derived(
    browser && 
    'gpu' in navigator && 
    enableGPUAcceleration
  );
  
  // Component loading state
  let shouldRenderComponent = $derived(
    browser && 
    !isLoading && 
    (hasWebGPU || !requireWebGPU) && 
    !loadError
  );
  
  onMount(async () => {
    try {
      if (!browser) {
        isLoading = false;
        return;
      }
      
      // Check WebGPU availability
      if (webGPUSupported) {
        await initializeWebGPU();
      }
      
      // Small delay to prevent hydration flash
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('SSRWebGPULoader initialization failed:', error);
      loadError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  });
  
  async function initializeWebGPU(): Promise<void> {
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        throw new Error('No WebGPU adapter available');
      }
      
      gpuDevice = await adapter.requestDevice({
        requiredLimits: {
          maxBufferSize: 268435456, // 256MB
          maxComputeWorkgroupStorageSize: 32768
        }
      });
      
      hasWebGPU = true;
      console.log('WebGPU initialized successfully');
      
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
      hasWebGPU = false;
      
      if (requireWebGPU) {
        throw error;
      }
    }
  }
  
  function handleRetry(): void {
    isLoading = true;
    loadError = null;
    initializeWebGPU().finally(() => {
      isLoading = false;
    });
  }
</script>

{#if !browser}
  <!-- Server-side rendering fallback -->
  {#if fallbackComponent}
    <svelte:component this={fallbackComponent} />
  {:else}
    <div class="ssr-placeholder">
      <div class="ssr-content">
        <div class="ssr-icon">🎮</div>
        <p>Loading GPU-accelerated interface...</p>
      </div>
    </div>
  {/if}
  
{:else if isLoading}
  <!-- Client-side loading state -->
  {#if loadingComponent}
    <svelte:component this={loadingComponent} />
  {:else}
    <div class="loading-container">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Initializing {webGPUSupported ? 'WebGPU' : 'CPU fallback'}...</p>
      </div>
    </div>
  {/if}
  
{:else if loadError}
  <!-- Error state -->
  {#if errorComponent}
    <svelte:component this={errorComponent} {loadError} {handleRetry} />
  {:else}
    <div class="error-container">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>GPU Initialization Failed</h3>
        <p>{loadError}</p>
        <button onclick={handleRetry} class="retry-button">
          Try Again
        </button>
      </div>
    </div>
  {/if}
  
{:else if shouldRenderComponent}
  <!-- Main component with WebGPU context -->
  {#if children}
    {@render children({ gpuDevice, hasWebGPU, webGPUSupported })}
  {:else}
    <slot {gpuDevice} {hasWebGPU} {webGPUSupported} />
  {/if}
  
{:else}
  <!-- Fallback when WebGPU required but not available -->
  {#if fallbackComponent}
    <svelte:component this={fallbackComponent} />
  {:else}
    <div class="fallback-container">
      <div class="fallback-content">
        <div class="fallback-icon">💻</div>
        <h3>GPU Acceleration Unavailable</h3>
        <p>This feature requires WebGPU support.</p>
        <p><small>Using CPU fallback mode.</small></p>
      </div>
    </div>
  {/if}
{/if}

<style>
  .ssr-placeholder,
  .loading-container,
  .error-container,
  .fallback-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .ssr-content,
  .loading-content,
  .error-content,
  .fallback-content {
    text-align: center;
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .ssr-icon,
  .error-icon,
  .fallback-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-content h3,
  .fallback-content h3 {
    margin: 0 0 1rem 0;
    color: #ef4444;
    font-size: 1.25rem;
  }
  
  .fallback-content h3 {
    color: #f59e0b;
  }
  
  .error-content p,
  .fallback-content p,
  .ssr-content p,
  .loading-content p {
    margin: 0.5rem 0;
    opacity: 0.8;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .retry-button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.9rem;
    margin-top: 1rem;
    transition: background 0.2s;
  }
  
  .retry-button:hover {
    background: #2563eb;
  }
  
  .retry-button:active {
    transform: translateY(1px);
  }
</style>