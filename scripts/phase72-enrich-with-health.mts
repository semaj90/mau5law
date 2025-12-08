#!/usr/bin/env node

/**
 * Phase 72 + 78: Enrich Route AST Graph with Health Metadata
 *
 * Reads route-ast-graph.json (Phase 72).
 * Joins with route_health table (Phase 78).
 * Adds error state, error count, and last error info.
 * Writes enriched graph back.
 *
 * Usage:
 *   node scripts/phase72-enrich-with-health.mts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import postgres from 'postgres';

// ============================================================================
// TYPES
// ============================================================================

interface RawRouteNode {
	id: string;
	path: string;
	file: string;
	kind: 'page' | 'layout' | 'server' | 'page_server' | 'api';
	meta?: Record<string, unknown>;
}

interface EnrichedRouteNode extends RawRouteNode {
	meta: {
		errorState?: 'healthy' | 'flaky' | 'broken';
		errorCount?: number;
		lastErrorAt?: string;
		lastErrorMessageShort?: string;
	} & Record<string, unknown>;
}

interface RawRouteGraph {
	routes: RawRouteNode[];
}

interface EnrichedRouteGraph {
	routes: EnrichedRouteNode[];
	enrichedAt: string;
	stats: {
		healthy: number;
		flaky: number;
		broken: number;
		total: number;
	};
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('🌲 Phase 72 + 78: Enrich Route Graph with Health');
	console.log('━'.repeat(70));

	const FRONTEND_DIR = path.resolve(__dirname, '../sveltekit-frontend');
	const GRAPH_PATH = path.join(FRONTEND_DIR, 'static/phase72/route-ast-graph.json');
	const DATABASE_URL = process.env.DATABASE_URL;

	// Step 1: Load route graph
	console.log('\n📖 Step 1: Load Route Graph');
	if (!existsSync(GRAPH_PATH)) {
		console.error(`❌ Graph not found at ${GRAPH_PATH}`);
		process.exit(1);
	}

	let rawGraph: RawRouteGraph;
	try {
		rawGraph = JSON.parse(readFileSync(GRAPH_PATH, 'utf-8'));
		console.log(`   ✓ Loaded ${rawGraph.routes.length} routes`);
	} catch (error) {
		console.error('❌ Failed to parse graph:', error);
		process.exit(1);
	}

	// Step 2: Connect to database (if available)
	let healthData: Map<string, any> = new Map();
	if (DATABASE_URL) {
		console.log('\n🗄️  Step 2: Load Health Data from Database');
		const sql = postgres(DATABASE_URL);

		try {
			const rows = await sql`
        SELECT route_path, state, recent_error_count, total_error_count, last_error_at, last_error_message_short
        FROM route_health;
      `;

			for (const row of rows) {
				healthData.set(row.route_path, row);
			}
			console.log(`   ✓ Loaded health data for ${rows.length} routes`);
		} catch (error) {
			console.warn('   ⚠️  Failed to load health data (continuing without DB):', error);
		} finally {
			await sql.end();
		}
	} else {
		console.log('\n⚠️  Step 2: DATABASE_URL not set, using default health state');
	}

	// Step 3: Enrich graph
	console.log('\n🔄 Step 3: Enrich Routes with Health Metadata');
	const enriched: EnrichedRouteNode[] = [];
	const stats = { healthy: 0, flaky: 0, broken: 0, total: rawGraph.routes.length };

	for (const route of rawGraph.routes) {
		const health = healthData.get(route.path);

		const enrichedRoute: EnrichedRouteNode = {
			...route,
			meta: {
				...route.meta,
				errorState: health?.state ?? 'healthy',
				errorCount: health?.total_error_count ?? 0,
				lastErrorAt: health?.last_error_at ?? undefined,
				lastErrorMessageShort: health?.last_error_message_short ?? undefined
			}
		};

		if (health) {
			const state = health.state as 'healthy' | 'flaky' | 'broken';
			stats[state]++;
		} else {
			stats.healthy++;
		}

		enriched.push(enrichedRoute);
	}

	console.log(`   ✓ Enriched all routes`);
	console.log(`     - Healthy: ${stats.healthy}`);
	console.log(`     - Flaky:   ${stats.flaky}`);
	console.log(`     - Broken:  ${stats.broken}`);

	// Step 4: Write enriched graph
	console.log('\n💾 Step 4: Write Enriched Graph');
	const enrichedGraph: EnrichedRouteGraph = {
		routes: enriched,
		enrichedAt: new Date().toISOString(),
		stats
	};

	try {
		writeFileSync(
			GRAPH_PATH,
			JSON.stringify(enrichedGraph, null, 2)
		);
		console.log(`   ✓ Wrote enriched graph to ${GRAPH_PATH}`);
	} catch (error) {
		console.error('❌ Failed to write graph:', error);
		process.exit(1);
	}

	console.log('\n' + '━'.repeat(70));
	console.log('✅ Route graph enriched with health metadata');
	console.log(`   Total routes: ${stats.total}`);
	console.log(`   Timestamp: ${enrichedGraph.enrichedAt}`);
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
	console.error('❌ Enrichment failed:', error);
	process.exit(1);
});
