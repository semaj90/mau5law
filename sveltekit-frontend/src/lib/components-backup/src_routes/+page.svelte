<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  // Import all advanced AI components
  import DocumentAnalysis from "$lib/components/DocumentAnalysis.svelte";
  import LegalChat from "$lib/components/LegalChat.svelte";
  import AISummarization from "$lib/components/AISummarization.svelte";
  import FindModal from "$lib/components/ai/FindModal.svelte";
  // Import system integration components
  import SystemHealthDashboard from "$lib/components/dashboard/SystemHealthDashboard.svelte";
  import PerformanceMonitor from "$lib/components/dashboard/PerformanceMonitor.svelte";
  import AIRecommendations from "$lib/components/ai/AIRecommendations.svelte";
  import RealTimeMetrics from "$lib/components/dashboard/RealTimeMetrics.svelte";
  // Import the comprehensive AI system
  import { createAISystemStore } from '$lib/stores/ai-system-store';
  import { createWebSocketStore } from '$lib/stores/websocket-store';
  // State management with Svelte 5 runes
  let activeTab = $state<"dashboard" | "chat" | "analysis" | "search" | "monitor">("dashboard");
  let systemHealth = $state<any>({});
  let performanceMetrics = $state<any>({});
  let aiRecommendations = $state<any[]>([]);
  let isSystemInitialized = $state(false);
  let showFindModal = $state(false);
  let webSocketConnection = $state<WebSocket | null>(null);
  let connectionStatus = $state<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  // AI System Integration
  const aiSystemStore = browser ? createAISystemStore() : null;
  const webSocketStore = browser ? createWebSocketStore() : null;
  // Reactive system state
  let systemState = $derived(aiSystemStore?.systemState || {});
  let wsState = $derived(webSocketStore?.connectionState || {});
  // Initialize comprehensive AI system on mount
  onMount(async () => {
    if (!browser) return;
    try {
      console.log('🚀 Initializing Comprehensive AI System...');
      // Initialize AI system store
      if (aiSystemStore) {
        await aiSystemStore.initialize({
          windowsOptimizations: {
            enableGPUAcceleration: true,
            enableSIMD: true,
            maxWorkerThreads: navigator.hardwareConcurrency * 2,
            enableWebAssembly: true
          },
          performance: {
            enableJITCompilation: true,
            cacheStrategy: 'hybrid',
            enableRealTimeMetrics: true
          }
        });
        isSystemInitialized = true;
        console.log('✅ AI System initialized successfully');
      }
      // Initialize WebSocket connection for real-time updates
      if (webSocketStore) {
        await webSocketStore.connect('ws://localhost:8080/ws');
        webSocketConnection = webSocketStore.socket;
        webSocketStore.on('system-health', (data: any) => {
          systemHealth = data;
        });
        webSocketStore.on('performance-metrics', (data: any) => {
          performanceMetrics = data;
        });
        webSocketStore.on('ai-recommendations', (data: any) => {
          aiRecommendations = data;
        });
        connectionStatus = "connected";
        console.log('🌐 WebSocket connection established');
      }
      // Start periodic health checks
      startHealthChecks();
    } catch (error) {
      console.error('❌ System initialization failed:', error);
      connectionStatus = "error";
    }
  });
  onDestroy(() => {
    if (browser) {
      webSocketStore?.disconnect();
      aiSystemStore?.shutdown();
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    }
  });
  let healthCheckInterval: NodeJS.Timeout;
  function startHealthChecks() {
    healthCheckInterval = setInterval(async () => {
      if (aiSystemStore) {
        try {
          const health = await aiSystemStore.getSystemHealth();
          systemHealth = health;
          const metrics = await aiSystemStore.getPerformanceMetrics();
          performanceMetrics = metrics;
          const recommendations = await aiSystemStore.getRecommendations();
          aiRecommendations = recommendations;
        } catch (error) {
          console.warn('Health check failed:', error);
        }
      }
    }, 5000); // Every 5 seconds
  }
  // Event handlers
  function handleAnalysisComplete(result: any) {
    console.log("Analysis complete:", result);
    if (aiSystemStore) {
      aiSystemStore.logAnalysis(result);
    }
  }
  function handleChatMessage(message: any) {
    console.log("New message:", message);
    if (aiSystemStore) {
      aiSystemStore.logInteraction(message);
    }
  }
  function toggleFindModal() {
    showFindModal = !showFindModal;
  }
  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      toggleFindModal();
    }
  }
  // Quick actions for different user roles
  const quickActions = {
    prosecutor: [
      { icon: "🔍", label: "Evidence Analysis", action: () => activeTab = "analysis" },
      { icon: "⚖️", label: "Case Builder", action: () => console.log("Case Builder") },
      { icon: "📊", label: "Precedent Search", action: toggleFindModal },
      { icon: "🤖", label: "AI Assistant", action: () => activeTab = "chat" },
      { icon: "⭐", label: "Best Practices", action: () => window.location.href = "/best-practices" }
    ],
    detective: [
      { icon: "🕵️", label: "Investigation Tools", action: () => activeTab = "analysis" },
      { icon: "🔗", label: "Connection Analysis", action: () => console.log("Connections") },
      { icon: "📋", label: "Report Generator", action: () => activeTab = "chat" },
      { icon: "🎯", label: "Lead Tracker", action: () => console.log("Leads") },
      { icon: "⭐", label: "Best Practices", action: () => window.location.href = "/best-practices" }
    ],
    admin: [
      { icon: "📊", label: "System Dashboard", action: () => activeTab = "dashboard" },
      { icon: "⚡", label: "Performance Monitor", action: () => activeTab = "monitor" },
      { icon: "🔧", label: "System Config", action: () => console.log("Config") },
      { icon: "👥", label: "User Management", action: () => console.log("Users") },
      { icon: "⭐", label: "Best Practices", action: () => window.location.href = "/best-practices" }
    ]
  };
  // Current user role (would come from auth in real app)
  const currentUserRole = "prosecutor";
  const userActions = quickActions[currentUserRole];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
  <!-- Header with System Status -->
  <header class="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <h1 class="text-2xl font-bold text-white">
            🏛️ Legal AI Command Center
          </h1>
          
          <!-- Tab Navigation -->
          <nav class="flex gap-1">
            {#each [
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "chat", label: "AI Chat", icon: "🤖" },
              { id: "analysis", label: "Analysis", icon: "📄" },
              { id: "search", label: "Search", icon: "🔍" },
              { id: "monitor", label: "Monitor", icon: "⚡" }
            ] as tab}
              <button
                onclick={() => activeTab = tab.id}
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                class:bg-blue-600={activeTab === tab.id}
                class:text-white={activeTab === tab.id}
                class:text-slate-300={activeTab !== tab.id}
                class:hover:bg-slate-700={activeTab !== tab.id}
              >
                <span class="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            {/each}
          </nav>
        </div>
        
        <!-- System Status Indicator -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm">
            <div 
              class="w-2 h-2 rounded-full"
              class:bg-green-400={connectionStatus === "connected"}
              class:bg-yellow-400={connectionStatus === "connecting"}
              class:bg-red-400={connectionStatus === "disconnected" || connectionStatus === "error"}
            ></div>
            <span class="text-slate-300">
              {connectionStatus === "connected" ? "System Online" : 
               connectionStatus === "connecting" ? "Connecting..." :
               connectionStatus === "error" ? "System Error" : "Offline"}
            </span>
          </div>
          
          <!-- Quick Search Button -->
          <button
            onclick={toggleFindModal}
            class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
            title="Search (Ctrl+K)"
          >
            🔍 Search
            <span class="text-xs bg-slate-600 px-1 rounded">Ctrl+K</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="container mx-auto px-6 py-8">
    {#if !isSystemInitialized}
      <!-- System Initialization Screen -->
      <div class="flex items-center justify-center min-h-96">
        <div class="text-center">
          <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 class="text-xl font-semibold text-white mb-2">Initializing AI System</h2>
          <p class="text-slate-300">
            Setting up GPU acceleration, worker threads, and neural networks...
          </p>
        </div>
      </div>
    {:else}
      <!-- Main Content Based on Active Tab -->
      {#if activeTab === "dashboard"}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Quick Actions -->
          <div class="lg:col-span-1">
            <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h2 class="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div class="grid grid-cols-1 gap-3">
                {#each userActions as action}
                  <button
                    onclick={action.action}
                    class="flex items-center gap-3 w-full p-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg transition-all duration-200 text-left group"
                  >
                    <span class="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                    <span class="text-white font-medium">{action.label}</span>
                  </button>
                {/each}
              </div>
            </div>
            
            <!-- AI Recommendations -->
            {#if aiRecommendations.length > 0}
              <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 mt-6">
                <h2 class="text-lg font-semibold text-white mb-4">🤖 AI Recommendations</h2>
                <AIRecommendations recommendations={aiRecommendations} />
              </div>
            {/if}
          </div>
          
          <!-- System Dashboard -->
          <div class="lg:col-span-2">
            <SystemHealthDashboard 
              health={systemHealth}
              metrics={performanceMetrics}
            />
          </div>
        </div>
        
        <!-- Real-time Metrics Strip -->
        {#if Object.keys(performanceMetrics).length > 0}
          <div class="mt-8">
            <RealTimeMetrics metrics={performanceMetrics} />
          </div>
        {/if}
        
      {:else if activeTab === "chat"}
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <!-- Main Chat Interface -->
          <div class="lg:col-span-3">
            <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
              <div class="border-b border-slate-700 p-4">
                <h2 class="text-lg font-semibold text-white">🤖 AI Legal Assistant</h2>
                <p class="text-sm text-slate-400">Enhanced with multi-model reasoning and context awareness</p>
              </div>
              <div class="h-96">
                <LegalChat
                  systemPrompt="You are an expert legal AI assistant with access to comprehensive legal databases, precedent analysis, and multi-model reasoning capabilities. Provide accurate, professional legal guidance."
                  onMessage={handleChatMessage}
                />
              </div>
            </div>
          </div>
          
          <!-- Chat Sidebar -->
          <div class="lg:col-span-1 space-y-6">
            <!-- Model Status -->
            <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <h3 class="font-semibold text-white mb-3">🧠 Active Models</h3>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-slate-300">Legal-BERT</span>
                  <span class="text-green-400">●</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-300">Gemma3-Legal</span>
                  <span class="text-green-400">●</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-300">Enhanced RAG</span>
                  <span class="text-green-400">●</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-300">SOM Engine</span>
                  <span class="text-green-400">●</span>
                </div>
              </div>
            </div>
            
            <!-- Recent Insights -->
            <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <h3 class="font-semibold text-white mb-3">💡 Recent Insights</h3>
              <div class="space-y-3 text-sm">
                <div class="p-3 bg-slate-700/50 rounded-lg">
                  <p class="text-slate-300">Case law analysis improved by 23%</p>
                  <span class="text-xs text-slate-500">2 minutes ago</span>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg">
                  <p class="text-slate-300">New precedent pattern detected</p>
                  <span class="text-xs text-slate-500">5 minutes ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      {:else if activeTab === "analysis"}
        <div class="max-w-4xl mx-auto">
          <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
            <div class="border-b border-slate-700 p-6">
              <h2 class="text-xl font-semibold text-white mb-2">📄 Advanced Document Analysis</h2>
              <p class="text-slate-400">
                Multi-model AI analysis with pgai integration, semantic search, and extended thinking
              </p>
            </div>
            <div class="p-6">
              <DocumentAnalysis
                onAnalysisComplete={handleAnalysisComplete}
                maxSizeMB={50}
              />
              
              <!-- AI Summarization Panel -->
              <div class="mt-8 border-t border-slate-700 pt-8">
                <h3 class="text-lg font-semibold text-white mb-4">🧠 AI Summarization</h3>
                <AISummarization />
              </div>
            </div>
          </div>
        </div>
        
      {:else if activeTab === "search"}
        <div class="max-w-6xl mx-auto">
          <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-8">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-semibold text-white mb-4">🔍 Enhanced Semantic Search</h2>
              <p class="text-slate-400 max-w-2xl mx-auto">
                Search through legal documents using advanced semantic analysis, vector embeddings, 
                and fuzzy matching powered by Fuse.js and enhanced RAG systems.
              </p>
            </div>
            
            <!-- Search Interface -->
            <div class="max-w-2xl mx-auto mb-8">
              <div class="relative">
                <input
                  type="text"
                  placeholder="Search legal documents, cases, precedents..."
                  class="w-full p-4 pl-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div class="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <span class="text-slate-400 text-xl">🔍</span>
                </div>
              </div>
              
              <div class="flex gap-2 mt-4 flex-wrap">
                {#each ["Contract Analysis", "Case Law", "Precedents", "Evidence", "Regulations"] as tag}
                  <button class="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full text-sm text-slate-300 transition-colors">
                    {tag}
                  </button>
                {/each}
              </div>
            </div>
            
            <!-- Search Results Placeholder -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each Array(6) as _, i}
                <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <div class="text-2xl">📄</div>
                    <div class="flex-1">
                      <h3 class="font-medium text-white mb-2">Document {i + 1}</h3>
                      <p class="text-sm text-slate-400 mb-2">Legal analysis result with 94% confidence match...</p>
                      <div class="flex items-center justify-between text-xs text-slate-500">
                        <span>Relevance: 94%</span>
                        <span>Updated 2h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
        
      {:else if activeTab === "monitor"}
        <div class="space-y-8">
          <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 class="text-xl font-semibold text-white mb-6">⚡ Performance Monitor</h2>
            <PerformanceMonitor 
              metrics={performanceMetrics}
              health={systemHealth}
            />
          </div>
          
          <!-- System Components Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each [
              { name: "Streaming Server", status: "active", icon: "🌐" },
              { name: "Cache Manager", status: "active", icon: "💾" },
              { name: "Analytics Service", status: "active", icon: "📊" },
              { name: "Recommendation Engine", status: "active", icon: "🤖" },
              { name: "Semantic Search", status: "active", icon: "🔍" },
              { name: "XState Orchestrator", status: "active", icon: "🎭" },
              { name: "Extended Thinking", status: "active", icon: "🧠" },
              { name: "Worker Pool", status: "active", icon: "👷" }
            ] as component}
              <div class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-2xl">{component.icon}</span>
                  <span class="font-medium text-white">{component.name}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span class="text-sm text-green-400 capitalize">{component.status}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </main>

  <!-- Find Modal -->
  {#if showFindModal}
    <FindModal 
      bind:isOpen={showFindModal}
      onClose={() => showFindModal = false}
    />
  {/if}
</div>

<style>
  /* Custom scrollbar for dark theme */
  :global(::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(::-webkit-scrollbar-track) {
    background: #1e293b;
  }
  
  :global(::-webkit-scrollbar-thumb) {
    background: #475569;
    border-radius: 4px;
  }
  
  :global(::-webkit-scrollbar-thumb:hover) {
    background: #64748b;
  }
</style>
