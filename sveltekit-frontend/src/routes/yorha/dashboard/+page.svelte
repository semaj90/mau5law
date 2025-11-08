<script lang="ts">
  // Fixed imports and clean top-level declarations
  import { onDestroy, onMount } from 'svelte';
  import * as yorhaAPI from '$lib/components/three/yorha-ui/api/YoRHaAPIClient';
  import YoRHaSystemStatus from '$lib/components/yorha/YoRHaSystemStatus.svelte';
  import type { PageData } from './$types';

  // runtime d3 namespace holder — use `any` to avoid TS namespace generics issues at compile time
  let d3: any = null;

  // Add strongly-typed graph interfaces (do NOT extend d3 namespaces)
  type Position = { x: number; y: number };
  interface GraphNode {
    id: string;
    type: 'database' | 'service' | 'component' | string;
    label: string;
    status: 'healthy' | 'warning' | 'error' | string;
    position?: Position;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }
  interface GraphEdge {
    id: string;
    source: string | GraphNode;
    target: string | GraphNode;
    type: string;
    traffic: number;
    latency: number;
  }
  interface YoRHaGraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
  }

  // Svelte, 5 (runes) pattern: read page data from $props() // keep TS typing with an assertion
  let { data } = $props() as { data: PageData };

  // System metrics and status - initialized from SSR data
  let systemMetrics = $state(data.systemStatus);

  // typed graphData with a safe default to avoid: 'never' inference
  let graphData = $state<YoRHaGraphData>(data.graphData ?? { nodes: [], edges: [] });

  let _multicoreStatus = $state(data.multicoreStatus); // prefixed with: '_' to indicate intentionally unused

  // Correct realtimeData typing and initialization
  let realtimeData = $state({
    cpuHistory: [] as number[],
    memoryHistory: [] as number[],
    networkHistory: [] as number[],
    timestamp: Date.now(),
  });

  let isLoading = $state(!data.initialLoad);
  let lastUpdate = $state(new Date(data.timestamp));

  // Data update intervals
  let metricsInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let realtimeInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let errorMessage = $state<string | null>(null);

  // add a ref for the d3 render container - make reactive so bind:this updates are tracked
  let graphContainer = $state<HTMLElement | null>(null);

  // D3 runtime handles - use: any to avoid referencing missing `select` symbol/type
  let svg: any = null;
  let simulation: any = null;

  let resizeObserver: ResizeObserver | null = null;

  // dynamic loader for YoRHaDataVizComponent
  let YoRHaDataVizComponent = $state<any | null>(null);

  // add: derived wrapper for runes-mode dynamic component rendering
  let VizComponent = $derived(YoRHaDataVizComponent);

  // add: safe vizProps derived from page data to avoid TS errors when PageData lacks vizProps
  let vizProps = $derived(() => (data as any).vizProps ?? {});

  // mark intentionally unused variable as used (no-op) to silence: "declared but never read"
  $effect(() => {
    void _multicoreStatus;
  });

  // Define missing functions
  async function loadSystemData(): Promise<void> {
    isLoading = true;
    errorMessage = null;
    try {
      // Simulate API call to fetch initial system data
      // NOTE: The import `import * as yorhaAPI from '$lib/components/three/yorha-ui/api/YoRHaAPIClient.svelte';`
      // suggests `YoRHaAPIClient.svelte` is a Svelte component. If it's meant to provide API functions,
      // it should typically be a `.ts` or `.js` file. For now, assuming `yorhaAPI` has these methods.
      const response = await yorhaAPI.getSystemStatus(); // Assuming this exists and returns data
      systemMetrics = response.systemStatus;
      graphData = response.graphData ?? { nodes: [], edges: [] };
      lastUpdate = new Date(response.timestamp);
    } catch (error: any) {
      console.error('Failed to load system data:', error);
      errorMessage = `Failed to load system data: ${error.message || 'Unknown error'}`;
    } finally {
      isLoading = false;
    }
  }

  function startRealTimeUpdates(): void {
    // Clear any existing intervals first
    if (metricsInterval) clearInterval(metricsInterval);
    if (realtimeInterval) clearInterval(realtimeInterval);

    metricsInterval = setInterval(async () => {
      try {
        const status = await yorhaAPI.getSystemStatus(); // Fetch updated system status
        systemMetrics = status.systemStatus;
        lastUpdate = new Date(status.timestamp);
      } catch (error: any) {
        console.error('Failed to update system metrics:', error);
        errorMessage = `Failed to update system metrics: ${error.message || 'Unknown error'}`;
      }
    }, 5000); // Update every 5 seconds

    realtimeInterval = setInterval(async () => {
      try {
        const rtData = await yorhaAPI.getRealtimeMetrics(); // Fetch updated real-time metrics
        realtimeData = {
          cpuHistory: [...realtimeData.cpuHistory.slice(-59), rtData.cpu], // Keep last 60 points
          memoryHistory: [...realtimeData.memoryHistory.slice(-59), rtData.memory],
          networkHistory: [...realtimeData.networkHistory.slice(-59), rtData.network],
          timestamp: Date.now(),
        };
      } catch (error: any) {
        console.error('Failed to update real-time data:', error);
        errorMessage = `Failed to update real-time data: ${error.message || 'Unknown error'}`;
      }
    }, 1000); // Update every 1 second
  }

  function cleanupD3(): void {
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
    if (realtimeInterval) {
      clearInterval(realtimeInterval);
      realtimeInterval = null;
    }
    if (simulation) {
      simulation.stop();
      simulation = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (svg) {
      svg.selectAll('*').remove();
      svg = null;
    }
    d3 = null; // Clear d3 reference
  }

  $effect(() => {
    (async () => {
      await loadSystemData();
      startRealTimeUpdates();
    })();
  });

  // call init/cleanup from Svelte lifecycle to avoid: "declared but never read"
  onMount(() => {
    initD3();

    // dynamic import of data viz component (safe, non-blocking)
    (async () => {
      try {
        const modAny: any = await import('$lib/components/yorha/YoRHaDataViz.svelte');
        YoRHaDataVizComponent = (modAny && (modAny.default ?? modAny)) || null;
      } catch (err) {
        // non-fatal - continue without viz if module not present
        console.warn('YoRHaDataViz failed to load:', err);
        YoRHaDataVizComponent = null;
      }
    })();

    return () => {
      // also ensure cleanup if Svelte calls the returned cleanup
      cleanupD3();
    };
  });

  onDestroy(() => {
    cleanupD3();
  });

  // react to graphData updates and re-render D3 when data changes
  $effect(() => {
    graphData; // make reactive
    if (svg) {
      updateD3();
    }
  });

  // make initD3 async and perform a dynamic import of d3
  async function initD3(): Promise<void> {
    if (!graphContainer) return;
    try {
      const modAny: any = await import('d3');
      d3 = (modAny && (modAny.default ?? modAny)) || null;
    } catch (e) {
      console.warn('d3 failed to load dynamically', e);
      return;
    }

    // clear previous svg if present
    d3.select(graphContainer).selectAll('*').remove();
    const { width, height } = graphContainer.getBoundingClientRect();
    svg = d3
      .select(graphContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${Math.max(300, width)} ${Math.max(300, height)}`);

    // groups
    svg.append('g').attr('class', 'links');
    svg.append('g').attr('class', 'nodes');

    // create simulation using d3 namespace (avoid static generics)
    simulation = d3.forceSimulation();
    const linkForce = d3
      .forceLink()
      .id((d: any) => d.id)
      .distance(120)
      .strength(0.6);
    simulation.force('link', linkForce);
    simulation.force('charge', d3.forceManyBody().strength(-400));
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    simulation.force('collision', d3.forceCollide(40));

    // setup resize observer to keep svg responsive
    resizeObserver = new ResizeObserver(() => {
      if (!graphContainer || !svg) return;
      const r = graphContainer.getBoundingClientRect();
      svg.attr('width', r.width).attr('height', r.height);
      const center = d3.forceCenter(r.width / 2, r.height / 2);
      if (simulation) simulation.force('center', center).alpha(0.5).restart();
    });
    resizeObserver.observe(graphContainer);

    updateD3();
  }

  function updateD3() {
    if (!svg || !simulation || !graphContainer || !d3) return;

    // Copy data (avoid mutating original)
    const nodes: GraphNode[] = graphData.nodes.map((n) => ({ ...n }));
    const edges: GraphEdge[] = graphData.edges.map((e) => ({ ...e }));

    // Update links
    const link = svg
      .select('.links')
      .selectAll('line')
      .data(edges, (d: GraphEdge) => d.id)
      .join(
        (enter: any) =>
          enter
            .append('line')
            .attr('stroke', '#555')
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#arrowhead)'), // Add marker for direction
        (update: any) => update,
        (exit: any) => exit.remove()
      );

    // Update nodes
    const node = svg
      .select('.nodes')
      .selectAll('g.node') // Select the group for nodes
      .data(nodes, (d: GraphNode) => d.id)
      .join(
        (enter: any) => {
          const g = enter.append('g').attr('class', 'node');

          g.append('circle')
            .attr('r', 20)
            .attr('fill', (d: GraphNode) => {
              if (d.status === 'healthy') return '#4ade80';
              if (d.status === 'warning') return '#fbbf24';
              if (d.status === 'error') return '#ef4444';
              return '#d4af37'; // Default color
            })
            .attr('stroke', '#333')
            .attr('stroke-width', 2);

          g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#000')
            .style('font-size', '10px')
            .text((d: GraphNode) => d.label);

          // Add drag behavior
          g.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

          return g;
        },
        (update: any) => {
          update.select('circle').attr('fill', (d: GraphNode) => {
            if (d.status === 'healthy') return '#4ade80';
            if (d.status === 'warning') return '#fbbf24';
            if (d.status === 'error') return '#ef4444';
            return '#d4af37';
          });
          update.select('text').text((d: GraphNode) => d.label);
          return update;
        },
        (exit: any) => exit.remove()
      );

    // Update simulation with new data
    simulation.nodes(nodes);
    (simulation.force('link') as any).links(edges); // Cast to any to access links method
    simulation.alpha(1).restart();

    // Define the 'ticked' function for simulation updates
    function ticked() {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    }

    simulation.on('tick', ticked);

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Add arrowhead definition for directed links
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25) // Position marker at the end of the line, slightly offset from node center
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#555')
      .style('stroke', 'none');
  }
</script>

<main>
  <div bind:this={graphContainer} class="graph-container"></div>

  <!-- Use runes-mode state variables directly -->
  {#if isLoading}
    <div class="loading-overlay">
      <YoRHaSystemStatus />
    </div>
  {/if}

  {#if errorMessage}
    <div class="error-message">Error: {errorMessage}</div>
  {/if}

  {#if VizComponent}
    <!-- Render with runes-mode dynamic component (no <svelte:component>) -->
    <VizComponent {...vizProps} />
  {/if}
</main>

<style>
  :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .graph-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.8);
    z-index: 10;
  }

  .error-message {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10;
  }
</style>
