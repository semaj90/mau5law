<!--
  EvidenceSidebar Component
  Comprehensive sidebar for managing evidence, cases, and user-specific content
  Features: Lucia auth integration, persisted stores, TypeScript, Drizzle ORM
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported

  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    user as currentUser,
    isAuthenticated
  } from '$lib/stores/sessionStore.svelte.js';
  import { cn } from '$lib/utils';
  import {
    FileText, Folder, Clock, User, Settings, Search,
    Plus, Filter, SortAsc, ChevronDown, ChevronRight,
    Eye, Edit3, Trash2, Archive, Star, AlertCircle,
    Calendar, Tag, Paperclip, MessageSquare, Brain
  } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';

  // Props
  interface Props {
    collapsed?: boolean;
    className?: string;
  }

  let {
    collapsed = $bindable(false),
    className = ''
  }: Props = $props();

  // Component state using Svelte 5 runes
  let searchQuery = $state('');
  let selectedCategory = $state<'all' | 'cases' | 'evidence' | 'reports' | 'citations'>('all');
  let sortBy = $state<'date' | 'name' | 'priority' | 'status'>('date');
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let expandedFolders = $state<Set<string>>(new Set(['recent', 'cases']));
  let selectedItems = $state<Set<string>>(new Set());
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // User-specific data
  let userCases = $state<Array<CaseItem>>([]);
  let userEvidence = $state<Array<EvidenceItem>>([]);
  let userReports = $state<Array<ReportItem>>([]);
  let userCitations = $state<Array<CitationItem>>([]);
  let recentActivity = $state<Array<ActivityItem>>([]);

  // TypeScript interfaces matching Drizzle schema
  interface CaseItem {
    id: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'closed' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'criminal' | 'civil' | 'corporate' | 'investigation';
    createdAt: Date;
    updatedAt: Date;
    evidenceCount: number;
    assignedTo?: string;
    tags: string[];
  }

  interface EvidenceItem {
    id: string;
    caseId: string;
    title: string;
    type: 'document' | 'photo' | 'video' | 'audio' | 'physical' | 'digital';
    description?: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
    chainOfCustody: boolean;
    analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    aiAnalysis?: any;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
  }

  interface ReportItem {
    id: string;
    title: string;
    type: 'analysis' | 'summary' | 'forensic' | 'timeline' | 'correlation';
    caseId?: string;
    content: string;
    status: 'draft' | 'review' | 'approved' | 'published';
    generatedBy: 'user' | 'ai' | 'system';
    createdAt: Date;
    updatedAt: Date;
  }

  interface CitationItem {
    id: string;
    title: string;
    type: 'case_law' | 'statute' | 'regulation' | 'precedent';
    jurisdiction: string;
    citation: string;
    relevance: number;
    summary?: string;
    caseId?: string;
    createdAt: Date;
  }

  interface ActivityItem {
    id: string;
    type: 'case_created' | 'evidence_added' | 'report_generated' | 'analysis_completed';
    title: string;
    description: string;
    entityId: string;
    entityType: 'case' | 'evidence' | 'report' | 'citation';
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
  }

  // Derived values
  let user = $derived(currentUser);
  let authenticated = $derived(isAuthenticated);
  let role = $derived(currentUser?.role);

  // Filtered and sorted items
  let filteredItems = $derived(() => {
    let items: Array<any> = [];

    switch (selectedCategory) {
      case 'cases':
        items = userCases;
        break;
      case 'evidence':
        items = userEvidence;
        break;
      case 'reports':
        items = userReports;
        break;
      case 'citations':
        items = userCitations;
        break;
      default:
        items = [
          ...userCases.map(item => ({ ...item, _type: 'case' })),
          ...userEvidence.map(item => ({ ...item, _type: 'evidence' })),
          ...userReports.map(item => ({ ...item, _type: 'report' })),
          ...userCitations.map(item => ({ ...item, _type: 'citation' }))
        ];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.updatedAt || a.createdAt).getTime() -
                      new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'status':
          comparison = a.status?.localeCompare(b.status) || 0;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return items;
  });

  // Utility functions
  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function truncateText(text: string, maxLength: number = 50): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  function getItemIcon(type: string) {
    const icons = {
      case: Folder,
      evidence: FileText,
      report: MessageSquare,
      citation: Archive,
      document: FileText,
      photo: Eye,
      video: Eye,
      audio: Eye,
      physical: Paperclip,
      digital: FileText
    };
    return icons[type as keyof typeof icons] || FileText;
  }

  function getStatusColor(status: string): string {
    const colors = {
      open: 'text-green-600',
      in_progress: 'text-blue-600',
      closed: 'text-gray-600',
      archived: 'text-gray-400',
      pending: 'text-yellow-600',
      completed: 'text-green-600',
      failed: 'text-red-600',
      draft: 'text-gray-500',
      review: 'text-yellow-600',
      approved: 'text-green-600',
      published: 'text-blue-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-500';
  }

  function getPriorityColor(priority: string): string {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  }

  // Event handlers
  function toggleFolder(folderId: string) {
    if (expandedFolders.has(folderId)) {
      expandedFolders.delete(folderId);
    } else {
      expandedFolders.add(folderId);
    }
    expandedFolders = new Set(expandedFolders);
  }

  function selectItem(itemId: string) {
    if (selectedItems.has(itemId)) {
      selectedItems.delete(itemId);
    } else {
      selectedItems.add(itemId);
    }
    selectedItems = new Set(selectedItems);
  }

  async function loadUserData() {
    if (!authenticated || !user) return;

    isLoading = true;
    error = null;

    try {
      // Load user-specific data from API
      const [casesRes, evidenceRes, reportsRes, citationsRes, activityRes] = await Promise.all([
        fetch(`/api/v1/cases/user/${user.id}`),
        fetch(`/api/v1/evidence/user/${user.id}`),
        fetch(`/api/v1/reports/user/${user.id}`),
        fetch(`/api/v1/citations/user/${user.id}`),
        fetch(`/api/v1/activity/user/${user.id}?limit=10`)
      ]);

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        userCases = casesData.data || [];
      }

      if (evidenceRes.ok) {
        const evidenceData = await evidenceRes.json();
        userEvidence = evidenceData.data || [];
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        userReports = reportsData.data || [];
      }

      if (citationsRes.ok) {
        const citationsData = await citationsRes.json();
        userCitations = citationsData.data || [];
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        recentActivity = activityData.data || [];
      }

    } catch (err) {
      console.error('Failed to load user data:', err);
      error = 'Failed to load data. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  function navigateToItem(item: any) {
    const routes = {
      case: `/cases/${item.id}`,
      evidence: `/evidence/${item.id}`,
      report: `/reports/${item.id}`,
      citation: `/citations/${item.id}`
    };

    const route = routes[item._type as keyof typeof routes];
    if (route) {
      goto(route);
    }
  }

  function createNewItem(type: string) {
    const routes = {
      case: '/cases/new',
      evidence: '/evidence/new',
      report: '/reports/new',
      citation: '/citations/new'
    };

    const route = routes[type as keyof typeof routes];
    if (route) {
      goto(route);
    }
  }

  // Lifecycle
  $effect(() => {
    if (authenticated && user) {
      loadUserData();
    }
  });

  // Auto-refresh data every 30 seconds
  $effect(() => {
    if (!authenticated) return;

    const interval = setInterval(() => {
      loadUserData();
    }, 30000);

    return () => clearInterval(interval);
  });
</script>

<div class={cn(
  "evidence-sidebar flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-200",
  collapsed ? "w-16" : "w-80",
  className
)}>
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    {#if !collapsed}
      <div class="flex items-center gap-2">
        <Folder class="w-5 h-5 text-blue-600" />
        <h2 class="font-semibold text-gray-900">Evidence Hub</h2>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onclick={() => collapsed = true}
        class="p-1"
      >
        <ChevronRight class="w-4 h-4" />
      </Button>
    {:else}
      <Button
        variant="ghost"
        size="sm"
        onclick={() => collapsed = false}
        class="p-1 mx-auto"
      >
        <ChevronDown class="w-4 h-4" />
      </Button>
    {/if}
  </div>

  {#if !collapsed}
    <!-- User Info -->
    {#if authenticated && user}
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User class="w-4 h-4 text-blue-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {user.name || user.email}
            </p>
            <p class="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Search and Filters -->
    <div class="p-4 space-y-3 border-b border-gray-200">
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search files..."
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Category Filter -->
      <select
        bind:value={selectedCategory}
        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Items</option>
        <option value="cases">Cases</option>
        <option value="evidence">Evidence</option>
        <option value="reports">Reports</option>
        <option value="citations">Citations</option>
      </select>

      <!-- Sort Options -->
      <div class="flex gap-2">
        <select
          bind:value={sortBy}
          class="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="priority">Priority</option>
          <option value="status">Status</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          class="px-2"
        >
          <SortAsc class="w-3 h-3" class:rotate-180={sortOrder === 'desc'} />
        </Button>
      </div>

      <!-- Quick Actions -->
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => createNewItem('case')}
          title="New Case"
          class="flex-1 text-xs"
        >
          <Plus class="w-3 h-3 mr-1" />
          Case
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => createNewItem('evidence')}
          title="New Evidence"
          class="flex-1 text-xs"
        >
          <Plus class="w-3 h-3 mr-1" />
          Evidence
        </Button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
      {#if isLoading}
        <div class="p-4 text-center">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p class="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      {:else if error}
        <div class="p-4 text-center">
          <AlertCircle class="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p class="text-sm text-red-600">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onclick={loadUserData}
            class="mt-2 text-xs"
          >
            Retry
          </Button>
        </div>
      {:else}
        <!-- Recent Activity -->
        {#if recentActivity.length > 0}
          <div class="p-4">
            <button
              onclick={() => toggleFolder('recent')}
              class="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {#if expandedFolders.has('recent')}
                <ChevronDown class="w-4 h-4" />
              {:else}
                <ChevronRight class="w-4 h-4" />
              {/if}
              <Clock class="w-4 h-4" />
              Recent Activity
            </button>

            {#if expandedFolders.has('recent')}
              <div class="mt-2 space-y-1">
                {#each recentActivity.slice(0, 5) as activity (activity.id)}
                  <div class="flex items-start gap-2 p-2 text-xs rounded hover:bg-gray-50">
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                      <p class="text-gray-900 font-medium truncate">{activity.title}</p>
                      <p class="text-gray-500 truncate">{activity.description}</p>
                      <p class="text-gray-400 mt-0.5">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Items List -->
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-700">
              {selectedCategory === 'all' ? 'All Items' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              ({filteredItems.length})
            </h3>
          </div>

          <div class="space-y-1">
            {#each filteredItems as item (item.id)}
              {@const Icon = getItemIcon(item._type || item.type)}
              <button
                onclick={() => navigateToItem(item)}
                class={cn(
                  "w-full flex items-start gap-3 p-2 text-left rounded-md hover:bg-gray-50 transition-colors",
                  selectedItems.has(item.id) && "bg-blue-50 border border-blue-200"
                )}
              >
                <Icon class="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {truncateText(item.title, 25)}
                    </p>
                    {#if item.priority}
                      <span class={cn("text-xs", getPriorityColor(item.priority))}>
                        {item.priority}
                      </span>
                    {/if}
                  </div>

                  {#if item.description}
                    <p class="text-xs text-gray-500 truncate mt-0.5">
                      {truncateText(item.description, 40)}
                    </p>
                  {/if}

                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-400">
                      {formatTimestamp(item.updatedAt || item.createdAt)}
                    </span>
                    {#if item.status}
                      <span class={cn("text-xs capitalize", getStatusColor(item.status))}>
                        {item.status.replace('_', ' ')}
                      </span>
                    {/if}
                  </div>

                  {#if item.tags && item.tags.length > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each item.tags.slice(0, 2) as tag}
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {tag}
                        </span>
                      {/each}
                      {#if item.tags.length > 2}
                        <span class="text-xs text-gray-400">+{item.tags.length - 2}</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </button>
            {/each}

            {#if filteredItems.length === 0}
              <div class="text-center py-8">
                <FileText class="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p class="text-sm text-gray-500">No items found</p>
                {#if searchQuery}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => searchQuery = ''}
                    class="mt-2 text-xs"
                  >
                    Clear search
                  </Button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer Actions -->
    <div class="p-4 border-t border-gray-200 space-y-2">
      <Button
        variant="outline"
        size="sm"
        onclick={() => goto('/ai-assistant')}
        class="w-full justify-start text-xs"
      >
        <Brain class="w-4 h-4 mr-2" />
        AI Assistant
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onclick={() => goto('/settings')}
        class="w-full justify-start text-xs"
      >
        <Settings class="w-4 h-4 mr-2" />
        Settings
      </Button>
    </div>
  {/if}
</div>

<style>
  .evidence-sidebar {
    --sidebar-width: 320px;
    --sidebar-collapsed-width: 64px;
  }

  .evidence-sidebar .rotate-180 {
    transform: rotate(180deg);
  }

  /* Custom scrollbar */
  .evidence-sidebar ::-webkit-scrollbar {
    width: 6px;
  }

  .evidence-sidebar ::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  .evidence-sidebar ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .evidence-sidebar ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>