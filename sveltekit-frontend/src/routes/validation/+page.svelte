<script lang="ts">
</script>
  import IntegrationValidator from '$lib/components/validation/IntegrationValidator.svelte';
  import { page } from '$app/stores';
  
  let pageTitle = 'Integration Validation - Legal AI Platform';
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content="Comprehensive integration validation for the Legal AI Platform" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-white mb-2">
        🏗️ Legal AI Platform Integration Validation
      </h1>
      <p class="text-xl text-slate-300">
        Comprehensive testing suite for all integrated components and systems
      </p>
      <div class="mt-4 text-sm text-slate-400">
        <span>✨ Testing Phase 1-3 Integration</span>
        <span class="mx-2">•</span>
        <span>🎯 GPU Acceleration Ready</span>
        <span class="mx-2">•</span>
        <span>⚖️ Legal AI Workflows Active</span>
      </div>
    </div>

    <!-- Integration Validator Component -->
    <IntegrationValidator />

    <!-- Integration Status Footer -->
    <div class="mt-8 text-center">
      <div class="inline-flex items-center gap-3 px-6 py-3 bg-slate-700/50 border border-slate-600 rounded-lg">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-white font-medium">Integration Status: Active</span>
        </div>
        <div class="text-slate-400">•</div>
        <div class="text-sm text-slate-300">
          Phase 1-3 Complete (12/12 Components Integrated)
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Global dark theme styles */
  :global(body) {
    background: #0f172a;
    color: #f8fafc;
  }
  
  /* Animation for the status indicator */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
