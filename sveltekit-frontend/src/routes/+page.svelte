<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import {
    Brain, Activity, Zap, Shield, Search, Users, BarChart3,
    Database, Folder, Eye, TrendingUp, Clock, AlertCircle,
    CheckCircle, FileText, MapPin, Calendar, Edit3
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import ProductionLayout from '$lib/components/layout/ProductionLayout.svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import * as Card from '$lib/components/ui/card';
  import RAGAssistantChat from '$lib/components/ai/RAGAssistantChat.svelte';

  let isLoading = $state(false);
  let systemMetrics = $state({
    totalCases: 247,
    activeCases: 18,
    personsOfInterest: 156,
    evidenceItems: 892,
    searchQueries: 1234,
    aiAnalyses: 567,
    systemUptime: '99.8%',
    responseTime: '0.3s'
  });

  let recentActivity = $state([
    {
      id: 1,
      type: 'case_created',
      title: 'New case opened: Corporate Fraud Investigation',
      timestamp: '2 minutes ago',
      priority: 'high',
      icon: Folder
    },
    {
      id: 2,
      type: 'person_added',
      title: 'Person of interest added: Marcus Chen',
      timestamp: '15 minutes ago',
      priority: 'medium',
      icon: Users
    },
    {
      id: 3,
      type: 'evidence_uploaded',
      title: 'Evidence uploaded: Financial records batch',
      timestamp: '1 hour ago',
      priority: 'medium',
      icon: FileText
    },
    {
      id: 4,
      type: 'ai_analysis',
      title: 'AI analysis completed for Case #2024-001',
      timestamp: '2 hours ago',
      priority: 'low',
      icon: Brain
    }
  ]);

  let quickActions = [
    {
      title: 'New Investigation',
      description: 'Start a new legal investigation',
      href: '/cases/create',
      icon: Folder,
      gradient: 'from-blue-600 to-blue-700',
      stats: '+12 this month'
    },
    {
      title: 'AI Analysis',
      description: 'Run intelligent case analysis',
      href: '/analysis',
      icon: Brain,
      gradient: 'from-purple-600 to-purple-700',
      stats: '567 completed'
    },
    {
      title: 'Evidence Search',
      description: 'Search across all evidence',
      href: '/evidence',
      icon: Search,
      gradient: 'from-green-600 to-green-700',
      stats: '892 items indexed'
    },
    {
      title: 'Person Tracking',
      description: 'Manage persons of interest',
      href: '/persons-of-interest',
      icon: Users,
      gradient: 'from-yellow-600 to-yellow-700',
      stats: '156 active records'
    },
    {
      title: '🎮 SPA Canvas',
      description: 'Full-screen gaming UX with gemma3:legal-latest',
      href: '/spa',
      icon: Brain,
      gradient: 'from-purple-600 to-blue-700',
      stats: 'NEW',
      isNew: true
    },
    {
      title: 'Text Editor',
      description: 'NieR-themed rich text editor',
      href: '/text-editor',
      icon: Edit3,
      gradient: 'from-red-600 to-red-700',
      stats: 'Legal documents'
    }
  ];

  let systemStatus = $state([
    { name: 'AI Engine', status: 'operational', uptime: '99.9%', color: 'green' },
    { name: 'Database', status: 'operational', uptime: '99.8%', color: 'green' },
    { name: 'Search Index', status: 'operational', uptime: '99.7%', color: 'green' },
    { name: 'GPU Cluster', status: 'limited', uptime: '87.3%', color: 'yellow' }
  ]);

  onMount(async () => {
    if (!browser) return;
    isLoading = true;

    try {
      // Simulate loading dashboard data
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    } finally {
      isLoading = false;
    }
  });

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'operational': return 'text-green-400';
      case 'limited': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  // derive user id (slug) from the page load data (falls back to demo)
  let userId = $state('demo-user');

  // update `userId` whenever the `$page` store changes (runes-mode friendly)
  const _unsub_userId = page.subscribe(($p) => {
    userId = $p?.data?.userId ?? $p?.data?.sessionId ?? 'demo-user';
  });

  onDestroy(() => {
    _unsub_userId();
  });

  function handleCaseCreated(caseId: string) {
    console.log('New case created:', caseId);
    // navigate to case or show a notification here
  }

  function handleCaseCreatedEvent(e: CustomEvent<string>) {
    console.log('New case created (event):', e.detail);
  }
</script>

<svelte:head>
  <title>Legal AI Platform - Professional Command Center</title>
  <meta name="description" content="Professional legal investigation platform with AI-powered analysis and intelligent case management" />
</svelte:head>

<ProductionLayout title="Command Center" subtitle="Central Operations Hub">
  <div class="space-y-8">
    <!-- Hero Statistics -->
    <section aria-label="System statistics overview">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-blue-600/20 rounded-lg">
            <Database class="w-6 h-6 text-blue-400" />
          </div>
          <div class="text-blue-400 text-sm font-medium">Total</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.totalCases}</div>
        <div class="text-sm text-gray-400">Legal Cases</div>
      </div>

      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-green-600/20 rounded-lg">
            <Activity class="w-6 h-6 text-green-400" />
          </div>
          <div class="text-green-400 text-sm font-medium">Active</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.activeCases}</div>
        <div class="text-sm text-gray-400">In Progress</div>
      </div>

      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-yellow-600/20 rounded-lg">
            <Users class="w-6 h-6 text-yellow-400" />
          </div>
          <div class="text-yellow-400 text-sm font-medium">Tracked</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.personsOfInterest}</div>
        <div class="text-sm text-gray-400">Persons</div>
      </div>

      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-purple-600/20 rounded-lg">
            <Eye class="w-6 h-6 text-purple-400" />
          </div>
          <div class="text-purple-400 text-sm font-medium">Stored</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.evidenceItems}</div>
        <div class="text-sm text-gray-400">Evidence Items</div>
      </div>
    </div>
    </section>

    <!-- Quick Actions -->
    <section aria-label="Quick action shortcuts">
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-6">
          <Zap class="w-6 h-6 text-amber-400" />
          <h2 class="text-xl font-semibold text-amber-400 tracking-wide">Quick Actions</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each quickActions as action}
            <a
              href={action.href}
              class="group relative overflow-hidden rounded-lg bg-gradient-to-br {action.gradient} p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label="{action.title}: {action.description}"
            >
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-4">
                  <action.icon class="w-8 h-8" />
                  <div class="text-xs opacity-75 font-medium">{action.stats}</div>
                </div>
                <h3 class="font-bold text-lg mb-2">{action.title}</h3>
                <p class="text-sm opacity-90">{action.description}</p>
              </div>

              <!-- Hover effect overlay -->
              <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          {/each}

          <!-- Live Demo Button -->
          <a
            href="/w1"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl ring-2 ring-emerald-400/50"
            aria-label="Live Demo: Experience the full Legal AI Platform"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <Brain class="w-8 h-8 animate-pulse" />
                <div class="text-xs opacity-75 font-medium bg-white/20 px-2 py-1 rounded">LIVE</div>
              </div>
              <h3 class="font-bold text-lg mb-2">🚀 Live Demo</h3>
              <p class="text-sm opacity-90">Full AI Assistant with auto case creation</p>
            </div>

            <!-- Special glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>

          <!-- SPA Canvas Button -->
          <a
            href="/spa"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 to-blue-700 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="SPA Canvas: Full-screen gaming UX with gemma3:legal-latest"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="relative">
                  <Brain class="w-8 h-8 animate-pulse" />
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <div class="text-xs opacity-75 font-medium bg-green-400/20 px-2 py-1 rounded">NEW</div>
              </div>
              <h3 class="font-bold text-lg mb-2">🎮 SPA Canvas</h3>
              <p class="text-sm opacity-90">Full-screen gaming UX with gemma3:legal-latest</p>
            </div>

            <!-- Special gaming glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>

          <!-- All Routes Button -->
          <a
            href="/all-routes"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="All Routes: Browse all available pages and features"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <MapPin class="w-8 h-8" />
                <div class="text-xs opacity-75 font-medium">Browse</div>
              </div>
              <h3 class="font-bold text-lg mb-2">All Routes</h3>
              <p class="text-sm opacity-90">Browse all available pages and features</p>
            </div>

            <!-- Hover effect overlay -->
            <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>
        </div>
      </div>
    </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Activity -->
      <div class="yorha-3d-panel">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <Clock class="w-6 h-6 text-amber-400" />
              <h3 class="text-xl font-semibold text-amber-400 tracking-wide">Recent Activity</h3>
            </div>
            <a href="/activity" class="text-amber-400 hover:text-amber-300 text-sm font-medium">
              View All →
            </a>
          </div>

          <div class="space-y-4">
            {#each recentActivity as activity}
              <div class="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-yellow-600/50 transition-colors">
                <div class="p-2 bg-gray-700 rounded-lg">
                  <activity.icon class="w-4 h-4 {getPriorityColor(activity.priority)}" />
                </div>
                <div class="flex-1">
                  <p class="text-white text-sm font-medium mb-1">{activity.title}</p>
                  <div class="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar class="w-3 h-3" />
                    {activity.timestamp}
                    <span class="w-1 h-1 bg-gray-500 rounded-full"></span>
                    <span class={cn("uppercase font-medium", getPriorityColor(activity.priority))}>
                      {activity.priority}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- System Status -->
      <div class="yorha-3d-panel">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <Shield class="w-6 h-6 text-amber-400" />
              <h3 class="text-xl font-semibold text-amber-400 tracking-wide">System Status</h3>
            </div>
            <div class="flex items-center gap-2 text-green-400">
              <CheckCircle class="w-4 h-4" />
              <span class="text-sm font-medium">All Systems Operational</span>
            </div>
          </div>

          <div class="space-y-4">
            {#each systemStatus as system}
              <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div class="flex items-center gap-3">
                  <div class={cn(
                    "w-3 h-3 rounded-full",
                    system.color === 'green' ? 'bg-green-400' :
                    system.color === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                  )}></div>
                  <span class="text-white font-medium">{system.name}</span>
                </div>
                <div class="text-right">
                  <div class={cn("text-sm font-medium", getStatusColor(system.status))}>
                    {system.status.toUpperCase()}
                  </div>
                  <div class="text-xs text-gray-400">{system.uptime} uptime</div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Performance Metrics -->
          <div class="mt-6 pt-6 border-t border-gray-600">
            <h4 class="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wide">Performance</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-400">{systemMetrics.systemUptime}</div>
                <div class="text-xs text-gray-400">System Uptime</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-400">{systemMetrics.responseTime}</div>
                <div class="text-xs text-gray-400">Avg Response</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Intelligence Summary -->
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <Brain class="w-6 h-6 text-amber-400" />
            <h3 class="text-xl font-semibold text-amber-400 tracking-wide">AI Intelligence Summary</h3>
          </div>
          <div class="flex items-center gap-2 text-purple-400">
            <TrendingUp class="w-4 h-4" />
            <span class="text-sm">Analysis Active</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-purple-600/30">
            <div class="text-3xl font-bold text-purple-400 mb-2">{systemMetrics.aiAnalyses}</div>
            <div class="text-sm text-gray-400">AI Analyses Completed</div>
            <div class="text-xs text-purple-300 mt-1">+23% this week</div>
          </div>

          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-blue-600/30">
            <div class="text-3xl font-bold text-blue-400 mb-2">{systemMetrics.searchQueries}</div>
            <div class="text-sm text-gray-400">Search Queries Processed</div>
            <div class="text-xs text-blue-300 mt-1">+15% this week</div>
          </div>

          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-green-600/30">
            <div class="text-3xl font-bold text-green-400 mb-2">94.2%</div>
            <div class="text-sm text-gray-400">Pattern Recognition Accuracy</div>
            <div class="text-xs text-green-300 mt-1">+2.1% improvement</div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Assistant RAG Chat Section -->
    <section aria-label="AI Legal Assistant with RAG Capabilities" class="mt-12">
      <div class="yorha-3d-panel">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <Brain class="w-6 h-6 text-emerald-400" />
            <h2 class="text-xl font-semibold text-emerald-400 tracking-wide">🤖 AI Legal Assistant</h2>
            <div class="ml-auto flex items-center gap-2 text-emerald-400">
              <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span class="text-sm font-medium">RAG + Who/What/Why/How</span>
            </div>
          </div>

          <div class="mb-4 p-4 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-lg border border-emerald-500/20">
            <p class="text-emerald-100 text-sm leading-relaxed">
              <strong>🚀 Advanced Legal AI:</strong> Start a conversation to begin systematic case building.
              I'll guide you through our proven "Who, What, Why, How" prosecution methodology with
              <strong>RAG-powered</strong> legal research integration. Just describe your situation and watch the magic happen!
            </p>
          </div>
          {#if systemMetrics.totalCases === 0}
            <div class="p-6">
              <div class="text-yellow-300 font-medium">No cases yet</div>
              <p class="text-sm text-gray-400">Start by creating a new case to enable the AI assistant.</p>
              <a href="/cases/create" class="mt-3 inline-block text-emerald-400 hover:underline">Create a case →</a>
            </div>
          {:else}
            <RAGAssistantChat
              userId={userId}
              onCaseCreated={(caseId: string) => {
                // ignore invalid sentinel id "0"
                if (caseId === '0' || caseId === 0) {
                  console.warn('Received invalid case id "0" — ignoring.');
                  return;
                }
                handleCaseCreated(caseId);
              }}
              on:caseCreated={handleCaseCreatedEvent}
            />
          {/if}

              </div>
              </div>
            </section>
            </div>
          </ProductionLayout>

<style>
  .yorha-3d-panel {
    /* Professional card styling with modern glass morphism */
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.85) 100%);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 0.75rem;
    backdrop-filter: blur(12px);
    box-shadow:
      0 8px 32px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(148, 163, 184, 0.05),
      inset 0 1px 0 rgba(248, 250, 252, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .yorha-3d-panel:hover {
    transform: translateY(-2px);
    box-shadow:
      0 20px 64px -12px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(251, 191, 36, 0.1),
      inset 0 1px 0 rgba(248, 250, 252, 0.1);
    border-color: rgba(251, 191, 36, 0.2);
  }

  /* Animation enhancements */
  @keyframes glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .neural-pulse {
    animation: glow 2s ease-in-out infinite;
  }
</style>
