#!/usr/bin/env node

/**
 * Phase 79: Error Ingestion Pipeline
 *
 * Captures, normalizes, and stores TypeScript errors for:
 * - Pattern matching and clustering
 * - Vector embedding and semantic search
 * - Qdrant indexing for RAG/agentic retrieval
 * - Leaderboard ranking by impact
 *
 * Usage:
 *   node scripts/error-ingest.mjs --input reports/svelte-check-<runId>.json --run <runId>
 *   node scripts/error-ingest.mjs --run manual-20251225 (uses live svelte-check)
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const LOGS_DIR = join(ROOT, 'logs', 'errors');
const DATA_DIR = join(ROOT, 'data');

// Ensure directories exist
mkdirSync(LOGS_DIR, { recursive: true });
mkdirSync(DATA_DIR, { recursive: true });

// Parse CLI args
const args = process.argv.slice(2);
const INPUT_FILE = args.find(a => a.startsWith('--input='))?.split('=')[1];
const RUN_ID = args.find(a => a.startsWith('--run='))?.split('=')[1] || `run-${Date.now()}`;
const COMMIT_HASH = execSync('git rev-parse --short HEAD 2>/dev/null || echo "no-git"', { encoding: 'utf8' }).trim();

console.log('📥 Phase 79: Error Ingestion Pipeline\n');
console.log(`   Run ID: ${RUN_ID}`);
console.log(`   Commit: ${COMMIT_HASH}\n`);

/**
 * Generate stable fingerprint for deduplication
 */
function generateFingerprint(error) {
	const hash = createHash('sha256');
	hash.update(`${error.tool}|${error.file}|${error.code}|${error.message}`);
	return hash.digest('hex').substring(0, 16);
}

/**
 * Normalize error from svelte-check format to unified schema
 */
function normalizeError(rawError, tool = 'svelte-check') {
	return {
		runId: RUN_ID,
		commit: COMMIT_HASH,
		timestamp: new Date().toISOString(),
		tool,
		file: rawError.file || rawError.fileName || 'unknown',
		line: rawError.line || rawError.start?.line || 0,
		column: rawError.column || rawError.start?.column || 0,
		code: rawError.code || rawError.errorCode || 'unknown',
		message: rawError.message || rawError.text || '',
		snippet: rawError.snippet || rawError.source || '',
		severity: rawError.severity || 'error',
		fingerprint: null // Set after creation
	};
}

/**
 * Run svelte-check and parse errors
 */
function collectErrors() {
	console.log('🔍 Running svelte-check...');

	try {
		const output = execSync('npx svelte-check 2>&1', {
			cwd: ROOT,
			encoding: 'utf8',
			maxBuffer: 50 * 1024 * 1024
		});

		return parseSvelteCheckOutput(output);
	} catch (error) {
		// svelte-check exits with code 1 when errors exist
		if (error.stdout) {
			return parseSvelteCheckOutput(error.stdout.toString());
		}
		throw error;
	}
}

/**
 * Parse human-readable svelte-check output
 */
function parseSvelteCheckOutput(output) {
	const errors = [];
	const lines = output.split('\n');
	let currentFile = null;

	// Regex to strip ANSI codes
	const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

	for (let rawLine of lines) {
		const line = stripAnsi(rawLine).trim();
		if (!line) continue;

		// Match: /path/to/file.ts:123:45
		// Handle Windows paths (c:\...) and colons in path
		// We look for :line:col at the end of the string
		const fileMatch = line.match(/^(.+):(\d+):(\d+)$/);
		if (fileMatch) {
			currentFile = {
				file: fileMatch[1].trim().replace(/\\/g, '/'),
				line: parseInt(fileMatch[2], 10),
				column: parseInt(fileMatch[3], 10)
			};
			continue;
		}

		// Match: Error: message (ts(####)) or just Error: message
		if (line.trim().startsWith('Error:') && currentFile) {
			const errorMatch = line.match(/Error:\s*(.+?)(?:\s*\(ts\((\d+)\)\))?$/);
			if (errorMatch) {
				const normalized = normalizeError({
					file: currentFile.file,
					line: currentFile.line,
					column: currentFile.column,
					message: errorMatch[1].trim(),
					code: errorMatch[2] || 'unknown'
				});

				normalized.fingerprint = generateFingerprint(normalized);
				errors.push(normalized);
				currentFile = null;
			}
		}
	}

	return errors;
}

/**
 * Load error patterns for classification
 */
