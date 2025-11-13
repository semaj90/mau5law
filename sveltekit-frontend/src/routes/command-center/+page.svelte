<script lang="ts">
  import ActiveCasesWidget from '$lib/components/yorha/dashboard/ActiveCasesWidget.svelte';
  import EvidenceStats from '$lib/components/yorha/dashboard/EvidenceStats.svelte';
  import GPUMetrics from '$lib/components/yorha/dashboard/GPUMetrics.svelte';
  import RecentActivity from '$lib/components/yorha/dashboard/RecentActivity.svelte';
  import SystemOverview from '$lib/components/yorha/dashboard/SystemOverview.svelte';
  import { cpuFallback } from '$lib/webgpu/webgpu-cpu-fallback';
  import { webgpu } from '$lib/webgpu/webgpu-init';
  import { onMount } from 'svelte';

  let webgpuCapabilities: any = null;
  let cpuCapabilities: any = null;

  onMount(async () => {
    try {
      webgpuCapabilities = await webgpu.initialize();
    } catch (error) {
      console.warn('WebGPU init failed:', error);
    }

    try {
      cpuCapabilities = await cpuFallback.initialize();
    } catch (error) {
      console.warn('CPU fallback init failed:', error);
    }
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-cyan-400 terminal-glow mb-2">YoRHa Command Center</h1>
    <p class="text-slate-400">Advanced Legal AI Platform - Evidence Analysis & Case Management</p>
  </div>

  <!-- System Status Overview -->
  <SystemOverview {webgpuCapabilities} {cpuCapabilities} />

  <!-- Main Dashboard Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
    <!-- Active Cases -->
    <div class="xl:col-span-2">
      <ActiveCasesWidget />
    </div>

    <!-- Evidence Statistics -->
    <EvidenceStats />

    <!-- GPU Metrics -->
    <GPUMetrics />

    <!-- Recent Activity -->
    <div class="xl:col-span-2">
      <RecentActivity />
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-slate-700/50">
    <h3 class="text-lg font-semibold text-cyan-400 mb-4">Quick Actions</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button class="p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left">
        <div class="text-cyan-400 text-2xl mb-2">📋</div>
        <div class="text-sm font-medium text-white">New Case</div>
        <div class="text-xs text-slate-400">Start investigation</div>
      </button>

      <button class="p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left">
        <div class="text-cyan-400 text-2xl mb-2">📚</div>
        <div class="text-sm font-medium text-white">Upload Evidence</div>
        <div class="text-xs text-slate-400">Add documents</div>
      </button>

      <button class="p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left">
        <div class="text-cyan-400 text-2xl mb-2">🔍</div>
        <div class="text-sm font-medium text-white">AI Analysis</div>
        <div class="text-xs text-slate-400">Process evidence</div>
      </button>

      <button class="p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left">
        <div class="text-cyan-400 text-2xl mb-2">💻</div>
        <div class="text-sm font-medium text-white">Terminal</div>
        <div class="text-xs text-slate-400">AI assistant</div>
      </button>
    </div>
  </div>
</div>

<style>
  .terminal-glow {
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
  }

  .cyber-grid {
    background-image:
      linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
  }
</style>