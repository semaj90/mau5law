<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { mcpApi } from '$lib/api/mcp-client.js';
  import { writable } from 'svelte/store';

  // Server status
  const serverStatus = writable({
    status: 'checking',
    workers: 0,
    uptime: 0,
    version: 'Unknown'
  });

  // Quick stats
  let totalProcessed = 1247;
  let avgProcessingTime = 2.3;
  let successRate = 97.8;
  let gpuAcceleration = true;

  // Feature cards data
  const features = [
    {
      title: 'Document Analysis',
      description: 'AI-powered legal document processing with entity extraction, risk assessment, and compliance checking',
      icon: '📄',
      href: '/mcp/demo',
      stats: { processed: '450+ docs', accuracy: '95%' },
      color: 'blue'
    },
    {
      title: 'Legal Processor',
      description: 'Batch document processing with parallel worker threads and real-time progress tracking',
      icon: '⚖️',
      href: '/mcp/processor',
      stats: { workers: '4 cores', speed: '2.3s avg' },
      color: 'purple'
    },
    {
      title: 'Server Dashboard',
      description: 'Real-time monitoring of MCP server performance, GPU utilization, and system metrics',
      icon: '📊',
      href: '/mcp/dashboard',
      stats: { uptime: '99.9%', gpu: 'RTX 3060 Ti' },
      color: 'green'
    }
  ];

  // Recent activity (mock data)
  const recentActivity = [
    { time: '2 min ago', action: 'Processed employment contract', status: 'completed', risk: 25 },
    { time: '5 min ago', action: 'Analyzed NDA template', status: 'completed', risk: 15 },
    { time: '8 min ago', action: 'Real estate agreement review', status: 'completed', risk: 42 },
    { time: '12 min ago', action: 'Corporate merger LOI', status: 'completed', risk: 38 },
    { time: '15 min ago', action: 'Partnership agreement scan', status: 'completed', risk: 22 }
  ];

  // Check server status on mount
  onMount(async () => {
    try {
      const health = await mcpApi.getHealth();
      serverStatus.set({
        status: health.status,
        workers: health.workers,
        uptime: health.uptime,
        version: health.version
      });
    } catch (error) {
      console.error('Failed to get server status:', error);
    }
  });

  function navigateToFeature(href: string) {
    goto(href);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  }

  function getRiskColor(risk: number) {
    if (risk < 30) return 'text-green-600';
    if (risk < 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  function formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
</script>

<svelte:head>
  <title>MCP Multi-Core AI System</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
  <!-- Hero Section -->
  <div class="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 text-white">
    <div class="absolute inset-0 bg-black opacity-10"></div>
    <div class="relative max-w-7xl mx-auto px-6 py-16">
      <div class="text-center">
        <h1 class="text-5xl md:text-6xl font-bold mb-4">
          🚀 MCP Multi-Core AI System
        </h1>
        <p class="text-xl md:text-2xl mb-8 text-blue-100">
          Next-generation legal document processing with GPU acceleration
        </p>

        <!-- Server Status Banner -->
        <div class="inline-flex items-center space-x-6 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-6 py-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">{getStatusIcon($serverStatus.status)}</span>
            <span class="font-medium">Server Status</span>
          </div>
          <div class="text-sm">
            <span class="opacity-75">Workers:</span> <strong>{$serverStatus.workers}/4</strong>
          </div>
          <div class="text-sm">
            <span class="opacity-75">Uptime:</span> <strong>{formatUptime($serverStatus.uptime)}</strong>
          </div>
          <div class="text-sm">
            <span class="opacity-75">Version:</span> <strong>{$serverStatus.version}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Overview -->
  <div class="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
      <div class="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-blue-500">
        <div class="text-3xl font-bold text-blue-600 mb-2">{totalProcessed.toLocaleString()}</div>
        <div class="text-gray-600">Documents Processed</div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-purple-500">
        <div class="text-3xl font-bold text-purple-600 mb-2">{avgProcessingTime}s</div>
        <div class="text-gray-600">Avg Processing Time</div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-green-500">
        <div class="text-3xl font-bold text-green-600 mb-2">{successRate}%</div>
        <div class="text-gray-600">Success Rate</div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-orange-500">
        <div class="text-3xl font-bold text-orange-600 mb-2">{gpuAcceleration ? 'ON' : 'OFF'}</div>
        <div class="text-gray-600">GPU Acceleration</div>
      </div>
    </div>
  </div>

  <!-- Feature Cards -->
  <div class="max-w-7xl mx-auto px-6 pb-12">
    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold text-gray-900 mb-4">AI-Powered Legal Analysis</h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        Experience the future of legal document processing with our multi-core AI system,
        featuring real-time analysis, GPU acceleration, and comprehensive risk assessment.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
      {#each features as feature}
        <div class="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-105">
          <div class="p-8">
            <div class="flex items-center justify-between mb-6">
              <div class="text-4xl">{feature.icon}</div>
              <div class="px-3 py-1 bg-{feature.color}-100 text-{feature.color}-800 text-sm rounded-full font-medium">
                Active
              </div>
            </div>

            <h3 class="text-2xl font-bold text-gray-900 mb-3 group-hover:text-{feature.color}-600 transition-colors">
              {feature.title}
            </h3>

            <p class="text-gray-600 mb-6 leading-relaxed">
              {feature.description}
            </p>

            <div class="flex justify-between items-center mb-6 text-sm">
              <div class="flex flex-col">
                <span class="text-gray-500">Performance</span>
                <span class="font-semibold text-{feature.color}-600">{Object.values(feature.stats)[0]}</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="text-gray-500">Metric</span>
                <span class="font-semibold text-{feature.color}-600">{Object.values(feature.stats)[1]}</span>
              </div>
            </div>

            <button
              on:click={() => navigateToFeature(feature.href)}
              class="w-full py-3 px-6 bg-{feature.color}-600 hover:bg-{feature.color}-700 text-white rounded-lg font-medium transition-colors"
            >
              Launch {feature.title} →
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Recent Activity & Capabilities -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

      <!-- Recent Activity -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          🕒 Recent Activity
        </h3>

        <div class="space-y-4">
          {#each recentActivity as activity}
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex-1">
                <p class="font-medium text-gray-900">{activity.action}</p>
                <p class="text-sm text-gray-500">{activity.time}</p>
              </div>

              <div class="flex items-center space-x-3">
                <div class="text-right">
                  <div class="text-sm {getRiskColor(activity.risk)} font-medium">
                    Risk: {activity.risk}%
                  </div>
                  <div class="text-xs text-green-600">✓ {activity.status}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <button class="w-full mt-6 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
          View All Activity →
        </button>
      </div>

      <!-- System Capabilities -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          ⚡ System Capabilities
        </h3>

        <div class="space-y-6">
          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              🧠
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 mb-1">AI Document Understanding</h4>
              <p class="text-sm text-gray-600">Advanced NLP with Gemma-3 for legal text comprehension</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              🔗
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 mb-1">Multi-Core Processing</h4>
              <p class="text-sm text-gray-600">4 worker threads with intelligent load balancing</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              🚀
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 mb-1">GPU Acceleration</h4>
              <p class="text-sm text-gray-600">NVIDIA RTX 3060 Ti with CUDA optimization</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              📊
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 mb-1">Real-time Analytics</h4>
              <p class="text-sm text-gray-600">Live performance monitoring and metrics dashboard</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              🛡️
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 mb-1">Risk Assessment</h4>
              <p class="text-sm text-gray-600">Comprehensive legal and compliance risk analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Call to Action -->
  <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
    <div class="max-w-4xl mx-auto text-center px-6">
      <h2 class="text-4xl font-bold mb-4">Ready to Transform Your Legal Workflow?</h2>
      <p class="text-xl mb-8 text-purple-100">
        Start processing legal documents with AI-powered analysis and get instant insights.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          on:click={() => goto('/mcp/demo')}
          class="px-8 py-4 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 transition-colors"
        >
          🚀 Start Demo Analysis
        </button>

        <button
          on:click={() => goto('/mcp/dashboard')}
          class="px-8 py-4 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold border-2 border-purple-400 transition-colors"
        >
          📊 View Dashboard
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom animations */
  @keyframes pulse-slow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .animate-pulse-slow {
    animation: pulse-slow 2s infinite;
  }
</style>
