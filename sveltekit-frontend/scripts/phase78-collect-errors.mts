#!/usr/bin/env node
/**
 * Phase 78 – Cutlass Error Collector
 *
 * Ties Phase 72 (route graph) + Phase 74 (LangExtract) + Phase 90 (DB)
 *
 * Reads error logs, parses TS/JS errors, maps to routes, stores in DB
 *
 * Usage:
 *   node --loader ts-node/esm scripts/phase78-collect-errors.mts
 * or (if pre-compiled):
 *   node dist/scripts/phase78-collect-errors.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RawRouteNode = {
	id: string;
	path: string;
	file: string;
	kind: string;
	meta?: Record<string, unknown>;
};

type RawRouteGraph = {
	nodes: RawRouteNode[];
	edges: Array<{
		sourceId: string;
		targetId: string;
		type: string;
	}>;
	metadata: Record<string, unknown>;
};

// 1. Load Phase 72 route graph and map file → route path
function loadRouteGraph(): Map<string, string> {
	const graphPath = path.join(
		__dirname,
		'..',
		'static',
		'phase72',
		'route-ast-graph.json'
	);

	if (!fs.existsSync(graphPath)) {
		console.warn(
			`⚠️  route-ast-graph.json not found at ${graphPath}. Using empty map.`
		);
		return new Map();
	}

	try {
		const raw = fs.readFileSync(graphPath, 'utf8');
		const json = JSON.parse(raw) as RawRouteGraph;

		const map = new Map<string, string>();

		for (const node of json.nodes) {
			// normalize to forward slashes
			const fileNorm = node.file.replace(/\\/g, '/');
			map.set(fileNorm, node.path);
		}

		return map;
	} catch (err) {
		console.warn(
			`⚠️  Failed to parse route-ast-graph.json: ${(err as Error).message}`
		);
		return new Map();
	}
}

// 2. A simple TS error parser (tsc / vite build)
// Example line:
// src/routes/cases/[id]/overview/+page.ts(42,5): error TS1005: ';' expected.
type ParsedError = {
	filePath: string;
	lineNum: number;
	colNum: number;
	tsCode?: string;
	message: string;
	severity: 'info' | 'warn' | 'error' | 'fatal';
};

function parseTsErrorLine(line: string): ParsedError | null {
	const regex =
		/^(?<file>.+\.(ts|tsx|js|jsx|svelte))\((?<line>\d+),(?<col>\d+)\):\s+(?<severity>error|warning)\s+(?<code>[A-Z]+\d+):\s+(?<msg>.+)$/;

	const match = line.match(regex);
	if (!match || !match.groups) return null;

	const filePath = match.groups.file.replace(/\\/g, '/');
	const lineNum = parseInt(match.groups.line, 10);
	const colNum = parseInt(match.groups.col, 10);
	const tsCode = match.groups.code;
	const severity =
		match.groups.severity === 'warning' ? 'warn' : 'error';
	const message = match.groups.msg.trim();

	return { filePath, lineNum, colNum, tsCode, message, severity };
}

// 3. Optional: call LangExtract (Phase 74) to enrich / normalize
async function callLangExtract(message: string, errorCode?: string) {
	// Phase 74 FastAPI is running on 127.0.0.1:8010 from project notes
	const endpoint =
		process.env.LANGEXTRACT_URL ?? 'http://127.0.0.1:8010';

	try {
		const res = await fetch(`${endpoint}/langextract/analyze`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				text: message,
				kind: 'ts-error',
				errorCode: errorCode || undefined
			}),
			signal: AbortSignal.timeout(5000)
		});

		if (!res.ok) {
			return null;
		}

		const json = (await res.json()) as Record<string, unknown>;
		return json;
	} catch (err) {
		// Silently skip if LangExtract not available
		return null;
	}
}

// 4. Main collection logic
async function collectErrors() {
	console.log('\n🗡️  Phase 78 – Cutlass Error Collector');
	console.log('════════════════════════════════════════════\n');

	const routeMap = loadRouteGraph();
	console.log(`✓ Loaded ${routeMap.size} route file mappings from Phase 72\n`);

	// You can wire this to any log files you like:
	const logFiles = [
		'logs/tsc.log',
		'logs/vite-build.log',
		'logs/phase72.log'
	]
		.map((p) => path.join(__dirname, '..', p))
		.filter((p) => fs.existsSync(p));

	if (logFiles.length === 0) {
		console.log('ℹ️  No log files found in logs/ directory.');
		console.log('   (Create logs/tsc.log or logs/vite-build.log to collect errors)\n');
		return;
	}

	const errorsByRoute = new Map<
		string,
		{
			routePath: string;
			filePath: string;
			errors: Array<ParsedError & { langExtractMeta?: Record<string, unknown> }>;
		}
	>();

	for (const logPath of logFiles) {
		console.log(`📖 Parsing: ${path.basename(logPath)}`);

		const content = fs.readFileSync(logPath, 'utf8');
		const lines = content.split(/\r?\n/);

		let parsed = 0;

		for (const line of lines) {
			const err = parseTsErrorLine(line);
			if (!err) continue;

			parsed++;

			// Map file → route path (Phase 72 graph)
			const fileRel = err.filePath.startsWith('src/')
				? err.filePath
				: `src/${err.filePath}`;
			const routePath =
				routeMap.get(fileRel) ??
				// fallback: derive from file path (very rough)
				'/' +
					fileRel
						.replace(/^src\/routes\//, '')
						.replace(/\+page.*$/, '')
						.replace(/\/$/, '');

			if (!errorsByRoute.has(routePath)) {
				errorsByRoute.set(routePath, {
					routePath,
					filePath: fileRel,
					errors: []
				});
			}

			errorsByRoute.get(routePath)!.errors.push(err);
		}

		console.log(`   → ${parsed} error(s) parsed\n`);
	}

	if (errorsByRoute.size === 0) {
		console.log('ℹ️  No errors parsed from logs.\n');
		return;
	}

	// Optional: enrich with LangExtract
	console.log('🧠 Enriching errors with LangExtract (Phase 74)...');
	let enriched = 0;

	for (const group of errorsByRoute.values()) {
		for (const err of group.errors) {
			const meta = await callLangExtract(err.message, err.tsCode);
			if (meta) {
				err.langExtractMeta = meta;
				enriched++;
			}
		}
	}

	console.log(`   → ${enriched} error(s) enriched\n`);

	// 5. Output summary
	console.log('📊 Error Summary by Route:\n');

	const routes = Array.from(errorsByRoute.values()).sort(
		(a, b) => b.errors.length - a.errors.length
	);

	let totalErrors = 0;

	for (const group of routes) {
		const count = group.errors.length;
		totalErrors += count;

		let healthIcon = '✅';
		if (count >= 5) healthIcon = '❌';
		else if (count >= 2) healthIcon = '⚠️';

		console.log(
			`   ${healthIcon} ${group.routePath.padEnd(40)} (${count} error${count !== 1 ? 's' : ''})`
		);
	}

	console.log(`\n📈 Total: ${totalErrors} error(s) across ${routes.length} route(s)\n`);

	// 6. Save errors to JSON file for insert script
	const logsDir = path.join(__dirname, '..', 'logs');
	if (!fs.existsSync(logsDir)) {
		fs.mkdirSync(logsDir, { recursive: true });
	}

	const outputFile = path.join(logsDir, 'phase78-errors.json');
	const errorsList: Array<ParsedError & { routePath: string }> = [];

	for (const [routePath, data] of errorsByRoute.entries()) {
		for (const err of data.errors) {
			errorsList.push({
				routePath,
				filePath: data.filePath,
				lineNum: err.lineNum,
				colNum: err.colNum,
				tsCode: err.tsCode,
				message: err.message,
				severity: err.severity,
			});
		}
	}

	fs.writeFileSync(
		outputFile,
		JSON.stringify(
			{ errors: errorsList, timestamp: new Date().toISOString() },
			null,
			2
		)
	);

	if (process.argv.includes('--verbose')) {
		console.log(`✅ Saved ${errorsList.length} errors to ${outputFile}`);
	}

	// 7. Show next steps
	console.log('═══════════════════════════════════════════════');
	console.log('✅ Phase 78 collection complete\n');
	console.log('Next Steps:');
	console.log('  1. Review errors above');
	console.log('  2. Run: npm run db:migrate (if tables not created)');
	console.log('  3. Wire to DB: npm run phase78:insert');
	console.log('  4. CUDA clustering: npm run phase78:cluster');
	console.log('  5. LLM suggestions: npm run phase78:suggest\n');
}

// Go
collectErrors().catch((err) => {
	console.error('❌ Phase 78 collector failed:', err);
	process.exit(1);
});
