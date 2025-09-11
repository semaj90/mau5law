<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  import { Button } from '$lib/components/ui/enhanced-bits';
  import * as Card from '$lib/components/ui/card';
  import { onMount } from 'svelte';
  
  interface Props {
    title: string;
    description?: string;
    showGpuStatus?: boolean;
    showWelcome?: boolean;
    children: import('svelte').Snippet;
  }
  
  let { 
    title, 
    description = '', 
    showGpuStatus = false,
    showWelcome = false,
    children 
  }: Props = $props();
  
  let pageLoaded = $state(false);
  let gpuStatus = $state({
    gpu: 'RTX 3060 Ti',
    status: 'Active',
    memory: '7.0GB/8.0GB',
    temperature: '51°C'
  });
  
  onMount(async () => {
    pageLoaded = true;
    
    if (showGpuStatus) {
      try {
        // Check WebGPU topology status
        const response = await fetch('/api/webgpu/topology');
        const data = await response.json();
        
        if (data.status === 'operational') {
          gpuStatus = {
            gpu: 'WebGPU',
            status: 'Ready',
            memory: 'Available',
            temperature: 'Optimal'
          };
        }
      } catch (error) {
        console.log('GPU status check:', error);
      }
    }
  });
</script>

<svelte:head>
  <title>{title} - Legal AI Platform</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
</svelte:head>

<div class="enhanced-page-layout">
  <!-- GPU Status Indicator -->
  {#if showGpuStatus && pageLoaded}
    <div class="gpu-status-overlay">
      <Card.Root class="gpu-status-card">
        <Card.Header>
          <Card.Title class="gpu-title">🚀 {gpuStatus.gpu}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="gpu-metrics">
            <div class="metric">
              <span class="label">Status</span>
              <span class="value status-{gpuStatus.status.toLowerCase()}">{gpuStatus.status}</span>
            </div>
            <div class="metric">
              <span class="label">Memory</span>
              <span class="value">{gpuStatus.memory}</span>
            </div>
            <div class="metric">
              <span class="label">Temp</span>
              <span class="value">{gpuStatus.temperature}</span>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <!-- Welcome Banner -->
  {#if showWelcome && pageLoaded}
    <div class="welcome-overlay">
      <Card.Root class="welcome-card animate-slide-in">
        <Card.Header>
          <Card.Title>✨ {title}</Card.Title>
          {#if description}
            <Card.Description>{description}</Card.Description>
          {/if}
        </Card.Header>
        <Card.Content>
          <div class="welcome-features">
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>GPU Accelerated</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🧠</span>
              <span>AI Powered</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔍</span>
              <span>Vector Search</span>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <!-- Page Content -->
  <main class="page-content" class:with-overlays={showGpuStatus || showWelcome}>
    {@render children()}
  </main>
</div>

<style>
  .enhanced-page-layout {
    position: relative;
    min-height: 100vh;
  }
  
  .gpu-status-overlay {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
  }
  
  .gpu-status-card {
    width: 240px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid #00ff41;
    box-shadow: 0 0 15px rgba(0, 255, 65, 0.2);
  }
  
  .gpu-title {
    font-size: 14px;
    color: #00ff41;
  }
  
  .gpu-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  
  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px;
    background: rgba(0, 255, 65, 0.1);
    border-radius: 3px;
  }
  
  .metric .label {
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
  }
  
  .metric .value {
    font-size: 11px;
    font-weight: bold;
    margin-top: 2px;
  }
  
  .status-active,
  .status-ready {
    color: #00ff41;
  }
  
  .welcome-overlay {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999;
  }
  
  .welcome-card {
    width: 300px;
    background: rgba(0, 0, 0, 0.95);
    border: 2px solid #00ff41;
    box-shadow: 0 0 25px rgba(0, 255, 65, 0.3);
  }
  
  .animate-slide-in {
    animation: slideInRight 0.6s ease-out;
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .welcome-features {
    display: flex;
    justify-content: space-around;
    margin-top: 12px;
  }
  
  .feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .feature-icon {
    font-size: 18px;
  }
  
  .feature span:last-child {
    font-size: 10px;
    color: #ccc;
    text-align: center;
  }
  
  .page-content {
    position: relative;
    z-index: 1;
  }
  
  .page-content.with-overlays {
    padding-top: 20px;
  }
  
  @media (max-width: 768px) {
    .gpu-status-overlay,
    .welcome-overlay {
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      margin: 10px;
    }
    
    .gpu-status-card,
    .welcome-card {
      width: 100%;
      max-width: none;
    }
  }
</style>
