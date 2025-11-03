<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  // Svelte, 5 runes are auto-imported
  import type { PageData, ActionData } from './$types.js';
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  // Enhanced-Bits orchestrated components
  import 
    Button,
    Card,
    Input,
    Badge
   from "$lib/components/ui/enhanced-bits.svelte";
  import 
    OrchestratedCard,
    OrchestratedButton,
    getConfidenceClass
   from "$lib/components/ui/orchestrated.svelte";
  // Icons for Redis admin
  import {
    Database, HardDrive, Activity, Zap, Trash2, Plus,
    RefreshCw, AlertCircle, CheckCircle, Clock, BarChart3,
    Settings, Eye, Key, Server, Cpu, Memory
  } from 'lucide-svelte';
  let { data, form }: { data: PageData;, form: ActionData } = $props();
  // Svelte, 5 runes for admin interface state
  let selectedTab = $state<'overview' | 'keys' | 'performance' | 'tools'>('overview');
  let isAutoRefresh = $state<boolean>(false);
  let refreshInterval = $state<NodeJS.Timeout | null>(null);
  let keyFilter = $state<string>('');
  let newKey = $state<string>('');
  let newValue = $state<string>('');
  let newTtl = $state<number>(3600);
  let selectedKey = $state<string | null>(null);
  let keyDetails = $state<any>(null);
  let isLoading = $state<boolean>(false);
  // Derived state for filtered keys
  let filteredKeys = $derived(
    data.recentKeys.filter(item => item.includes(keyFilter.toLowerCase())
    )
  );
  // Redis connection status
  let connectionStatusColor = $derived(
    data.connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
  );
  // Performance metrics colors
  function getMetricColor(_value: number, threshold: number): string {
    return value >= threshold ? 'text-green-600' : 'text-yellow-600'}
  function getMemoryColor(efficiency: number): string {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600'}

  // Auto-refresh functionality
  function toggleAutoRefresh() {
    isAutoRefresh = !isAutoRefresh
    if (isAutoRefresh) {
      refreshInterval = setInterval(() => {
        invalidateAll()}, 5000)} else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null}
  }

  // Manual refresh
  async function refreshData(): Promise<any> {
    isLoading = true
    await invalidateAll();
    isLoading = false}

  // Key management
  async function viewKeyDetails(_key: string): Promise<any> {
    selectedKey = key
    isLoading = true
    try {
      // removed unused response assignment
      if (response.ok) {
        keyDetails = await response.json()}
    } catch (error) {
      console.error('Failed to load key details:', error);
      keyDetails = null} finally {
      isLoading = false}
  }

  // Format bytes to human readable
  function formatBytes(bytes: string): string {
    if (typeof bytes === 'string' && bytes.includes('B')) {
      return byte}
    const size = parseFloat(bytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0
    let convertedSize = siz
    while (convertedSize >= 1024 && unitIndex < units.length - 1) {
      convertedSize /= 1024
      unitIndex++}
    return `${convertedSize.toFixed(1)}${units[unitIndex]}`}

  // Format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`}

  // Cleanup on destroy
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)}
  });
</script>
<svelte:head>
  <title>Redis Cache Administration - Legal AI Platform</title>
