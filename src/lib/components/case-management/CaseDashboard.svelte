<!--
  Case Management Dashboard
  Real-time legal case tracking with AI insights using Enhanced Bits UI
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    ButtonBits,
    CardBits,
    BadgeBits,
    AlertBits,
    ProgressBits,
    SeparatorBits,
    SkeletonBits
  } from '$lib/components/ui/bits-ui';
  import {
    Activity,
    BarChart3,
    Clock,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Plus,
    FolderOpen,
    ListTodo,
    Brain
  } from 'lucide-svelte';
  import type { CaseDashboardStats } from '$lib/server/services/case-management';

  // Svelte 5 runes for state management
  let dashboardStats = $state<CaseDashboardStats | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let refreshing = $state(false);

  // Real-time updates
  let lastUpdate = $state<Date>(new Date());
  let updateInterval: NodeJS.Timeout;

  // Current user (from page data or auth store)
  const userId = $derived($page.data?.user?.id || 'mock-user-id');

  onMount(() => {
    loadDashboard();

    // Set up real-time updates every 30 seconds
    updateInterval = setInterval(() => {
      loadDashboard(true);
    }, 30000);

    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  });

  async function loadDashboard(silent = false) {
    if (!silent) isLoading = true;
    if (silent) refreshing = true;
    error = null;

    try {
      const response = await fetch('/api/case-management/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      dashboardStats = data.stats;
      lastUpdate = new Date();
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      isLoading = false;
      refreshing = false;
    }
  }

  function getProgressColor(progress: number): string {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  }

  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }

  function formatRelativeTime(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
</script>

<svelte:head>
  <title>Case Dashboard - Legal AI Platform</title>
</svelte:head>

<div class="case-dashboard">
  <!-- Header -->
  <div class="dashboard-header">
    <div class="header-content">
      <h1 class="dashboard-title">📊 Case Management Dashboard</h1>
      <p class="dashboard-subtitle">
        Real-time overview of your legal cases and tasks
      </p>
    </div>

    <div class="header-actions">
      <div class="last-update">
        <span class="update-text">Last updated: {lastUpdate.toLocaleTimeString()}</span>
        {#if refreshing}
          <div class="refresh-indicator">🔄</div>
        {/if}
      </div>

      <ButtonBits
        onclick={() => loadDashboard()}
        disabled={isLoading || refreshing}
        variant="outline"
        size="sm"
      >
        {#if isLoading || refreshing}
          <RefreshCw class="w-4 h-4 mr-2 animate-spin" />
          Refreshing...
        {:else}
          <RefreshCw class="w-4 h-4 mr-2" />
          Refresh
        {/if}
      </ButtonBits>
    </div>
  </div>

  {#if error}
    <AlertBits variant="destructive" class="mb-6">
      <AlertTriangle class="w-4 h-4" />
      <div class="ml-2">
        <h3 class="font-semibold">Failed to load dashboard</h3>
        <p class="text-sm mt-1">{error}</p>
        <ButtonBits onclick={() => loadDashboard()} variant="outline" size="sm" class="mt-2">
          <RefreshCw class="w-4 h-4 mr-2" />
          Try Again
        </ButtonBits>
      </div>
    </AlertBits>
  {:else if isLoading}
    <div class="loading-state">
      <div class="space-y-6">
        <!-- Loading skeletons for metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each Array(8) as _}
            <CardBits class="p-4">
              <SkeletonBits class="h-4 w-20 mb-2" />
              <SkeletonBits class="h-8 w-16 mb-1" />
              <SkeletonBits class="h-3 w-24" />
            </CardBits>
          {/each}
        </div>

        <!-- Loading skeleton for activity -->
        <CardBits class="p-4">
          <SkeletonBits class="h-6 w-32 mb-4" />
          <div class="space-y-3">
            {#each Array(5) as _}
              <div class="flex items-center space-x-3">
                <SkeletonBits class="h-4 w-4 rounded" />
                <SkeletonBits class="h-4 flex-1" />
                <SkeletonBits class="h-4 w-16" />
              </div>
            {/each}
          </div>
        </CardBits>
      </div>
    </div>
  {:else if dashboardStats}
    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Cases -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <FolderOpen class="w-5 h-5 text-blue-600" />
            <h3 class="font-semibold text-gray-700">Total Cases</h3>
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-gray-900">{dashboardStats.totalCases}</div>
          <p class="text-sm text-gray-500">Active & Closed</p>
        </div>
      </CardBits>

      <!-- Active Cases -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <Activity class="w-5 h-5 text-green-600" />
            <h3 class="font-semibold text-gray-700">Active Cases</h3>
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-green-600">{dashboardStats.activeCases}</div>
          <p class="text-sm text-gray-500">Currently working</p>
        </div>
      </CardBits>

      <!-- Completed This Month -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <CheckCircle class="w-5 h-5 text-emerald-600" />
            <h3 class="font-semibold text-gray-700">Completed (Month)</h3>
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-emerald-600">{dashboardStats.completedThisMonth}</div>
          <p class="text-sm text-gray-500">Cases closed</p>
        </div>
      </CardBits>

      <!-- Average Progress -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <BarChart3 class="w-5 h-5 text-blue-600" />
            <h3 class="font-semibold text-gray-700">Avg Progress</h3>
          </div>
        </div>
        <div class="space-y-3">
          <div class="text-3xl font-bold text-blue-600">{dashboardStats.averageProgress}%</div>
          <ProgressBits value={dashboardStats.averageProgress} class="w-full" />
        </div>
      </CardBits>

      <!-- High Priority Cases -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <AlertTriangle class="w-5 h-5 text-red-600" />
            <h3 class="font-semibold text-gray-700">High Priority</h3>
          </div>
          {#if dashboardStats.highPriorityCases > 0}
            <BadgeBits variant="destructive" class="animate-pulse">Urgent</BadgeBits>
          {/if}
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-red-600">{dashboardStats.highPriorityCases}</div>
          <p class="text-sm text-gray-500">Require attention</p>
        </div>
      </CardBits>

      <!-- Overdue Todos -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <Clock class="w-5 h-5 text-orange-600" />
            <h3 class="font-semibold text-gray-700">Overdue Tasks</h3>
          </div>
          {#if dashboardStats.overdueTodos > 0}
            <BadgeBits variant="secondary" class="bg-orange-100 text-orange-800">Overdue</BadgeBits>
          {/if}
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-orange-600">{dashboardStats.overdueTodos}</div>
          <p class="text-sm text-gray-500">Past due date</p>
        </div>
      </CardBits>

      <!-- Pending Recommendations -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <Brain class="w-5 h-5 text-purple-600" />
            <h3 class="font-semibold text-gray-700">AI Recommendations</h3>
          </div>
          {#if dashboardStats.pendingRecommendations > 0}
            <BadgeBits variant="secondary" class="bg-purple-100 text-purple-800">New</BadgeBits>
          {/if}
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-purple-600">{dashboardStats.pendingRecommendations}</div>
          <p class="text-sm text-gray-500">Pending review</p>
        </div>
      </CardBits>

      <!-- Total Time Spent -->
      <CardBits class="p-6 hover:shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <Clock class="w-5 h-5 text-indigo-600" />
            <h3 class="font-semibold text-gray-700">Time Spent</h3>
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-3xl font-bold text-indigo-600">{formatTime(dashboardStats.totalTimeSpent)}</div>
          <p class="text-sm text-gray-500">Across all cases</p>
        </div>
      </CardBits>
    </div>

    <!-- Recent Activity -->
    <CardBits class="mb-8">
      <div class="p-6">
        <div class="flex items-center space-x-2 mb-6">
          <Activity class="w-5 h-5 text-blue-600" />
          <h2 class="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {#if dashboardStats.recentActivities.length === 0}
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📭</div>
            <p class="text-gray-500">No recent activity</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each dashboardStats.recentActivities as activity}
              <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  {#if activity.action === 'created'}
                    <Plus class="w-4 h-4 text-blue-600" />
                  {:else if activity.action === 'updated'}
                    <Activity class="w-4 h-4 text-green-600" />
                  {:else if activity.action === 'status_changed'}
                    <RefreshCw class="w-4 h-4 text-orange-600" />
                  {:else if activity.action === 'todo_added'}
                    <ListTodo class="w-4 h-4 text-purple-600" />
                  {:else if activity.action === 'todo_completed'}
                    <CheckCircle class="w-4 h-4 text-green-600" />
                  {:else if activity.action === 'recommendation_generated'}
                    <Brain class="w-4 h-4 text-indigo-600" />
                  {:else}
                    <Activity class="w-4 h-4 text-gray-600" />
                  {/if}
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <div class="flex items-center space-x-2 mt-1">
                    <span class="text-xs text-gray-500">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                    {#if activity.entityType}
                      <SeparatorBits orientation="vertical" class="h-3" />
                      <BadgeBits variant="outline" class="text-xs">
                        {activity.entityType}
                      </BadgeBits>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </CardBits>

    <!-- Quick Actions -->
    <CardBits>
      <div class="p-6">
        <div class="flex items-center space-x-2 mb-6">
          <Activity class="w-5 h-5 text-green-600" />
          <h2 class="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ButtonBits
            onclick={() => window.location.href = '/cases/new'}
            class="h-12 w-full justify-start"
            size="lg"
          >
            <Plus class="w-4 h-4 mr-2" />
            New Case
          </ButtonBits>

          <ButtonBits
            onclick={() => window.location.href = '/cases'}
            variant="outline"
            class="h-12 w-full justify-start"
            size="lg"
          >
            <FolderOpen class="w-4 h-4 mr-2" />
            View All Cases
          </ButtonBits>

          <ButtonBits
            onclick={() => window.location.href = '/todos'}
            variant="outline"
            class="h-12 w-full justify-start"
            size="lg"
          >
            <ListTodo class="w-4 h-4 mr-2" />
            My Tasks
          </ButtonBits>

          <ButtonBits
            onclick={() => window.location.href = '/recommendations'}
            variant="outline"
            class="h-12 w-full justify-start"
            size="lg"
          >
            <Brain class="w-4 h-4 mr-2" />
            AI Insights
          </ButtonBits>
        </div>
      </div>
    </CardBits>
  {/if}
</div>

<style>
  .case-dashboard {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
  }

  .header-content {
    flex: 1;
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .dashboard-subtitle {
    font-size: 1.1rem;
    color: #64748b;
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .last-update {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #64748b;
  }

  .update-text {
    white-space: nowrap;
  }

  .refresh-indicator {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading-state {
    padding: 2rem 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .case-dashboard {
      padding: 1rem;
    }

    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
    }

    .header-actions {
      align-self: stretch;
      justify-content: space-between;
    }

    .dashboard-title {
      font-size: 1.5rem;
    }

    .last-update {
      font-size: 0.8rem;
    }
  }
</style>