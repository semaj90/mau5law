<!--
  Interactive Network Analysis Component
  Advanced network visualization for evidence relationships and collaboration patterns
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { websocketStore } from '$lib/stores/websocket-store';
  import * as d3 from 'd3';

  // Props
  interface Props {
    caseId: string;
    evidenceData: any[];
    relationshipData: any[];
    width?: number;
    height?: number;
    interactive?: boolean;
    showClusters?: boolean;
    showMetrics?: boolean;
    realTimeUpdates?: boolean;
  }

  let {
    caseId,
    evidenceData = [],
    relationshipData = [],
    width = 800,
    height = 600,
    interactive = true,
    showClusters = true,
    showMetrics = true,
    realTimeUpdates = false
  }: Props = $props();

  // Reactive state
  let containerElement: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let simulation: d3.Simulation<any, any>;

  let selectedNode = $state<any>(null);
  let hoveredNode = $state<any>(null);
  let networkMetrics = $state<any>({});
  let clusterData = $state<any[]>([]);
  let isLoading = $state(true);
  let analysisMode = $state<'relationships' | 'importance' | 'timeline' | 'similarity'>('relationships');

  // Network data
  let nodes = $state<any[]>([]);
  let links = $state<any[]>([]);
  let clusters = $state<any[]>([]);

  // D3 elements
  let nodeElements: d3.Selection<SVGCircleElement, any, SVGGElement, unknown>;
  let linkElements: d3.Selection<SVGLineElement, any, SVGGElement, unknown>;
  let labelElements: d3.Selection<SVGTextElement, any, SVGGElement, unknown>;
  let clusterElements: d3.Selection<SVGCircleElement, any, SVGGElement, unknown>;

  // Lifecycle
  onMount(async () => {
    if (!browser) return;

    try {
      await initializeNetwork();
      await processNetworkData();
      calculateNetworkMetrics();
      createVisualization();

      if (realTimeUpdates) {
        setupRealTimeUpdates();
      }

      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize network analysis:', error);
      isLoading = false;
    }
  });

  onDestroy(() => {
    simulation?.stop();
  });

  async function initializeNetwork() {
    // Create SVG container
    svg = d3.select(containerElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)')
      .style('border-radius', '8px');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        svg.select('.network-container')
          .attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create container for network elements
    svg.append('g').attr('class', 'network-container');
  }

  async function processNetworkData() {
    // Process evidence data into nodes
    nodes = evidenceData.map(evidence => ({
      id: evidence.id,
      label: evidence.title || `Evidence ${evidence.id}`,
      type: evidence.type || 'document',
      importance: calculateImportance(evidence),
      cluster: assignCluster(evidence),
      x: Math.random() * width,
      y: Math.random() * height,
      evidence: evidence
    }));

    // Process relationships into links
    links = relationshipData.map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      strength: rel.strength || 1,
      type: rel.type || 'related',
      value: rel.confidence || 0.5
    }));

    // Add implicit links based on analysis mode
    addImplicitLinks();

    // Detect communities/clusters
    if (showClusters) {
      detectCommunities();
    }
  }

  function calculateImportance(evidence: any): number {
    let importance = 1;

    // Factor in AI analysis results
    if (evidence.aiSummary) importance += 2;
    if (evidence.entities?.length > 0) importance += evidence.entities.length * 0.5;
    if (evidence.sentiment?.confidence > 0.8) importance += 1;

    // Factor in relationships
    const relationshipCount = relationshipData.filter(rel =>
      rel.sourceId === evidence.id || rel.targetId === evidence.id
    ).length;
    importance += relationshipCount * 0.3;

    // Factor in document type
    const typeMultipliers = {
      'key_document': 3,
      'witness_statement': 2,
      'photo': 1.5,
      'video': 2,
      'document': 1
    };
    importance *= typeMultipliers[evidence.type as keyof typeof typeMultipliers] || 1;

    return Math.min(importance, 10); // Cap at 10
  }

  function assignCluster(evidence: any): number {
    // Simple clustering based on evidence type and temporal proximity
    const clusters = {
      'document': 0,
      'photo': 1,
      'video': 2,
      'audio': 3,
      'witness_statement': 4,
      'key_document': 5
    };

    return clusters[evidence.type as keyof typeof clusters] || 0;
  }

  function addImplicitLinks() {
    switch (analysisMode) {
      case 'timeline':
        addTemporalLinks();
        break;
      case 'similarity':
        addSimilarityLinks();
        break;
      case 'importance':
        addImportanceLinks();
        break;
    }
  }

  function addTemporalLinks() {
    // Sort evidence by date and link sequential items
    const sortedEvidence = [...evidenceData].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (let i = 0; i < sortedEvidence.length - 1; i++) {
      const timeDiff = new Date(sortedEvidence[i + 1].createdAt).getTime() -
                      new Date(sortedEvidence[i].createdAt).getTime();

      if (timeDiff <= 86400000) { // Within 1 day
        links.push({
          source: sortedEvidence[i].id,
          target: sortedEvidence[i + 1].id,
          strength: 1 - (timeDiff / 86400000),
          type: 'temporal',
          value: 0.7
        });
      }
    }
  }

  function addSimilarityLinks() {
    // Add links based on content similarity (simplified)
    evidenceData.forEach((evidence1, i) => {
      evidenceData.slice(i + 1).forEach(evidence2 => {
        const similarity = calculateContentSimilarity(evidence1, evidence2);
        if (similarity > 0.3) {
          links.push({
            source: evidence1.id,
            target: evidence2.id,
            strength: similarity,
            type: 'similarity',
            value: similarity
          });
        }
      });
    });
  }

  function addImportanceLinks() {
    // Connect high-importance nodes
    const importantNodes = nodes.filter(n => n.importance > 5);
    importantNodes.forEach((node1, i) => {
      importantNodes.slice(i + 1).forEach(node2 => {
        links.push({
          source: node1.id,
          target: node2.id,
          strength: (node1.importance + node2.importance) / 20,
          type: 'importance',
          value: 0.6
        });
      });
    });
  }

  function calculateContentSimilarity(evidence1: any, evidence2: any): number {
    // Simplified similarity calculation
    let similarity = 0;

    // Type similarity
    if (evidence1.type === evidence2.type) similarity += 0.3;

    // Entity overlap
    if (evidence1.entities && evidence2.entities) {
      const entities1 = new Set(evidence1.entities.map((e: any) => e.text.toLowerCase()));
      const entities2 = new Set(evidence2.entities.map((e: any) => e.text.toLowerCase()));
      const overlap = new Set([...entities1].filter(e => entities2.has(e)));
      similarity += (overlap.size / Math.max(entities1.size, entities2.size, 1)) * 0.7;
    }

    return Math.min(similarity, 1);
  }

  function detectCommunities() {
    // Simple community detection using modularity-based clustering
    const communities = new Map<number, any[]>();

    nodes.forEach(node => {
      const cluster = node.cluster;
      if (!communities.has(cluster)) {
        communities.set(cluster, []);
      }
      communities.get(cluster)!.push(node);
    });

    clusters = Array.from(communities.entries()).map(([clusterId, clusterNodes]) => ({
      id: clusterId,
      nodes: clusterNodes,
      centroid: {
        x: d3.mean(clusterNodes, d => d.x) || 0,
        y: d3.mean(clusterNodes, d => d.y) || 0
      },
      size: clusterNodes.length,
      color: getClusterColor(clusterId)
    }));

    clusterData = clusters;
  }

  function calculateNetworkMetrics() {
    const nodeCount = nodes.length;
    const linkCount = links.length;

    // Calculate density
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = linkCount / maxPossibleLinks;

    // Calculate degree centrality
    const degrees = new Map<string, number>();
    links.forEach(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      degrees.set(source, (degrees.get(source) || 0) + 1);
      degrees.set(target, (degrees.get(target) || 0) + 1);
    });

    const avgDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0) / nodeCount;
    const maxDegree = Math.max(...Array.from(degrees.values()));

    // Calculate clustering coefficient (simplified)
    let totalClustering = 0;
    nodes.forEach(node => {
      const neighbors = getNeighbors(node.id);
      if (neighbors.length < 2) return;

      let neighborConnections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (areConnected(neighbors[i], neighbors[j])) {
            neighborConnections++;
          }
        }
      }

      const maxNeighborConnections = (neighbors.length * (neighbors.length - 1)) / 2;
      totalClustering += maxNeighborConnections > 0 ? neighborConnections / maxNeighborConnections : 0;
    });

    const avgClustering = totalClustering / nodeCount;

    networkMetrics = {
      nodeCount,
      linkCount,
      density: (density * 100).toFixed(1),
      avgDegree: avgDegree.toFixed(1),
      maxDegree,
      avgClustering: (avgClustering * 100).toFixed(1),
      communities: clusters.length
    };
  }

  function getNeighbors(nodeId: string): string[] {
    const neighbors: string[] = [];
    links.forEach(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      if (source === nodeId) neighbors.push(target);
      if (target === nodeId) neighbors.push(source);
    });
    return neighbors;
  }

  function areConnected(nodeId1: string, nodeId2: string): boolean {
    return links.some(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      return (source === nodeId1 && target === nodeId2) ||
             (source === nodeId2 && target === nodeId1);
    });
  }

  function createVisualization() {
    const container = svg.select('.network-container');

    // Create force simulation
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 2));

    // Draw cluster hulls
    if (showClusters) {
      drawClusterHulls(container);
    }

    // Draw links
    linkElements = container
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => getLinkColor(d.type))
      .attr('stroke-width', d => Math.sqrt(d.value) * 3)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    nodeElements = container
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', interactive ? 'pointer' : 'default');

    // Add node labels
    labelElements = container
      .selectAll('.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('pointer-events', 'none')
      .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label);

    // Add interactivity
    if (interactive) {
      nodeElements
        .on('mouseover', handleNodeHover)
        .on('mouseout', handleNodeUnhover)
        .on('click', handleNodeClick)
        .call(d3.drag<SVGCircleElement, any>()
          .on('start', handleDragStart)
          .on('drag', handleDrag)
          .on('end', handleDragEnd)
        );
    }

    // Start simulation
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeElements
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labelElements
        .attr('x', d => d.x)
        .attr('y', d => d.y);

      if (showClusters) {
        updateClusterHulls();
      }
    });
  }

  function drawClusterHulls(container: any) {
    clusterElements = container
      .selectAll('.cluster-hull')
      .data(clusters)
      .enter()
      .append('circle')
      .attr('class', 'cluster-hull')
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.1)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.3);
  }

  function updateClusterHulls() {
    if (!clusterElements) return;

    clusters.forEach(cluster => {
      cluster.centroid = {
        x: d3.mean(cluster.nodes, d => d.x) || 0,
        y: d3.mean(cluster.nodes, d => d.y) || 0
      };

      // Calculate hull radius
      const distances = cluster.nodes.map(node =>
        Math.sqrt(Math.pow(node.x - cluster.centroid.x, 2) + Math.pow(node.y - cluster.centroid.y, 2))
      );
      cluster.radius = Math.max(...distances) + 20;
    });

    clusterElements
      .attr('cx', d => d.centroid.x)
      .attr('cy', d => d.centroid.y)
      .attr('r', d => d.radius);
  }

  function getNodeRadius(node: any): number {
    return Math.max(5, Math.min(20, node.importance * 3));
  }

  function getNodeColor(node: any): string {
    const colors = {
      'document': '#4CAF50',
      'photo': '#2196F3',
      'video': '#9C27B0',
      'audio': '#FF9800',
      'witness_statement': '#F44336',
      'key_document': '#FFD700'
    };

    return colors[node.type as keyof typeof colors] || '#607D8B';
  }

  function getLinkColor(linkType: string): string {
    const colors = {
      'related': '#4CAF50',
      'temporal': '#2196F3',
      'similarity': '#FF9800',
      'importance': '#9C27B0',
      'causal': '#F44336'
    };

    return colors[linkType as keyof typeof colors] || '#666';
  }

  function getClusterColor(clusterId: number): string {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#FFD700', '#00BCD4'];
    return colors[clusterId % colors.length];
  }

  function handleNodeHover(event: any, node: any) {
    hoveredNode = node;

    // Highlight connected nodes and links
    nodeElements
      .style('opacity', d => isConnected(d, node) ? 1 : 0.3);

    linkElements
      .style('opacity', d => d.source.id === node.id || d.target.id === node.id ? 1 : 0.1);

    labelElements
      .style('opacity', d => isConnected(d, node) ? 1 : 0.3);
  }

  function handleNodeUnhover() {
    hoveredNode = null;

    // Reset opacity
    nodeElements.style('opacity', 1);
    linkElements.style('opacity', 0.6);
    labelElements.style('opacity', 1);
  }

  function handleNodeClick(event: any, node: any) {
    selectedNode = selectedNode?.id === node.id ? null : node;

    // Update visual selection
    nodeElements
      .attr('stroke-width', d => d.id === selectedNode?.id ? 3 : 1.5)
      .attr('stroke', d => d.id === selectedNode?.id ? '#FFD700' : '#fff');
  }

  function handleDragStart(event: any, node: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
  }

  function handleDrag(event: any, node: any) {
    node.fx = event.x;
    node.fy = event.y;
  }

  function handleDragEnd(event: any, node: any) {
    if (!event.active) simulation.alphaTarget(0);
    node.fx = null;
    node.fy = null;
  }

  function isConnected(nodeA: any, nodeB: any): boolean {
    if (nodeA.id === nodeB.id) return true;

    return links.some(link =>
      (link.source.id === nodeA.id && link.target.id === nodeB.id) ||
      (link.source.id === nodeB.id && link.target.id === nodeA.id)
    );
  }

  function changeAnalysisMode(mode: 'relationships' | 'importance' | 'timeline' | 'similarity') {
    analysisMode = mode;

    // Recalculate links based on new mode
    links = relationshipData.map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      strength: rel.strength || 1,
      type: rel.type || 'related',
      value: rel.confidence || 0.5
    }));

    addImplicitLinks();

    // Update simulation
    simulation.force('link', d3.forceLink(links).id((d: any) => d.id).strength(d => d.strength));
    simulation.alpha(1).restart();
  }

  function setupRealTimeUpdates() {
    // Setup WebSocket listeners for real-time updates
    websocketStore.subscribeToDashboard();

    // This would integrate with the websocket store to receive updates
    // and dynamically add/remove nodes and links
  }

  function exportNetwork() {
    // Export network data as JSON
    const networkData = {
      nodes: nodes.map(n => ({ ...n, x: undefined, y: undefined })),
      links: links,
      metrics: networkMetrics,
      clusters: clusters
    };

    const dataStr = JSON.stringify(networkData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `network-analysis-${caseId}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function resetNetwork() {
    simulation.alpha(1).restart();
    selectedNode = null;
    hoveredNode = null;

    // Reset visual states
    nodeElements
      .attr('stroke-width', 1.5)
      .attr('stroke', '#fff')
      .style('opacity', 1);

    linkElements.style('opacity', 0.6);
    labelElements.style('opacity', 1);
  }
</script>

<div class="network-container" style="position: relative; width: {width}px; height: {height}px;">
  <!-- Controls -->
  <div class="controls-panel">
    <div class="analysis-controls">
      <label>Analysis Mode:</label>
      <select bind:value={analysisMode} onchange={(e) => changeAnalysisMode(e.target.value)}>
        <option value="relationships">Relationships</option>
        <option value="importance">Importance</option>
        <option value="timeline">Timeline</option>
        <option value="similarity">Similarity</option>
      </select>
    </div>

    <div class="view-controls">
      <label>
        <input type="checkbox" bind:checked={showClusters} onchange={() => createVisualization()}>
        Show Clusters
      </label>
      <label>
        <input type="checkbox" bind:checked={showMetrics}>
        Show Metrics
      </label>
    </div>

    <div class="action-controls">
      <button class="btn-control" onclick={resetNetwork}>Reset</button>
      <button class="btn-control" onclick={exportNetwork}>Export</button>
    </div>
  </div>

  <!-- Network Metrics Panel -->
  {#if showMetrics}
    <div class="metrics-panel">
      <h3>Network Metrics</h3>
      <div class="metrics-grid">
        <div class="metric">
          <label>Nodes:</label>
          <span>{networkMetrics.nodeCount}</span>
        </div>
        <div class="metric">
          <label>Links:</label>
          <span>{networkMetrics.linkCount}</span>
        </div>
        <div class="metric">
          <label>Density:</label>
          <span>{networkMetrics.density}%</span>
        </div>
        <div class="metric">
          <label>Avg Degree:</label>
          <span>{networkMetrics.avgDegree}</span>
        </div>
        <div class="metric">
          <label>Max Degree:</label>
          <span>{networkMetrics.maxDegree}</span>
        </div>
        <div class="metric">
          <label>Clustering:</label>
          <span>{networkMetrics.avgClustering}%</span>
        </div>
        <div class="metric">
          <label>Communities:</label>
          <span>{networkMetrics.communities}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Node Details Panel -->
  {#if selectedNode}
    <div class="node-details-panel">
      <h3>{selectedNode.label}</h3>
      <div class="details-content">
        <p><strong>Type:</strong> {selectedNode.type}</p>
        <p><strong>Importance:</strong> {selectedNode.importance.toFixed(1)}/10</p>
        <p><strong>Cluster:</strong> {selectedNode.cluster}</p>
        <p><strong>Connections:</strong> {getNeighbors(selectedNode.id).length}</p>

        {#if selectedNode.evidence.aiSummary}
          <p><strong>AI Summary:</strong> {selectedNode.evidence.aiSummary}</p>
        {/if}

        <div class="connected-nodes">
          <h4>Connected Evidence:</h4>
          <ul>
            {#each getNeighbors(selectedNode.id).slice(0, 5) as neighborId}
              {@const neighbor = nodes.find(n => n.id === neighborId)}
              {#if neighbor}
                <li>{neighbor.label}</li>
              {/if}
            {/each}
          </ul>
        </div>
      </div>

      <button class="btn-close" onclick={() => selectedNode = null}>×</button>
    </div>
  {/if}

  <!-- Loading indicator -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Analyzing network structure...</p>
    </div>
  {/if}

  <!-- Network visualization container -->
  <div bind:this={containerElement} class="d3-container"></div>
</div>

<style>
  .network-container {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }

  .controls-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(0, 0, 0, 0.8);
    padding: 15px;
    border-radius: 6px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 200px;
  }

  .analysis-controls, .view-controls, .action-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .analysis-controls label, .view-controls label {
    color: #ccc;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .analysis-controls select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .view-controls label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .view-controls input[type="checkbox"] {
    margin: 0;
  }

  .action-controls {
    flex-direction: row;
    gap: 5px;
  }

  .btn-control {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-control:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .metrics-panel {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 6px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 200px;
  }

  .metrics-panel h3 {
    margin: 0 0 10px 0;
    color: #4a90e2;
    font-size: 14px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .metric label {
    color: #ccc;
  }

  .metric span {
    color: #4a90e2;
    font-weight: bold;
  }

  .node-details-panel {
    position: absolute;
    bottom: 10px;
    left: 10px;
    z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 6px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 300px;
  }

  .node-details-panel h3 {
    margin: 0 0 10px 0;
    color: #4a90e2;
    font-size: 16px;
    padding-right: 20px;
  }

  .details-content p {
    margin: 5px 0;
    font-size: 14px;
    line-height: 1.4;
  }

  .connected-nodes {
    margin-top: 10px;
  }

  .connected-nodes h4 {
    margin: 0 0 5px 0;
    color: #4a90e2;
    font-size: 14px;
  }

  .connected-nodes ul {
    margin: 0;
    padding-left: 15px;
    list-style-type: disc;
  }

  .connected-nodes li {
    font-size: 12px;
    color: #ccc;
    margin: 2px 0;
  }

  .btn-close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: #ccc;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    color: white;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 200;
    color: white;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid #4a90e2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .d3-container {
    width: 100%;
    height: 100%;
  }

  :global(.network-container .link) {
    transition: opacity 0.2s ease;
  }

  :global(.network-container .node) {
    transition: opacity 0.2s ease;
  }

  :global(.network-container .label) {
    transition: opacity 0.2s ease;
  }
</style>