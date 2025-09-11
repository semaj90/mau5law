<!--
  Case-Level Evidence Organizer Component
  
  Comprehensive evidence organization system for legal cases with:
  - Hierarchical evidence categorization
  - Timeline-based organization  
  - AI-powered clustering with Gemma embeddings
  - Real-time collaborative sorting via WebSocket
  - Chain of custody tracking
  - Evidence relationship mapping
-->

<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { page } from '$app/stores';
  import DetectiveWebSocketManager from '$lib/websocket/DetectiveWebSocketManager.js';
  
  // Props
  interface Props {
    caseId: string;
    initialEvidence?: any[];
    organizationMode?: 'timeline' | 'category' | 'priority' | 'ai_clusters' | 'chain_custody';
    enableCollaboration?: boolean;
    showMetrics?: boolean;
  }
  
  let {
    caseId,
    initialEvidence = [],
    organizationMode = 'category',
    enableCollaboration = true,
    showMetrics = true
  }: Props = $props();
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    evidenceReorganized: { evidence: any[]; organization: any };
    evidenceSelected: { evidence: any; context: string };
    organizationChanged: { mode: string; structure: any };
  }>();
  
  // State
  let evidenceList = $state(initialEvidence);
  let isLoading = $state(false);
  let organizationStructure = $state<any>({});
  let selectedEvidence = $state<any[]>([]);
  let searchQuery = $state('');
  let filterCriteria = $state({
    evidenceType: 'all',
    dateRange: 'all',
    priority: 'all',
    status: 'all'
  });
  
  // AI-powered organization state
  let aiClusters = $state<any[]>([]);
  let isGeneratingClusters = $state(false);
  let clusteringProgress = $state(0);
  
  // Collaboration state
  let wsManager: DetectiveWebSocketManager | null = null;
  let collaborativeUsers = $state<any[]>([]);
  let isConnectedToCollaboration = $state(false);
  
  // Organization metrics
  let organizationMetrics = $state({
    totalEvidence: 0,
    categorized: 0,
    uncategorized: 0,
    duplicates: 0,
    missingMetadata: 0,
    chainOfCustodyComplete: 0,
    aiAnalyzed: 0
  });
  
  // Reactive derived values
  const filteredEvidence = $derived(() => {
    return evidenceList.filter(evidence => {
      // Text search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = evidence.title?.toLowerCase().includes(searchLower) ||
                             evidence.description?.toLowerCase().includes(searchLower) ||
                             evidence.evidenceType?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filter by type
      if (filterCriteria.evidenceType !== 'all' && evidence.evidenceType !== filterCriteria.evidenceType) {
        return false;
      }
      
      // Filter by priority
      if (filterCriteria.priority !== 'all') {
        const priority = evidence.metadata?.priority || 'medium';
        if (priority !== filterCriteria.priority) return false;
      }
      
      // Filter by status
      if (filterCriteria.status !== 'all') {
        const status = evidence.metadata?.status || 'pending';
        if (status !== filterCriteria.status) return false;
      }
      
      return true;
    });
  });
  
  const organizationModes = [
    { value: 'category', label: 'By Category', icon: '🗂️' },
    { value: 'timeline', label: 'Timeline', icon: '📅' },
    { value: 'priority', label: 'By Priority', icon: '⭐' },
    { value: 'ai_clusters', label: 'AI Clusters', icon: '🧠' },
    { value: 'chain_custody', label: 'Chain of Custody', icon: '🔗' }
  ];
  
  /**
   * Initialize component
   */
  onMount(async () => {
    await loadCaseEvidence();
    updateOrganizationMetrics();
    
    if (enableCollaboration) {
      await initializeCollaboration();
    }
    
    // Generate initial organization
    await reorganizeEvidence();
  });
  
  /**
   * Cleanup
   */
  onDestroy(() => {
    if (wsManager) {
      wsManager.disconnect();
    }
  });
  
  /**
   * Load evidence for the case
   */
  async function loadCaseEvidence() {
    if (!caseId) return;
    
    isLoading = true;
    try {
      const response = await fetch(`/api/v1/evidence/by-case/${caseId}?includeAnalysis=true&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        evidenceList = data.data.evidence || [];
      }
    } catch (error) {
      console.error('Failed to load case evidence:', error);
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * Initialize WebSocket collaboration
   */
  async function initializeCollaboration() {
    try {
      const userId = `organizer_${Math.random().toString(36).substr(2, 6)}`;
      wsManager = new DetectiveWebSocketManager(caseId, userId);
      
      wsManager.onConnectionStatus((connected) => {
        isConnectedToCollaboration = connected;
      });
      
      wsManager.onUserJoined((user) => {
        collaborativeUsers = [...collaborativeUsers, user];
      });
      
      wsManager.onUserLeft((userId) => {
        collaborativeUsers = collaborativeUsers.filter(u => u.id !== userId);
      });
      
      // Handle real-time organization updates
      wsManager.onMessage('evidence_organization', (data) => {
        if (data.action === 'reorganized') {
          organizationStructure = data.structure;
          organizationMode = data.mode;
        }
      });
      
      wsManager.connect();
    } catch (error) {
      console.warn('Collaboration initialization failed:', error);
    }
  }
  
  /**
   * Reorganize evidence based on current mode
   */
  async function reorganizeEvidence() {
    isLoading = true;
    
    try {
      switch (organizationMode) {
        case 'category':
          await organizeByCategory();
          break;
        case 'timeline':
          await organizeByTimeline();
          break;
        case 'priority':
          await organizeByPriority();
          break;
        case 'ai_clusters':
          await organizeByAIClusters();
          break;
        case 'chain_custody':
          await organizeByChainOfCustody();
          break;
      }
      
      updateOrganizationMetrics();
      
      // Send to collaborators
      if (wsManager) {
        wsManager.send({
          type: 'evidence_organization',
          caseId,
          userId: wsManager.userId,
          sessionId: wsManager.sessionId,
          timestamp: new Date().toISOString(),
          data: {
            action: 'reorganized',
            mode: organizationMode,
            structure: organizationStructure
          }
        });
      }
      
      dispatch('organizationChanged', {
        mode: organizationMode,
        structure: organizationStructure
      });
      
    } catch (error) {
      console.error('Failed to reorganize evidence:', error);
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * Organize evidence by category
   */
  async function organizeByCategory() {
    const categories = {};
    
    filteredEvidence.forEach(evidence => {
      const category = evidence.evidenceType || 'uncategorized';
      if (!categories[category]) {
        categories[category] = {
          name: category,
          evidence: [],
          count: 0,
          priority: calculateCategoryPriority(category)
        };
      }
      categories[category].evidence.push(evidence);
      categories[category].count++;
    });
    
    organizationStructure = {
      type: 'category',
      categories: Object.values(categories).sort((a, b) => b.priority - a.priority)
    };
  }
  
  /**
   * Organize evidence by timeline
   */
  async function organizeByTimeline() {
    const timeline = filteredEvidence
      .filter(evidence => evidence.collected_at || evidence.uploaded_at)
      .sort((a, b) => {
        const dateA = new Date(a.collected_at || a.uploaded_at);
        const dateB = new Date(b.collected_at || b.uploaded_at);
        return dateB.getTime() - dateA.getTime();
      });
    
    // Group by time periods
    const periods = {};
    timeline.forEach(evidence => {
      const date = new Date(evidence.collected_at || evidence.uploaded_at);
      const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const periodLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!periods[periodKey]) {
        periods[periodKey] = {
          key: periodKey,
          label: periodLabel,
          evidence: [],
          count: 0,
          startDate: date,
          endDate: date
        };
      }
      
      periods[periodKey].evidence.push(evidence);
      periods[periodKey].count++;
      
      if (date < periods[periodKey].startDate) periods[periodKey].startDate = date;
      if (date > periods[periodKey].endDate) periods[periodKey].endDate = date;
    });
    
    organizationStructure = {
      type: 'timeline',
      periods: Object.values(periods).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
      uncategorized: filteredEvidence.filter(e => !e.collected_at && !e.uploaded_at)
    };
  }
  
  /**
   * Organize evidence by priority
   */
  async function organizeByPriority() {
    const priorities = {
      critical: { name: 'Critical', evidence: [], color: '#dc2626' },
      high: { name: 'High', evidence: [], color: '#ea580c' },
      medium: { name: 'Medium', evidence: [], color: '#d97706' },
      low: { name: 'Low', evidence: [], color: '#65a30d' },
      unknown: { name: 'Unknown', evidence: [], color: '#6b7280' }
    };
    
    filteredEvidence.forEach(evidence => {
      const priority = evidence.metadata?.priority || 
                      calculateEvidencePriority(evidence) || 
                      'unknown';
      
      if (priorities[priority]) {
        priorities[priority].evidence.push(evidence);
      } else {
        priorities.unknown.evidence.push(evidence);
      }
    });
    
    // Add counts
    Object.values(priorities).forEach(priority => {
      priority.count = priority.evidence.length;
    });
    
    organizationStructure = {
      type: 'priority',
      priorities: Object.values(priorities).filter(p => p.count > 0)
    };
  }
  
  /**
   * Organize evidence using AI clustering with Gemma embeddings
   */
  async function organizeByAIClusters() {
    isGeneratingClusters = true;
    clusteringProgress = 0;
    
    try {
      // Step 1: Get embeddings for all evidence (20%)
      clusteringProgress = 20;
      const evidenceWithEmbeddings = await getEvidenceEmbeddings();
      
      // Step 2: Generate clusters using MCP server (60%)
      clusteringProgress = 60;
      const clusters = await generateAIClusters(evidenceWithEmbeddings);
      
      // Step 3: Organize clusters (80%)
      clusteringProgress = 80;
      const organizedClusters = await organizeClusters(clusters);
      
      // Step 4: Finalize (100%)
      clusteringProgress = 100;
      
      organizationStructure = {
        type: 'ai_clusters',
        clusters: organizedClusters,
        metadata: {
          totalClusters: organizedClusters.length,
          clusteringMethod: 'gemma_embeddings',
          generatedAt: new Date().toISOString()
        }
      };
      
      aiClusters = organizedClusters;
      
    } catch (error) {
      console.error('AI clustering failed:', error);
      // Fallback to category organization
      await organizeByCategory();
    } finally {
      isGeneratingClusters = false;
      clusteringProgress = 0;
    }
  }
  
  /**
   * Organize evidence by chain of custody
   */
  async function organizeByChainOfCustody() {
    const custodyChains = {};
    
    filteredEvidence.forEach(evidence => {
      const custody = evidence.chain_of_custody || [];
      const chainId = custody.length > 0 ? custody[0].officer_id || 'unknown' : 'no_chain';
      const chainStatus = validateChainOfCustody(custody);
      
      if (!custodyChains[chainId]) {
        custodyChains[chainId] = {
          id: chainId,
          officer: custody[0]?.officer_name || 'Unknown Officer',
          evidence: [],
          status: chainStatus,
          completeness: 0
        };
      }
      
      custodyChains[chainId].evidence.push({
        ...evidence,
        custodyStatus: chainStatus
      });
    });
    
    // Calculate completeness for each chain
    Object.values(custodyChains).forEach(chain => {
      const completeChains = chain.evidence.filter(e => e.custodyStatus === 'complete').length;
      chain.completeness = (completeChains / chain.evidence.length) * 100;
      chain.count = chain.evidence.length;
    });
    
    organizationStructure = {
      type: 'chain_custody',
      chains: Object.values(custodyChains).sort((a, b) => b.completeness - a.completeness)
    };
  }
  
  /**
   * Get embeddings for evidence using MCP server
   */
  async function getEvidenceEmbeddings() {
    const evidenceWithEmbeddings = [];
    
    for (const evidence of filteredEvidence) {
      try {
        // Check if embeddings already exist
        if (evidence.metadata?.aiAnalysis?.embeddingVector) {
          evidenceWithEmbeddings.push({
            ...evidence,
            embedding: evidence.metadata.aiAnalysis.embeddingVector
          });
          continue;
        }
        
        // Generate new embeddings using MCP server
        const response = await fetch('http://localhost:3002/mcp/evidence-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evidenceId: evidence.id,
            content: evidence.title + ' ' + (evidence.description || ''),
            useGemmaEmbeddings: true,
            analysisType: 'embedding_only'
          })
        });
        
        if (response.ok) {
          const analysis = await response.json();
          evidenceWithEmbeddings.push({
            ...evidence,
            embedding: analysis.embedding
          });
        } else {
          evidenceWithEmbeddings.push(evidence);
        }
      } catch (error) {
        console.warn(`Failed to get embedding for evidence ${evidence.id}:`, error);
        evidenceWithEmbeddings.push(evidence);
      }
    }
    
    return evidenceWithEmbeddings;
  }
  
  /**
   * Generate AI clusters using MCP server
   */
  async function generateAIClusters(evidenceWithEmbeddings) {
    try {
      const response = await fetch('http://localhost:3002/mcp/cluster-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence: evidenceWithEmbeddings.map(e => ({
            id: e.id,
            title: e.title,
            type: e.evidenceType,
            embedding: e.embedding
          })),
          clusteringParams: {
            minClusterSize: 2,
            maxClusters: 10,
            similarityThreshold: 0.7,
            method: 'kmeans'
          }
        })
      });
      
      if (response.ok) {
        const clusterData = await response.json();
        return clusterData.clusters || [];
      }
    } catch (error) {
      console.error('MCP clustering failed:', error);
    }
    
    // Fallback: Simple similarity clustering
    return performSimpleClustering(evidenceWithEmbeddings);
  }
  
  /**
   * Organize clusters with metadata
   */
  async function organizeClusters(clusters) {
    return clusters.map((cluster, index) => ({
      id: `cluster_${index}`,
      name: cluster.name || `Cluster ${index + 1}`,
      description: cluster.description || generateClusterDescription(cluster.evidence),
      evidence: cluster.evidence,
      count: cluster.evidence.length,
      similarity: cluster.averageSimilarity || 0.8,
      keywords: cluster.keywords || extractClusterKeywords(cluster.evidence),
      color: getClusterColor(index)
    }));
  }
  
  /**
   * Calculate category priority
   */
  function calculateCategoryPriority(category: string): number {
    const priorities = {
      'physical_evidence': 10,
      'digital_evidence': 9,
      'document': 8,
      'testimony': 7,
      'photograph': 6,
      'video': 6,
      'audio': 5,
      'other': 1
    };
    return priorities[category] || 3;
  }
  
  /**
   * Calculate evidence priority based on metadata
   */
  function calculateEvidencePriority(evidence: any): string {
    // AI-based priority calculation
    if (evidence.metadata?.aiAnalysis?.importance > 0.8) return 'critical';
    if (evidence.metadata?.aiAnalysis?.importance > 0.6) return 'high';
    if (evidence.metadata?.aiAnalysis?.importance > 0.4) return 'medium';
    
    // Type-based priority
    if (evidence.evidenceType === 'physical_evidence') return 'high';
    if (evidence.evidenceType === 'digital_evidence') return 'high';
    if (evidence.evidenceType === 'testimony') return 'medium';
    
    return 'low';
  }
  
  /**
   * Validate chain of custody
   */
  function validateChainOfCustody(custody: any[]): string {
    if (!custody || custody.length === 0) return 'missing';
    
    const requiredFields = ['officer_id', 'timestamp', 'action'];
    const hasAllFields = custody.every(entry => 
      requiredFields.every(field => entry[field])
    );
    
    const isChronological = custody.every((entry, index) => {
      if (index === 0) return true;
      return new Date(entry.timestamp) >= new Date(custody[index - 1].timestamp);
    });
    
    if (hasAllFields && isChronological) return 'complete';
    if (hasAllFields) return 'incomplete';
    return 'invalid';
  }
  
  /**
   * Update organization metrics
   */
  function updateOrganizationMetrics() {
    organizationMetrics = {
      totalEvidence: evidenceList.length,
      categorized: evidenceList.filter(e => e.evidenceType && e.evidenceType !== 'other').length,
      uncategorized: evidenceList.filter(e => !e.evidenceType || e.evidenceType === 'other').length,
      duplicates: 0, // TODO: Implement duplicate detection
      missingMetadata: evidenceList.filter(e => !e.metadata || Object.keys(e.metadata).length === 0).length,
      chainOfCustodyComplete: evidenceList.filter(e => 
        validateChainOfCustody(e.chain_of_custody) === 'complete'
      ).length,
      aiAnalyzed: evidenceList.filter(e => e.metadata?.aiAnalysis).length
    };
  }
  
  /**
   * Handle organization mode change
   */
  async function handleModeChange(newMode: string) {
    organizationMode = newMode;
    await reorganizeEvidence();
  }
  
  /**
   * Select evidence
   */
  function selectEvidence(evidence: any, context: string = 'organization') {
    if (selectedEvidence.includes(evidence)) {
      selectedEvidence = selectedEvidence.filter(e => e.id !== evidence.id);
    } else {
      selectedEvidence = [...selectedEvidence, evidence];
    }
    
    dispatch('evidenceSelected', { evidence, context });
  }
  
  /**
   * Utility functions
   */
  function performSimpleClustering(evidenceWithEmbeddings: any[]) {
    // Simple fallback clustering
    return [{
      evidence: evidenceWithEmbeddings,
      name: 'All Evidence',
      averageSimilarity: 0.5
    }];
  }
  
  function generateClusterDescription(evidence: any[]): string {
    const types = [...new Set(evidence.map(e => e.evidenceType))];
    return `Contains ${evidence.length} items of types: ${types.join(', ')}`;
  }
  
  function extractClusterKeywords(evidence: any[]): string[] {
    // Extract common keywords from evidence titles and descriptions
    const allText = evidence.map(e => (e.title + ' ' + (e.description || '')).toLowerCase()).join(' ');
    const words = allText.split(/\s+/).filter(word => word.length > 3);
    const wordCounts = {};
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  function getClusterColor(index: number): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    return colors[index % colors.length];
  }
</script>

<!-- Case Evidence Organizer UI -->
<div class="case-evidence-organizer">
  <!-- Header with controls -->
  <header class="organizer-header">
    <div class="header-content">
      <h1>Evidence Organization</h1>
      <div class="case-info">
        <span class="case-id">Case: {caseId}</span>
        {#if isConnectedToCollaboration}
          <span class="collaboration-status">
            🌐 {collaborativeUsers.length + 1} users active
          </span>
        {/if}
      </div>
    </div>
    
    <!-- Organization mode selector -->
    <div class="mode-selector">
      {#each organizationModes as mode}
        <button 
          type="button"
          class="mode-button"
          class:active={organizationMode === mode.value}
          onclick={() => handleModeChange(mode.value)}
        >
          <span class="mode-icon">{mode.icon}</span>
          <span class="mode-label">{mode.label}</span>
        </button>
      {/each}
    </div>
  </header>

  <!-- Metrics and filters -->
  <section class="controls-section">
    <!-- Organization metrics -->
    {#if showMetrics}
      <div class="metrics-panel">
        <div class="metric">
          <span class="metric-value">{organizationMetrics.totalEvidence}</span>
          <span class="metric-label">Total Evidence</span>
        </div>
        <div class="metric">
          <span class="metric-value">{organizationMetrics.categorized}</span>
          <span class="metric-label">Categorized</span>
        </div>
        <div class="metric">
          <span class="metric-value">{organizationMetrics.aiAnalyzed}</span>
          <span class="metric-label">AI Analyzed</span>
        </div>
        <div class="metric">
          <span class="metric-value">{organizationMetrics.chainOfCustodyComplete}</span>
          <span class="metric-label">Chain Complete</span>
        </div>
      </div>
    {/if}
    
    <!-- Search and filters -->
    <div class="filters-panel">
      <div class="search-box">
        <input 
          type="text" 
          placeholder="Search evidence..." 
          bind:value={searchQuery}
          class="search-input"
        />
      </div>
      
      <div class="filter-controls">
        <select bind:value={filterCriteria.evidenceType}>
          <option value="all">All Types</option>
          <option value="physical_evidence">Physical Evidence</option>
          <option value="digital_evidence">Digital Evidence</option>
          <option value="document">Documents</option>
          <option value="testimony">Testimony</option>
          <option value="photograph">Photographs</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>
        
        <select bind:value={filterCriteria.priority}>
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  </section>

  <!-- Loading and progress indicators -->
  {#if isLoading || isGeneratingClusters}
    <div class="loading-section">
      <div class="loading-content">
        {#if isGeneratingClusters}
          <h3>Generating AI Clusters with Gemma Embeddings...</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {clusteringProgress}%"></div>
          </div>
          <p>Progress: {clusteringProgress}%</p>
        {:else}
          <h3>Reorganizing Evidence...</h3>
          <div class="spinner"></div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Organization display -->
  <main class="organization-display">
    {#if organizationStructure.type === 'category'}
      <!-- Category organization -->
      <div class="category-organization">
        {#each organizationStructure.categories as category}
          <div class="category-group">
            <div class="category-header">
              <h3>{category.name}</h3>
              <span class="category-count">{category.count} items</span>
            </div>
            <div class="evidence-grid">
              {#each category.evidence as evidence}
                <div 
                  class="evidence-card"
                  class:selected={selectedEvidence.includes(evidence)}
                  onclick={() => selectEvidence(evidence, 'category')}
                >
                  <div class="evidence-header">
                    <h4>{evidence.title}</h4>
                    {#if evidence.metadata?.priority}
                      <span class="priority-badge priority-{evidence.metadata.priority}">
                        {evidence.metadata.priority}
                      </span>
                    {/if}
                  </div>
                  <p class="evidence-description">{evidence.description || 'No description'}</p>
                  <div class="evidence-meta">
                    <span class="evidence-type">{evidence.evidenceType}</span>
                    {#if evidence.collected_at}
                      <span class="evidence-date">
                        {new Date(evidence.collected_at).toLocaleDateString()}
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    
    {:else if organizationStructure.type === 'timeline'}
      <!-- Timeline organization -->
      <div class="timeline-organization">
        {#each organizationStructure.periods as period}
          <div class="timeline-period">
            <div class="period-header">
              <h3>{period.label}</h3>
              <span class="period-count">{period.count} items</span>
            </div>
            <div class="timeline-items">
              {#each period.evidence as evidence}
                <div 
                  class="timeline-item"
                  class:selected={selectedEvidence.includes(evidence)}
                  onclick={() => selectEvidence(evidence, 'timeline')}
                >
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <h4>{evidence.title}</h4>
                    <p>{evidence.description || 'No description'}</p>
                    <div class="timeline-meta">
                      <span class="timeline-date">
                        {new Date(evidence.collected_at || evidence.uploaded_at).toLocaleString()}
                      </span>
                      <span class="timeline-type">{evidence.evidenceType}</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    
    {:else if organizationStructure.type === 'ai_clusters'}
      <!-- AI Clusters organization -->
      <div class="clusters-organization">
        {#each organizationStructure.clusters as cluster}
          <div class="cluster-group" style="border-left-color: {cluster.color}">
            <div class="cluster-header">
              <h3>{cluster.name}</h3>
              <div class="cluster-meta">
                <span class="cluster-count">{cluster.count} items</span>
                <span class="cluster-similarity">
                  {Math.round(cluster.similarity * 100)}% similarity
                </span>
              </div>
            </div>
            <p class="cluster-description">{cluster.description}</p>
            {#if cluster.keywords?.length > 0}
              <div class="cluster-keywords">
                {#each cluster.keywords as keyword}
                  <span class="keyword-tag">{keyword}</span>
                {/each}
              </div>
            {/if}
            <div class="cluster-evidence">
              {#each cluster.evidence as evidence}
                <div 
                  class="evidence-card compact"
                  class:selected={selectedEvidence.includes(evidence)}
                  onclick={() => selectEvidence(evidence, 'cluster')}
                >
                  <h4>{evidence.title}</h4>
                  <span class="evidence-type">{evidence.evidenceType}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    
    {:else if organizationStructure.type === 'chain_custody'}
      <!-- Chain of Custody organization -->
      <div class="custody-organization">
        {#each organizationStructure.chains as chain}
          <div class="custody-chain">
            <div class="chain-header">
              <h3>{chain.officer}</h3>
              <div class="chain-meta">
                <span class="chain-count">{chain.count} items</span>
                <span class="chain-completeness completeness-{Math.round(chain.completeness / 25)}">
                  {Math.round(chain.completeness)}% complete
                </span>
              </div>
            </div>
            <div class="chain-evidence">
              {#each chain.evidence as evidence}
                <div 
                  class="evidence-card custody"
                  class:selected={selectedEvidence.includes(evidence)}
                  onclick={() => selectEvidence(evidence, 'custody')}
                >
                  <div class="evidence-header">
                    <h4>{evidence.title}</h4>
                    <span class="custody-status status-{evidence.custodyStatus}">
                      {evidence.custodyStatus}
                    </span>
                  </div>
                  <div class="custody-timeline">
                    {#each evidence.chain_of_custody || [] as entry}
                      <div class="custody-entry">
                        <span class="custody-action">{entry.action}</span>
                        <span class="custody-time">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .case-evidence-organizer {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .organizer-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 1.5rem 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header-content h1 {
    margin: 0;
    color: #1e293b;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .case-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    font-size: 0.875rem;
    color: #64748b;
  }

  .collaboration-status {
    color: #059669;
    font-weight: 500;
  }

  .mode-selector {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mode-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-button:hover {
    background: #e2e8f0;
  }

  .mode-button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .mode-icon {
    font-size: 1.25rem;
  }

  .mode-label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .controls-section {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .metrics-panel {
    display: flex;
    gap: 2rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filters-panel {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .search-input {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    min-width: 250px;
  }

  .filter-controls {
    display: flex;
    gap: 0.5rem;
  }

  .filter-controls select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .loading-section {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    background: white;
  }

  .loading-content {
    text-align: center;
    max-width: 400px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    margin: 1rem 0;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 1rem auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .organization-display {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .evidence-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .evidence-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }

  .evidence-card.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .evidence-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .evidence-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .priority-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .priority-critical { background: #fef2f2; color: #991b1b; }
  .priority-high { background: #fff7ed; color: #9a3412; }
  .priority-medium { background: #fffbeb; color: #92400e; }
  .priority-low { background: #f0fdf4; color: #166534; }

  .evidence-description {
    margin: 0 0 0.75rem 0;
    color: #64748b;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .evidence-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .evidence-type {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  /* Category organization styles */
  .category-organization {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .category-group {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .category-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .category-count {
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  /* Timeline organization styles */
  .timeline-organization {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .timeline-period {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .period-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .timeline-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timeline-item:hover {
    border-color: #3b82f6;
  }

  .timeline-marker {
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border-radius: 50%;
    margin-top: 0.25rem;
    flex-shrink: 0;
  }

  .timeline-content {
    flex: 1;
  }

  .timeline-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .timeline-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* Clusters organization styles */
  .clusters-organization {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .cluster-group {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-left: 4px solid;
  }

  .cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .cluster-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  .cluster-description {
    margin: 0 0 1rem 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  .cluster-keywords {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .keyword-tag {
    background: #f1f5f9;
    color: #475569;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .cluster-evidence {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
  }

  .evidence-card.compact {
    padding: 0.75rem;
  }

  .evidence-card.compact h4 {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  /* Chain of custody styles */
  .custody-organization {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .custody-chain {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .chain-completeness {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .completeness-0 { background: #fef2f2; color: #991b1b; }
  .completeness-1 { background: #fff7ed; color: #9a3412; }
  .completeness-2 { background: #fffbeb; color: #92400e; }
  .completeness-3 { background: #f0fdf4; color: #166534; }
  .completeness-4 { background: #dcfce7; color: #166534; }

  .custody-status {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-complete { background: #dcfce7; color: #166534; }
  .status-incomplete { background: #fffbeb; color: #92400e; }
  .status-missing { background: #fef2f2; color: #991b1b; }
  .status-invalid { background: #fef2f2; color: #991b1b; }

  .custody-timeline {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
  }

  .custody-entry {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .custody-action {
    font-weight: 500;
  }
</style>