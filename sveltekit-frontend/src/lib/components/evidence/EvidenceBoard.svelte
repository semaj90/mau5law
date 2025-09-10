<!--
  Evidence Board with Detective Mode
  
  Advanced evidence management system featuring:
  - Interactive evidence visualization
  - Detective mode with pattern analysis
  - Cross-reference mapping
  - Timeline correlation
  - AI-powered insights
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { caseManagementService } from '$lib/services/case-management-service.js';
  import { apiFetch } from '$lib/api/clients/api-client.js';
  import { 
    Eye, EyeOff, Search, Filter, Plus, Link, Clock, 
    AlertTriangle, CheckCircle, FileText, Image, 
    Video, Music, Archive, Settings, Zap, Target,
    Network, Brain, Lightbulb, BookOpen
  } from 'lucide-svelte';
  
  // Props - Svelte 5
  interface Props {
    caseId: string;
    detectiveMode?: boolean;
    readOnly?: boolean;
  }
  
  let {
    caseId,
    detectiveMode = false,
    readOnly = false
  }: Props = $props();

  // State management
  let evidenceItems = writable<any[]>([]);
  let selectedEvidence = writable<string[]>([]);
  let detectiveInsights = writable<any>({});
  let connectionMap = writable<any[]>([]);
  let analysisResults = writable<any>({});
  
  // UI state
  let searchQuery = '';
  let filterType = 'all';
  let viewMode: 'grid' | 'timeline' | 'network' = 'grid';
  let showFilters = false;
  let showInsights = false;
  let loadingAnalysis = false;
  let draggedEvidence: string | null = null;

  // Evidence filters
  const evidenceTypes = [
    { value: 'all', label: 'All Evidence', icon: Archive },
    { value: 'document', label: 'Documents', icon: FileText },
    { value: 'photo', label: 'Photos', icon: Image },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'audio', label: 'Audio', icon: Music },
    { value: 'digital', label: 'Digital', icon: Archive },
  ];

  // Detective mode configuration
  let detectiveConfig = {
    enableSuspiciousPatternDetection: true,
    enableCrossReferenceAnalysis: true,
    enableEntityMapping: true,
    enableTimelineAnalysis: true,
    confidenceThreshold: 7,
  };

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let networkLayout: any = {};

  onMount(async () => {
    await loadEvidence();
    if (detectiveMode) {
      await loadDetectiveInsights();
    }
    initializeCanvas();
  });

  onDestroy(() => {
    // Cleanup canvas and event listeners
  });

  // Load evidence for the case
  async function loadEvidence() {
    try {
      const caseData = await caseManagementService.getCaseById(caseId, {
        includeEvidence: true,
        includeTimeline: true,
      });
      
      if (caseData?.evidence) {
        evidenceItems.set(caseData.evidence);
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  }

  // Load detective insights if in detective mode
  async function loadDetectiveInsights() {
    try {
      loadingAnalysis = true;
      const insights = await caseManagementService.generateDetectiveInsights(caseId);
      detectiveInsights.set(insights);
      
      // Build connection map for network view
      buildConnectionMap(insights);
    } catch (error) {
      console.error('Failed to load detective insights:', error);
    } finally {
      loadingAnalysis = false;
    }
  }

  // Build connection map for network visualization
  function buildConnectionMap(insights: any) {
    const connections: any[] = [];
    
    // Process entity connections
    insights.entityConnections?.forEach((connection: any) => {
      connections.push({
        type: 'entity',
        source: connection.source,
        target: connection.target,
        strength: connection.confidence,
        label: connection.relationship,
      });
    });

    // Process cross-references
    insights.crossReferences?.forEach((ref: any) => {
      connections.push({
        type: 'reference',
        source: ref.sourceEvidence,
        target: ref.targetEvidence,
        strength: ref.relevance,
        label: ref.type,
      });
    });

    connectionMap.set(connections);
  }

  // Initialize canvas for network view
  function initializeCanvas() {
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  // Filter evidence based on search and type
  $: filteredEvidence = $evidenceItems.filter(evidence => {
    const matchesSearch = !searchQuery || 
      evidence.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evidence.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evidence.evidenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || evidence.evidenceType === filterType;
    
    return matchesSearch && matchesType;
  });

  // Toggle detective mode
  async function toggleDetectiveMode() {
    detectiveMode = !detectiveMode;
    
    if (detectiveMode) {
      await caseManagementService.enableDetectiveMode(caseId, detectiveConfig);
      await loadDetectiveInsights();
    }
  }

  // Analyze selected evidence
  async function analyzeSelectedEvidence() {
    if ($selectedEvidence.length === 0) return;
    
    loadingAnalysis = true;
    
    try {
      for (const evidenceId of $selectedEvidence) {
        await caseManagementService.analyzeEvidence({
          evidenceId,
          analysisTypes: ['ocr', 'entity_extraction', 'pattern_detection', 'forensic'],
          detectiveMode: detectiveMode,
        });
      }
      
      // Reload evidence and insights
      await loadEvidence();
      if (detectiveMode) {
        await loadDetectiveInsights();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      loadingAnalysis = false;
    }
  }

  // Handle evidence selection
  function toggleEvidenceSelection(evidenceId: string) {
    selectedEvidence.update(selected => {
      if (selected.includes(evidenceId)) {
        return selected.filter(id => id !== evidenceId);
      } else {
        return [...selected, evidenceId];
      }
    });
  }

  // Handle drag and drop for evidence connections
  function handleDragStart(event: DragEvent, evidenceId: string) {
    if (!event.dataTransfer) return;
    
    draggedEvidence = evidenceId;
    event.dataTransfer.setData('text/plain', evidenceId);
    event.dataTransfer.effectAllowed = 'link';
  }

  function handleDrop(event: DragEvent, targetEvidenceId: string) {
    event.preventDefault();
    
    if (draggedEvidence && draggedEvidence !== targetEvidenceId) {
      createEvidenceConnection(draggedEvidence, targetEvidenceId);
    }
    
    draggedEvidence = null;
  }

  // Create connection between evidence items
  async function createEvidenceConnection(sourceId: string, targetId: string) {
    try {
      // This would update the database to create a connection
      console.log(`Creating connection: ${sourceId} -> ${targetId}`);
      
      // Update UI to show new connection
      connectionMap.update(connections => [
        ...connections,
        {
          type: 'manual',
          source: sourceId,
          target: targetId,
          strength: 1.0,
          label: 'User Created',
        }
      ]);
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  }

  // Get evidence type icon
  function getEvidenceIcon(type: string) {
    switch (type) {
      case 'document': return FileText;
      case 'photo': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'digital': return Archive;
      default: return FileText;
    }
  }

  // Get analysis status color
  function getAnalysisStatusColor(evidence: any) {
    if (evidence.analyzed) return 'text-green-600';
    if (loadingAnalysis && $selectedEvidence.includes(evidence.id)) return 'text-yellow-600';
    return 'text-gray-400';
  }

  // Render network view
  function renderNetworkView() {
    if (!ctx || !canvas) return;
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw connections
    $connectionMap.forEach(connection => {
      drawConnection(connection);
    });
    
    // Draw evidence nodes
    filteredEvidence.forEach((evidence, index) => {
      drawEvidenceNode(evidence, index);
    });
  }

  function drawConnection(connection: any) {
    if (!ctx) return;
    
    // Simplified connection drawing
    ctx.beginPath();
    ctx.strokeStyle = connection.type === 'entity' ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = connection.strength * 3;
    ctx.setLineDash(connection.type === 'manual' ? [5, 5] : []);
    
    // Draw line between nodes (simplified positioning)
    ctx.moveTo(100, 100);
    ctx.lineTo(300, 200);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }

  function drawEvidenceNode(evidence: any, index: number) {
    if (!ctx) return;
    
    const x = 50 + (index % 8) * 100;
    const y = 50 + Math.floor(index / 8) * 100;
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fillStyle = evidence.analyzed ? '#10b981' : '#6b7280';
    ctx.fill();
    
    // Draw evidence type indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(evidence.evidenceType.charAt(0).toUpperCase(), x, y + 4);
  }

  // Reactive updates for network view
  $: if (viewMode === 'network' && canvas) {
    setTimeout(() => renderNetworkView(), 100);
  }
</script>

<!-- Evidence Board UI -->
<div class="evidence-board" class:detective-mode={detectiveMode}>
  <!-- Header Controls -->
  <div class="board-header">
    <div class="header-left">
      <h2 class="board-title">
        Evidence Board
        {#if detectiveMode}
          <span class="detective-badge">🕵️ DETECTIVE MODE</span>
        {/if}
      </h2>
      
      <div class="evidence-stats">
        <span class="stat">
          {$evidenceItems.length} Evidence Items
        </span>
        <span class="stat">
          {$evidenceItems.filter(e => e.analyzed).length} Analyzed
        </span>
        {#if detectiveMode}
          <span class="stat suspicious">
            {$detectiveInsights.suspiciousPatterns?.length || 0} Patterns
          </span>
        {/if}
      </div>
    </div>

    <div class="header-controls">
      <!-- View Mode Toggle -->
      <div class="view-toggle">
        <button 
          class="view-btn"
          class:active={viewMode === 'grid'}
          onclick={() => viewMode = 'grid'}
          title="Grid View"
        >
          <Archive class="w-4 h-4" />
        </button>
        <button 
          class="view-btn"
          class:active={viewMode === 'timeline'}
          onclick={() => viewMode = 'timeline'}
          title="Timeline View"
        >
          <Clock class="w-4 h-4" />
        </button>
        <button 
          class="view-btn"
          class:active={viewMode === 'network'}
          onclick={() => viewMode = 'network'}
          title="Network View"
        >
          <Network class="w-4 h-4" />
        </button>
      </div>

      <!-- Detective Mode Toggle -->
      <button 
        class="detective-toggle"
        class:active={detectiveMode}
        onclick={toggleDetectiveMode}
        title="Toggle Detective Mode"
      >
        {#if detectiveMode}
          <Eye class="w-4 h-4" />
          Detective ON
        {:else}
          <EyeOff class="w-4 h-4" />
          Detective OFF
        {/if}
      </button>

      <!-- Analysis Controls -->
      {#if $selectedEvidence.length > 0}
        <button 
          class="analyze-btn"
          onclick={analyzeSelectedEvidence}
          disabled={loadingAnalysis}
          title="Analyze Selected Evidence"
        >
          {#if loadingAnalysis}
            <div class="spinner"></div>
            Analyzing...
          {:else}
            <Brain class="w-4 h-4" />
            Analyze ({$selectedEvidence.length})
          {/if}
        </button>
      {/if}

      <!-- Filters Toggle -->
      <button 
        class="filter-toggle"
        class:active={showFilters}
        onclick={() => showFilters = !showFilters}
        title="Toggle Filters"
      >
        <Filter class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- Filters Panel -->
  {#if showFilters}
    <div class="filters-panel">
      <div class="filter-group">
        <label for="search">Search Evidence:</label>
        <input 
          id="search"
          type="text" 
          bind:value={searchQuery}
          placeholder="Search by title, description, or number..."
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <label for="type-filter">Evidence Type:</label>
        <select id="type-filter" bind:value={filterType} class="type-select">
          {#each evidenceTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>

      {#if detectiveMode}
        <div class="filter-group">
          <label>Detective Analysis:</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={detectiveConfig.enableSuspiciousPatternDetection}
              />
              Pattern Detection
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={detectiveConfig.enableCrossReferenceAnalysis}
              />
              Cross References
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={detectiveConfig.enableEntityMapping}
              />
              Entity Mapping
            </label>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Detective Insights Panel -->
  {#if detectiveMode && $detectiveInsights.suspiciousPatterns?.length > 0}
    <div class="insights-panel">
      <div class="insights-header">
        <h3>🕵️ Detective Insights</h3>
        <button 
          class="insights-toggle"
          onclick={() => showInsights = !showInsights}
        >
          {showInsights ? 'Hide' : 'Show'} Insights
        </button>
      </div>

      {#if showInsights}
        <div class="insights-content">
          {#each $detectiveInsights.suspiciousPatterns as pattern}
            <div class="insight-item" class:high-confidence={pattern.confidence > 0.8}>
              <div class="insight-header">
                <AlertTriangle class="w-4 h-4 text-yellow-500" />
                <span class="insight-type">{pattern.pattern}</span>
                <span class="confidence">({Math.round(pattern.confidence * 100)}%)</span>
              </div>
              <p class="insight-description">{pattern.description}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Evidence Display -->
  <div class="evidence-display">
    {#if viewMode === 'grid'}
      <!-- Grid View -->
      <div class="evidence-grid">
        {#each filteredEvidence as evidence (evidence.id)}
          <div 
            class="evidence-card"
            class:selected={$selectedEvidence.includes(evidence.id)}
            class:analyzed={evidence.analyzed}
            class:suspicious={evidence.suspiciousIndicators?.length > 0}
            draggable={detectiveMode}
            on:dragstart={e => handleDragStart(e, evidence.id)}
            on:dragover={e => e.preventDefault()}
            on:drop={e => handleDrop(e, evidence.id)}
            onclick={() => toggleEvidenceSelection(evidence.id)}
          >
            <!-- Evidence Header -->
            <div class="card-header">
              <div class="evidence-icon">
                <svelte:component this={getEvidenceIcon(evidence.evidenceType)} class="w-5 h-5" />
              </div>
              <div class="evidence-info">
                <h4 class="evidence-title">{evidence.title}</h4>
                <span class="evidence-number">{evidence.evidenceNumber}</span>
              </div>
              <div class="analysis-status">
                <div class={`status-indicator ${getAnalysisStatusColor(evidence)}`}>
                  {#if evidence.analyzed}
                    <CheckCircle class="w-4 h-4" />
                  {:else}
                    <Clock class="w-4 h-4" />
                  {/if}
                </div>
              </div>
            </div>

            <!-- Evidence Preview -->
            <div class="card-content">
              {#if evidence.description}
                <p class="evidence-description">{evidence.description}</p>
              {/if}
              
              {#if evidence.evidenceType === 'photo' && evidence.filePath}
                <div class="evidence-preview">
                  <img src={evidence.filePath} alt={evidence.title} class="preview-image" />
                </div>
              {/if}

              {#if evidence.ocrText}
                <div class="ocr-text">
                  <strong>Extracted Text:</strong>
                  <p>{evidence.ocrText.substring(0, 150)}...</p>
                </div>
              {/if}
            </div>

            <!-- Detective Mode Indicators -->
            {#if detectiveMode}
              <div class="detective-indicators">
                {#if evidence.suspiciousIndicators?.length > 0}
                  <div class="suspicious-badge">
                    <AlertTriangle class="w-3 h-3" />
                    {evidence.suspiciousIndicators.length} Flags
                  </div>
                {/if}

                {#if evidence.crossReferences?.length > 0}
                  <div class="references-badge">
                    <Link class="w-3 h-3" />
                    {evidence.crossReferences.length} Links
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Card Footer -->
            <div class="card-footer">
              <span class="date-created">
                Added: {new Date(evidence.dateCreated).toLocaleDateString()}
              </span>
              {#if evidence.analyzed}
                <span class="date-analyzed">
                  Analyzed: {new Date(evidence.dateAnalyzed).toLocaleDateString()}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    
    {:else if viewMode === 'timeline'}
      <!-- Timeline View -->
      <div class="evidence-timeline">
        {#each filteredEvidence.sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()) as evidence, index (evidence.id)}
          <div class="timeline-item">
            <div class="timeline-marker">
              <svelte:component this={getEvidenceIcon(evidence.evidenceType)} class="w-4 h-4" />
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <h4 class="timeline-title">{evidence.title}</h4>
                <span class="timeline-date">
                  {new Date(evidence.dateCreated).toLocaleString()}
                </span>
              </div>
              <p class="timeline-description">{evidence.description || 'No description'}</p>
            </div>
          </div>
        {/each}
      </div>
    
    {:else if viewMode === 'network'}
      <!-- Network View -->
      <div class="network-view">
        <canvas 
          bind:this={canvas}
          class="network-canvas"
          width="800" 
          height="600"
        ></canvas>
        
        <div class="network-legend">
          <div class="legend-item">
            <div class="legend-color entity"></div>
            <span>Entity Connections</span>
          </div>
          <div class="legend-item">
            <div class="legend-color reference"></div>
            <span>Cross References</span>
          </div>
          <div class="legend-item">
            <div class="legend-color manual"></div>
            <span>Manual Links</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .evidence-board {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
  }

  .detective-mode {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    color: #e2e8f0;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .detective-mode .board-header {
    background: rgba(30, 27, 75, 0.9);
    border-bottom-color: #4c1d95;
  }

  .board-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .detective-badge {
    background: linear-gradient(45deg, #dc2626, #ef4444);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .evidence-stats {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .stat {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .detective-mode .stat {
    color: #cbd5e1;
  }

  .stat.suspicious {
    color: #f59e0b;
    font-weight: 600;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.25rem;
  }

  .view-btn {
    padding: 0.5rem;
    border: none;
    background: none;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #64748b;
    transition: all 0.2s;
  }

  .view-btn:hover,
  .view-btn.active {
    background: white;
    color: #3b82f6;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .detective-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .detective-toggle:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .detective-toggle.active {
    background: linear-gradient(45deg, #dc2626, #ef4444);
    border-color: #dc2626;
    color: white;
  }

  .analyze-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .analyze-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .analyze-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .filter-toggle {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 0.5rem;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s;
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .filters-panel {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    align-items: end;
  }

  .detective-mode .filters-panel {
    background: rgba(30, 27, 75, 0.7);
    border-bottom-color: #4c1d95;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .detective-mode .filter-group label {
    color: #e2e8f0;
  }

  .search-input,
  .type-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    min-width: 200px;
  }

  .checkbox-group {
    display: flex;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .insights-panel {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    margin: 1rem 1.5rem;
    overflow: hidden;
  }

  .insights-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.2);
    font-weight: 600;
  }

  .insights-content {
    padding: 1rem;
  }

  .insight-item {
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid #f59e0b;
  }

  .insight-item.high-confidence {
    border-left-color: #dc2626;
  }

  .insight-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .confidence {
    color: #64748b;
    font-size: 0.875rem;
  }

  .evidence-display {
    flex: 1;
    padding: 1.5rem;
    overflow: auto;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .evidence-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .evidence-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .evidence-card.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .evidence-card.analyzed {
    border-left: 4px solid #10b981;
  }

  .evidence-card.suspicious {
    border-left: 4px solid #f59e0b;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .evidence-icon {
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 0.5rem;
    color: #6b7280;
  }

  .evidence-info {
    flex: 1;
    min-width: 0;
  }

  .evidence-title {
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .evidence-number {
    font-size: 0.875rem;
    color: #64748b;
  }

  .card-content {
    margin-bottom: 1rem;
  }

  .evidence-description {
    color: #4b5563;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 0.75rem 0;
  }

  .preview-image {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 0.375rem;
    margin-bottom: 0.75rem;
  }

  .ocr-text {
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .detective-indicators {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .suspicious-badge,
  .references-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .suspicious-badge {
    background: #fef3c7;
    color: #92400e;
  }

  .references-badge {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #64748b;
  }

  .evidence-timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
    padding-left: 2rem;
  }

  .evidence-timeline::before {
    content: '';
    position: absolute;
    left: 0.875rem;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e2e8f0;
  }

  .timeline-item {
    position: relative;
    background: white;
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .timeline-marker {
    position: absolute;
    left: -2.125rem;
    top: 1rem;
    width: 1.75rem;
    height: 1.75rem;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }

  .network-view {
    position: relative;
    height: 600px;
  }

  .network-canvas {
    width: 100%;
    height: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: white;
  }

  .network-legend {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .legend-color {
    width: 1rem;
    height: 0.25rem;
    border-radius: 0.125rem;
  }

  .legend-color.entity {
    background: #3b82f6;
  }

  .legend-color.reference {
    background: #ef4444;
  }

  .legend-color.manual {
    background: #6b7280;
    background-image: linear-gradient(45deg, transparent 40%, white 40%, white 60%, transparent 60%);
    background-size: 0.25rem 0.25rem;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .board-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .header-controls {
      justify-content: space-between;
    }

    .filters-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .evidence-grid {
      grid-template-columns: 1fr;
    }

    .checkbox-group {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
