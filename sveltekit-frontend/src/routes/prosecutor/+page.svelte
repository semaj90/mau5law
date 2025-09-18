<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!--
Prosecutor Dashboard - Complete Legal AI Workflow
Features: Case management, evidence upload, AI chat, vector search
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { SearchResults } from "$lib/types/global";
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import Button from '$lib/components/ui/enhanced-bits';;
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import EvidenceUploadComponent from '$lib/components/prosecutor/EvidenceUploadComponent.svelte';
  import EnhancedAIChatAssistant from '$lib/components/prosecutor/EnhancedAIChatAssistant.svelte';
  import { webGPUProcessor } from '$lib/services/webgpu-vector-processor';
  import {
    Scale,
    Users,
    FileText,
    Upload,
    Search,
    Brain,
    Zap,
    Eye,
    Plus,
    Filter
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // State management
  let selectedCaseId = $state('');
  let cases: unknown[] = $state([]);
  let personsOfInterest: unknown[] = $state([]);
  let recentEvidence: unknown[] = $state([]);
  let searchQuery = $state('');
  let searchResults: unknown[] = $state([]);
  let activeTab = $state('overview');

  // AI features state
  let webGPUEnabled = $state(false);
  let ragSystemStatus = $state('initializing');

  onMount(async () => {
    // Check WebGPU availability
    webGPUEnabled = await webGPUProcessor.initialize();

    // Load prosecutor data
    await loadCases();
    await loadPersonsOfInterest();
    await loadRecentEvidence();

    ragSystemStatus = 'ready';
  });

  const loadCases = async () => {
    try {
  let response = $state<Responsetry {
          response  | null>(null); const data = await fetch('/api/cases?role=prosecutor');
          if (!(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).ok) {
            throw new Error(`HTTP ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).status}: ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).statusText}`);
          }
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      const result = await (response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).json();
      cases = (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).data || [];

      if (cases.length > 0 && !selectedCaseId) {
        selectedCaseId = cases[0].id;
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    }
  };

  const loadPersonsOfInterest = async () => {
    try {
  let response = $state<Responsetry {
          response  | null>(null); const data = await fetch(`/api/persons-of-interest?caseId=${selectedCaseId}`);
          if (!(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).ok) {
            throw new Error(`HTTP ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).status}: ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).statusText}`);
          }
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      const result = await (response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).json();
      personsOfInterest = (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).data || [];
    } catch (error) {
      console.error('Failed to load POIs:', error);
    }
  };

  const loadRecentEvidence = async () => {
    try {
  let response = $state<Responsetry {
          response  | null>(null); const data = await fetch(`/api/evidence?caseId=${selectedCaseId}&limit=10`);
          if (!(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).ok) {
            throw new Error(`HTTP ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).status}: ${(response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).statusText}`);
          }
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      const result = await (response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).json();
      recentEvidence = (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).data || [];
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  };

  // Enhanced vector search with WebGPU
  const performVectorSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      if (webGPUEnabled) {
        searchResults = await webGPUProcessor.searchSimilarEvidence(
          searchQuery,
          selectedCaseId,
          undefined, // any evidence type
          undefined, // any tags
          20
        );
      } else {
        // Fallback to API search
        const response = await fetch('/api/search/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            caseId: selectedCaseId,
            type: 'evidence'
          })
        });
        const result = await (response as { ok?: unknown; status?: unknown; statusText?: unknown; json?: unknown }).json();
        searchResults = (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).results || [];
      }
    } catch (error) {
      console.error('Vector search failed:', error);
    }
  };

  // Handle evidence upload completion
  const handleEvidenceUploaded = (results: unknown[]) => {
    console.log('Evidence uploaded:', results);
    loadRecentEvidence(); // Refresh evidence list
  };

  // Case selection handler
  const selectCase = (caseId: string) => {
    selectedCaseId = caseId;
    loadPersonsOfInterest();
    loadRecentEvidence();
  };
</script>

<svelte:head>
  <title>Prosecutor Dashboard - Legal AI Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-4">
          <Scale class="w-8 h-8 text-blue-600" />
          <h1 class="text-2xl font-bold text-gray-900">Prosecutor Dashboard</h1>

          {#if webGPUEnabled}
            <Badge variant="secondary" class="hidden sm:flex">
              <Zap class="w-3 h-3 mr-1" />
              GPU Accelerated
            </Badge>
          {/if}

          <Badge variant="outline" class="hidden sm:flex">
            <Brain class="w-3 h-3 mr-1" />
            Gemma3Legal Active
          </Badge>
        </div>

        <div class="flex items-center space-x-4">
          <Badge variant={ragSystemStatus === 'ready' ? 'secondary' : 'outline'}>
            {ragSystemStatus === 'ready' ? '✅' : '⏳'} RAG System
          </Badge>
        </div>
      </div>
    </div>
  </header>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Case Selector -->
    <div class="mb-6 nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">Active Cases</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="flex flex-wrap gap-2">
          {#each cases as caseItem}
            <Button class="bits-btn"
              variant={selectedCaseId === caseItem.id ? 'default' : 'outline'}
              size="sm"
              onclick={() =>
selectCase(caseItem.id)}
            >
              {caseItem.caseNumber} - {caseItem.title}
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{caseItem.status}</span>

          {/each}

          <Button class="bits-btn" variant="outline" size="sm">
<Plus class="w-4 h-4 mr-1" />
            New Case

        </div>
      </div>
    </div>

    <!-- Main Dashboard Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Left Column: Evidence & Search -->
      <div class="xl:col-span-2 space-y-6">
        <!-- Vector Search -->
        <div class="nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary flex items-center gap-2">
              <Search class="w-5 h-5" />
              Enhanced Vector Search
              {#if webGPUEnabled}
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">GPU Accelerated</span>
              {/if}
            </h3>
          </div>
          <div class="yorha-panel-content space-y-4">
            <div class="flex gap-2">
              <Input
                bind:value={searchQuery}
                placeholder="Search evidence, cases, precedents..."
                class="flex-1"
              />
              <Button class="bits-btn" onclick={performVectorSearch} disabled={!searchQuery.trim()}>
<Search class="w-4 h-4" />

            </div>

            {#if searchResults.length > 0}
              <div class="space-y-2">
                <h4 class="font-medium">Search Results ({searchResults.length})</h4>
                {#each searchResults as result}
                  <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div class="flex justify-between items-start">
                      <div>
                        <p class="font-medium text-sm">{(result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).payload?.fileName || (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).id}</p>
                        <p class="text-xs text-gray-600 mt-1">
                          {(result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).payload?.title || 'No title'}
                        </p>
                        {#if (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).payload?.tags}
                          <div class="flex gap-1 mt-2">
                            {#each (result as { data?: unknown; results?: unknown; payload?: unknown; id?: unknown; score?: unknown }).payload.tags as tag}
                              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{tag}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                      <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{Math.round.score * 100)}% match</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Evidence Upload -->
        <EvidenceUploadComponent
          caseId={selectedCaseId}
          enableWebGPU={webGPUEnabled}
          uploadcomplete={handleEvidenceUploaded}
        />

        <!-- Recent Evidence -->
        <div class="nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary flex items-center gap-2">
              <FileText class="w-5 h-5" />
              Recent Evidence ({recentEvidence.length})
            </h3>
          </div>
          <div class="yorha-panel-content">
            {#if recentEvidence.length === 0}
              <p class="text-gray-500 text-center py-8">No evidence uploaded yet</p>
            {:else}
              <div class="space-y-3">
                {#each recentEvidence as evidence}
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <FileText class="w-5 h-5 text-blue-500" />
                      <div>
                        <p class="font-medium text-sm">{evidence.title}</p>
                        <p class="text-xs text-gray-500">
                          {evidence.fileName} • {new Date(evidence.uploadedAt).toLocaleDateString()}
                        </p>
                        {#if evidence.aiSummary}
                          <p class="text-xs text-blue-600 mt-1">
                            AI: {evidence.aiSummary.substring(0, 60)}...
                          </p>
                        {/if}
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      {#if evidence.aiAnalysis?.prosecutionRelevance}
                        <Badge
                          variant={evidence.aiAnalysis.prosecutionRelevance === 'high' ? 'destructive' : 'secondary'}
                          class="text-xs"
                        >
                          {evidence.aiAnalysis.prosecutionRelevance}
                        </Badge>
                      {/if}
                      <Button class="bits-btn" variant="ghost" size="sm">
<Eye class="w-4 h-4" />

                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Right Column: AI Chat & POIs -->
      <div class="space-y-6">
        <!-- Persons of Interest -->
        <div class="nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary flex items-center gap-2">
              <Users class="w-5 h-5" />
              Persons of Interest ({personsOfInterest.length})
            </h3>
          </div>
          <div class="yorha-panel-content">
            {#if personsOfInterest.length === 0}
              <p class="text-gray-500 text-center py-4">No POIs for this case</p>
            {:else}
              <div class="space-y-3">
                {#each personsOfInterest as poi}
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex justify-between items-start">
                      <div>
                        <p class="font-medium text-sm">{poi.name}</p>
                        <p class="text-xs text-gray-500">{poi.role}</p>
                        {#if poi.tags}
                          <div class="flex gap-1 mt-1">
                            {#each poi.tags as tag}
                              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{tag}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                      <Badge
                        variant={poi.priority === 'high' ? 'destructive' : 'secondary'}
                        class="text-xs"
                      >
                        {poi.priority || 'normal'}
                      </Badge>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <Button variant="outline" size="sm" class="w-full mt-3 bits-btn bits-btn">
<Plus class="w-4 h-4 mr-1" />
              Add Person of Interest

          </div>
        </div>

        <!-- AI Chat Assistant -->
        <div class="h-96">
          <EnhancedAIChatAssistant
            caseId={selectedCaseId}
            enableSelfPrompting={true}
            enableElementalAwareness={true}
            enableEnhancedRAG={true}
          />
        </div>
      </div>
    </div>

    <!-- System Status Bar -->
    <div class="fixed bottom-4 right-4 z-50">
      <div class="bg-black text-white nes-container">
        <div class="yorha-panel-content p-3">
          <div class="flex items-center space-x-4 text-xs">
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>PostgreSQL</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>MinIO</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Qdrant</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 {webGPUEnabled ? 'bg-green-500' : 'bg-yellow-500'} rounded-full"></div>
              <span>WebGPU</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Gemma3Legal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Prosecutor dashboard styling */
  :global(.prosecutor-dashboard) {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  }

  /* Enhanced hover effects for elemental awareness */
  :global(*:hover) {
    transition: all 0.1s ease;
  }

  /* WebGPU acceleration indicators */
  :global(.gpu-accelerated) {
    position: relative;
  }

  :global(.gpu-accelerated: :after) {
    content: '⚡';
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 12px;
  }
</style>


