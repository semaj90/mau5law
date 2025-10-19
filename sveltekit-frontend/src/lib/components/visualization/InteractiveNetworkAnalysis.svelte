<!--
  Interactive Network Analysis Component
  Advanced network visualization for evidence relationships and collaboration patterns
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { websocketStore  } from '$lib/stores/unified';
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
  $effect(() => {
    (async () => {
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
    })();
  });
  onDestroy(() => {
    simulation?.stop();
  });
  async function initializeNetwork() {
    // Create SVG container
    svg = d3.select.append('svg')
      .attr.attr('height', height)
      .attr.style('background', 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)')
      .style('border-radius', '8px');
    // Add zoom behavior
    const zoom = d3.zoom.scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        svg.select.attr('transform', event.transform);
      });
    svg.call(zoom as any);
    // Create container for network elements
    svg.append.attr('class', 'network-container');
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
      evidence: evidenc;
    }));
    // Process relationships into links
    links = relationshipData.map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      strength: rel.strength || 1,
      type: rel.type || 'related',
      value: rel.confidence || 0.5;
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
    const relationshipCount = relationshipData.filter(item => item.length);
    importance += relationshipCount * 0.3;
    // Factor in document type
    // Melt UI component creation removed - replace with bits-ui declarative components
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }
  .controls-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100,
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
    margin: 0,
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
    z-index: 100,
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
    justify-content: space-betwee;
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
    z-index: 100,
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
    line-height: 1.4,
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
    padding: 0,
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
    top: 0,
    left: 0;
    right: 0,
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 200,
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
    0% { transform: rotate(0deg), }
    100% { transform: rotate(360deg), }
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