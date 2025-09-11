<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  import LegalAIPipelineDemo from '$lib/components/ai/LegalAIPipelineDemo.svelte';
  import { onMount } from 'svelte';

  let pageTitle = '🚀 Legal AI Acceleration Pipeline';
  
  onMount(() => {
    console.log('🎯 Pipeline demo page loaded');
  });
</script>

<svelte:head>
  <title>{pageTitle} - Legal AI Platform</title>
  <meta name="description" content="Complete legal AI acceleration pipeline demonstrating SIMD JSON, WebGPU, NES-GPU bridge, and WASM clustering integration" />
</svelte:head>

<div class="pipeline-demo-page">
  <div class="page-header">
    <h1>{pageTitle}</h1>
    <p class="page-description">
      Complete integration of SIMD JSON parsing, WebGPU compute, NES-GPU memory bridge, 
      and WebAssembly clustering for optimal legal document processing performance.
    </p>
    <div class="tech-stack">
      <span class="tech-badge">SIMD JSON</span>
      <span class="tech-badge">WebGPU</span>
      <span class="tech-badge">NES-GPU Bridge</span>
      <span class="tech-badge">WASM Clustering</span>
      <span class="tech-badge">RTX 3060 Ti</span>
    </div>
  </div>
  
  <LegalAIPipelineDemo />
</div>

<style>
  .pipeline-demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 20px 0;
  }

  .page-header {
    text-align: center;
    margin-bottom: 40px;
    padding: 0 20px;
  }

  .page-header h1 {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 15px;
  }

  .page-description {
    font-size: 1.2rem;
    color: #64748b;
    max-width: 800px;
    margin: 0 auto 25px auto;
    line-height: 1.6;
  }

  .tech-stack {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .tech-badge {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }
    
    .page-description {
      font-size: 1rem;
      padding: 0 10px;
    }
    
    .tech-stack {
      gap: 8px;
    }
    
    .tech-badge {
      font-size: 12px;
      padding: 6px 12px;
    }
  }
</style>
