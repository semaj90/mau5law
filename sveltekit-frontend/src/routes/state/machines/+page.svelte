<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  // XState Machine Registry & Management
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  
  let mounted = $state(false);
  let machines = $state([]);
  let selectedMachine = $state(null);
  let loading = $state(true);
  
  // Mock machine registry data - replace with actual XState registry
  let mockMachines = [
    {
      id: 'auth-machine',
      name: 'Authentication State Machine',
      status: 'running',
      currentState: 'authenticated',
      transitions: ['logout', 'refresh', 'profile'],
      lastUpdated: new Date().toISOString(),
      instances: 3
    },
    {
      id: 'case-management-machine',
      name: 'Case Management Workflow',
      status: 'running',
      currentState: 'reviewing',
      transitions: ['submit', 'save-draft', 'archive'],
      lastUpdated: new Date().toISOString(),
      instances: 1
    },
    {
      id: 'rag-pipeline-machine',
      name: 'RAG Processing Pipeline',
      status: 'idle',
      currentState: 'waiting',
      transitions: ['process', 'reset', 'configure'],
      lastUpdated: new Date().toISOString(),
      instances: 0
    },
    {
      id: 'gpu-allocation-machine',
      name: 'GPU Resource Allocation',
      status: 'running',
      currentState: 'allocated',
      transitions: ['release', 'extend', 'optimize'],
      lastUpdated: new Date().toISOString(),
      instances: 2
    }
  ];
  
  $effect(() => {
    mounted = true;
    loadMachines();
  });
  
  async function loadMachines() {
    loading = true;
    try {
      // In production: const response = await fetch('/api/state/machines');
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 1000);
      machines = mockMachines;
    } catch (error) {
      console.error('Failed to load state machines:', error);
    } finally {
      loading = false;
    }
  }
  
  async function restartMachine(machineId: string) {
    try {
      // await fetch(`/api/state/machines/${machineId}/restart`, { method: 'POST' });
      console.log('Restarting machine:', machineId);
      await loadMachines();
    } catch (error) {
      console.error('Failed to restart machine:', error);
    }
  }
  
  async function stopMachine(machineId: string) {
    try {
      // await fetch(`/api/state/machines/${machineId}/stop`, { method: 'POST' });
      console.log('Stopping machine:', machineId);
      await loadMachines();
    } catch (error) {
      console.error('Failed to stop machine:', error);
    }
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'idle': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<svelte:head>
  <title>XState Machine Registry - Legal AI Platform</title>
  <meta name="description" content="Manage and monitor XState machines across the legal AI platform" />
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <h1>🔄 State Machine Registry</h1>
    <p>Monitor and manage XState machines across the legal AI platform</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-number">{machines.length}</span>
        <span class="stat-label">Total Machines</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{machines.filter(m => m.status === 'running').length}</span>
        <span class="stat-label">Running</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{machines.reduce((sum, m) => sum + m.instances, 0)}</span>
        <span class="stat-label">Active Instances</span>
      </div>
    </div>
  </header>

  <main class="page-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading state machines...</p>
      </div>
    {:else}
      <div class="machines-grid">
        {#each machines as machine}
          <Card class="machine-card">
            <CardHeader>
              <div class="machine-header">
                <CardTitle>{machine.name}</CardTitle>
                <span class="status-badge {getStatusColor(machine.status)}">
                  {machine.status}
                </span>
              </div>
              <p class="machine-id">ID: {machine.id}</p>
            </CardHeader>
            
            <CardContent>
              <div class="machine-details">
                <div class="detail-row">
                  <span class="label">Current State:</span>
                  <span class="value state-indicator">{machine.currentState}</span>
                </div>
                
                <div class="detail-row">
                  <span class="label">Instances:</span>
                  <span class="value">{machine.instances}</span>
                </div>
                
                <div class="detail-row">
                  <span class="label">Last Updated:</span>
                  <span class="value">{new Date(machine.lastUpdated).toLocaleTimeString()}</span>
                </div>
                
                <div class="transitions">
                  <span class="label">Available Transitions:</span>
                  <div class="transition-tags">
                    {#each machine.transitions as transition}
                      <span class="transition-tag">{transition}</span>
                    {/each}
                  </div>
                </div>
                
                <div class="machine-actions">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onclick={() => (window.location.href = `/state/transitions?machine=${machine.id}`)}
                  >
                    View Transitions
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onclick={() => restartMachine(machine.id)}
                  >
                    Restart
                  </Button>
                  
                  {#if machine.status === 'running'}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onclick={() => stopMachine(machine.id)}
                    >
                      Stop
                    </Button>
                  {/if}
                </div>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .loading-state {
    text-align: center;
    padding: 4rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .machines-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr);
    gap: 1.5rem;
  }

  .machine-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    transition: box-shadow 0.2s;
  }

  .machine-card:hover {
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .machine-header {
    display: flex;
    justify-content: between;
    align-items: center;
    gap: 1rem;
  }

  .machine-id {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .machine-details {
    space-y: 1rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .label {
    font-weight: 500;
    color: #374151;
  }

  .value {
    color: #6b7280;
  }

  .state-indicator {
    background: #dbeafe;
    color: #1d4ed8;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .transitions {
    margin-top: 1rem;
  }

  .transition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .transition-tag {
    background: #f3e8ff;
    color: #7c3aed;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid #e9d5ff;
  }

  .machine-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .machines-grid {
      grid-template-columns: 1fr;
    }

    .machine-actions {
      justify-content: center;
    }
  }
</style>