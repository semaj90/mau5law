<!--
  Instant Legal Search Demo
  
  Showcases the complete Redis + Loki.js + Fuse.js integration with:
  - Real-time instant search with sub-100ms responses
  - Smart legal pattern recognition and synonym expansion
  - Multi-source search results (cache, fuzzy, semantic, hybrid)
  - Advanced filtering and performance analytics
  - Interactive search configuration and testing
-->

<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { InstantLegalSearch } from '$lib/components/search';
  import Button from '$lib/components/ui/Button.svelte';
  import * as Card from '$lib/components/ui/card';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/enhanced-bits';
  import { 
    Play, 
    RefreshCw, 
    Settings, 
    BarChart3, 
    Database, 
    Zap,
    CheckCircle,
    XCircle,
    Clock,
    Activity
  } from 'lucide-svelte';

  // Demo state
  let searchQuery = $state('');
  let isTestRunning = $state(false);
  let testResults = $state(null);
  let benchmarkResults = $state(null);
  let systemHealth = $state(null);
  let testCount = $state(50);
  
  // Performance metrics
  let performanceMetrics = $state({
    searchTime: 0,
    cacheHitRate: 0,
    totalSearches: 0,
    averageResponseTime: 0
  });

  onMount(() => {
    // Run initial health check
    checkSystemHealth();
  });

  async function runIntegrationTest(testType = 'all') {
    isTestRunning = true;
    
    try {
      const response = await fetch(`/api/instant-search-test?test=${testType}`);
      const data = await response.json();
      testResults = data;
      
      if (data.status === 'success') {
        performanceMetrics = {
          searchTime: data.performance.instantSearch || 0,
          cacheHitRate: data.results.health?.components?.instantSearch?.stats?.cacheHitRate || 0,
          totalSearches: data.results.health?.components?.instantSearch?.stats?.totalSearches || 0,
          averageResponseTime: data.results.health?.components?.instantSearch?.stats?.averageResponseTime || 0
        };
      }
    } catch (error) {
      console.error('Test failed:', error);
      testResults = { status: 'error', error: error.message };
    } finally {
      isTestRunning = false;
    }
  }

  async function runBenchmark() {
    isTestRunning = true;
    
    try {
      const response = await fetch('/api/instant-search-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'benchmark',
          data: { 
            iterations: testCount,
            queries: ['contract law', 'evidence analysis', 'case precedent', 'legal brief']
          }
        })
      });
      
      const data = await response.json();
      benchmarkResults = data.benchmarks;
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      isTestRunning = false;
    }
  }

  async function populateTestData() {
    isTestRunning = true;
    
    try {
      const response = await fetch('/api/instant-search-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'populate-test-data',
          data: { count: 100 }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await checkSystemHealth();
      }
    } catch (error) {
      console.error('Data population failed:', error);
    } finally {
      isTestRunning = false;
    }
  }

  async function clearCache() {
    isTestRunning = true;
    
    try {
      const response = await fetch('/api/instant-search-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' })
      });
      
      const data = await response.json();
      if (data.success) {
        testResults = null;
        benchmarkResults = null;
        await checkSystemHealth();
      }
    } catch (error) {
      console.error('Cache clear failed:', error);
    } finally {
      isTestRunning = false;
    }
  }

  async function checkSystemHealth() {
    try {
      const response = await fetch('/api/instant-search-test?test=health');
      const data = await response.json();
      systemHealth = data.results.health;
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  function handleResultClick(result) {
    console.log('Search result clicked:', result);
  }

  function handleResultAction(result, action) {
    console.log('Search result action:', action, result);
  }

  function getStatusColor(status) {
    switch (status) {
      case 'connected':
      case 'working':
      case 'healthy':
      case 'success':
        return 'text-green-600';
      case 'degraded':
      case 'partial':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'connected':
      case 'working':
      case 'healthy':
      case 'success':
        return CheckCircle;
      case 'degraded':
      case 'partial':
        return Clock;
      case 'error':
        return XCircle;
      default:
        return Activity;
    }
  }
</script>

<svelte:head>
  <title>Instant Legal Search Demo - Redis + Loki.js + Fuse.js</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center space-y-4">
    <div class="flex items-center justify-center gap-3">
      <Zap class="h-8 w-8 text-blue-600" />
      <h1 class="text-4xl font-bold">Instant Legal Search Demo</h1>
    </div>
    <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
      High-performance legal document search powered by Redis + Loki.js + Fuse.js integration.
      Experience sub-100ms search responses with smart legal pattern recognition.
    </p>
  </div>

  <!-- System Health Dashboard -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <Card.Title class="flex items-center gap-2">
          <Activity class="h-5 w-5" />
          System Health
        </Card.Title>
        <Button size="sm" onclick={checkSystemHealth} disabled={isTestRunning}>
          <RefreshCw class="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </Card.Header>
    <Card.Content>
      {#if systemHealth}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Redis Status -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <{getStatusIcon(systemHealth.components?.redis?.connected ? 'connected' : 'error')} class="h-4 w-4 {getStatusColor(systemHealth.components?.redis?.connected ? 'connected' : 'error')}" 
              />
              <span class="font-medium">Redis Cache</span>
            </div>
            <div class="text-sm text-muted-foreground">
              Status: {systemHealth.components?.redis?.connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <!-- Loki Status -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <{getStatusIcon(systemHealth.components?.loki?.initialized ? 'working' : 'error')} class="h-4 w-4 {getStatusColor(systemHealth.components?.loki?.initialized ? 'working' : 'error')}" 
              />
              <span class="font-medium">Loki.js Database</span>
            </div>
            <div class="text-sm text-muted-foreground">
              Documents: {systemHealth.components?.loki?.stats?.overall?.totalDocuments || 0}
            </div>
          </div>

          <!-- Search Engine Status -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <{getStatusIcon(systemHealth.components?.instantSearch?.available ? 'healthy' : 'error')} class="h-4 w-4 {getStatusColor(systemHealth.components?.instantSearch?.available ? 'healthy' : 'error')}" 
              />
              <span class="font-medium">Search Engine</span>
            </div>
            <div class="text-sm text-muted-foreground">
              Searches: {systemHealth.components?.instantSearch?.stats?.totalSearches || 0}
            </div>
          </div>
        </div>

        <!-- Integration Status -->
        <div class="mt-4 p-3 rounded-lg border">
          <div class="flex items-center gap-2 mb-2">
            <{getStatusIcon(systemHealth.status)} class="h-4 w-4 {getStatusColor(systemHealth.status)}" 
            />
            <span class="font-medium">Full Pipeline Integration</span>
            <Badge class="{systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
              {systemHealth.status}
            </Badge>
          </div>
          <div class="text-sm text-muted-foreground">
            Redis ↔ Loki: {systemHealth.integration?.redisLoki ? '✓' : '✗'} | 
            Loki ↔ Search: {systemHealth.integration?.lokiSearch ? '✓' : '✗'} | 
            Full Pipeline: {systemHealth.integration?.fullPipeline ? '✓' : '✗'}
          </div>
        </div>
      {:else}
        <div class="text-center py-4">
          <Activity class="h-8 w-8 mx-auto text-muted-foreground animate-pulse mb-2" />
          <p class="text-muted-foreground">Loading system health...</p>
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Main Content Tabs -->
  <Tabs.Root value="search" class="w-full">
    <Tabs.List class="grid w-full grid-cols-4">
      <Tabs.Trigger value="search">Live Search</Tabs.Trigger>
      <Tabs.Trigger value="testing">Integration Testing</Tabs.Trigger>
      <Tabs.Trigger value="benchmark">Performance</Tabs.Trigger>
      <Tabs.Trigger value="config">Configuration</Tabs.Trigger>
    </Tabs.List>

    <!-- Live Search Tab -->
    <Tabs.Content value="search" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Live Instant Search</Card.Title>
          <Card.Description>
            Test real-time search with legal pattern recognition and smart filtering.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <InstantLegalSearch
            placeholder="Search contracts, evidence, legal briefs, case law..."
            showFilters={true}
            showStats={true}
            showAdvanced={true}
            maxResults={20}
            onResultClick={handleResultClick}
            onResultAction={handleResultAction}
            class="w-full"
          />
        </CardContent>
      </Card>

      <!-- Performance Metrics -->
      {#if performanceMetrics.totalSearches > 0}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <BarChart3 class="h-5 w-5" />
              Live Performance Metrics
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{performanceMetrics.searchTime}ms</div>
                <div class="text-sm text-muted-foreground">Last Search Time</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{(performanceMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                <div class="text-sm text-muted-foreground">Cache Hit Rate</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{performanceMetrics.totalSearches}</div>
                <div class="text-sm text-muted-foreground">Total Searches</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{Math.round(performanceMetrics.averageResponseTime)}ms</div>
                <div class="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}
    </Tabs.Content>

    <!-- Integration Testing Tab -->
    <Tabs.Content value="testing" class="space-y-6">
      <!-- Test Controls -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Integration Testing</Card.Title>
          <Card.Description>
            Test individual components and full pipeline integration.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onclick={() => runIntegrationTest('redis')} disabled={isTestRunning}>
              <Database class="h-4 w-4 mr-2" />
              Test Redis
            </Button>
            <Button onclick={() => runIntegrationTest('loki')} disabled={isTestRunning}>
              <Activity class="h-4 w-4 mr-2" />
              Test Loki.js
            </Button>
            <Button onclick={() => runIntegrationTest('search')} disabled={isTestRunning}>
              <Zap class="h-4 w-4 mr-2" />
              Test Search
            </Button>
            <Button onclick={() => runIntegrationTest('all')} disabled={isTestRunning}>
              <Play class="h-4 w-4 mr-2" />
              Test All
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Test Results -->
      {#if testResults}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <{getStatusIcon(testResults.status)} class="h-5 w-5 {getStatusColor(testResults.status)}" />
              Test Results
              <Badge class="{testResults.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                {testResults.status}
              </Badge>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <!-- Summary -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="text-center">
                <div class="text-xl font-bold text-blue-600">{testResults.summary?.testsRun || 0}</div>
                <div class="text-sm text-muted-foreground">Tests Run</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-green-600">{testResults.summary?.testsSucceeded || 0}</div>
                <div class="text-sm text-muted-foreground">Tests Passed</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-red-600">{testResults.summary?.errorCount || 0}</div>
                <div class="text-sm text-muted-foreground">Errors</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-purple-600">{testResults.summary?.totalTime || 0}ms</div>
                <div class="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>

            <!-- Detailed Results -->
            {#if testResults.results}
              <div class="space-y-4">
                {#each Object.entries(testResults.results) as [component, result]}
                  <div class="border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <{getStatusIcon(result.status)} class="h-4 w-4 {getStatusColor(result.status)}" 
                      />
                      <span class="font-medium capitalize">{component}</span>
                      <Badge class="{result.status === 'working' || result.status === 'connected' || result.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        {result.status}
                      </Badge>
                    </div>
                    
                    {#if result.operations}
                      <div class="text-sm text-muted-foreground mb-2">
                        Operations: {result.operations.join(', ')}
                      </div>
                    {/if}
                    
                    {#if result.message}
                      <div class="text-sm text-red-600">
                        Error: {result.message}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Errors -->
            {#if testResults.errors && testResults.errors.length > 0}
              <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 class="font-medium text-red-800 mb-2">Errors</h4>
                <ul class="space-y-1">
                  {#each testResults.errors as error}
                    <li class="text-sm text-red-700">• {error}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </CardContent>
        </Card>
      {/if}
    </Tabs.Content>

    <!-- Performance Benchmark Tab -->
    <Tabs.Content value="benchmark" class="space-y-6">
      <!-- Benchmark Controls -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Performance Benchmarking</Card.Title>
          <Card.Description>
            Run performance tests to measure search speed and cache efficiency.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium">Test Iterations:</label>
              <Input 
                type="number" 
                bind:value={testCount} 
                min="10" 
                max="1000" 
                class="w-20"
                disabled={isTestRunning}
              />
            </div>
            <Button onclick={runBenchmark} disabled={isTestRunning}>
              {#if isTestRunning}
                <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
                Running...
              {:else}
                <BarChart3 class="h-4 w-4 mr-2" />
                Run Benchmark
              {/if}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Benchmark Results -->
      {#if benchmarkResults}
        <Card.Root>
          <Card.Header>
            <Card.Title>Benchmark Results</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{Math.round(benchmarkResults.statistics.avgSearchTime)}ms</div>
                <div class="text-sm text-muted-foreground">Average Search Time</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{benchmarkResults.statistics.minSearchTime}ms</div>
                <div class="text-sm text-muted-foreground">Fastest Search</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{benchmarkResults.statistics.maxSearchTime}ms</div>
                <div class="text-sm text-muted-foreground">Slowest Search</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{(benchmarkResults.statistics.cacheHitRate * 100).toFixed(1)}%</div>
                <div class="text-sm text-muted-foreground">Cache Hit Rate</div>
              </div>
            </div>
            
            <div class="mt-4 text-sm text-muted-foreground">
              Ran {benchmarkResults.iterations} searches across {benchmarkResults.queries} different queries
            </div>
          </CardContent>
        </Card>
      {/if}
    </Tabs.Content>

    <!-- Configuration Tab -->
    <Tabs.Content value="config" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>System Configuration</Card.Title>
          <Card.Description>
            Manage test data and system configuration.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onclick={populateTestData} disabled={isTestRunning}>
              <Database class="h-4 w-4 mr-2" />
              Populate Test Data
            </Button>
            <Button variant="outline" onclick={clearCache} disabled={isTestRunning}>
              <RefreshCw class="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
            <Button variant="outline" onclick={checkSystemHealth} disabled={isTestRunning}>
              <Activity class="h-4 w-4 mr-2" />
              Check System Health
            </Button>
          </div>
          
          <div class="mt-6 space-y-4">
            <h4 class="font-medium">System Features</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Redis caching and pub/sub</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Loki.js in-memory database</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Fuse.js fuzzy search</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Semantic search integration</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Legal pattern recognition</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm">Real-time result highlighting</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Tabs.Content>
  </Tabs.Root>
</div>