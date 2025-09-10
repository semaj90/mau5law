<script lang="ts">
</script>
  import type { PageData, ActionData } from './$types.js';
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  
  // Enhanced-Bits orchestrated components
  import { 
    Button, 
    Card, 
    Input,
    Badge
  } from '$lib/components/ui/enhanced-bits';
  import { 
    OrchestratedCard,
    OrchestratedButton,
    getConfidenceClass
  } from '$lib/components/ui/orchestrated';
  
  // Icons for Redis admin
  import { 
    Database, HardDrive, Activity, Zap, Trash2, Plus,
    RefreshCw, AlertCircle, CheckCircle, Clock, BarChart3,
    Settings, Eye, Key, Server, Cpu, Memory
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  
  // Svelte 5 runes for admin interface state
  let selectedTab = $state<'overview' | 'keys' | 'performance' | 'tools'>('overview');
  let isAutoRefresh = $state(false);
  let refreshInterval = $state<NodeJS.Timeout | null>(null);
  let keyFilter = $state('');
  let newKey = $state('');
  let newValue = $state('');
  let newTtl = $state(3600);
  let selectedKey = $state<string | null>(null);
  let keyDetails = $state<any>(null);
  let isLoading = $state(false);

  // Derived state for filtered keys
  let filteredKeys = $derived(
    data.recentKeys.filter(key => 
      key.key.toLowerCase().includes(keyFilter.toLowerCase())
    )
  );

  // Redis connection status
  let connectionStatusColor = $derived(
    data.connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
  );

  // Performance metrics colors
  function getMetricColor(value: number, threshold: number): string {
    return value >= threshold ? 'text-green-600' : 'text-yellow-600';
  }

  function getMemoryColor(efficiency: number): string {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Auto-refresh functionality
  function toggleAutoRefresh() {
    isAutoRefresh = !isAutoRefresh;
    
    if (isAutoRefresh) {
      refreshInterval = setInterval(() => {
        invalidateAll();
      }, 5000);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // Manual refresh
  async function refreshData() {
    isLoading = true;
    await invalidateAll();
    isLoading = false;
  }

  // Key management
  async function viewKeyDetails(key: string) {
    selectedKey = key;
    isLoading = true;
    
    try {
      const response = await fetch(`/api/redis/key/${encodeURIComponent(key)}`);
      if (response.ok) {
        keyDetails = await response.json();
      }
    } catch (error) {
      console.error('Failed to load key details:', error);
      keyDetails = null;
    } finally {
      isLoading = false;
    }
  }

  // Format bytes to human readable
  function formatBytes(bytes: string): string {
    if (typeof bytes === 'string' && bytes.includes('B')) {
      return bytes;
    }
    const size = parseFloat(bytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let convertedSize = size;
    
    while (convertedSize >= 1024 && unitIndex < units.length - 1) {
      convertedSize /= 1024;
      unitIndex++;
    }
    
    return `${convertedSize.toFixed(1)}${units[unitIndex]}`;
  }

  // Format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  // Cleanup on destroy
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
</script>

<svelte:head>
  <title>Redis Cache Administration - Legal AI Platform</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-primary flex items-center gap-3">
        <Database class="w-8 h-8 text-primary" />
        Redis Cache Admin
      </h1>
      <p class="text-muted-foreground mt-1">
        Performance management and cache administration
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      <!-- Connection Status -->
      <Badge 
        variant={data.connectionStatus === 'connected' ? 'default' : 'destructive'}
        class="gap-1"
      >
        {#if data.connectionStatus === 'connected'}
          <CheckCircle class="w-3 h-3" />
          Connected
        {:else}
          <AlertCircle class="w-3 h-3" />
          Disconnected
        {/if}
      </Badge>
      
      <!-- Auto Refresh Toggle -->
      <Button 
        variant="outline" 
        size="sm"
        onclick={toggleAutoRefresh}
        class="gap-2"
      >
        <Activity class="w-4 h-4 {isAutoRefresh ? 'text-green-600' : ''}" />
        {isAutoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
      </Button>
      
      <!-- Manual Refresh -->
      <OrchestratedButton.Enhanced
        variant="outline"
        size="sm"
        onclick={refreshData}
        disabled={isLoading}
        class="gap-2"
      >
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
        Refresh
      </OrchestratedButton.Enhanced>
    </div>
  </div>

  <!-- Form Messages -->
  {#if form?.success}
    <div class="p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
      {form.message}
    </div>
  {/if}
  
  {#if form?.error}
    <div class="p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
      {form.error}
    </div>
  {/if}

  <!-- Tab Navigation -->
  <div class="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
    {#each [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'keys', label: 'Keys', icon: Key },
      { id: 'performance', label: 'Performance', icon: Activity },
      { id: 'tools', label: 'Tools', icon: Settings }
    ] as tab}
      <button
        onclick={() => selectedTab = tab.id}
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
               {selectedTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        {@render tab.icon({ class: "w-4 h-4" })}
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Overview Tab -->
  {#if selectedTab === 'overview'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Redis Server Info -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Server class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.redisInfo.version}</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Redis Server</p>
          <p class="text-lg font-medium capitalize">{data.redisInfo.mode}</p>
          <p class="text-xs text-muted-foreground">Role: {data.redisInfo.role}</p>
        </CardContent>
      </OrchestratedCard.Analysis>

      <!-- Memory Usage -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Memory class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.redisInfo.used_memory}</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Memory Usage</p>
          <p class="text-lg font-medium">{data.redisInfo.used_memory}</p>
          <p class="text-xs text-muted-foreground">Peak: {data.redisInfo.used_memory_peak}</p>
        </CardContent>
      </OrchestratedCard.Analysis>

      <!-- Operations -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Zap class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">{data.redisInfo.instantaneous_ops_per_sec}/s</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Operations</p>
          <p class="text-lg font-medium">{data.redisInfo.total_commands_processed.toLocaleString()}</p>
          <p class="text-xs text-muted-foreground">Total processed</p>
        </CardContent>
      </OrchestratedCard.Analysis>

      <!-- Uptime -->
      <OrchestratedCard.Analysis>
        <Card.Content class="p-6">
          <div class="flex items-center justify-between mb-4">
            <Clock class="w-8 h-8 text-primary/60" />
            <Badge variant="outline">Active</Badge>
          </div>
          <p class="text-sm text-muted-foreground mb-1">Uptime</p>
          <p class="text-lg font-medium">{formatUptime(data.redisInfo.uptime_in_seconds)}</p>
          <p class="text-xs text-muted-foreground">{data.redisInfo.connected_clients} clients</p>
        </CardContent>
      </OrchestratedCard.Analysis>
    </div>

    <!-- Hit/Miss Statistics -->
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <BarChart3 class="w-5 h-5" />
          Cache Performance
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">{data.redisInfo.keyspace_hits.toLocaleString()}</p>
            <p class="text-sm text-muted-foreground">Hits</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-red-600">{data.redisInfo.keyspace_misses.toLocaleString()}</p>
            <p class="text-sm text-muted-foreground">Misses</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-yellow-600">{data.redisInfo.expired_keys.toLocaleString()}</p>
            <p class="text-sm text-muted-foreground">Expired</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-primary">
              {((data.redisInfo.keyspace_hits / (data.redisInfo.keyspace_hits + data.redisInfo.keyspace_misses)) * 100).toFixed(1)}%
            </p>
            <p class="text-sm text-muted-foreground">Hit Rate</p>
          </div>
        </div>
      </CardContent>
    </OrchestratedCard.Analysis>
  {/if}

  <!-- Keys Tab -->
  {#if selectedTab === 'keys'}
    <div class="space-y-6">
      <!-- Key Management Tools -->
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Key class="w-5 h-5" />
            Key Management
          </Card.Title>
          <Card.Description>
            Browse and manage Redis keys ({data.keyStats.total_keys} total)
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Search Filter -->
          <Input
            bind:value={keyFilter}
            placeholder="Filter keys..."
            class="max-w-md"
          />
          
          <!-- Key List -->
          <div class="grid gap-2 max-h-96 overflow-y-auto">
            {#each filteredKeys as key}
              <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div class="flex-1">
                  <p class="font-mono text-sm">{key.key}</p>
                  <div class="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span class="capitalize">{key.type}</span>
                    <span>{key.size}</span>
                    <span>TTL: {key.ttl > 0 ? `${key.ttl}s` : 'No expiry'}</span>
                  </div>
                </div>
                <div class="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => viewKeyDetails(key.key)}
                  >
                    <Eye class="w-3 h-3" />
                  </Button>
                  <form method="POST" action="?/deleteKey" use:enhance>
                    <input type="hidden" name="key" value={key.key} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      class="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 class="w-3 h-3" />
                    </Button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </OrchestratedCard.Analysis>

      <!-- Add New Key -->
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Plus class="w-5 h-5" />
            Add New Key
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <form method="POST" action="?/setKey" use:enhance class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                bind:value={newKey}
                name="key"
                placeholder="Key name"
                required
              />
              <Input
                bind:value={newValue}
                name="value"
                placeholder="Value"
                required
              />
              <Input
                bind:value={newTtl}
                name="ttl"
                type="number"
                placeholder="TTL (seconds)"
                min="0"
              />
            </div>
            <Button type="submit" class="gap-2">
              <Plus class="w-4 h-4" />
              Add Key
            </Button>
          </form>
        </CardContent>
      </OrchestratedCard.Analysis>
    </div>
  {/if}

  <!-- Performance Tab -->
  {#if selectedTab === 'performance'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title>Performance Metrics</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold {getMetricColor(data.performanceMetrics.hit_rate, 80)}">{data.performanceMetrics.hit_rate.toFixed(1)}%</p>
              <p class="text-sm text-muted-foreground">Hit Rate</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{data.performanceMetrics.ops_per_sec}</p>
              <p class="text-sm text-muted-foreground">Ops/sec</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold text-primary">{data.performanceMetrics.latency_avg}ms</p>
              <p class="text-sm text-muted-foreground">Avg Latency</p>
            </div>
            <div class="text-center p-4 bg-muted/50 rounded-lg">
              <p class="text-2xl font-bold {getMemoryColor(data.performanceMetrics.memory_efficiency)}">{data.performanceMetrics.memory_efficiency.toFixed(1)}%</p>
              <p class="text-sm text-muted-foreground">Memory Efficiency</p>
            </div>
          </div>
        </CardContent>
      </OrchestratedCard.Analysis>

      <OrchestratedCard.Analysis>
        <Card.Header>
          <Card.Title>Key Statistics</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="space-y-3">
            <div class="flex justify-between">
              <span>Total Keys</span>
              <span class="font-medium">{data.keyStats.total_keys.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>Memory Usage</span>
              <span class="font-medium">{data.keyStats.memory_usage}</span>
            </div>
            <div class="flex justify-between">
              <span>Average TTL</span>
              <span class="font-medium">{data.keyStats.avg_ttl}s</span>
            </div>
            <div class="flex justify-between">
              <span>Fragmentation</span>
              <span class="font-medium">{data.keyStats.fragmentation_ratio.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </OrchestratedCard.Analysis>
    </div>
  {/if}

  <!-- Tools Tab -->
  {#if selectedTab === 'tools'}
    <OrchestratedCard.Analysis>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Settings class="w-5 h-5" />
          Administrative Tools
        </Card.Title>
        <Card.Description class="text-yellow-600">
          ⚠️ Use these tools carefully - they affect the entire cache
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <form method="POST" action="?/flushCache" use:enhance>
          <Button
            type="submit"
            variant="destructive"
            class="gap-2"
            onclick={(e) => {
              if (!confirm('Are you sure you want to flush all cache data? This cannot be undone.')) {
                e.preventDefault();
              }
            }}
          >
            <Trash2 class="w-4 h-4" />
            Flush All Cache
          </Button>
        </form>
        
        <div class="text-sm text-muted-foreground">
          <p>Last updated: {new Date(data.timestamp).toLocaleString()}</p>
        </div>
      </CardContent>
    </OrchestratedCard.Analysis>
  {/if}
</div>