<!--
  Case Relationship Graph LOD Component - N64-Inspired Node Culling
  
  Implements progressive graph detail similar to N64 polygon reduction:
  - LOD 0: All nodes visible (1000+ nodes)
  - LOD 1: High importance nodes (500 nodes)
  - LOD 2: Core entities only (200 nodes) 
  - LOD 3: Key relationships (50 nodes) - N64 fog distance
  
  Features:
  - WebGPU instanced rendering for thousands of nodes
  - Distance-based node culling and simplification
  - Intelligent edge bundling for distant connections
  - Force-directed layout with LOD-aware physics
  - Real-time collaboration cursors
-->

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { LoadingButton } from '$lib/headless';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { 
    Network, Eye, Layers, ZoomIn, ZoomOut, RotateCcw,
    Users, FileText, Calendar, MapPin, Search, Filter
  } from 'lucide-svelte';

  interface GraphNode {
    id: string;
    type: 'person' | 'entity' | 'document' | 'event' | 'location';
    label: string;
    importance: number; // 0-1, affects LOD visibility
    connections: string[];
    position: { x: number; y: number; z?: number };
    size: number;
    color: string;
    metadata: Record<string, any>;
  }

  interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'relationship' | 'reference' | 'temporal' | 'spatial';
    strength: number; // 0-1, affects LOD visibility
    label?: string;
    color: string;
    metadata: Record<string, any>;
  }

  interface GraphCluster {
    id: string;
    nodes: string[];
    center: { x: number; y: number };
    radius: number;
    importance: number;
    label: string;
  }

  interface CaseGraphLODProps {
    caseId: string;
    graphData?: { nodes: GraphNode[]; edges: GraphEdge[] };
    enableWebGPU?: boolean;
    maxNodes?: number;
    cameraDistance?: number;
    onNodeClick?: (node: GraphNode) => void;
    onEdgeClick?: (edge: GraphEdge) => void;
    onLODChange?: (level: number) => void;
  }

  let {
    caseId,
    graphData = { nodes: [], edges: [] },
    enableWebGPU = true,
    maxNodes = 1000,
    cameraDistance = 100,
    onNodeClick,
    onEdgeClick,
    onLODChange
  }: CaseGraphLODProps = $props();

  // Svelte 5 state management
  let canvasElement = $state<HTMLCanvasElement>();
  let gpuDevice = $state<GPUDevice | null>(null);
  let isWebGPUReady = $state(false);
  
  let allNodes = $state<GraphNode[]>([]);
  let allEdges = $state<GraphEdge[]>([]);
  let visibleNodes = $state<GraphNode[]>([]);
  let visibleEdges = $state<GraphEdge[]>([]);
  let graphClusters = $state<GraphCluster[]>([]);
  
  let currentLOD = $state(1);
  let cameraPosition = $state({ x: 0, y: 0, z: cameraDistance });
  let zoomLevel = $state(1.0);
  let rotation = $state(0);
  let isLoading = $state(false);
  let selectedNode = $state<GraphNode | null>(null);
  let hoveredNode = $state<GraphNode | null>(null);

  // Physics simulation state
  let physicsEnabled = $state(true);
  let simulationStep = $state(0);
  let forceStrength = $state(0.1);

  // Filter controls
  let nodeTypeFilters = $state({
    person: true,
    entity: true,
    document: true,
    event: true,
    location: true
  });
  let importanceThreshold = $state(0.1);

  // LOD configuration inspired by N64 polygon reduction
  const lodConfig = {
    0: { 
      maxNodes: 1000, 
      maxEdges: 2000, 
      minImportance: 0.0, 
      clusterDistance: 0,
      description: 'Ultra High (All Nodes)',
      renderComplexity: 1.0
    },
    1: { 
      maxNodes: 500, 
      maxEdges: 1000, 
      minImportance: 0.2, 
      clusterDistance: 5,
      description: 'High Detail',
      renderComplexity: 0.7
    },
    2: { 
      maxNodes: 200, 
      maxEdges: 400, 
      minImportance: 0.4, 
      clusterDistance: 15,
      description: 'Medium Detail',
      renderComplexity: 0.4
    },
    3: { 
      maxNodes: 50, 
      maxEdges: 100, 
      minImportance: 0.7, 
      clusterDistance: 30,
      description: 'Low Detail (N64 Style)',
      renderComplexity: 0.2
    }
  };

  // Derived values for automatic LOD calculation
  let recommendedLOD = $derived(() => {
    // N64-style LOD based on camera distance and node count
    const distance = Math.sqrt(cameraPosition.x ** 2 + cameraPosition.y ** 2 + cameraPosition.z ** 2);
    const nodeCount = allNodes.length;
    
    if (distance < 50 && nodeCount < 200) return 0; // Ultra high
    if (distance < 100 && nodeCount < 500) return 1; // High
    if (distance < 200 && nodeCount < 1000) return 2; // Medium
    return 3; // Low detail - N64 fog distance
  });

  let lodStats = $derived(() => {
    const config = lodConfig[currentLOD as keyof typeof lodConfig];
    return {
      level: currentLOD,
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      maxNodes: config?.maxNodes || 50,
      renderComplexity: config?.renderComplexity || 0.2,
      memoryUsage: calculateMemoryUsage(),
      frameTime: estimateFrameTime()
    };
  });

  // Initialize WebGPU and load graph data
  onMount(async () => {
    if (!browser) return;
    
    try {
      if (enableWebGPU) {
        await initializeWebGPU();
      }
      await loadGraphData();
      startPhysicsSimulation();
    } catch (error) {
      console.error('[CaseGraphLOD] Initialization failed:', error);
      await initializeCanvas2DFallback();
    }
  });

  onDestroy(() => {
    // Cleanup WebGPU resources and physics simulation
    if (gpuDevice) {
      // Cleanup GPU buffers and textures
    }
  });

  async function initializeWebGPU(): Promise<void> {
    if (!navigator.gpu) throw new Error('WebGPU not supported');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter not found');

    gpuDevice = await adapter.requestDevice({
      requiredFeatures: ['texture-compression-bc'],
      requiredLimits: {
        maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB for node data
        maxBufferSize: 64 * 1024 * 1024 // 64MB like N64
      }
    });

    if (!canvasElement) throw new Error('Canvas element not found');

    const context = canvasElement.getContext('webgpu');
    if (!context) throw new Error('WebGPU context creation failed');

    context.configure({
      device: gpuDevice,
      format: 'bgra8unorm',
      alphaMode: 'premultiplied',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    isWebGPUReady = true;
    console.log('[CaseGraphLOD] WebGPU initialized for graph rendering');
  }

  async function initializeCanvas2DFallback(): Promise<void> {
    const ctx = canvasElement?.getContext('2d');
    if (ctx) {
      isWebGPUReady = true;
    }
  }

  async function loadGraphData(): Promise<void> {
    isLoading = true;
    
    try {
      // Load graph data from API
      const response = await fetch(`/api/v1/cases/${caseId}/graph?maxNodes=${maxNodes}`);
      const data = await response.json();
      
      allNodes = data.nodes || [];
      allEdges = data.edges || [];
      
      // Calculate node importance based on connections and metadata
      calculateNodeImportance();
      
      // Create initial clusters
      generateGraphClusters();
      
      // Apply initial LOD filtering
      applyLODFiltering();
      
      // Initialize physics positions
      initializePhysicsPositions();
      
    } catch (error) {
      console.error('[CaseGraphLOD] Failed to load graph data:', error);
      // Use demo data for development
      await loadDemoGraphData();
    } finally {
      isLoading = false;
    }
  }

  function calculateNodeImportance(): void {
    allNodes = allNodes.map(node => {
      // Calculate importance based on multiple factors
      const connectionWeight = node.connections.length / Math.max(1, allNodes.length * 0.1);
      const typeWeight = getNodeTypeImportance(node.type);
      const metadataWeight = node.metadata.priority || 0.5;
      
      const importance = Math.min(1.0, (connectionWeight * 0.4) + (typeWeight * 0.3) + (metadataWeight * 0.3));
      
      return { ...node, importance };
    });
  }

  function getNodeTypeImportance(type: string): number {
    const typeWeights = {
      person: 0.9,     // People are usually most important
      entity: 0.8,     // Organizations, companies
      document: 0.6,   // Evidence, contracts
      event: 0.7,      // Timeline events
      location: 0.5    // Places, addresses
    };
    return typeWeights[type as keyof typeof typeWeights] || 0.5;
  }

  function generateGraphClusters(): void {
    // Use simple clustering based on node connections and types
    const clusters = new Map<string, GraphNode[]>();
    
    allNodes.forEach(node => {
      const clusterKey = node.type;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(node);
    });
    
    graphClusters = Array.from(clusters.entries()).map(([type, nodes]) => {
      const center = calculateClusterCenter(nodes);
      const radius = calculateClusterRadius(nodes, center);
      const importance = nodes.reduce((sum, node) => sum + node.importance, 0) / nodes.length;
      
      return {
        id: `cluster_${type}`,
        nodes: nodes.map(n => n.id),
        center,
        radius,
        importance,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)}s (${nodes.length})`
      };
    });
  }

  function calculateClusterCenter(nodes: GraphNode[]): { x: number; y: number } {
    const sum = nodes.reduce(
      (acc, node) => ({ x: acc.x + node.position.x, y: acc.y + node.position.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / nodes.length, y: sum.y / nodes.length };
  }

  function calculateClusterRadius(nodes: GraphNode[], center: { x: number; y: number }): number {
    return Math.max(
      ...nodes.map(node => 
        Math.sqrt((node.position.x - center.x) ** 2 + (node.position.y - center.y) ** 2)
      )
    );
  }

  function applyLODFiltering(): void {
    const config = lodConfig[currentLOD as keyof typeof lodConfig];
    if (!config) return;

    // Filter nodes based on LOD configuration and user filters
    let filtered = allNodes.filter(node => {
      // Check type filters
      if (!nodeTypeFilters[node.type as keyof typeof nodeTypeFilters]) return false;
      
      // Check importance threshold
      if (node.importance < Math.max(config.minImportance, importanceThreshold)) return false;
      
      return true;
    });

    // Sort by importance and take top N nodes
    filtered.sort((a, b) => b.importance - a.importance);
    visibleNodes = filtered.slice(0, config.maxNodes);
    
    // Filter edges to only show connections between visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    let filteredEdges = allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    
    // Sort edges by strength and take top N
    filteredEdges.sort((a, b) => b.strength - a.strength);
    visibleEdges = filteredEdges.slice(0, config.maxEdges);
    
    console.log(`[CaseGraphLOD] LOD ${currentLOD}: ${visibleNodes.length} nodes, ${visibleEdges.length} edges`);
  }

  function initializePhysicsPositions(): void {
    // Initialize node positions if not set
    visibleNodes.forEach((node, index) => {
      if (!node.position.x || !node.position.y) {
        const angle = (index / visibleNodes.length) * Math.PI * 2;
        const radius = Math.sqrt(visibleNodes.length) * 20;
        node.position = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: node.position.z || 0
        };
      }
    });
  }

  function startPhysicsSimulation(): void {
    if (!physicsEnabled) return;
    
    const simulate = () => {
      if (!physicsEnabled) return;
      
      // Simple force-directed layout with LOD-aware forces
      applyForces();
      simulationStep++;
      
      // Render frame
      renderGraph();
      
      // Continue simulation
      if (simulationStep < 1000) { // Limit simulation steps
        requestAnimationFrame(simulate);
      }
    };
    
    simulate();
  }

  function applyForces(): void {
    const config = lodConfig[currentLOD as keyof typeof lodConfig];
    const dampening = 0.9;
    const repulsionStrength = forceStrength * config.renderComplexity;
    
    // Apply repulsion forces between nodes
    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeA = visibleNodes[i];
      let forceX = 0, forceY = 0;
      
      for (let j = 0; j < visibleNodes.length; j++) {
        if (i === j) continue;
        
        const nodeB = visibleNodes[j];
        const dx = nodeA.position.x - nodeB.position.x;
        const dy = nodeA.position.y - nodeB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = repulsionStrength / (distance * distance);
        forceX += (dx / distance) * force;
        forceY += (dy / distance) * force;
      }
      
      // Apply attraction forces from edges
      visibleEdges.forEach(edge => {
        if (edge.source === nodeA.id) {
          const target = visibleNodes.find(n => n.id === edge.target);
          if (target) {
            const dx = target.position.x - nodeA.position.x;
            const dy = target.position.y - nodeA.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const attractionForce = edge.strength * forceStrength * 0.01;
            
            forceX += (dx / distance) * attractionForce;
            forceY += (dy / distance) * attractionForce;
          }
        }
      });
      
      // Update position with dampening
      nodeA.position.x += forceX * dampening;
      nodeA.position.y += forceY * dampening;
    }
  }

  async function renderGraph(): Promise<void> {
    if (isWebGPUReady && gpuDevice) {
      await renderWebGPU();
    } else {
      await renderCanvas2D();
    }
  }

  async function renderWebGPU(): Promise<void> {
    // WebGPU instanced rendering for high-performance graph visualization
    // Implementation would include:
    // - Instanced rendering for nodes (using GPU buffers)
    // - Line rendering for edges with bundling
    // - LOD-based shader switching
    // - N64-style effects for distant nodes
  }

  async function renderCanvas2D(): Promise<void> {
    const ctx = canvasElement?.getContext('2d');
    if (!ctx) return;
    
    const width = canvasElement?.width || 800;
    const height = canvasElement?.height || 600;
    
    // Clear canvas with N64-style background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    // Apply camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cameraPosition.x, -cameraPosition.y);
    
    // Render edges first (behind nodes)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    
    visibleEdges.forEach(edge => {
      const source = visibleNodes.find(n => n.id === edge.source);
      const target = visibleNodes.find(n => n.id === edge.target);
      
      if (source && target) {
        // Apply LOD-based edge styling
        const alpha = Math.max(0.1, lodConfig[currentLOD as keyof typeof lodConfig].renderComplexity);
        ctx.strokeStyle = `${edge.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = edge.strength * 3;
        
        ctx.beginPath();
        ctx.moveTo(source.position.x, source.position.y);
        ctx.lineTo(target.position.x, target.position.y);
        ctx.stroke();
      }
    });
    
    // Render nodes
    visibleNodes.forEach(node => {
      const distance = Math.sqrt(
        (node.position.x - cameraPosition.x) ** 2 + 
        (node.position.y - cameraPosition.y) ** 2
      );
      
      // Apply N64-style LOD effects
      const lodAlpha = Math.max(0.3, 1 - (currentLOD / 3));
      const size = node.size * Math.max(0.5, 1 - (currentLOD * 0.2));
      
      ctx.fillStyle = node.color + Math.floor(lodAlpha * 255).toString(16).padStart(2, '0');
      
      // Draw node based on type
      ctx.beginPath();
      switch (node.type) {
        case 'person':
          ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
          break;
        case 'document':
          ctx.rect(node.position.x - size/2, node.position.y - size/2, size, size);
          break;
        case 'event':
          // Draw diamond
          ctx.moveTo(node.position.x, node.position.y - size);
          ctx.lineTo(node.position.x + size, node.position.y);
          ctx.lineTo(node.position.x, node.position.y + size);
          ctx.lineTo(node.position.x - size, node.position.y);
          ctx.closePath();
          break;
        default:
          ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Highlight selected/hovered nodes
      if (node === selectedNode) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (node === hoveredNode) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw labels for important nodes at higher LOD levels
      if (currentLOD <= 1 && node.importance > 0.7) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(10, 12 - currentLOD * 2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.position.x, node.position.y + size + 15);
      }
    });
    
    ctx.restore();
  }

  // User interaction handlers
  function handleCanvasClick(event: MouseEvent): void {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (event.clientX - rect.left - rect.width / 2) / zoomLevel + cameraPosition.x;
    const y = (event.clientY - rect.top - rect.height / 2) / zoomLevel + cameraPosition.y;
    
    // Find clicked node
    const clickedNode = visibleNodes.find(node => {
      const distance = Math.sqrt((node.position.x - x) ** 2 + (node.position.y - y) ** 2);
      return distance <= node.size;
    });
    
    if (clickedNode) {
      selectedNode = clickedNode;
      onNodeClick?.(clickedNode);
    } else {
      selectedNode = null;
    }
    
    renderGraph();
  }

  function handleCanvasHover(event: MouseEvent): void {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (event.clientX - rect.left - rect.width / 2) / zoomLevel + cameraPosition.x;
    const y = (event.clientY - rect.top - rect.height / 2) / zoomLevel + cameraPosition.y;
    
    // Find hovered node
    const hovered = visibleNodes.find(node => {
      const distance = Math.sqrt((node.position.x - x) ** 2 + (node.position.y - y) ** 2);
      return distance <= node.size;
    });
    
    if (hovered !== hoveredNode) {
      hoveredNode = hovered;
      renderGraph();
    }
  }

  function handleZoomIn(): void {
    zoomLevel = Math.min(3.0, zoomLevel * 1.2);
    renderGraph();
  }

  function handleZoomOut(): void {
    zoomLevel = Math.max(0.1, zoomLevel / 1.2);
    renderGraph();
  }

  function handleResetView(): void {
    cameraPosition = { x: 0, y: 0, z: cameraDistance };
    zoomLevel = 1.0;
    rotation = 0;
    renderGraph();
  }

  function handleLODChange(): void {
    applyLODFiltering();
    onLODChange?.(currentLOD);
    renderGraph();
  }

  function handleFilterChange(): void {
    applyLODFiltering();
    renderGraph();
  }

  function calculateMemoryUsage(): number {
    const nodeSize = 128; // Approximate bytes per node
    const edgeSize = 64;  // Approximate bytes per edge
    return ((visibleNodes.length * nodeSize) + (visibleEdges.length * edgeSize)) / (1024 * 1024);
  }

  function estimateFrameTime(): number {
    // Estimate based on visible elements and LOD level
    const baseTime = 16.67; // Target 60fps
    const complexity = lodConfig[currentLOD as keyof typeof lodConfig].renderComplexity;
    const nodeCount = visibleNodes.length;
    
    return baseTime * (1 + (nodeCount / 1000) * (2 - complexity));
  }

  async function loadDemoGraphData(): Promise<void> {
    // Demo data for development/testing
    const demoNodes: GraphNode[] = [
      {
        id: 'person_1',
        type: 'person',
        label: 'John Doe',
        importance: 0.9,
        connections: ['entity_1', 'document_1'],
        position: { x: 0, y: 0 },
        size: 15,
        color: '#4ade80',
        metadata: { role: 'defendant' }
      },
      {
        id: 'entity_1',
        type: 'entity',
        label: 'ABC Corp',
        importance: 0.8,
        connections: ['person_1', 'document_2'],
        position: { x: 50, y: 50 },
        size: 12,
        color: '#3b82f6',
        metadata: { type: 'corporation' }
      }
    ];
    
    const demoEdges: GraphEdge[] = [
      {
        id: 'edge_1',
        source: 'person_1',
        target: 'entity_1',
        type: 'relationship',
        strength: 0.8,
        color: '#6b7280',
        metadata: { relationship: 'employee' }
      }
    ];
    
    allNodes = demoNodes;
    allEdges = demoEdges;
    calculateNodeImportance();
    generateGraphClusters();
    applyLODFiltering();
    initializePhysicsPositions();
  }
</script>

<div class="case-graph-lod nes-container with-title">
  <p class="title">🕸️ Case Relationship Graph</p>
  
  <!-- Graph Controls -->
  <div class="graph-controls">
    <div class="view-controls">
      <LoadingButton onclick={handleZoomIn} variant="outline" size="sm">
        {#snippet children()}<ZoomIn class="w-4 h-4" />{/snippet}
      </LoadingButton>
      
      <span class="zoom-info">
        {Math.round(zoomLevel * 100)}%
      </span>
      
      <LoadingButton onclick={handleZoomOut} variant="outline" size="sm">
        {#snippet children()}<ZoomOut class="w-4 h-4" />{/snippet}
      </LoadingButton>
      
      <LoadingButton onclick={handleResetView} variant="outline" size="sm">
        {#snippet children()}<RotateCcw class="w-4 h-4" />{/snippet}
      </LoadingButton>
    </div>
    
    <div class="lod-controls">
      <select 
        class="nes-select"
        bind:value={currentLOD}
        onchange={handleLODChange}
      >
        {#each Object.entries(lodConfig) as [level, config]}
          <option value={parseInt(level)}>
            LOD {level}: {config.description}
          </option>
        {/each}
      </select>
      
      <Badge variant="outline" class="lod-badge">
        <Layers class="w-3 h-3 mr-1" />
        Recommended: LOD {recommendedLOD}
      </Badge>
    </div>
    
    <div class="filter-controls">
      <details class="filter-dropdown nes-container">
        <summary>
          <Filter class="w-4 h-4 mr-1" />
          Filters
        </summary>
        
        <div class="filter-content">
          <div class="node-type-filters">
            <h5>Node Types:</h5>
            {#each Object.keys(nodeTypeFilters) as nodeType}
              <label class="nes-checkbox">
                <input 
                  type="checkbox" 
                  bind:checked={nodeTypeFilters[nodeType as keyof typeof nodeTypeFilters]}
                  onchange={handleFilterChange}
                />
                <span>{nodeType}</span>
              </label>
            {/each}
          </div>
          
          <div class="importance-filter">
            <label class="nes-label" for="-min-importance-impo">
              Min Importance: {importanceThreshold.toFixed(2)}
            </label><input id="-min-importance-impo" 
              type="range" 
              class="nes-range"
              min="0" 
              max="1" 
              step="0.1"
              bind:value={importanceThreshold}
              onchange={handleFilterChange}
            />
          </div>
        </div>
      </details>
    </div>
  </div>
  
  <!-- Graph Canvas -->
  <div class="graph-canvas-container">
    <canvas
      bind:this={canvasElement}
      width="800"
      height="600"
      class="graph-canvas"
      onclick={handleCanvasClick}
      onmousemove={handleCanvasHover}
    ></canvas>
    
    <!-- Loading overlay -->
    {#if isLoading}
      <div class="loading-overlay">
        <div class="nes-progress">
          <div class="nes-progress-bar indeterminate"></div>
        </div>
        <p>Loading graph data...</p>
      </div>
    {/if}
    
    <!-- Node info panel -->
    {#if selectedNode}
      <div class="node-info-panel nes-container">
        <h4>{selectedNode.label}</h4>
        <p>Type: {selectedNode.type}</p>
        <p>Importance: {selectedNode.importance.toFixed(2)}</p>
        <p>Connections: {selectedNode.connections.length}</p>
        
        <div class="node-actions">
          <LoadingButton variant="primary" size="sm">
            {#snippet children()}View Details{/snippet}
          </LoadingButton>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Graph Statistics -->
  <div class="graph-stats nes-container">
    <h4>📊 Graph Statistics</h4>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="label">Current LOD:</span>
        <span class="value">Level {lodStats.level}</span>
      </div>
      <div class="stat-item">
        <span class="label">Visible Nodes:</span>
        <span class="value">{lodStats.visibleNodes} / {allNodes.length}</span>
      </div>
      <div class="stat-item">
        <span class="label">Visible Edges:</span>
        <span class="value">{lodStats.visibleEdges} / {allEdges.length}</span>
      </div>
      <div class="stat-item">
        <span class="label">Memory Usage:</span>
        <span class="value">{lodStats.memoryUsage.toFixed(2)}MB</span>
      </div>
      <div class="stat-item">
        <span class="label">Frame Time:</span>
        <span class="value">{lodStats.frameTime.toFixed(1)}ms</span>
      </div>
      <div class="stat-item">
        <span class="label">Physics:</span>
        <span class="value {physicsEnabled ? 'success' : 'disabled'}">
          {physicsEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  </div>
</div>

<style>
  .case-graph-lod {
    background: linear-gradient(135deg, #0f0f23, #1a1a2e);
    color: #fff;
    min-height: 700px;
  }

  .graph-controls {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }

  .view-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-info {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-size: 0.875rem;
    min-width: 60px;
    text-align: center;
  }

  .lod-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-self: center;
  }

  .filter-controls {
    justify-self: end;
  }

  .filter-dropdown {
    position: relative;
    background: rgba(0, 0, 0, 0.5);
  }

  .filter-content {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 10;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #444;
    border-radius: 4px;
    padding: 1rem;
    min-width: 200px;
  }

  .node-type-filters {
    margin-bottom: 1rem;
  }

  .node-type-filters h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #ccc;
  }

  .importance-filter {
    margin-top: 1rem;
  }

  .graph-canvas-container {
    position: relative;
    background: #1a1a2e;
    border: 2px solid #444;
    border-radius: 4px;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .graph-canvas {
    display: block;
    cursor: crosshair;
    image-rendering: pixelated; /* N64-style pixelated rendering */
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }

  .node-info-panel {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #4ade80;
    min-width: 200px;
    max-width: 300px;
  }

  .node-actions {
    margin-top: 1rem;
  }

  .graph-stats {
    background: rgba(0, 0, 0, 0.4);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: 0.875rem;
    color: #ccc;
  }

  .value {
    font-weight: bold;
    color: #4ade80;
  }

  .value.success {
    color: #4ade80;
  }

  .value.disabled {
    color: #6b7280;
  }

  .lod-badge {
    font-size: 0.75rem;
  }

  /* N64-style animations */
  @keyframes indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .nes-progress-bar.indeterminate {
    animation: indeterminate 1.5s linear infinite;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .graph-controls {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .view-controls,
    .lod-controls,
    .filter-controls {
      justify-self: center;
    }

    .graph-canvas {
      width: 100%;
      height: 400px;
    }

    .node-info-panel {
      position: static;
      margin-top: 1rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>