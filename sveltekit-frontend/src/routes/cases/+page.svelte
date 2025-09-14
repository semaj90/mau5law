<!-- @migration-task Error while migrating Svelte code: Cannot read properties of undefined (reading 'end') -->
<!-- @migration-task Error while migrating Svelte code: Cannot read properties of undefined (reading 'end') -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { z } from 'zod';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    Dialog,
    Input,
    Label,
    Select
  } from '$lib/components/ui/enhanced-bits';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { toast } from 'svelte-sonner';
  import { Plus, Search, Filter, Edit2, Trash2, FileText, Eye, AlertCircle } from 'lucide-svelte';
  import { cn } from '$lib/utils.js';
  import type { PageData, ActionData } from './$types.js';
  import { get } from 'svelte/store';
  import HeadlessDialog from '$lib/headless/HeadlessDialog.svelte';
  // Headless primitives
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import FormField from '$lib/headless/FormField.svelte';

  // Feedback Integration
  import FeedbackIntegration from '$lib/components/feedback/FeedbackIntegration.svelte';

  // Zod schemas for validation
  const createCaseSchema = z.object({
    title: z.string().min(1, 'Case title is required').max(500, 'Case title too long'),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    status: z.enum(['open', 'investigating', 'pending', 'closed', 'archived']).default('open'),
    incidentDate: z.string().optional(),
    location: z.string().optional(),
    jurisdiction: z.string().optional()
  });

  const addEvidenceSchema = z.object({
    caseId: z.string().min(1, 'Case ID is required'),
    title: z.string().min(1, 'Evidence title is required').max(255, 'Title too long'),
    description: z.string().optional(),
    evidenceType: z.enum(['document', 'photo', 'video', 'audio', 'physical', 'digital', 'testimony']).default('document'),
    tags: z.string().optional()
  });

  // Props from load function  
  let { data }: { data: PageData } = $props();
  let form: ActionData | null = $state(null);

  // Superforms for type-safe form handling
  const createCaseForm = superForm((data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).createCaseForm, {
    validators: zodClient(createCaseSchema),
    onUpdated: ({ form }) => {
      isCreatingCase = false;
      if (form.valid) {
        toast.success('Case created successfully');
        createCaseDialogOpen = false;
        invalidateAll();
        if (caseCreationFeedback) {
          caseCreationFeedback.markCompleted({
            success: true,
            caseTitle: form.(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).title,
            casePriority: form.(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).priority,
            caseStatus: form.(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).status
          });
        }
      }
    },
    onError: ({ result }) => {
      isCreatingCase = false;
      toast.error((result as { error?: any; title?: any; similarity?: any; description?: any }).error.message || 'Failed to create case');
      if (caseCreationFeedback) {
        caseCreationFeedback.markFailed({
          errorType: 'case_creation_error',
          errorMessage: (result as { error?: any; title?: any; similarity?: any; description?: any }).error.message
        });
      }
    }
  });

  const addEvidenceForm = superForm((data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).addEvidenceForm, {
    validators: zodClient(addEvidenceSchema),
    onUpdated: ({ form }) => {
      isAddingEvidence = false;
      if (form.valid) {
        toast.success('Evidence added successfully');
        addEvidenceDialogOpen = false;
        optimisticEvidence = [];
        invalidateAll();
      }
    },
    onError: ({ result }) => {
      isAddingEvidence = false;
      // Remove optimistic placeholders
      if (optimisticEvidence.length) {
        optimisticEvidence = optimisticEvidence.filter(e => !e.__optimistic);
      }
      toast.error((result as { error?: any; title?: any; similarity?: any; description?: any }).error.message || 'Failed to add evidence');
    }
  });

  const { form: createFormData, enhance: createEnhance } = createCaseForm;
  const { form: evidenceFormData, enhance: evidenceEnhance } = addEvidenceForm;

  // Local vars to bind selects (avoid binding to store-derived expressions)
  // Removed duplicate variables - using $derived versions below

  // UI state (Svelte 5 runes)
  let createCaseDialogOpen = $state(false);
  let addEvidenceDialogOpen = $state(false);
  let deleteEvidenceDialogOpen = $state(false);
  let evidenceToDelete: any = $state(null);
  // Loading flags
  let isCreatingCase = $state(false);
  let isAddingEvidence = $state(false);
  // Optimistic evidence list
  let optimisticEvidence: any[] = $state([]);
  // Focus management
  let lastDialogTrigger: HTMLElement | null = null; // still used for legacy alert dialog

  function handleCreateCaseSubmit() {
    isCreatingCase = true;
  }
  function handleEvidenceSubmit() {
    isAddingEvidence = true;
    const current = get(evidenceFormData) as any;
    if (current?.title?.trim()) {
      optimisticEvidence = [
        ...optimisticEvidence,
        {
          id: `temp-${Date.now()}`,
          title: current.title,
          description: current.description,
          collectedAt: new Date().toISOString(),
          evidenceType: current.evidenceType,
          tags: current.tags,
          __optimistic: true
        }
      ];
    }
  }

  // Search and filter state (Svelte 5 runes)
  let searchQuery = $state('');
  let statusFilter: string | 'all' = $state('all');
  let priorityFilter: string | 'all' = $state('all');
  let sortBy = $state('createdAt');
  let sortOrder: 'asc' | 'desc' = $state('desc');

  // Vector search state
  let useVectorSearch = $state(false);
  let vectorSearchResults: any[] = $state([]);
  let isSearching = $state(false);

  // Feedback integration references
  let pageFeedback: any = $state(undefined);
  let searchFeedback: any = $state(undefined);
  let caseCreationFeedback: any = $state(undefined);

  // Sync local select variables from the form stores using Svelte 5 runes
  let createFormPriority = $derived($createFormData?.priority ?? 'medium');
  let createFormStatus = $derived($createFormData?.status ?? 'open');
  let evidenceFormType = $derived($evidenceFormData?.evidenceType ?? 'document');

  // Update form stores when local select variables change
  $effect(() => {
    if (createFormData && typeof createFormData.update === 'function') {
      const current = get(createFormData);
      if (current && typeof current === 'object' && 'priority' in current && current.priority !== createFormPriority) {
        createFormData.update((c: any) => ({ ...c, priority: createFormPriority }));
      }
    }
  });

  $effect(() => {
    if (createFormData && typeof createFormData.update === 'function') {
      const current = get(createFormData);
      if (current && typeof current === 'object' && 'status' in current && current.status !== createFormStatus) {
        createFormData.update((c: any) => ({ ...c, status: createFormStatus }));
      }
    }
  });

  $effect(() => {
    if (evidenceFormData && typeof evidenceFormData.update === 'function') {
      const current = get(evidenceFormData);
      if (current && typeof current === 'object' && 'evidenceType' in current && current.evidenceType !== evidenceFormType) {
        evidenceFormData.update((c: any) => ({ ...c, evidenceType: evidenceFormType }));
      }
    }
  });

  // Filtered and sorted cases using Svelte 5 runes
  let filteredCases = $derived((() => {
    let filtered = data?.userCases || [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.location?.toLowerCase().includes(query) ||
        c.jurisdiction?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }

    // Sort cases
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  })());

  // Priority colors
  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  // Status colors
  const statusColors = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
  };

  // Vector search function
  async function performVectorSearch() {
    if (!searchQuery.trim()) return;

    // Track search interaction for feedback
    const searchInteractionId = searchFeedback?.triggerFeedback({
      query: searchQuery,
      searchType: 'vector_search',
      legalDomain: 'case_management',
      searchStartTime: Date.now()
    });

    isSearching = true;
    const searchStartTime = Date.now();

    try {
      const response = await fetch('/api/cases/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          useVectorSearch: true,
          limit: 10,
          threshold: 0.7
        })
      });

      if ((response as { ok?: any; json?: any }).ok) {
        const results = await (response as { ok?: any; json?: any }).json();
        vectorSearchResults = results.data || [];
        toast.success(`Found ${vectorSearchResults.length} similar cases using AI search`);

        // Track successful search for feedback
        if (searchInteractionId && searchFeedback) {
          searchFeedback.markCompleted({
            success: true,
            resultCount: vectorSearchResults.length,
            searchTime: Date.now() - searchStartTime,
            relevanceScore: vectorSearchResults.length > 0 ? 0.8 : 0.3 // Estimated relevance
          });
        }
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      toast.error('Vector search failed');

      // Track failed search for feedback
      if (searchInteractionId && searchFeedback) {
        searchFeedback.markFailed({
          errorType: 'search_error',
          errorMessage: error.message,
          searchTime: Date.now() - searchStartTime
        });
      }
    } finally {
      isSearching = false;
    }
  }

  // View case details
  function viewCase(caseItem: any) {
    goto(`/cases?view=${caseItem.id}`);
  }

  // Delete evidence handler
  function confirmDeleteEvidence(evidence: any) {
    evidenceToDelete = evidence;
    deleteEvidenceDialogOpen = true;
  }

  async function deleteEvidence() {
    if (!evidenceToDelete) return;

    const formData = new FormData();
    formData.append('evidenceId', evidenceToDelete.id);

    const response = await fetch('/cases?/deleteEvidence', {
      method: 'POST',
      body: formData
    });

    if ((response as { ok?: any; json?: any }).ok) {
      toast.success('Evidence deleted successfully');
      deleteEvidenceDialogOpen = false;
      evidenceToDelete = null;
      await invalidateAll();
    } else {
      toast.error('Failed to delete evidence');
    }
  }

  // Set evidence form case ID when dialog opens using Svelte 5 runes
  $effect(() => {
    if (addEvidenceDialogOpen && data?.activeCase?.id) {
      if (evidenceFormData && typeof evidenceFormData.update === 'function') {
        evidenceFormData.update((c: any) => ({ ...c, caseId: (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.id }));
      } else if (evidenceFormData && typeof evidenceFormData.set === 'function') {
        const current = get(evidenceFormData);
        if (current && typeof current === 'object') {
          evidenceFormData.set({ ...current, caseId: (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.id });
        }
      }
    }
  });
</script>

<svelte:head>
  <title>Legal Cases - YoRHa Detective Interface</title>
  <meta name="description" content="Manage legal cases with AI-powered vector search and PostgreSQL storage" />
</svelte:head>

<div class="container mx-auto py-6 px-4 max-w-7xl">
  <div class="flex flex-col space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Legal Cases</h1>
        <p class="nes-text is-disabled">
          Manage cases with AI-powered search and PostgreSQL vector storage
        </p>
      </div>
  <Button class="bits-btn gap-2" on:click={(e) => { lastDialogTrigger = e.currentTarget as HTMLElement; createCaseDialogOpen = true; }}>
        {#snippet children()}
          <Plus class="h-4 w-4" />
          New Case
        {/snippet}

    </div>

    <!-- Stats Overview -->
    {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats}
    <div class="grid gap-4 md:grid-cols-4">
      <div class="p-6 nes-container">
        {#snippet children()}
          <div class="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 class="text-sm font-medium">Total Cases</h3>
            <FileText class="h-4 w-4 nes-text is-disabled" />
          </div>
          <div class="text-2xl font-bold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.total}</div>
        {/snippet}
      </div>
      <div class="p-6 nes-container">
        {#snippet children()}
          <div class="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 class="text-sm font-medium">Open Cases</h3>
            <Eye class="h-4 w-4 nes-text is-disabled" />
          </div>
          <div class="text-2xl font-bold text-blue-600">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.open}</div>
        {/snippet}
      </div>
      <div class="p-6 nes-container">
        {#snippet children()}
          <div class="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 class="text-sm font-medium">High Priority</h3>
            <AlertCircle class="h-4 w-4 text-red-500" />
          </div>
          <div class="text-2xl font-bold text-red-600">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.highPriority}</div>
        {/snippet}
      </div>
      <div class="p-6 nes-container">
        {#snippet children()}
          <div class="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 class="text-sm font-medium">Closed Cases</h3>
            <div class="h-4 w-4 rounded-full bg-gray-500"></div>
          </div>
          <div class="text-2xl font-bold text-gray-600">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.closed}</div>
        {/snippet}
      </div>
    </div>
    {/if}

    <!-- Filters and Search -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <div class="relative">
          <Search class="absolute left-2 top-2.5 h-4 w-4 nes-text is-disabled" />
          <Input
            bind:value={searchQuery}
            placeholder="Search cases with AI vector search..."
            class="pl-8 w-full md:w-[400px]"
          />
        </div>

        <div class="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            on:click={performVectorSearch}
            disabled={!searchQuery.trim() || isSearching}
            class="gap-2 bits-btn"
          >
            {#snippet children()}
              {#if isSearching}
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              {:else}
                <Search class="h-4 w-4" />
              {/if}
              AI Search
            {/snippet}

          <Select
            options={[
              {value: 'all', label: 'All Status'},
              {value: 'open', label: 'Open'},
              {value: 'investigating', label: 'Investigating'},
              {value: 'pending', label: 'Pending'},
              {value: 'closed', label: 'Closed'},
              {value: 'archived', label: 'Archived'}
            ]}
            bind:selected={statusFilter}
            placeholder="Status"
            class="w-[140px]"
          />

          <Select
            options={[
              {value: 'all', label: 'All Priority'},
              {value: 'low', label: 'Low'},
              {value: 'medium', label: 'Medium'},
              {value: 'high', label: 'High'},
              {value: 'critical', label: 'Critical'}
            ]}
            bind:selected={priorityFilter}
            placeholder="Priority"
            class="w-[140px]"
          />
        </div>
      </div>
    </div>

    <!-- Cases Grid or Detail View -->
    {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase}
      <!-- Case Detail View -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <Button class="bits-btn" variant="outline" on:click={() => goto('/cases')}>
            {#snippet children()}
              ← Back to Cases
            {/snippet}

          <div class="flex gap-2">
            <Button class="bits-btn" variant="outline" size="sm" on:click={(e) => { lastDialogTrigger = e.currentTarget as HTMLElement; addEvidenceDialogOpen = true; }}>
              {#snippet children()}
                <Plus class="h-4 w-4 mr-2" />
                Add Evidence
              {/snippet}

          </div>
        </div>

        <div class="p-6 nes-container">
          {#snippet children()}
            <div class="mb-4">
              <div class="flex items-start justify-between">
                <div class="space-y-2">
                  <h2 class="text-2xl font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.title}</h2>
                  <div class="flex gap-2">
                    <Badge class={cn(priorityColors[(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.priority])}>
                      {(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.priority}
                    </Badge>
                    <Badge class={cn(statusColors[(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.status])}>
                      {(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.status}
                    </Badge>
                    {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.location}
                      <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">📍 {(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.location}</span>
                    {/if}
                    {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.jurisdiction}
                      <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">⚖️ {(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.jurisdiction}</span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
            <p class="nes-text is-disabled mb-4">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.description}</p>
            {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.incidentDate}
              <div class="text-sm nes-text is-disabled">
                <strong>Incident Date:</strong> {new Date((data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).activeCase.incidentDate).toLocaleDateString()}
              </div>
            {/if}
          {/snippet}
        </div>

        <!-- Evidence Section -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Evidence ({(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseEvidence.length})</h2>

          {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseEvidence.length === 0}
            <div class="p-6 nes-container">
              {#snippet children()}
                <div class="flex flex-col items-center justify-center py-12">
                  <FileText class="h-12 w-12 nes-text is-disabled mb-4" />
                  <p class="nes-text is-disabled mb-4">No evidence has been added to this case yet.</p>
                  <Button class="bits-btn" on:click={(e) => { lastDialogTrigger = e.currentTarget as HTMLElement; addEvidenceDialogOpen = true; }}>
                    {#snippet children()}
                      <Plus class="h-4 w-4 mr-2" />
                      Add First Evidence
                    {/snippet}

                </div>
              {/snippet}
            </div>
          {:else}
            <div class="grid gap-4">
              {#each [...(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseEvidence, ...optimisticEvidence] as item}
                <div class="p-6 nes-container">
                  {#snippet children()}
                    <div class="mb-4">
                      <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">{(item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).title}</h3>
                        <div class="flex gap-2">
                          <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{(item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).evidenceType}</span>
                          {#if (item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).__optimistic}
                            <span class="flex items-center gap-1 text-xs nes-text is-disabled animate-pulse">
                              <div class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                              pending
                            </span>
                          {/if}
                          <Button class="bits-btn" variant="ghost" size="sm">
                            {#snippet children()}
                              <Edit2 class="h-4 w-4" />
                            {/snippet}

                          <Button class="bits-btn"
                            variant="ghost"
                            size="sm"
                            on:click={() => confirmDeleteEvidence(item)}
                          >
                            {#snippet children()}
                              <Trash2 class="h-4 w-4" />
                            {/snippet}

                        </div>
                      </div>
                    </div>
                    <p class="text-sm nes-text is-disabled mb-2">{(item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).description}</p>
                    <div class="flex justify-between items-center text-xs nes-text is-disabled">
                      <span>Collected: {new Date((item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).collectedAt).toLocaleDateString()}</span>
                      {#if (item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).tags}
                        <span>Tags: {(item as { title?: any; evidenceType?: any; __optimistic?: any; description?: any; collectedAt?: any; tags?: any }).tags}</span>
                      {/if}
                    </div>
                  {/snippet}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Cases Grid View -->
      <Tabs.Root value="all-cases" class="w-full">
        <Tabs.List class="grid w-full grid-cols-3">
          <Tabs.Trigger value="all-cases">All Cases ({filteredCases.length})</Tabs.Trigger>
          <Tabs.Trigger value="vector-search" disabled={!vectorSearchResults.length}>
            AI Search Results ({vectorSearchResults.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="all-cases" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each filteredCases as caseItem}
              <div class="cursor-pointer transition-colors hover:bg-muted/50 p-6 nes-container"> viewCase(caseItem)}>
                {#snippet children()}
                  <div class="mb-4">
                    <div class="flex items-start justify-between">
                      <h3 class="text-lg font-semibold line-clamp-2">{caseItem.title}</h3>
                      <div class="flex flex-col gap-1">
                        <Badge class={cn(priorityColors[caseItem.priority], 'text-xs')}>
                          {caseItem.priority}
                        </Badge>
                        <Badge class={cn(statusColors[caseItem.status], 'text-xs')}>
                          {caseItem.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p class="text-sm nes-text is-disabled line-clamp-3 mb-4">
                    {caseItem.description || 'No description provided'}
                  </p>
                  <div class="space-y-2">
                    {#if caseItem.location}
                      <div class="text-xs nes-text is-disabled">📍 {caseItem.location}</div>
                    {/if}
                    {#if caseItem.jurisdiction}
                      <div class="text-xs nes-text is-disabled">⚖️ {caseItem.jurisdiction}</div>
                    {/if}
                    <div class="flex items-center justify-between text-xs nes-text is-disabled">
                      <span>Created: {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                      {#if caseItem.updatedAt}
                        <span>Updated: {new Date(caseItem.updatedAt).toLocaleDateString()}</span>
                      {/if}
                    </div>
                  </div>
                {/snippet}
              </div>
            {:else}
              <div class="col-span-full">
                <div class="p-6 nes-container">
                  {#snippet children()}
                    <div class="flex flex-col items-center justify-center py-12">
                      <FileText class="h-12 w-12 nes-text is-disabled mb-4" />
                      <p class="nes-text is-disabled mb-4">
                        {searchQuery.trim() ? 'No cases found matching your search.' : 'No cases found.'}
                      </p>
                      <Button class="bits-btn" on:click={() => createCaseDialogOpen = true}>
                        {#snippet children()}
                          <Plus class="h-4 w-4 mr-2" />
                          Create Your First Case
                        {/snippet}

                    </div>
                  {/snippet}
                </div>
              </div>
            {/each}
          </div>
        </Tabs.Content>

        <Tabs.Content value="vector-search" class="space-y-4">
          {#if vectorSearchResults.length > 0}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {#each vectorSearchResults as result}
                <div class="cursor-pointer transition-colors hover:bg-muted/50 p-6 nes-container"> viewCase(result)}>
                  {#snippet children()}
                    <div class="mb-4">
                      <div class="flex items-start justify-between">
                        <h3 class="text-lg font-semibold line-clamp-2">{(result as { error?: any; title?: any; similarity?: any; description?: any }).title}</h3>
                        <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{Math.round((result as { error?: any; title?: any; similarity?: any; description?: any }).similarity * 100)}% match</span>
                      </div>
                    </div>
                    <p class="text-sm nes-text is-disabled line-clamp-3 mb-2">
                      {(result as { error?: any; title?: any; similarity?: any; description?: any }).description || 'No description provided'}
                    </p>
                    <div class="text-xs text-green-600 mb-2">
                      🤖 AI-powered similarity: {((result as { error?: any; title?: any; similarity?: any; description?: any }).similarity * 100).toFixed(1)}%
                    </div>
                  {/snippet}
                </div>
              {/each}
            </div>
          {:else}
            <div class="p-6 nes-container">
              {#snippet children()}
                <div class="flex flex-col items-center justify-center py-12">
                  <Search class="h-12 w-12 nes-text is-disabled mb-4" />
                  <p class="nes-text is-disabled mb-4">Use the AI Search button to find similar cases</p>
                  <p class="text-sm nes-text is-disabled text-center max-w-md">
                    Vector search uses AI to find semantically similar cases based on content, not just keywords.
                  </p>
                </div>
              {/snippet}
            </div>
          {/if}
        </Tabs.Content>

        <Tabs.Content value="analytics" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="p-6 nes-container">
              {#snippet children()}
                <div class="mb-4">
                  <h3 class="text-lg font-semibold">Case Distribution</h3>
                </div>
                <div class="space-y-2">
                  {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats}
                    <div class="flex justify-between">
                      <span>Open Cases</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.open}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Investigating</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.investigating || 0}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Pending</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.pending || 0}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Closed</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.closed}</span>
                    </div>
                  {/if}
                </div>
              {/snippet}
            </div>

            <div class="p-6 nes-container">
              {#snippet children()}
                <div class="mb-4">
                  <h3 class="text-lg font-semibold">Priority Breakdown</h3>
                </div>
                <div class="space-y-2">
                  {#if (data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats}
                    <div class="flex justify-between">
                      <span class="text-red-600">Critical</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.critical || 0}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-orange-600">High</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.highPriority}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-yellow-600">Medium</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.medium || 0}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-green-600">Low</span>
                      <span class="font-semibold">{(data as { createCaseForm?: any; title?: any; priority?: any; status?: any; addEvidenceForm?: any; activeCase?: any; caseStats?: any; caseEvidence?: any }).caseStats.low || 0}</span>
                    </div>
                  {/if}
                </div>
              {/snippet}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    {/if}
  </div>
</div>

<!-- Create Case Dialog -->
<HeadlessDialog bind:open={createCaseDialogOpen} ariaLabelledby="create-case-title">
  <h2 id="create-case-title" class="text-lg font-semibold mb-2">Create New Case</h2>
  <form method="post" action="?/createCase" use:enhance={createEnhance} on:submit={handleCreateCaseSubmit} class="space-y-4">
      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="case-title">Case Title *</Label>
          <FormField name="title" errors={$createCaseForm?.errors?.title}>
            <Input slot="control"
              id="case-title"
              name="title"
              bind:value={$createFormData.title}
              placeholder="Enter case title..."
              required
            />
          </FormField>
        </div>
        <div class="grid gap-2">
          <Label for="case-description">Description</Label>
          <FormField name="description" errors={$createCaseForm?.errors?.description}>
            <Textarea slot="control"
              id="case-description"
              name="description"
              bind:value={$createFormData.description}
              placeholder="Describe the case details..."
              class="min-h-[100px]"
            />
          </FormField>
        </div>
        <div class="grid gap-2">
          <Label for="case-status">Status</Label>
          <Select
            options={[
              {value: 'open', label: 'Open'},
              {value: 'investigating', label: 'Investigating'},
              {value: 'pending', label: 'Pending'},
              {value: 'closed', label: 'Closed'}
            ]}
            bind:selected={$createFormData.status}
            placeholder="Select status"
            name="status"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="case-priority">Priority</Label>
            <Select
              options={[
                {value: 'low', label: 'Low'},
                {value: 'medium', label: 'Medium'},
                {value: 'high', label: 'High'},
                {value: 'critical', label: 'Critical'}
              ]}
              bind:selected={$createFormData.priority}
              placeholder="Select priority"
              name="priority"
            />
          </div>
          <!-- Removed duplicate Status block to avoid confusion -->
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="case-location">Location</Label>
            <FormField name="location" errors={$createCaseForm?.errors?.location}>
              <Input slot="control"
                id="case-location"
                name="location"
                bind:value={$createFormData.location}
                placeholder="Case location..."
              />
            </FormField>
          </div>
          <div class="grid gap-2">
            <Label for="case-jurisdiction">Jurisdiction</Label>
            <FormField name="jurisdiction" errors={$createCaseForm?.errors?.jurisdiction}>
              <Input slot="control"
                id="case-jurisdiction"
                name="jurisdiction"
                bind:value={$createFormData.jurisdiction}
                placeholder="Legal jurisdiction..."
              />
            </FormField>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="incident-date">Incident Date</Label>
          <FormField name="incidentDate" errors={$createCaseForm?.errors?.incidentDate}>
            <Input slot="control"
              id="incident-date"
              name="incidentDate"
              type="datetime-local"
              bind:value={$createFormData.incidentDate}
            />
          </FormField>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <Button class="bits-btn" variant="outline" type="button" on:click={() => createCaseDialogOpen = false}>
          {#snippet children()}Cancel{/snippet}

        <Button class="bits-btn" type="submit" disabled={isCreatingCase || !$createFormData.title?.trim()}>
          {#snippet children()}
            {#if isCreatingCase}Creating...{:else}Create Case{/if}
          {/snippet}

      </div>
    </form>
    <div aria-live="polite" class="sr-only">{isCreatingCase ? 'Creating case' : ''}</div>
</HeadlessDialog>

<!-- Add Evidence Dialog -->
<HeadlessDialog bind:open={addEvidenceDialogOpen} ariaLabelledby="add-evidence-title">
  <h2 id="add-evidence-title" class="text-lg font-semibold mb-2">Add Evidence</h2>
  <form method="post" action="?/addEvidence" use:enhance={evidenceEnhance} on:submit={handleEvidenceSubmit} class="space-y-4">
      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="evidence-type">Evidence Type</Label>
          <Select
            options={[
              {value: 'document', label: 'Document'},
              {value: 'photo', label: 'Photo'},
              {value: 'video', label: 'Video'},
              {value: 'audio', label: 'Audio'},
              {value: 'physical', label: 'Physical'},
              {value: 'digital', label: 'Digital'},
              {value: 'testimony', label: 'Testimony'}
            ]}
            bind:selected={$evidenceFormData.evidenceType}
            placeholder="Select type"
            name="evidenceType"
          />
        </div>
        <div class="grid gap-2">
          <Label for="evidence-title">Title *</Label>
          <FormField name="title" errors={$addEvidenceForm?.errors?.title}>
            <Input slot="control"
              id="evidence-title"
              name="title"
              bind:value={$evidenceFormData.title}
              placeholder="Enter evidence title..."
              required
            />
          </FormField>
        </div>
        <div class="grid gap-2">
          <Label for="evidence-description">Description</Label>
          <FormField name="description" errors={$addEvidenceForm?.errors?.description}>
            <Textarea slot="control"
              id="evidence-description"
              name="description"
              bind:value={$evidenceFormData.description}
              placeholder="Describe the evidence..."
              class="min-h-[80px]"
            />
          </FormField>
        </div>
        <!-- Removed duplicate Evidence Type block -->
        <input type="hidden" name="caseId" value={$evidenceFormData.caseId} />
        <div class="grid gap-2">
          <Label for="evidence-tags">Tags</Label>
          <FormField name="tags" errors={$addEvidenceForm?.errors?.tags}>
            <Input slot="control"
              id="evidence-tags"
              name="tags"
              bind:value={$evidenceFormData.tags}
              placeholder="Comma-separated tags..."
            />
          </FormField>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <Button class="bits-btn" variant="outline" type="button" on:click={() => addEvidenceDialogOpen = false}>
          {#snippet children()}Cancel{/snippet}

        <Button class="bits-btn" type="submit" disabled={isAddingEvidence || !$evidenceFormData.title?.trim()}>
          {#snippet children()}
            {#if isAddingEvidence}Adding...{:else}Add Evidence{/if}
          {/snippet}

      </div>
    </form>
    <div aria-live="polite" class="sr-only">{isAddingEvidence ? 'Adding evidence' : ''}</div>
</HeadlessDialog>

<!-- Delete Evidence Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteEvidenceDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete the evidence
        "{evidenceToDelete?.title}" from the case and remove it from the vector index.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <Button class="bits-btn" variant="outline" on:click={() => deleteEvidenceDialogOpen = false}>
        {#snippet children()}Cancel{/snippet}

      <Button class="bits-btn" variant="destructive" on:click={deleteEvidence}>
        {#snippet children()}Delete Evidence{/snippet}

    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Feedback Integration Components -->
<FeedbackIntegration
  bind:this={pageFeedback}
  interactionType="page_visit"
  ratingType="ui_experience"
  priority="low"
  context={{
    page: 'cases',
    totalCases: filteredCases.length,
    hasActiveFilters: searchQuery.trim() || statusFilter !== 'all' || priorityFilter !== 'all'
  }}
  trackOnMount={true}
  let:feedback
/>

<FeedbackIntegration
  bind:this={searchFeedback}
  interactionType="ai_search"
  ratingType="search_relevance"
  priority="medium"
  context={{ component: 'VectorSearch', legalDomain: 'case_management' }}
  let:feedback
/>

<FeedbackIntegration
  bind:this={caseCreationFeedback}
  interactionType="case_creation"
  ratingType="ui_experience"
  priority="high"
  context={{ component: 'CreateCaseDialog' }}
  let:feedback
/>

<!-- Tailwind CSS will handle all styling through bits-ui components -->

