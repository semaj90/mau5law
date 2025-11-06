<script lang="ts">
// Fixed imports and clean top-level declarations
import { onDestroy, onMount } from 'svelte';
import * as yorhaAPI from '$lib/components/three/yorha-ui/api/YoRHaAPIClient.svelte';
import YoRHaSystemStatus from '$lib/components/yorha/YoRHaSystemStatus.svelte';
import type { PageData } from './$types';
import type { SvelteComponent } from 'svelte';

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
let { data } = ($props() as { data: PageData });

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
	timestamp: Date.now()
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

// mark intentionally unused variable as used (no-op) to silence: "declared but never read"
$effect(() => {
	void _multicoreStatus;
});

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