<!--
  Cases Management - SvelteKit 2 + Drizzle ORM + pgvector
  Real-time case management with vector search integration
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Modern UI Components
  import * as Card from '$lib/components/ui/card';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import * as Table from '$lib/components/ui/table';
  import * as Dialog from '$lib/components/ui/dialog';
  
  // Icons
  import { 
    Plus, Search, Filter, FileText, Calendar,
    Eye, Edit, Trash2, Users, Clock,
    AlertCircle, CheckCircle, XCircle,
    TrendingUp, MoreHorizontal
  } from 'lucide-svelte';
  
  // Types matching Drizzle schema
  interface Case {
    id: string;
    title: string;
    description: string | null;
    case_number: string;
    status: 'active' | 'closed' | 'pending' | 'archived';
    created_by: string;
    assigned_to: string | null;
    created_at: Date;
    updated_at: Date;
    closed_at: Date | null;
    metadata: Record<string, any> | null;
    evidence_count?: number;
    vector_queries?: number;
  }
  
  // State
  let cases = $state<Case[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');
  let selectedStatus = $state<string>('all');
  let showNewCaseDialog = $state(false);
  
  // New case form
  let newCase = $state({
    title: '',
    description: '',
    case_number: '',
    assigned_to: '',
    status: 'active' as const
  });
  
  // Filters
  const statusOptions = [
    { value: 'all', label: 'All Cases', count: 0 },
    { value: 'open', label: 'Open', count: 0 },
    { value: 'pending', label: 'Pending', count: 0 },
    { value: 'closed', label: 'Closed', count: 0 },
    { value: 'archived', label: 'Archived', count: 0 }
  ];
  
  // Filtered cases
  let filteredCases = $derived(() => {
    let filtered = cases;
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.case_number.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  });
  
  // Case statistics
  let caseStats = $derived(() => {
    const stats = {
      total: cases.length,
      active: 0,
      pending: 0,
      closed: 0,
      archived: 0,
      thisWeek: 0,
      avgProcessingTime: 0
    };
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    cases.forEach(c => {
      stats[c.status as keyof typeof stats]++;
      if (new Date(c.created_at) >= oneWeekAgo) {
        stats.thisWeek++;
      }
    });
    
    return stats;
  });
  
  // Load cases from API
  async function loadCases() {
    try {
      loading = true;
      error = null;
      
      const searchParams = new URLSearchParams();
      if (selectedStatus !== 'all') {
        searchParams.set('status', selectedStatus);
      }
      searchParams.set('page', '1');
      searchParams.set('limit', '50');
      
      const response = await fetch(`/api/v1/cases?${searchParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load cases: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load cases');
      }
      
      cases = result.data || [];
      
      // Update status counts
      statusOptions.forEach(option => {
        if (option.value === 'all') {
          option.count = cases.length;
        } else {
          option.count = cases.filter(c => c.status === option.value).length;
        }
      });
      
    } catch (err) {
      console.error('Failed to load cases:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }
  
  // Create new case
  async function createCase() {
    if (!newCase.title.trim()) return;
    
    try {
      const response = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCase.title.trim(),
          description: newCase.description?.trim() || '',
          status: 'open', // default to open status
          priority: 'medium', // default priority
          metadata: {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create case: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create case');
      }
      
      // Reset form and reload
      newCase = {
        title: '',
        description: '',
        case_number: '',
        assigned_to: '',
        status: 'active'
      };
      showNewCaseDialog = false;
      
      await loadCases();
      
    } catch (err) {
      console.error('Failed to create case:', err);
      error = err instanceof Error ? err.message : 'Failed to create case';
    }
  }
  
  function getStatusIcon(status: string) {
    switch (status) {
      case 'active': return CheckCircle;
      case 'pending': return Clock;
      case 'closed': return XCircle;
      case 'archived': return FileText;
      default: return AlertCircle;
    }
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      case 'archived': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  }
  
  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }
  
  // Initialize
  onMount(() => {
    loadCases();
  });
</script>

<svelte:head>
  <title>Cases Management - Legal AI Dashboard</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-nier-text-primary">Cases</h1>
      <p class="text-nier-text-muted mt-1">Manage legal cases and track progress</p>
    </div>
    <Button class="bits-btn bits-btn" onclick={() => showNewCaseDialog = true} class="gap-2">
      <Plus class="w-4 h-4" />
      New Case
    </Button>
  </div>
  
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-nier-text-muted">Total Cases</p>
            <p class="text-2xl font-bold text-nier-text-primary">{caseStats.total}</p>
          </div>
          <div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <FileText class="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">+{caseStats.thisWeek} this week</span>
        </div>
      </Card.Content>
    </Card.Root>
    
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-nier-text-muted">Active Cases</p>
            <p class="text-2xl font-bold text-nier-text-primary">{caseStats.active}</p>
          </div>
          <div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{((caseStats.active / caseStats.total) * 100).toFixed(1)}% of total</span>
        </div>
      </Card.Content>
    </Card.Root>
    
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-nier-text-muted">Pending Review</p>
            <p class="text-2xl font-bold text-nier-text-primary">{caseStats.pending}</p>
          </div>
          <div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
            <Clock class="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      </Card.Content>
    </Card.Root>
    
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-nier-text-muted">Closed Cases</p>
            <p class="text-2xl font-bold text-nier-text-primary">{caseStats.closed}</p>
          </div>
          <div class="w-12 h-12 bg-gray-500/10 rounded-lg flex items-center justify-center">
            <XCircle class="w-6 h-6 text-gray-500" />
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
  
  <!-- Filters and Search -->
  <Card.Root>
    <Card.Content class="p-6">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          <!-- Search -->
          <div class="relative min-w-0 flex-1 max-w-sm">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nier-text-muted" />
            <Input
              type="search"
              placeholder="Search cases..."
              bind:value={searchQuery}
              class="pl-10"
            />
          </div>
          
          <!-- Status Filter -->
          <select 
            bind:value={selectedStatus}
            class="px-3 py-2 border border-nier-border-muted rounded-md bg-nier-bg-primary text-nier-text-primary focus:ring-2 focus:ring-nier-accent-warm"
          >
            {#each statusOptions as option}
              <option value={option.value}>
                {option.label} ({option.count})
              </option>
            {/each}
          </select>
        </div>
        
        <div class="flex gap-2">
          <Button class="bits-btn bits-btn" variant="outline" size="sm">
            <Filter class="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
  
  <!-- Cases Table -->
  <Card.Root>
    <Card.Content class="p-0">
      {#if loading}
        <div class="p-6 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-nier-accent-warm border-t-transparent rounded-full mx-auto"></div>
          <p class="mt-2 text-nier-text-muted">Loading cases...</p>
        </div>
      {:else if error}
        <div class="p-6 text-center">
          <AlertCircle class="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p class="text-red-600">{error}</p>
          <Button onclick={loadCases} variant="outline" size="sm" class="mt-2 bits-btn bits-btn">
            Retry
          </Button>
        </div>
      {:else if filteredCases.length === 0}
        <div class="p-6 text-center">
          <FileText class="w-8 h-8 text-nier-text-muted mx-auto mb-2" />
          <p class="text-nier-text-muted">No cases found</p>
          {#if searchQuery || selectedStatus !== 'all'}
            <Button class="bits-btn bits-btn" onclick={() => { searchQuery = ''; selectedStatus = 'all'; }} variant="outline" size="sm" class="mt-2">
              Clear Filters
            </Button>
          {/if}
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="w-[300px]">Case</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Assigned To</Table.Head>
              <Table.Head>Created</Table.Head>
              <Table.Head>Updated</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredCases as caseItem}
              <Table.Row class="hover:bg-nier-bg-tertiary">
                <Table.Cell class="py-4">
                  <div class="space-y-1">
                    <div class="font-medium text-nier-text-primary">{caseItem.title}</div>
                    <div class="text-sm text-nier-text-muted">{caseItem.case_number}</div>
                    {#if caseItem.description}
                      <div class="text-xs text-nier-text-muted truncate max-w-xs">
                        {caseItem.description}
                      </div>
                    {/if}
                  </div>
                </Table.Cell>
                
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full {getStatusColor(caseItem.status)}"></div>
                    <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{caseItem.status}</span>
                  </div>
                </Table.Cell>
                
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <Users class="w-4 h-4 text-nier-text-muted" />
                    <span class="text-sm">{caseItem.assigned_to || 'Unassigned'}</span>
                  </div>
                </Table.Cell>
                
                <Table.Cell>
                  <div class="text-sm">
                    <div>{formatDate(caseItem.created_at)}</div>
                    <div class="text-xs text-nier-text-muted">{formatRelativeTime(caseItem.created_at)}</div>
                  </div>
                </Table.Cell>
                
                <Table.Cell>
                  <div class="text-sm">
                    <div>{formatDate(caseItem.updated_at)}</div>
                    <div class="text-xs text-nier-text-muted">{formatRelativeTime(caseItem.updated_at)}</div>
                  </div>
                </Table.Cell>
                
                <Table.Cell class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button class="bits-btn bits-btn"
                      variant="ghost"
                      size="sm"
                      onclick={() => goto(`/dashboard/cases/${caseItem.id}`)}
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button class="bits-btn bits-btn"
                      variant="ghost"
                      size="sm"
                      onclick={() => goto(`/dashboard/cases/${caseItem.id}/edit`)}
                    >
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button class="bits-btn bits-btn" variant="ghost" size="sm">
                      <MoreHorizontal class="w-4 h-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<!-- New Case Dialog -->
<Dialog.Root bind:open={showNewCaseDialog}>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>Create New Case</Dialog.Title>
      <Dialog.Description>
        Add a new legal case to the system
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="space-y-4 py-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="title" class="text-sm font-medium">Case Title *</label>
          <Input
            id="title"
            bind:value={newCase.title}
            placeholder="Enter case title"
          />
        </div>
        
        <div class="space-y-2">
          <label for="case_number" class="text-sm font-medium">Case Number</label>
          <Input
            id="case_number"
            bind:value={newCase.case_number}
            placeholder="Auto-generated if empty"
          />
        </div>
      </div>
      
      <div class="space-y-2">
        <label for="description" class="text-sm font-medium">Description</label>
        <textarea
          id="description"
          bind:value={newCase.description}
          rows="3"
          class="w-full px-3 py-2 border border-nier-border-muted rounded-md focus:ring-2 focus:ring-nier-accent-warm"
          placeholder="Case description and details"
        ></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="assigned_to" class="text-sm font-medium">Assigned To</label>
          <Input
            id="assigned_to"
            bind:value={newCase.assigned_to}
            placeholder="Attorney or team member"
          />
        </div>
        
        <div class="space-y-2">
          <label for="status" class="text-sm font-medium">Initial Status</label>
          <select
            id="status"
            bind:value={newCase.status}
            class="w-full px-3 py-2 border border-nier-border-muted rounded-md bg-nier-bg-primary text-nier-text-primary focus:ring-2 focus:ring-nier-accent-warm"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
    </div>
    
    <Dialog.Footer>
      <Button class="bits-btn bits-btn" variant="outline" onclick={() => showNewCaseDialog = false}>
        Cancel
      </Button>
      <Button class="bits-btn bits-btn" onclick={createCase} disabled={!newCase.title.trim()}>
        Create Case
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>