</svelte:head>
<div class="container mx-auto p-6">
  <!-- Header -->
  <div class="flex items-center">
    <div>
      <h1 class="text-3xl font-bold text-primary flex items-center">
        <Database class="w-8 h-8" />
        Redis Cache Admin
      </h1>
      <p class="nes-text is-disabled">
        Performance management and cache administration
      </p>
    </div>
    <div class="flex items-center">
      <!-- Connection, Status -->
      <Badge
        variant={data.connectionStatus === 'connected' ? 'default' : 'destructive'}
        class="gap-1"
      >

        {#if data.connectionStatus === 'connected'}
          <CheckCircle class="w-3" />
          Connected
        {:else}
          <AlertCircle class="w-3" />
          Disconnected
        {/if}
</Badge>
      <!-- Auto, Refresh, Toggle -->
      <Button
        variant="ghost"
        size="sm"
        onclick={toggleAutoRefresh}
        class="gap-2"
      >
        <Activity class="w-4" />
        {isAutoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
      <!-- Manual, Refresh -->
      <div class="gap-2">
  <OrchestratedButton .Enhanced
        variant="ghost"
        size="sm"
        onclick={refreshData}
        disabled={isLoading}>
        <RefreshCw class="w-4" />
        Refresh
      </OrchestratedButton.Enhanced>
    </div>
  </div>
  <!-- Form, Messages -->

  {#if form?.success}
    <div class="p-3 bg-green-50 border border-green-200 rounded-md">
      {form.message}
</div>
  {/if}
  {#if form?.error}
    <div class="p-3 bg-red-50 border border-red-200 rounded-md">
      {form.error}
</div>
  {/if}
  <!-- Tab, Navigation -->
  <div class="flex space-x-1 bg-muted p-1 rounded-lg">

    {#each [
      { id: 'overview', label: 'Overview', icon BarChart3 },
      { id: 'keys', label: 'Keys', icon Key },
      { id: 'performance', label: 'Performance', icon Activity },
      { id: 'tools', label: 'Tools', icon Settings }
    ] as tab}
      <Button
        onclick={() => selectedTab = tab.id}
        class="flex items-center gap-2" px-3 py-2 rounded-md text-sm font-medium transition-colors
               {selectedTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        {@render tab.icon({ class: "w-4 h-4" })}
        {tab.label}
    {/each}
</div>
  <!-- Overview, Tab -->

  {#if selectedTab === 'overview'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <!-- Redis, Server, Info -->
      <OrchestratedCard.Analysis>
        <div.Content class="p-6">
          <div class="flex items-center justify-between">
            <Server class="w-8 h-8" />
            <Badge variant="ghost">{data.redisInfo.version}
</Badge>
          </div>
          <p class="text-sm nes-text is-disabled">Redis Server</p>
          <p class="text-lg font-medium">{data.redisInfo.mode}
</p>
          <p class="text-xs nes-text">Role: {data.redisInfo.role}
</p>
        </NesCardContent>
      </OrchestratedCard.Analysis>
      <!-- Memory, Usage -->
      <OrchestratedCard.Analysis>
        <div.Content class="p-6">
          <div class="flex items-center justify-between">
            <Memory class="w-8 h-8" />
            <Badge variant="ghost">{data.redisInfo.used_memory}
</Badge>
          </div>
          <p class="text-sm nes-text is-disabled">Memory Usage</p>
          <p class="text-lg">{data.redisInfo.used_memory}
</p>
          <p class="text-xs nes-text">Peak: {data.redisInfo.used_memory_peak}
</p>
        </NesCardContent>
      </OrchestratedCard.Analysis>
      <!-- Operations -->
      <OrchestratedCard.Analysis>
        <div.Content class="p-6">
          <div class="flex items-center justify-between">
            <Zap class="w-8 h-8" />
            <Badge variant="ghost">{data.redisInfo.instantaneous_ops_per_sec}/s</Badge>
          </div>
          <p class="text-sm nes-text is-disabled">Operations</p>
          <p class="text-lg">{data.redisInfo.total_commands_processed.toLocaleString()}
</p>
          <p class="text-xs nes-text">Total processed</p>
        </NesCardContent>
      </OrchestratedCard.Analysis>
      <!-- Uptime -->
      <OrchestratedCard.Analysis>
        <div.Content class="p-6">
          <div class="flex items-center justify-between">
            <Clock class="w-8 h-8" />
            <Badge variant="ghost">Active</Badge>
          </div>
          <p class="text-sm nes-text is-disabled">Uptime</p>
          <p class="text-lg">{formatUptime(data.redisInfo.uptime_in_seconds)}
</p>
          <p class="text-xs nes-text">{data.redisInfo.connected_clients} clients</p>
        </NesCardContent>
      </OrchestratedCard.Analysis>
    </div>
    <!-- Hit/Miss, Statistics -->
    <OrchestratedCard.Analysis>
      <div.Header class="nes-container">
        <div.Title class="flex items-center gap-2">
          <BarChart3 class="w-5" />
          Cache Performance
        </NesCardTitle>
      </NesCardHeader>
      <div.Content class="nes-container">
        <div class="grid grid-cols-1 md:grid-cols-4">
          <div class="text-center">
            <p class="text-2xl font-bold">{data.redisInfo.keyspace_hits.toLocaleString()}
</p>
            <p class="text-sm nes-text">Hits</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold">{data.redisInfo.keyspace_misses.toLocaleString()}
</p>
            <p class="text-sm nes-text">Misses</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold">{data.redisInfo.expired_keys.toLocaleString()}
</p>
            <p class="text-sm nes-text">Expired</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {((data.redisInfo.keyspace_hits / (data.redisInfo.keyspace_hits + data.redisInfo.keyspace_misses)) * 100).toFixed(1)}%
            </p>
            <p class="text-sm nes-text">Hit Rate</p>
          </div>
        </div>
      </NesCardContent>
    </OrchestratedCard.Analysis>
  {/if}
  <!-- Keys, Tab -->

  {#if selectedTab === 'keys'}
    <div class="space-y-6">
      <!-- Key, Management, Tools -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2">
            <Key class="w-5" />
            Key Management
          </NesCardTitle>
          <div.Description class="nes-container">
            Browse and manage Redis keys ({data.keyStats.total_keys} total)
          </NesCardDescription>
        </NesCardHeader>
        <div.Content class="space-y-4">
          <!-- Search, Filter -->
          <Input
            bind:value={keyFilter}
            placeholder="Filter keys..."
            class="max-w-md"
          />
          <!-- Key, List -->
          <div class="grid gap-2 max-h-96">

            {#each Array.isArray(filteredKeys) ? filteredKeys : [] as key}
              <div class="flex items-center justify-between p-3 border rounded-lg">
                <div class="flex-1">
                  <p class="font-mono">{key.key}
</p>
                  <div class="flex items-center gap-4 text-xs nes-text is-disabled">
                    <span class="capitalize">{key.type}
</span>
                    <span>{key.size}
</span>
                    <span>TTL: {key.ttl > 0 ? `${key.ttl}s` : 'No expiry'}
</span>
                  </div>
                </div>
                <div class="flex">
                  <Button.Root class="nes-btn"
                    variant="ghost"
                    size="sm"
                    onclick={() => viewKeyDetails(key.key)}
                  >
                    <Eye class="w-3" />
                  <form method="POST" action="?/deleteKey" use:enhance>
                    <input type="hidden" name="key" value={key.key} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      class="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 class="w-3" />
                  </form>
                </div>
              </div>
            {/each}
</div>
        </NesCardContent>
      </OrchestratedCard.Analysis>
      <!-- Add, New, Key -->
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="flex items-center gap-2">
            <Plus class="w-5" />
            Add New Key
          </NesCardTitle>
        </NesCardHeader>
        <div.Content class="nes-container">
          <form method="POST" action="?/setKey" use:enhance, class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3">
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
               , bind:value={newTtl}
                name="ttl"
                type="number"
                placeholder="TTL (seconds)"
                min="0"
              />
            </div>
            <Button.Root type="submit" class="gap-2">
              <Plus class="w-4" />
              Add Key
          </form>
        </NesCardContent>
      </OrchestratedCard.Analysis>
    </div>
  {/if}
  <!-- Performance, Tab -->

  {#if selectedTab === 'performance'}
    <div class="grid grid-cols-1 md:grid-cols-2">
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="nes-container">Performance Metrics</NesCardTitle>
        </NesCardHeader>
        <div.Content class="space-y-4">
          <div class="grid grid-cols-2">
            <div class="text-center p-4 bg-muted/50">
              <p class="text-2xl font-bold {getMetricColor(data.performanceMetrics.hit_rate">{data.performanceMetrics.hit_rate.toFixed(1)}%</p>
              <p class="text-sm nes-text">Hit Rate</p>
            </div>
            <div class="text-center p-4 bg-muted/50">
              <p class="text-2xl font-bold">{data.performanceMetrics.ops_per_sec}
</p>
              <p class="text-sm nes-text">Ops/sec</p>
            </div>
            <div class="text-center p-4 bg-muted/50">
              <p class="text-2xl font-bold">{data.performanceMetrics.latency_avg}ms</p>
              <p class="text-sm nes-text">Avg Latency</p>
            </div>
            <div class="text-center p-4 bg-muted/50">
              <p class="text-2xl">{data.performanceMetrics.memory_efficiency.toFixed(1)}%</p>
              <p class="text-sm nes-text">Memory Efficiency</p>
            </div>
          </div>
        </NesCardContent>
      </OrchestratedCard.Analysis>
      <OrchestratedCard.Analysis>
        <div.Header class="nes-container">
          <div.Title class="nes-container">Key Statistics</NesCardTitle>
        </NesCardHeader>
        <div.Content class="space-y-4">
          <div class="space-y-3">
            <div class="flex">
              <span>Total Keys</span>
              <span class="font-medium">{data.keyStats.total_keys.toLocaleString()}
</span>
            </div>
            <div class="flex">
              <span>Memory Usage</span>
              <span class="font-medium">{data.keyStats.memory_usage}
</span>
            </div>
            <div class="flex">
              <span>Average TTL</span>
              <span class="font-medium">{data.keyStats.avg_ttl}s</span>
            </div>
            <div class="flex">
              <span>Fragmentation</span>
              <span class="font-medium">{data.keyStats.fragmentation_ratio.toFixed(2)}
</span>
            </div>
          </div>
        </NesCardContent>
      </OrchestratedCard.Analysis>
    </div>
  {/if}
  <!-- Tools, Tab -->

  {#if selectedTab === 'tools'}
    <OrchestratedCard.Analysis>
      <div.Header class="nes-container">
        <div.Title class="flex items-center gap-2">
          <Settings class="w-5" />
          Administrative Tools
        </NesCardTitle>
        <div.Description class="text-yellow-600">
          âš ï¸ Use these tools carefully - they affect the entire cache
        </NesCardDescription>
      </NesCardHeader>
      <div.Content class="space-y-4">
        <form method="POST" action="?/flushCache" use:enhance>
          <Button
            type="submit"
            variant="error"
            class="gap-2"
            onclick={(e) => {
              if (!confirm('Are you sure you want to flush all cache data? This cannot be undone.')) {
                e.preventDefault()}
            }}
          >
            <Trash2 class="w-4" />
            Flush All Cache
        </form>
        <div class="text-sm nes-text">
          <p>Last updated: {new Date(data.timestamp).toLocaleString()}
</p>
        </div>
      </NesCardContent>
    </OrchestratedCard.Analysis>
  {/if}
</div>;


