<script lang="ts">
  import Button from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card';
  import Input from '$lib/components/ui/input';
  import type { appActions, appStore  } from '$lib/stores/app-store';
  import Cpu from 'lucide-svelte/icons/cpu';
import Database from 'lucide-svelte/icons/database';
import RefreshCw from 'lucide-svelte/icons/refresh-cw';
import Save from 'lucide-svelte/icons/save';
import Server from 'lucide-svelte/icons/server';
import Zap from 'lucide-svelte/icons/zap';;
  import { onMount } from 'svelte';;

  // Reactive state from app store
  let systemMetrics = $state <any>(null);
  let isLoading = $state(false);
  let error = $state <string | null>(null);

  // Configuration state
  let config = $state({
    databaseUrl: '',
    redisUrl: '',
    ollamaUrl: '',
    gpuLayers: 25,
    maxBatchSize: 100,
    enableRag: true,
    enableGpu: true,
  });

  let isSaving = $state(false);

  // Subscribe to app store
  $effect(() => {() => {
    const unsubscribe = appStore.subscribe((state) => {
      systemMetrics = state.systemMetrics;
      isLoading = state.isLoading;
      error = state.error;
    });
    return unsubscribe;
  });

  function getHealthColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'bg-green-500 text-white';
      case 'degraded':
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'unhealthy':
      case 'error':
      case 'stopped':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  async function loadConfig() {
    try {
      // Load from environment or API
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        config = { ...config, ...data };
      }
    } catch (err) {
      console.warn('Failed to load config:', err);
    }
  }

  async function saveConfig() {
    isSaving = true;
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        // Success - could show a toast here
        console.log('Configuration saved successfully');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      error = 'Failed to save configuration';
      console.error('Save config failed:', err);
    } finally {
      isSaving = false;
    }
  }

  async function restartService(service: string) {
    try {
      const response = await fetch(`/api/services/${service}/restart`, {
        method: 'POST',
      });
      if (response.ok) {
        await appActions.loadSystemMetrics(); // Refresh metrics
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      error = `Failed to restart ${service}`;
      console.error(`Restart ${service} failed:`, err);
    }
  }

  onMount(() => {
    loadConfig();
    appActions.loadSystemMetrics();

    // Refresh system metrics periodically
    const interval = setInterval(() => {
      appActions.loadSystemMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>SYSTEM CONFIGURATION - YoRHa Detective Interface</title>
</svelte:head>

<!-- YoRHa Interface -->
<div class="yorha-interface">
  <!-- Left Sidebar -->
  <aside class="yorha-sidebar">
    <div class="yorha-logo">
      <div class="yorha-title">YORHA</div>
      <div class="yorha-subtitle">DETECTIVE</div>
      <div class="yorha-subtext">Investigation Interface</div>
    </div>
    <nav class="yorha-nav">
      <div class="nav-section">
        <a href="/yorha-command-center" class="nav-item">
          <span class="nav-icon">⌘</span> COMMAND CENTER
        </a>
        <a href="/yorha/detective" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span>
          <span class="nav-count">3</span>
        </a>
        <a href="/yorha/evidence" class="nav-item">
          <span class="nav-icon">📋</span> EVIDENCE LIBRARY
        </a>
        <a href="/yorha/persons" class="nav-item">
          <span class="nav-icon">👤</span> PERSONS OF INTEREST
        </a>
        <a href="/yorha/analysis" class="nav-item">
          <span class="nav-icon">📊</span> ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item">
          <span class="nav-icon">🔍</span> GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item">
          <span class="nav-icon">></span> TERMINAL
        </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item config-active">
          <span class="nav-icon">⚙️</span> SYSTEM CONFIG
        </a>
      </div>
    </nav>
    <div class="yorha-status">
      <div class="status-item">Online</div>
      <div class="status-time">{new Date().toLocaleTimeString()}</div>
      <div class="status-text">System: Operational</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="yorha-main">
    <!-- Header -->
    <header class="config-header">
      <div class="header-left">
        <button class="header-icon">⚙️</button>
        <h1 class="config-title">SYSTEM CONFIGURATION</h1>
        <div class="config-subtitle">System Settings and Service Management</div>
      </div>
      <div class="header-right">
        <Button onclick={saveConfig} disabled={isSaving} class="header-btn bits-btn" type="button">
          <Save class="w-4" /> {isSaving ? 'SAVING...' : 'SAVE CONFIG'}
        </Button>
        <Button onclick={() => appActions.loadSystemMetrics()} class="header-btn bits-btn" variant="ghost" type="button">
          <RefreshCw class="w-4" /> REFRESH
        </Button>
      </div>
    </header>

    <!-- Error State -->
    {#if error}
      <div class="error-banner">
        {error}
      </div>
    {/if}

    <!-- Configuration Grid -->
    <div class="config-grid">
      <!-- System Status -->
      <Card class="config-card">
        <div class="card-header">
          <Server class="card-icon" />
          <div>
            <h3 class="card-title">System Status</h3>
            <p class="card-description">Service Health Overview</p>
          </div>
        </div>
        <div class="card-content">
          {#if systemMetrics}
            <div class="status-grid">
              {#each Object.entries(systemMetrics.services || {}) as [service, status] (service)}
                <div class="status-item">
                  <div class="status-name">{service}</div>
                  <span class="status-badge {getHealthColor((status as any)?.status || 'unknown')}">
                    {(status as any)?.status || 'UNKNOWN'}
                  </span>
                  {#if (status as any)?.status === 'running' || (status as any)?.status === 'healthy'}
                    <Button
                      onclick={() => restartService(service)}
                      class="restart-btn bits-btn"
                      size="sm"
                      variant="ghost"
                      type="button"
                    >
                      RESTART
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          {:else if isLoading}
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <div class="loading-text">Loading system status...</div>
            </div>
          {:else}
            <div class="no-data">No system metrics available</div>
          {/if}
        </div>
      </Card>

      <!-- Database Configuration -->
      <Card class="config-card">
        <div class="card-header">
          <Database class="card-icon" />
          <div>
            <h3 class="card-title">Database Settings</h3>
            <p class="card-description">PostgreSQL & Redis Configuration</p>
          </div>
        </div>
        <div class="card-content">
          <div class="config-fields">
            <div class="field-group">
              <label for="databaseUrl" class="field-label">Database URL</label>
              <Input
                id="databaseUrl"
                type="text"
                value={config.databaseUrl}
                on:input={(e) => config.databaseUrl = e.target.value}
                placeholder="postgresql://user:pass@localhost:5432/db"
                class="config-input"
              />
            </div>
            <div class="field-group">
              <label for="redisUrl" class="field-label">Redis URL</label>
              <Input
                id="redisUrl"
                type="text"
                value={config.redisUrl}
                on:input={(e) => config.redisUrl = e.target.value}
                placeholder="redis://localhost:6379"
                class="config-input"
              />
            </div>
          </div>
        </div>
      </Card>

      <!-- AI/ML Configuration -->
      <Card class="config-card">
        <div class="card-header">
          <Cpu class="card-icon" />
          <div>
            <h3 class="card-title">AI/ML Settings</h3>
            <p class="card-description">Ollama & GPU Configuration</p>
          </div>
        </div>
        <div class="card-content">
          <div class="config-fields">
            <div class="field-group">
              <label for="ollamaUrl" class="field-label">Ollama URL</label>
              <Input
                id="ollamaUrl"
                type="text"
                value={config.ollamaUrl}
                on:input={(e) => config.ollamaUrl = e.target.value}
                placeholder="http://localhost:11434"
                class="config-input"
              />
            </div>
            <div class="field-group">
              <label for="gpuLayers" class="field-label">GPU Layers</label>
              <Input
                id="gpuLayers"
                type="number"
                value={config.gpuLayers.toString()}
                on:input={(e) => config.gpuLayers = parseInt(e.target.value) || config.gpuLayers}
                min="1"
                max="50"
                class="config-input"
              />
            </div>
            <div class="field-group">
              <label for="maxBatchSize" class="field-label">Max Batch Size</label>
              <Input
                id="maxBatchSize"
                type="number"
                value={config.maxBatchSize.toString()}
                on:input={(e) => config.maxBatchSize = parseInt(e.target.value) || config.maxBatchSize}
                min="1"
                max="1000"
                class="config-input"
              />
            </div>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={config.enableRag} />
                Enable RAG Processing
              </label>
            </div>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={config.enableGpu} />
                Enable GPU Acceleration
              </label>
            </div>
          </div>
        </div>
      </Card>

      <!-- Performance Metrics -->
      <Card class="config-card">
        <div class="card-header">
          <Zap class="card-icon" />
          <div>
            <h3 class="card-title">Performance Metrics</h3>
            <p class="card-description">System Resource Usage</p>
          </div>
        </div>
        <div class="card-content">
          {#if systemMetrics}
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-label">CPU Usage</div>
                <div class="metric-value">{systemMetrics.cpuUsage || 'N/A'}%</div>
                <div class="metric-bar">
                  <div class="metric-fill" style="width: {systemMetrics.cpuUsage || 0}%"></div>
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value">{systemMetrics.memoryUsage || 'N/A'}%</div>
                <div class="metric-bar">
                  <div class="metric-fill" style="width: {systemMetrics.memoryUsage || 0}%"></div>
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Disk Usage</div>
                <div class="metric-value">{systemMetrics.diskUsage || 'N/A'}%</div>
                <div class="metric-bar">
                  <div class="metric-fill" style="width: {systemMetrics.diskUsage || 0}%"></div>
                </div>
              </div>
              {#if systemMetrics.gpu}
                <div class="metric-item">
                  <div class="metric-label">GPU Memory</div>
                  <div class="metric-value">{systemMetrics.gpu.memoryUsage || 'N/A'}%</div>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width: {systemMetrics.gpu.memoryUsage || 0}%"></div>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="no-data">Performance metrics unavailable</div>
          {/if}
        </div>
      </Card>
    </div>
  </main>
</div>

<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2a2a2a;
    color: #d4af37;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  .yorha-sidebar {
    width: 200px;
    background: #1a1a1a;
    border-right: 1px solid #3a3a3a;
    display: flex;
    flex-direction: column;
  }

  .yorha-logo {
    padding: 20px 15px;
  }

  .yorha-title,
  .yorha-subtitle {
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    line-height: 1;
  }

  .yorha-subtext {
    font-size: 10px;
    color: #888;
    padding-top: 8px;
    border-bottom: 1px solid #3a3a3a;
  }

  .yorha-nav {
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-left: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    color: #888;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    justify-content: space-between;
    font-size: 11px;
  }

  .nav-item:hover {
    background: #2a2a2a;
    color: #d4af37;
  }

  .nav-item.config-active {
    background: #162016;
    color: #d4af37;
    border-left: 3px solid #d4af37;
    padding-left: 9px;
  }

  .nav-count {
    font-size: 10px;
    background: #d4af37;
    color: #000;
    padding: 1px 6px;
    border-radius: 2px;
  }

  .yorha-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2a2a2a;
    overflow: hidden;
  }

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #3a3a3a;
    background: #2a2a2a;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon {
    background: none;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
  }

  .config-title {
    font-size: 24px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }

  .config-subtitle {
    font-size: 12px;
    color: #888;
  }

  .header-right {
    display: flex;
    gap: 10px;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .config-card {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    padding: 20px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .card-icon {
    color: #d4af37;
    width: 24px;
    height: 24px;
  }

  .card-title {
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }

  .card-description {
    font-size: 12px;
    color: #888;
    margin: 4px 0 0 0;
  }

  .card-content {
    color: #d4af37;
  }

  .status-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .status-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #2a2a2a;
    border-radius: 4px;
  }

  .status-name {
    font-weight: bold;
    text-transform: capitalize;
  }

  .restart-btn {
    font-size: 10px;
    padding: 4px 8px;
  }

  .config-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 11px;
    color: #d4af37;
    font-weight: bold;
    text-transform: uppercase;
  }

  .config-input {
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    padding: 8px 12px;
  }

  .checkbox-group {
    margin-top: 8px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d4af37;
    cursor: pointer;
  }

  .checkbox-label input {
    margin: 0;
  }

  .metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metric-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-label {
    font-size: 11px;
    color: #888;
  }

  .metric-value {
    font-size: 16px;
    font-weight: bold;
    color: #d4af37;
  }

  .metric-bar {
    width: 100%;
    height: 8px;
    background: #3a3a3a;
    border-radius: 4px;
    overflow: hidden;
  }

  .metric-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4af37, #f4c430);
    transition: width 0.3s ease;
  }

  .no-data {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #4a1a1a;
    border: 1px solid #ef4444;
    color: #fca5a5;
    font-size: 12px;
    margin: 15px 20px;
    border-radius: 4px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #888;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #3a3a3a;
    border-top: 2px solid #d4af37;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>