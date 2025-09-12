<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/button/Button.svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  
  // Icons
  import { 
    Settings, Users, Activity, Database, Cpu, HardDrive,
    Shield, BarChart3, Clock, CheckCircle, AlertTriangle,
    RefreshCw, Eye, Zap, Server, Network, Monitor
  } from 'lucide-svelte';

  // Svelte 5 runes
  let systemStats = $state({
    totalUsers: 0,
    activeUsers: 0,
    totalCases: 0,
    activeCases: 0,
    totalDocuments: 0,
    processedDocuments: 0,
    aiAnalyses: 0,
    uptime: '0d 0h 0m'
  });

  let systemHealth = $state({
    database: true,
    redis: true,
    aiService: true,
    fileSystem: true,
    gpu: false,
    vectorSearch: true
  });

  let recentActivity = $state([]);
  let isLoading = $state(true);
  let lastUpdated = $state(new Date());

  onMount(async () => {
    await loadSystemStats();
    await loadSystemHealth();
    await loadRecentActivity();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  });

  async function loadSystemStats() {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        systemStats = data;
      } else {
        // Mock data for demo
        systemStats = {
          totalUsers: 47,
          activeUsers: 12,
          totalCases: 156,
          activeCases: 23,
          totalDocuments: 1847,
          processedDocuments: 1523,
          aiAnalyses: 3421,
          uptime: '2d 14h 32m'
        };
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  }

  async function loadSystemHealth() {
    try {
      const response = await fetch('/api/admin/health');
      if (response.ok) {
        const data = await response.json();
        systemHealth = data.services || systemHealth;
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadRecentActivity() {
    try {
      const response = await fetch('/api/admin/activity');
      if (response.ok) {
        const data = await response.json();
        recentActivity = data.activities || [];
      } else {
        // Mock recent activity
        recentActivity = [
          {
            id: 1,
            type: 'case_created',
            user: 'john.doe@law.com',
            description: 'Created new case: Smith v. Johnson',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            status: 'success'
          },
          {
            id: 2,
            type: 'ai_analysis',
            user: 'jane.smith@law.com',
            description: 'Completed AI analysis on contract dispute',
            timestamp: new Date(Date.now() - 900000).toISOString(),
            status: 'success'
          },
          {
            id: 3,
            type: 'user_login',
            user: 'admin@legal-ai.com',
            description: 'Administrator login from 192.168.1.100',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            status: 'info'
          }
        ];
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  }

  async function refreshData() {
    await Promise.all([
      loadSystemStats(),
      loadSystemHealth(),
      loadRecentActivity()
    ]);
    lastUpdated = new Date();
  }

  function getHealthIcon(isHealthy: boolean) {
    return isHealthy ? CheckCircle : AlertTriangle;
  }

  function getHealthColor(isHealthy: boolean) {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'case_created': return Users;
      case 'ai_analysis': return Cpu;
      case 'user_login': return Shield;
      default: return Activity;
    }
  }

  function formatTimeAgo(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Legal AI Platform</title>
  <meta name="description" content="Administrative dashboard for the Legal AI Platform" />
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <Shield class="w-8 h-8 text-primary" />
        Admin Dashboard
      </h1>
      <p class="text-muted-foreground mt-2">
        Legal AI Platform system administration and monitoring
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      <Badge variant="secondary" class="gap-1">
        <Clock class="w-3 h-3" />
        Updated {formatTimeAgo(lastUpdated.toISOString())}
      </Badge>
      
      <Button 
        variant="outline" 
        onclick={refreshData}
        disabled={isLoading}
        class="gap-2"
      >
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
        Refresh
      </Button>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Button 
      onclick={() => goto('/admin/users')}
      variant="outline" 
      class="h-20 flex-col gap-2"
    >
      <Users class="w-6 h-6" />
      <span>Manage Users</span>
    </Button>
    
    <Button 
      onclick={() => goto('/admin/cluster')}
      variant="outline" 
      class="h-20 flex-col gap-2"
    >
      <Server class="w-6 h-6" />
      <span>Cluster Status</span>
    </Button>
    
    <Button 
      onclick={() => goto('/admin/gpu-demo')}
      variant="outline" 
      class="h-20 flex-col gap-2"
    >
      <Cpu class="w-6 h-6" />
      <span>GPU Monitor</span>
    </Button>
    
    <Button 
      onclick={() => goto('/system-status')}
      variant="outline" 
      class="h-20 flex-col gap-2"
    >
      <Monitor class="w-6 h-6" />
      <span>System Status</span>
    </Button>
  </div>

  <!-- System Statistics -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div>
      <divHeader class="pb-3">
        <divTitle class="text-sm font-medium text-muted-foreground">Total Users</h3>
      </div>
      <divContent class="pt-0">
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">{systemStats.totalUsers}</span>
          <Users class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          {systemStats.activeUsers} active
        </div>
      </div>
    </div>

    <div>
      <divHeader class="pb-3">
        <divTitle class="text-sm font-medium text-muted-foreground">Cases</h3>
      </div>
      <divContent class="pt-0">
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">{systemStats.totalCases}</span>
          <BarChart3 class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
          {systemStats.activeCases} active
        </div>
      </div>
    </div>

    <div>
      <divHeader class="pb-3">
        <divTitle class="text-sm font-medium text-muted-foreground">Documents</h3>
      </div>
      <divContent class="pt-0">
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">{systemStats.totalDocuments}</span>
          <HardDrive class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
          {systemStats.processedDocuments} processed
        </div>
      </div>
    </div>

    <div>
      <divHeader class="pb-3">
        <divTitle class="text-sm font-medium text-muted-foreground">AI Analyses</h3>
      </div>
      <divContent class="pt-0">
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">{systemStats.aiAnalyses}</span>
          <Zap class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
          Uptime: {systemStats.uptime}
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- System Health -->
    <div>
      <divHeader>
        <divTitle class="flex items-center gap-2">
          <Activity class="w-5 h-5" />
          System Health
        </h3>
        <divDescription>
          Real-time status of core system components
        </p>
      </div>
      <divContent class="space-y-4">
        {#each [
          { key: 'database', label: 'PostgreSQL Database', icon: Database },
          { key: 'redis', label: 'Redis Cache', icon: HardDrive },
          { key: 'aiService', label: 'AI Service', icon: Cpu },
          { key: 'vectorSearch', label: 'Vector Search', icon: Network },
          { key: 'fileSystem', label: 'File System', icon: HardDrive },
          { key: 'gpu', label: 'GPU Acceleration', icon: Zap }
        ] as service}
          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <service.icon class="w-4 h-4 text-muted-foreground" />
              <span class="font-medium">{service.label}</span>
            </div>
            <div class="flex items-center gap-2">
              {#if systemHealth[service.key]}
                <Badge class="bg-green-100 text-green-800">Healthy</Badge>
                <CheckCircle class="{getHealthColor(systemHealth[service.key])} w-4 h-4" />
              {:else}
                <Badge class="bg-red-100 text-red-800">Down</Badge>
                <AlertTriangle class="{getHealthColor(systemHealth[service.key])} w-4 h-4" />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <divHeader>
        <divTitle class="flex items-center gap-2">
          <Clock class="w-5 h-5" />
          Recent Activity
        </h3>
        <divDescription>
          Latest system events and user actions
        </p>
      </div>
      <divContent class="space-y-4">
        {#if recentActivity.length > 0}
          {#each recentActivity as activity}
            {@const ActivityIcon = getActivityIcon(activity.type)}
            <div class="flex items-start gap-3 p-3 border-l-4 {activity.status === 'success' ? 'border-green-500 bg-green-50' : activity.status === 'error' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'} rounded-r-lg">
              <ActivityIcon class="w-4 h-4 mt-1 text-muted-foreground" />
              <div class="flex-1">
                <p class="text-sm font-medium">{activity.description}</p>
                <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{activity.user}</span>
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="text-center py-8 text-muted-foreground">
            <Activity class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>