function loadPatterns() {
	const patternsPath = join(ROOT, 'patterns.json');

	if (!existsSync(patternsPath)) {
		console.warn('⚠️  patterns.json not found - creating default');
		const defaultPatterns = {
			patterns: [
				{
					id: 'db-import',
					description: 'Named db import instead of default',
					regex: /import.*\{.*db.*\}.*from.*\$lib\/server\/db/,
					priority: 1,
					severityWeight: 5,
					domains: ['backend', 'database']
				},
				{
					id: 'drizzle-enum',
					description: 'Drizzle enum mismatch (active→open)',
					regex: /eq\(cases\.status.*active.*\)/,
					priority: 2,
					severityWeight: 4,
					domains: ['database']
				},
				{
					id: 'lucia-adapter',
					description: 'Lucia PostgreSQL adapter type mismatch',
					regex: /DrizzlePostgreSQLAdapter.*not assignable/,
					priority: 3,
					severityWeight: 10,
					domains: ['auth']
				},
				{
					id: 'import-type-runtime',
					description: 'Type-only import used at runtime',
					regex: /import type.*cannot be used as a value/,
					priority: 3,
					severityWeight: 3,
					domains: ['frontend', 'backend']
				}
			]
		};
		writeFileSync(patternsPath, JSON.stringify(defaultPatterns, null, 2));
		return defaultPatterns.patterns;
	}

	const data = JSON.parse(readFileSync(patternsPath, 'utf8'));
	return data.patterns || [];
}

/**
 * Classify error against known patterns
 */
function classifyError(error, patterns) {
	for (const pattern of patterns) {
		const regex = new RegExp(pattern.regex, 'i');
		if (regex.test(error.message) || regex.test(error.snippet)) {
			return {
				patternId: pattern.id,
				priority: pattern.priority,
				severityWeight: pattern.severityWeight,
				domains: pattern.domains
			};
		}
	}

	return {
		patternId: 'unknown',
		priority: 999,
		severityWeight: 1,
		domains: ['uncategorized']
	};
}

/**
 * Main ingestion pipeline
 */
async function main() {
	// Step 1: Collect errors
	let errors = INPUT_FILE
		? JSON.parse(readFileSync(INPUT_FILE, 'utf8'))
		: collectErrors();

	// Auto-normalize if input is raw svelte-check JSON
	if (errors.length > 0 && !errors[0].runId) {
		console.log('🔄 Normalizing raw input...');
		errors = errors.map(e => normalizeError(e));
	}

	console.log(`✅ Collected ${errors.length} errors\n`);

	// Step 2: Load patterns and classify
	const patterns = loadPatterns();
	console.log(`📋 Loaded ${patterns.length} patterns\n`);

	const classified = errors.map(error => {
		const classification = classifyError(error, patterns);
		return { ...error, ...classification };
	});

	// Step 3: Generate statistics
	const stats = {
		runId: RUN_ID,
		commit: COMMIT_HASH,
		timestamp: new Date().toISOString(),
		totalErrors: errors.length,
		byPattern: {},
		byFile: {},
		byDomain: {}
	};

	for (const error of classified) {
		// By pattern
		stats.byPattern[error.patternId] = (stats.byPattern[error.patternId] || 0) + 1;

		// By file
		stats.byFile[error.file] = (stats.byFile[error.file] || 0) + 1;

		// By domain
		for (const domain of error.domains) {
			stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
		}
	}

	// Step 4: Save outputs
	const runFile = join(LOGS_DIR, `${RUN_ID}.jsonl`);
	const centralLog = join(DATA_DIR, 'errors.ndjson');
	const statsFile = join(LOGS_DIR, `${RUN_ID}-stats.json`);

	// Write JSONL for this run
	writeFileSync(runFile, classified.map(e => JSON.stringify(e)).join('\n'));
	console.log(`📄 Run log: ${relative(ROOT, runFile)}`);

	// Append to central log
	appendFileSync(centralLog, classified.map(e => JSON.stringify(e)).join('\n') + '\n');
	console.log(`📄 Central log: ${relative(ROOT, centralLog)}`);

	// Write stats
	writeFileSync(statsFile, JSON.stringify(stats, null, 2));
	console.log(`📊 Stats: ${relative(ROOT, statsFile)}\n`);

	// Step 5: Print summary
	console.log('📊 INGESTION SUMMARY\n');
	console.log(`Total Errors: ${stats.totalErrors}`);
	console.log(`\nTop Patterns:`);

	const topPatterns = Object.entries(stats.byPattern)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	for (const [pattern, count] of topPatterns) {
		console.log(`  ${pattern}: ${count} errors`);
	}

	console.log(`\nTop Files:`);
	const topFiles = Object.entries(stats.byFile)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	for (const [file, count] of topFiles) {
		const shortPath = relative(ROOT, file);
		console.log(`  ${shortPath}: ${count} errors`);
	}

	console.log(`\n✅ Ingestion complete!`);
	console.log(`\n💡 Next steps:`);
	console.log(`   1. node scripts/error-leaderboard.mjs --run ${RUN_ID}`);
	console.log(`   2. node scripts/error-index-qdrant.mjs --run ${RUN_ID}`);
	console.log(`   3. node scripts/phase79-pattern-fixer.mjs --apply`);
}

main().catch(error => {
	console.error('❌ Ingestion failed:', error.message);
	process.exit(1);
});
