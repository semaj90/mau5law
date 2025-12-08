#!/usr/bin/env node

/**
 * Phase 78: Error Collector
 *
 * Parses output from:
 *  - npm run check (TypeScript)
 *  - npm run lint (ESLint)
 *  - vite build logs
 *  - Runtime errors from SvelteKit logs
 *
 * Normalizes into RouteErrorEvent objects and stores to Postgres.
 *
 * Usage:
 *  node scripts/phase78-collect-errors.mts
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import postgres from 'postgres';

interface RouteErrorEvent {
	id: string;
	routePath: string;
	file: string;
	kind: 'typescript' | 'svelte' | 'lint' | 'build' | 'runtime' | 'api' | 'other';
	severity: 'info' | 'warn' | 'error' | 'fatal';
	tsCode?: string;
	message: string;
	stack?: string;
	createdAt: string;
}

interface CollectionResult {
	total: number;
	byKind: Record<string, number>;
	byRoute: Record<string, number>;
	events: RouteErrorEvent[];
}

// ============================================================================
// CONFIG
// ============================================================================

const FRONTEND_DIR = path.resolve(__dirname, '../sveltekit-frontend');
const DATABASE_URL = process.env.DATABASE_URL;
const SKIP_DB = process.env.SKIP_DB === 'true';

if (!DATABASE_URL && !SKIP_DB) {
	console.warn('⚠️  DATABASE_URL not set. Using in-memory collection only.');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('🔍 Phase 78: Error Collector');
	console.log('━'.repeat(70));

	const result: CollectionResult = {
		total: 0,
		byKind: {},
		byRoute: {},
		events: []
	};

	try {
		// Step 1: Run npm run check (TypeScript)
		console.log('\n📋 Step 1: TypeScript Check');
		const tsErrors = await runTypeScriptCheck();
		result.events.push(...tsErrors);
		console.log(`   Found ${tsErrors.length} TypeScript errors`);

		// Step 2: Run npm run lint (ESLint)
		console.log('\n📋 Step 2: ESLint Lint');
		const lintErrors = await runESLint();
		result.events.push(...lintErrors);
		console.log(`   Found ${lintErrors.length} lint errors`);

		// Step 3: Parse build errors (if any)
		console.log('\n📋 Step 3: Parse Build Logs');
		const buildErrors = parseBuildErrors();
		result.events.push(...buildErrors);
		console.log(`   Found ${buildErrors.length} build errors`);

		// Step 4: Parse runtime errors (Sentry/logs)
		console.log('\n📋 Step 4: Parse Runtime Errors');
		const runtimeErrors = parseRuntimeErrors();
		result.events.push(...runtimeErrors);
		console.log(`   Found ${runtimeErrors.length} runtime errors`);

		// Step 5: Deduplicate by file + message hash
		console.log('\n📋 Step 5: Deduplicate');
		const deduped = deduplicateEvents(result.events);
		console.log(`   Deduplicated ${result.events.length} → ${deduped.length} unique errors`);
		result.events = deduped;

		// Step 6: Normalize & aggregate
		result.total = result.events.length;
		for (const evt of result.events) {
			result.byKind[evt.kind] = (result.byKind[evt.kind] ?? 0) + 1;
			result.byRoute[evt.routePath] = (result.byRoute[evt.routePath] ?? 0) + 1;
		}

		// Step 7: Store to Postgres (optional)
		if (DATABASE_URL && !SKIP_DB) {
			console.log('\n📋 Step 6: Store to Postgres');
			await storeToPostgres(result.events);
			console.log(`   Stored ${result.events.length} events`);
		}

		// Step 8: Write summary
		console.log('\n📋 Step 7: Write Summary');
		writeSummary(result);

		console.log('\n' + '━'.repeat(70));
		console.log('✅ Error collection complete');
		console.log(`   Total: ${result.total} errors`);
		console.log(`   By kind: ${JSON.stringify(result.byKind)}`);
		console.log(`   Top routes: ${JSON.stringify(
			Object.entries(result.byRoute)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 5)
				.map(([k, v]) => `${k} (${v})`)
		)}`);
	} catch (error) {
		console.error('❌ Error collection failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// COLLECTORS
// ============================================================================

async function runTypeScriptCheck(): Promise<RouteErrorEvent[]> {
	return new Promise((resolve) => {
		const child = spawn('npm', ['run', 'check'], {
			cwd: FRONTEND_DIR,
			stdio: 'pipe'
		});

		let output = '';
		child.stdout.on('data', (data) => {
			output += data.toString();
		});
		child.stderr.on('data', (data) => {
			output += data.toString();
		});

		child.on('close', () => {
			const events = parseTypeScriptOutput(output);
			resolve(events);
		});
	});
}

async function runESLint(): Promise<RouteErrorEvent[]> {
	return new Promise((resolve) => {
		const child = spawn('npm', ['run', 'lint'], {
			cwd: FRONTEND_DIR,
			stdio: 'pipe'
		});

		let output = '';
		child.stdout.on('data', (data) => {
			output += data.toString();
		});
		child.stderr.on('data', (data) => {
			output += data.toString();
		});

		child.on('close', () => {
			const events = parseESLintOutput(output);
			resolve(events);
		});
	});
}

function parseBuildErrors(): RouteErrorEvent[] {
	// Look for .vite_build_errors or Sentry logs
	// This is a placeholder; in production you'd parse actual build artifacts
	return [];
}

function parseRuntimeErrors(): RouteErrorEvent[] {
	// Look for application logs (e.g., from SvelteKit hooks, API routes)
	// Could read from structured logs or error tracking service
	return [];
}

// ============================================================================
// PARSERS
// ============================================================================

function parseTypeScriptOutput(output: string): RouteErrorEvent[] {
	const events: RouteErrorEvent[] = [];

	// TypeScript error format:
	// src/routes/cases/[id]/+page.svelte:12:5 - error TS2322: Type 'string' is not assignable to type 'number'.
	const lines = output.split('\n');
	const errorRegex = /^(.+?):(\d+):(\d+)\s+-\s+(error|warning|info)\s+(TS\d+):\s*(.+)$/;

	for (const line of lines) {
		const match = line.match(errorRegex);
		if (!match) continue;

		const [, file, lineNum, colNum, level, tsCode, message] = match;
		const routePath = extractRouteFromFile(file);

		events.push({
			id: `ts:${file}:${lineNum}:${colNum}`,
			routePath,
			file,
			kind: 'typescript',
			severity: level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info',
			tsCode,
			message,
			createdAt: new Date().toISOString()
		});
	}

	return events;
}

function parseESLintOutput(output: string): RouteErrorEvent[] {
	const events: RouteErrorEvent[] = [];

	// ESLint format:
	// src/routes/cases/[id]/+page.svelte
	//   12:5  error  Unexpected console statement  no-console
	const lines = output.split('\n');
	let currentFile = '';

	for (const line of lines) {
		if (line.startsWith('  ')) {
			// Error/warning line under current file
			const match = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/);
			if (!match) continue;

			const [, lineNum, colNum, level, message, rule] = match;
			const routePath = extractRouteFromFile(currentFile);

			events.push({
				id: `lint:${currentFile}:${lineNum}:${colNum}`,
				routePath,
				file: currentFile,
				kind: 'lint',
				severity: level === 'error' ? 'error' : 'warn',
				message: `${rule}: ${message}`,
				createdAt: new Date().toISOString()
			});
		} else if (line && !line.startsWith(' ')) {
			// File name line
			currentFile = line.trim();
		}
	}

	return events;
}

// ============================================================================
// UTILITIES
// ============================================================================

function extractRouteFromFile(filePath: string): string {
	// src/routes/cases/[id]/overview/+page.svelte → /cases/[id]/overview
	const match = filePath.match(/src\/routes\/([\w\[\]\/\-_.]+)\/([\+\w]+)\.\w+/);
	if (match) {
		return '/' + match[1];
	}
	return '/(unknown)';
}

function deduplicateEvents(events: RouteErrorEvent[]): RouteErrorEvent[] {
	const seen = new Set<string>();
	return events.filter((evt) => {
		const key = `${evt.file}:${evt.message}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

async function storeToPostgres(events: RouteErrorEvent[]): Promise<void> {
	if (!DATABASE_URL) return;

	const sql = postgres(DATABASE_URL);

	try {
		// Insert error events
		for (const evt of events) {
			await sql`
        INSERT INTO error_events (
          id, route_path, file, kind, severity, ts_code, message, created_at
        ) VALUES (
          ${evt.id}, ${evt.routePath}, ${evt.file}, ${evt.kind},
          ${evt.severity}, ${evt.tsCode ?? null}, ${evt.message}, ${new Date(evt.createdAt)}
        )
        ON CONFLICT DO NOTHING;
      `;
		}

		// Update route_health for affected routes
		const affectedRoutes = new Set(events.map((e) => e.routePath));
		for (const routePath of affectedRoutes) {
			const count = events.filter((e) => e.routePath === routePath).length;
			await sql`
        INSERT INTO route_health (route_path, recent_error_count, total_error_count)
        VALUES (${routePath}, ${count}, ${count})
        ON CONFLICT (route_path) DO UPDATE
        SET
          recent_error_count = recent_error_count + ${count},
          total_error_count = total_error_count + ${count},
          updated_at = NOW();
      `;
		}
	} finally {
		await sql.end();
	}
}

function writeSummary(result: CollectionResult): void {
	const summaryPath = path.resolve(FRONTEND_DIR, '.phase78-collection.json');
	writeFileSync(summaryPath, JSON.stringify(result, null, 2));
	console.log(`   Summary written to ${summaryPath}`);
}

// ============================================================================
// RUN
// ============================================================================

main();
