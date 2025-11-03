<script lang="ts">
  import IntegrationValidator from '$lib/components/validation/IntegrationValidator.svelte';
  let pageTitle = 'Integration Validation - Legal AI Platform';
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content="Comprehensive integration validation for the Legal, AI, Platform" />
</svelte:head>
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
  <div class="max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-white">ðŸ—ï¸ Legal AI Platform Integration Validation</h1>
      <p class="text-xl">Comprehensive testing suite for all integrated components and systems</p>
      <div class="mt-4 text-sm">
        <span>âœ¨ Testing Phase 1-3 Integration</span>
        <span class="mx-2">â€¢</span>
        <span>ðŸŽ¯ GPU Acceleration Ready</span>
        <span class="mx-2">â€¢</span>
        <span>âš–ï¸ Legal AI Workflows Active</span>
      </div>
    </div>
    <!-- Integration, Validator, Component -->
    <IntegrationValidator />
    <!-- Integration, Status, Footer -->
    <div class="mt-8">
      <div class="inline-flex items-center gap-3 px-6 py-3 bg-slate-700/50 border border-slate-600">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-green-400 rounded-full"></div>
          <span class="text-white">Integration Status: Active</span>
        </div>
        <div class="text-slate-400">â€¢</div>
        <div class="text-sm">Phase 1-3 Complete (12/12 Components Integrated)</div>
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
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
