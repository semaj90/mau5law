import { getRouteAstGraph } from '$lib/phase72/routeGraphAdapter';
import type { PageServerLoad } from './$types';

// ─────────────────────────────────────────────────────────
// Types for /all-routes UI (matches ErrorModal.svelte)
// ─────────────────────────────────────────────────────────

export type RouteNode = {
	id: string;
	path: string;
	url?: string;
	href?: string;
	file?: string;
	kind?: 'page' | 'layout' | 'server' | 'endpoint' | string;
	group?: string; // (app), (yorha), etc.
	status?: 'ok' | 'warning' | 'error';
	tags?: string[];
	category?: string;
	lastModified?: string;
	hasLoad?: boolean;
	hasActions?: boolean;
	hasAiImports?: boolean;
};

export type RouteErrorCluster = {
	id: string;
	routeId: string;
	tool: 'svelte-check' | 'tsc' | 'vite' | 'drizzle' | 'custom' | string;
	code: string;
	message: string;
	severity: 'info' | 'warning' | 'error' | string;
	count: number;
	lastSeen?: string;
	file?: string;
	rawLogSnippet?: string;
};

// ─────────────────────────────────────────────────────────
// Helper: map AST nodes to RouteNode
// ─────────────────────────────────────────────────────────

function astNodeToRouteNode(astNode: any): RouteNode {
	const nodeId = astNode.id || astNode.path || String(Math.random());

	// Parse SvelteKit route pattern to extract group, kind
	const path = astNode.path || '';
	const groupMatch = path.match(/\(([^)]+)\)/);
	const group = groupMatch ? `(${groupMatch[1]})` : undefined;

	// Infer kind from file extension or name
	let kind: RouteNode['kind'] = 'page';
	if (astNode.file?.includes('+layout')) kind = 'layout';
	else if (astNode.file?.includes('+server')) kind = 'server';
	else if (astNode.file?.includes('api/')) kind = 'endpoint';

	// Build tags from file structure or keywords
	const tags: string[] = [];
	if (path.includes('cases')) tags.push('case');
	if (path.includes('evidence')) tags.push('evidence');
	if (path.includes('persons')) tags.push('person');
	if (path.includes('api')) tags.push('api');
	if (path.includes('yorha')) tags.push('yorha');
	if (astNode.hasAiImports) tags.push('ai');

	return {
		id: nodeId,
		path: path,
		href: path,
		file: astNode.file,
		kind,
		group,
		status: 'ok', // Will be overridden by error clusters
		tags: tags.length ? tags : undefined,
		category: group ? `Routes/${group}` : 'Routes/root',
		lastModified: astNode.lastModified,
		hasLoad: astNode.hasLoad ?? false,
		hasActions: astNode.hasActions ?? false,
		hasAiImports: astNode.hasAiImports ?? false
	};
}

// ─────────────────────────────────────────────────────────
// Helper: build error clusters from build logs
// ─────────────────────────────────────────────────────────

function buildErrorClusters(
	routes: RouteNode[],
	astGraph: any
): RouteErrorCluster[] {
	const clusters: RouteErrorCluster[] = [];
	const clusterId = new Map<string, number>();

	// TODO: Once Phase 78 database is live, query route_health + error_events here
	// For now, we'll infer from the AST graph structure

	// Example: if a route has no handlers, mark as warning
	for (const route of routes) {
		if (!route.hasLoad && !route.hasActions && route.kind === 'page') {
			const id = `cluster-${route.id}-no-handlers`;
			if (!clusterId.has(id)) {
				clusters.push({
					id,
					routeId: route.id,
					tool: 'ts-morph',
					code: 'ROUTE_NO_HANDLERS',
					message: `Page route has no +page.server.ts or +page.ts (no data loading or actions)`,
					severity: 'info',
					count: 1,
					lastSeen: new Date().toISOString()
				});
				clusterId.set(id, clusters.length - 1);
			}
		}
	}

	return clusters;
}

export const load: PageServerLoad = async () => {
	let astGraph = { nodes: [], edges: [] };
	let astStats: any = {};
	let routes: RouteNode[] = [];
	let errorClusters: RouteErrorCluster[] = [];

	// ─────────────────────────────────────────────────────────
	// Step 1: Load Phase 72 AST graph
	// ─────────────────────────────────────────────────────────

	try {
		const result = await getRouteAstGraph();
		astGraph = result.graph || astGraph;
		astStats = result.stats || astStats;

		// Convert AST nodes to RouteNode format
		if (astGraph.nodes && Array.isArray(astGraph.nodes)) {
			routes = astGraph.nodes.map((node: any) => astNodeToRouteNode(node));
		}

		console.log(`[Phase 78] Loaded ${routes.length} routes from Phase 72 AST`);
	} catch (error) {
		console.error('[Phase 78] Route AST load error:', error);
		// Continue with empty routes - UI will render empty state
	}

	// ─────────────────────────────────────────────────────────
	// Step 2: Build error clusters (from AST + future db queries)
	// ─────────────────────────────────────────────────────────

	try {
		errorClusters = buildErrorClusters(routes, astGraph);
		console.log(`[Phase 78] Built ${errorClusters.length} error clusters`);
	} catch (error) {
		console.error('[Phase 78] Error cluster build error:', error);
	}

	// ─────────────────────────────────────────────────────────
	// Step 3: Update route status based on error clusters
	// ─────────────────────────────────────────────────────────

	const clustersByRouteId = new Map<string, RouteErrorCluster[]>();
	for (const cluster of errorClusters) {
		if (!clustersByRouteId.has(cluster.routeId)) {
			clustersByRouteId.set(cluster.routeId, []);
		}
		clustersByRouteId.get(cluster.routeId)!.push(cluster);
	}

	for (const route of routes) {
		const clusters = clustersByRouteId.get(route.id) ?? [];
		if (clusters.some((c) => c.severity === 'error')) {
			route.status = 'error';
		} else if (clusters.some((c) => c.severity === 'warning')) {
			route.status = 'warning';
		}
	}

	// ─────────────────────────────────────────────────────────
	// Step 4: Return shaped data for UI
	// ─────────────────────────────────────────────────────────

	return {
		routes,
		errorClusters,
		stats: {
			totalRoutes: routes.length,
			totalClusters: errorClusters.length,
			errorCount: errorClusters.filter((c) => c.severity === 'error').length,
			warningCount: errorClusters.filter((c) => c.severity === 'warning').length
		}
	};
};
