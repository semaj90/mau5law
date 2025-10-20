<!-- @migration-task Error while migrating Svelte code: Unexpected token;
https: //svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onDestroy, onMount } from 'svelte';
  import { quintOut } from "svelte/easing";
  // The 'fly' transition is e";
  import AdvancedSearch from "../search/AdvancedSearch.svelte";
  import Modal from "../ui/Modal.svelte";
  import ReportToolbar from "./ReportToolbar.svelte";
  import RichTextEditor from "./RichTextEditor.svelte";
  import type { Component } from 'svelte'; // Add this import
  import MasonryGrid from "$lib/components/ui/MasonryGrid.svelte"; // Add this import
  import EvidenceCard from "$lib/components/evidence/EvidenceCard.svelte"; // Add this import
  // Icons
  import { invalidateAll } from "$app/navigation";
  import {
    Columns,
    Download,
    Eye,
    Grid,
    Layout,
    Loader2,
    Maximize2,
    Minimize2,
    PanelLeftOpen,
    PenLine,
    Plus,
    Search,
    Settings,
    Trash2,
  } from "lucide-svelte";
  import { Button } from 'bits-ui'; // Add bits-ui Button import
  import type { Evidence, ReportStoreState, ReportUIState, EditorState } from '$lib/types/report'; // Import new types
  import { editorState, report, reportActions, reportUI, setupAutoSave } from '$lib/stores/unified';
  import { legalAnalysisCache } from '$lib/services/legal-analysis-cache';

  // State
  let editorComponent = $state<any>(null);
  let selectedEvidence = $state<Evidence | null>(null); // Type selectedEvidence
  let showEvidenceModal = $state(false);
  let showSettingsModal = $state(false);
  let evidenceSearchResults = $state<Evidence[]>([]); // Type evidenceSearchResults
  let evidenceFormData = $state<any>(null);
  let cleanupAutoSave: (() => void) | null = null;

  // Workaround for Svelte 5 component type inference issue
  let MasonryGridComponent: Component = MasonryGrid as Component;

  // Legal document comparison state
  let comparingId = $state<string | null>(null);
  let compareError = $state<string | null>(null);
  let comparisonResults = $state<Record<string, any>>({});
  let cacheStats = $state({ totalEntries: 0, oldestEntry: null, newestEntry: null, totalSize: 0 });

  // Handler for AdvancedSearch component
  const handleEvidenceSearch = (event: CustomEvent<Evidence[]>) => {
    evidenceSearchResults = event.detail;
  };

  let isFullscreen = $derived(($reportUI as ReportUIState).fullscreen);
  let isSidebarClosed = $derived(!($reportUI as ReportUIState).sidebarOpen);

  let layoutClass = $derived(
    ($report as unknown as ReportStoreState)?.settings?.layout // Add type assertion
      ? {
          single: "layout-single",
          dual: "layout-dual",
          masonry: "layout-masonry",
        }[($report as unknown as ReportStoreState).settings.layout] // Add type assertion
      : "layout-single"
  );
  // Reactive editor height
  let editorHeight = $derived(($reportUI as ReportUIState) && ($reportUI as ReportUIState).fullscreen ? window.innerHeight - 200 : 500); // Add type assertion
  function updateEditorHeight() {
    editorHeight = ($reportUI as ReportUIState).fullscreen ? window.innerHeight - 200 : 500; // Add type assertion
  }
  $effect(() => {
    window.addEventListener('resize', updateEditorHeight);
  });
  onDestroy(() => {
    window.removeEventListener('resize', updateEditorHeight);
  });
  // Initialize auto-save
  $effect(() => {
    if (($report as unknown as ReportStoreState).settings.autoSave) { // Add type assertion
      cleanupAutoSave = setupAutoSave();
    }
  });
  onDestroy(() => {
    if (cleanupAutoSave) {
      cleanupAutoSave();
    }
  });
  // Handle evidence actions
  const handleViewEvidence = (evidence: Evidence) => { // Type evidence
    selectedEvidence = evidence;
    showEvidenceModal = true;
  }
  const handleEditEvidence = (evidence: Evidence) => { // Type evidence
    selectedEvidence = evidence;
    showEvidenceModal = true;
  }
  const handleDeleteEvidence = async (evidence: Evidence) => { // Type evidence
    if (confirm(`Are you sure you want to delete "${evidence.title}"?`)) {
      try {
        const formData = new FormData();
        formData.append("id", evidence.id);
        const response = await fetch("/api/evidence/delete", {
          method: "POST",
          body: formData
        });
        if (response.ok) {
          reportActions.removeEvidence(evidence.id);
          await invalidateAll(); // Refresh the page data
        } else {
          alert("Failed to delete evidence");
        }
      } catch (error) {
        console.error("Error deleting evidence:", error);
        alert("Error deleting evidence");
      }
    }
  }
  const handleDownloadEvidence = (evidence: Evidence) => { // Type evidence
    if (evidence.url) {
      window.open(evidence.url, "_blank");
    }
  }

  const handleCompareEvidence = async (evidence: Evidence) => {
    comparingId = evidence.id;
    compareError = null;

    try {
      // 1. Check cache first for instant results
      const cached = await legalAnalysisCache.get(
        evidence.id,
        evidence.title,
        evidence.description,
        evidence.tags
      );

      if (cached) {
        console.log('⚡ Using cached analysis for:', evidence.title);
        comparisonResults[evidence.id] = {
          analysis: cached.analysis,
          comparison: cached.comparison,
          processingTime: cached.processingTime,
          fromCache: true,
        };
        comparingId = null;
        updateCacheStats();
        return;
      }

      // 2. No cache hit - analyze with API
      const formData = new FormData();

      // Create a text file from evidence content for analysis
      const textContent = `${evidence.title}\n\n${evidence.description || ''}`;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new File([blob], `${evidence.title}.txt`, { type: 'text/plain' });

      formData.append('file', file);
      formData.append('title', evidence.title);
      formData.append('documentType', 'evidence');
      formData.append('tags', (evidence.tags || []).join(','));
      formData.append('enableComparison', 'true');

      const response = await fetch('/api/legal-report/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        comparisonResults[evidence.id] = result.data;
        console.log('✅ Legal analysis complete:', result.data);

        // 3. Store in cache for future use
        await legalAnalysisCache.set(
          evidence.id,
          evidence.title,
          evidence.description || '',
          evidence.tags || [],
          result.data.analysis,
          result.data.comparison,
          result.data.processingTime
        );

        updateCacheStats();
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Legal comparison failed:', error);
      compareError = error.message || 'Failed to analyze evidence';
    } finally {
      comparingId = null;
    }
  }

  // Update cache statistics
  function updateCacheStats() {
    cacheStats = legalAnalysisCache.getStats();
  }

  // Load cache stats on mount
  onMount(() => {
    updateCacheStats();
  });

  const handleAddNewEvidence = () => {
    selectedEvidence = null;
    showEvidenceModal = true;
  }
  // Layout switching
  const switchLayout = () => {
    const layouts = ["single", "dual", "masonry"] as const;
    const currentIndex = layouts.indexOf(($report as unknown as ReportStoreState).settings.layout); // Add type assertion
    const nextLayout = layouts[(currentIndex + 1) % layouts.length];
    reportActions.updateSettings({ layout: nextLayout });
  }
  // Sidebar toggle
  const toggleSidebar = () => {
    reportUI.update((ui: ReportUIState) => ({ ...ui, sidebarOpen: !ui.sidebarOpen })); // Type ui parameter
  }
  // Fullscreen toggle
  const toggleFullscreen = () => {
    reportUI.update((ui: ReportUIState) => ({ ...ui, fullscreen: !ui.fullscreen })); // Type ui parameter
    if (!($reportUI as ReportUIState).fullscreen) { // Add type assertion
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  // Keyboard shortcuts
  const handleKeydown = (e: KeyboardEvent) => { // Changed type from CustomEvent<any> to KeyboardEvent
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "s":
          e.preventDefault();
          reportActions.save();
          break;
        case "b":
          e.preventDefault();
          toggleSidebar();
          break;
        case "n":
          e.preventDefault();
          reportActions.reset();
          break;
      }
    }
    if (e.key === "F11") {
      e.preventDefault();
      toggleFullscreen();
    }
  }
</script>
<svelte:window on:keydown={handleKeydown} /> <!-- Changed keydown={handleKeydown} to on:keydown={handleKeydown} -->
<div
  class="report-editor {layoutClass}"
  class:fullscreen={isFullscreen}
  class:sidebar-closed={isSidebarClosed}
>
  <!-- Toolbar -->
  <header class="editor-toolbar">
    <ReportToolbar />
  </header>
  <!-- Main Content Area -->
  <div class="editor-content">
    <!-- Sidebar -->
    {#if ($reportUI as ReportUIState).sidebarOpen} <!-- Add type assertion -->
      <aside
        class="editor-sidebar"
        style="width: {($reportUI as ReportUIState).sidebarWidth}px"
      >
        <!-- Evidence Search -->
        <section class="sidebar-section">
          <div class="section-header">
            <section class="space-y-4">
              <div>
                <h3>Evidence Library</h3>
                <Button <!-- Changed Button.Root to Button -->
                  on:click={() => handleAddNewEvidence()}
                  title="Add new evidence"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <!-- The evidence search component was removed earlier; keep placeholder markup -->
              <div class="evidence-search-placeholder">
                <!-- Re-integrating AdvancedSearch component -->
                <AdvancedSearch on:search={handleEvidenceSearch} />
              </div>
            </section>
          </div>
        </section>
        <!-- Evidence Grid -->
        <section class="evidence-section">
          {#if ($report as unknown as ReportStoreState).settings.layout === "masonry"} <!-- Add type assertion -->
            <section class="space-y-4">
              <MasonryGridComponent
                items={evidenceSearchResults}
                columnWidth={250}
                gutter={12}
                let:item
              >
                <EvidenceCard
                  evidence={item}
                  compact={true}
                >
                  {#snippet actions(evidence: Evidence)} <!-- Type evidence -->
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                      on:click={() => handleViewEvidence(evidence)}
                      title="View evidence"
                    >
                      <Eye size={14} />
                    </Button>
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-purple-600"
                      on:click={() => handleCompareEvidence(evidence)}
                      title="Analyze & Compare with Legal Documents"
                      disabled={comparingId === evidence.id}
                    >
                      {#if comparingId === evidence.id}
                        <Loader2 size={14} class="animate-spin" />
                      {:else}
                        <Search size={14} />
                      {/if}
                    </Button>
                    {#if evidence.url || evidence.file}
                      <Button
                        class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                        on:click={() => handleDownloadEvidence(evidence)}
                        title="Download"
                      >
                        <Download size={14} />
                      </Button>
                    {/if}
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-green-600"
                      on:click={() => handleEditEvidence(evidence)}
                      title="Edit evidence"
                    >
                      <PenLine size={14} />
                    </Button>
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-red-600"
                      on:click={() => handleDeleteEvidence(evidence)}
                      title="Delete evidence"
                    >
                      <Trash2 size={14} />
                    </Button>
                  {/snippet}
                </EvidenceCard>
              </MasonryGridComponent>
            </section>
          {:else}
            <div>
              {#each evidenceSearchResults as evidence (evidence.id)}
                <EvidenceCard
                  {evidence}
                  compact={true}
                >
                  {#snippet actions(evidence: Evidence)} <!-- Type evidence -->
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                      on:click={() => handleViewEvidence(evidence)}
                      title="View evidence"
                    >
                      <Eye size={14} />
                    </Button>
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-purple-600"
                      on:click={() => handleCompareEvidence(evidence)}
                      title="Analyze & Compare with Legal Documents"
                      disabled={comparingId === evidence.id}
                    >
                      {#if comparingId === evidence.id}
                        <Loader2 size={14} class="animate-spin" />
                      {:else}
                        <Search size={14} />
                      {/if}
                    </Button>
                    {#if evidence.url || evidence.file}
                      <Button
                        class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                        on:click={() => handleDownloadEvidence(evidence)}
                        title="Download"
                      >
                        <Download size={14} />
                      </Button>
                    {/if}
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-green-600"
                      on:click={() => handleEditEvidence(evidence)}
                      title="Edit evidence"
                    >
                      <PenLine size={14} />
                    </Button>
                    <Button
                      class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-red-600"
                      on:click={() => handleDeleteEvidence(evidence)}
                      title="Delete evidence"
                    >
                      <Trash2 size={14} />
                    </Button>
                  {/snippet}
                </EvidenceCard>
              {/each}
            </div>
          {/if}
          {#if evidenceSearchResults.length === 0}
            <div>
              <p>No evidence found</p>
              <small>Add evidence to enhance your report</small>
            </div>
          {/if}
        </section>

        <!-- Legal Analysis Results Panel -->
        {#if Object.keys(comparisonResults).length > 0}
          <section class="sidebar-section">
            <div class="section-header">
              <h3 class="text-sm font-semibold text-gray-700">Legal Analysis</h3>
            </div>
            {#each Object.entries(comparisonResults) as [evidenceId, result]}
              <div class="p-3 bg-white border border-gray-200 rounded-lg mb-2">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-xs font-semibold text-gray-900">
                    {evidenceSearchResults.find(e => e.id === evidenceId)?.title || 'Analysis Result'}
                  </h4>
                  {#if result.fromCache}
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <span class="text-[10px]">⚡</span>
                      Cached
                    </span>
                  {/if}
                </div>

                {#if result.analysis}
                  <!-- WHO Section -->
                  {#if result.analysis.who?.personsOfInterest?.length > 0}
                    <div class="mb-2">
                      <span class="text-xs font-medium text-blue-700">WHO:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        {#each result.analysis.who.personsOfInterest.slice(0, 3) as person}
                          <span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {person.name}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- WHAT Section -->
                  {#if result.analysis.what?.legalIssues?.length > 0}
                    <div class="mb-2">
                      <span class="text-xs font-medium text-green-700">WHAT:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        {#each result.analysis.what.legalIssues.slice(0, 2) as issue}
                          <span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {issue}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Similar Cases -->
                  {#if result.comparison?.similarCases?.length > 0}
                    <div class="mb-2">
                      <span class="text-xs font-medium text-purple-700">Similar Cases:</span>
                      <div class="space-y-1 mt-1">
                        {#each result.comparison.similarCases.slice(0, 2) as similarCase}
                          <div class="text-xs text-gray-600 truncate">
                            • {similarCase.title} ({(similarCase.score * 100).toFixed(0)}%)
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/if}

                <div class="text-xs text-gray-400 mt-2">
                  Processed in {(result.processingTime / 1000).toFixed(1)}s
                </div>
              </div>
            {/each}
          </section>
        {/if}

        {#if compareError}
          <section class="sidebar-section">
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-xs text-red-700">{compareError}</p>
            </div>
          </section>
        {/if}

        <section class="stats-section sidebar-section">
          <div class="stats-grid">
            <section class="space-y-4">
              <div>
                <div>
                  <span>Words</span>
                  <span>{($editorState as EditorState).wordCount}</span> <!-- Add type assertion -->
                </div>
                <div>
                  <span>Evidence</span>
                  <span>{($report as unknown as ReportStoreState).attachedEvidence.length}</span> <!-- Add type assertion -->
                </div>
                <div>
                  <span>Status</span>
                  <span>
                    {($report as unknown as ReportStoreState).metadata.status} <!-- Add type assertion -->
                  </span>
                </div>
                <div>
                  <span>Modified</span>
                  <span>
                    {($report as unknown as ReportStoreState).metadata.updatedAt.toLocaleDateString()} <!-- Add type assertion -->
                  </span>
                </div>
                {#if cacheStats.totalEntries > 0}
                  <div class="border-t border-gray-200 pt-2 mt-2">
                    <div class="text-xs text-gray-500 font-semibold mb-1">Analysis Cache</div>
                    <div>
                      <span>Cached</span>
                      <span class="text-green-600">{cacheStats.totalEntries}</span>
                    </div>
                    <div>
                      <span>Size</span>
                      <span class="text-xs">{(cacheStats.totalSize / 1024).toFixed(1)}KB</span>
                    </div>
                  </div>
                {/if}
              </div>
            </section>
          </div>
        </section>
      </aside> <!-- FIXED: Added missing closing tag for the sidebar -->
    {/if}
    <!-- Main Editor Area -->
    <main class="editor-main">
      <!-- Editor Header -->
      <div class="editor-header">
        <div class="editor-title-section">
          {#if !($reportUI as ReportUIState).sidebarOpen} <!-- Add type assertion -->
            <Button <!-- Changed Button.Root to Button -->
              on:click={() => toggleSidebar()}
              title="Show sidebar"
              class="sidebar-toggle"
            >
              <PanelLeftOpen size={20} />
            </Button>
          {/if}
          <input
            type="text"
            value={($report as unknown as ReportStoreState).title} oninput={(e) => reportActions.updateTitle((e.currentTarget as HTMLInputElement).value)}
            placeholder="Report title..."
            class="report-title-input"
          />
        </div>
        <div class="editor-actions">
          <Button <!-- Changed Button.Root to Button -->
            on:click={() => switchLayout()}
            title="Switch layout ({($report as unknown as ReportStoreState).settings.layout})" <!-- Add type assertion -->
            class="layout-toggle"
          >
            {#if ($report as unknown as ReportStoreState).settings.layout === "single"} <!-- Add type assertion -->
              <Layout size={18} />
            {:else if ($report as unknown as ReportStoreState).settings.layout === "dual"} <!-- Add type assertion -->
              <Columns size={18} />
            {:else}
              <Grid size={18} />
            {/if}
          </Button>
          <Button <!-- Changed Button.Root to Button -->
            on:click={() => toggleFullscreen()}
            title="Toggle fullscreen"
            class="fullscreen-toggle"
          >
            {#if ($reportUI as ReportUIState).fullscreen} <!-- Add type assertion -->
              <Minimize2 size={18} />
            {:else}
              <Maximize2 size={18} />
            {/if}
          </Button>
          <Button <!-- Changed Button.Root to Button -->
            on:click={() => (showSettingsModal = true)}
            title="Settings"
            class="settings-btn"
          >
            <Settings size={18} />
          </Button>
        </div>
      </div>
      <RichTextEditor
        bind:this={editorComponent}
        height={editorHeight}
      />
    </main>
    <!-- Evidence Panel (for dual layout) -->
    {#if ($report as unknown as ReportStoreState).settings.layout === "dual"} <!-- Add type assertion -->
      <!-- transition removed -->
      <aside
        class="evidence-panel"
      >
        <div class="panel-header">
          <h3>Evidence</h3>
          <Button class="add-evidence-btn" on:click={() => handleAddNewEvidence()}> <!-- Changed Button.Root to Button -->
            <Plus size={16} />
          </Button>
        </div>
        <div class="evidence-grid-panel">
          <MasonryGridComponent // Use the new alias
            items={($report as unknown as ReportStoreState).attachedEvidence} <!-- Add type assertion -->
            columnWidth={200}
            gutter={8}
            let:item
          >
            <EvidenceCard
              evidence={item}
              compact={true}
            >
              {#snippet actions(evidence: Evidence)} <!-- Type evidence -->
                <Button <!-- Changed Button.Root to Button -->
                  class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                  on:click={() => handleViewEvidence(evidence)}
                  title="View evidence"
                >
                  <Eye size={14} />
                </Button>
                {#if evidence.url || evidence.file}
                  <Button <!-- Changed Button.Root to Button -->
                    class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                    on:click={() => handleDownloadEvidence(evidence)}
                    title="Download"
                  >
                    <Download size={14} />
                  </Button>
                {/if}
                <Button <!-- Changed Button.Root to Button -->
                  class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-green-600"
                  on:click={() => handleEditEvidence(evidence)}
                  title="Edit evidence"
                >
                  <PenLine size={14} />
                </Button>
                <Button <!-- Changed Button.Root to Button -->
                  class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-red-600"
                  on:click={() => handleDeleteEvidence(evidence)}
                  title="Delete evidence"
                >
                  <Trash2 size={14} />
                </Button>
              {/snippet}
            </EvidenceCard>
          </MasonryGridComponent>
        </div>
      </aside>
    {/if}
  </div>
</div>

<!-- Modals -->
<Modal bind:open={showEvidenceModal}>
  {#if showEvidenceModal}
    <EvidenceForm
      data={evidenceFormData}
      evidence={selectedEvidence}
      success={() => {
        showEvidenceModal = false;
        selectedEvidence = null;
      }}
      error={(e: CustomEvent) => { // Type e parameter
        console.error("Evidence form error:", e.detail);
        alert("Error saving evidence");
      }}
      cancel={() => {
        showEvidenceModal = false;
        selectedEvidence = null;
      }}
    />
  {/if}
</Modal>
<!-- Settings Modal -->
<Modal bind:open={showSettingsModal}>
  <div slot="title">Report Settings</div>
  <!-- Settings form would go here -->
  <div class="settings-form">
    <!-- TODO: Implement settings form for report options such as auto-save, layout selection, evidence preferences, and other report configurations -->
    <p>Settings panel - TODO: Implement settings form</p>
  </div>
</Modal>
<style>
  .report-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #ffffff;
    transition: all 0.3s ease;
  }

  .editor-toolbar {
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .editor-title-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: none;
    color: #6b7280;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sidebar-toggle:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }

  .report-title-input {
    flex: 1;
    max-width: 30rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid transparent;
    background: none;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    border-radius: 0.375rem;
    transition: border-color 0.15s ease;
  }

  .report-title-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: #ffffff;
  }

  .editor-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .layout-toggle,
  .fullscreen-toggle,
  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    background: none;
    color: #6b7280;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .layout-toggle:hover,
  .fullscreen-toggle:hover,
  .settings-btn:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }

  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    padding: 1rem;
  }

  .evidence-panel {
    width: 20rem;
    background: #f8fafc;
    border-left: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .evidence-grid-panel {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  /* Layout variations */
  .layout-single .evidence-panel {
    display: none;
  }

  .layout-dual .editor-sidebar {
    width: 16rem !important;
  }

  .layout-masonry .evidence-section {
    padding: 0.5rem;
  }

  /* Modal content */
  .settings-form {
    padding: 1rem;
    text-align: center;
    color: #6b7280;
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .editor-sidebar {
      width: 16rem !important;
    }
    .evidence-panel {
      width: 16rem;
    }
  }

  @media (max-width: 768px) {
    .layout-dual .evidence-panel {
      display: none;
    }
    .editor-sidebar {
      width: 14rem !important;
    }
  }
</style>