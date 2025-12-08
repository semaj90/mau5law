// src/lib/phase72/routeGraphAdapter.ts
import type { RouteAstGraph } from '$lib/command-center-manifest';
// If your ts-morph script writes this JSON, adjust the path accordingly.
import graphJson from '$lib/phase72/route-ast-graph.json' assert { type: 'json' };

export async function getRouteAstGraph(): Promise<{
	graph: RouteAstGraph;
	stats: {
		totalRoutes: number;
		totalEdges: number;
	};
}> {
	const graph = graphJson as RouteAstGraph;

	return {
		graph,
		stats: {
			totalRoutes: graph.nodes.length,
			totalEdges: graph.edges.length
		}
	};
}
