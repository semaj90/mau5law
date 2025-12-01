#!/usr/bin/env node
/**
 * Phase 74: Run svelte-check and vectorize errors
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVELTE_CHECK_JSON = path.join(ROOT, 'svelte-check-machine.json');
const VECTORS_FILE = path.join(ROOT, 'svelte-check-vectors.json');

function runSvelteCheck() {
	return new Promise((resolve, reject) => {
		console.log('⚙️  Running svelte-check...');
		const proc = spawn('npx', ['svelte-check', '--output', 'machine'], {
			cwd: ROOT,
			stdio: ['ignore', 'pipe', 'inherit'],
			shell: true
		});

		let buf = '';
		proc.stdout.on('data', (chunk) => {
			buf += chunk.toString();
		});

		proc.on('exit', (code) => {
			if (code !== 0 && code !== 1) {
				return reject(new Error(`svelte-check exited with ${code}`));
			}
			fs.writeFileSync(SVELTE_CHECK_JSON, buf, 'utf8');
			resolve(buf);
		});
	});
}

async function parseAndVectorize() {
	console.log('📊 Parsing errors...');

	// Dynamically import the vectorizer
	const { errorVectorizer } = await import('../src/lib/ast/error-vectorizer.js');

	const raw = fs.readFileSync(SVELTE_CHECK_JSON, 'utf8');
	const data = JSON.parse(raw);

	// Convert to ASTError format
	const errors = (data.diagnostics ?? []).map((d, i) => ({
		id: `${d.filename}:${d.start?.line ?? 0}:${d.code ?? 'UNKNOWN'}:${i}`,
		line: d.start?.line ?? 0,
		column: d.start?.column ?? 0,
		endLine: d.end?.line ?? d.start?.line ?? 0,
		endColumn: d.end?.column ?? d.start?.column ?? 0,
		message: d.text ?? '',
		severity: d.severity === 'error' ? 'error' : 'warning',
		code: d.code ?? 'UNKNOWN',
		source: 'svelte',
		file: d.filename ?? 'unknown'
	}));

	console.log(`📈 Found ${errors.length} errors`);

	// Vectorize
	console.log('🔢 Vectorizing errors...');
	const vectors = errorVectorizer.vectorizeAll(errors);
	const exportData = errorVectorizer.exportForWebGPU(vectors);

	// Save
	fs.writeFileSync(VECTORS_FILE, JSON.stringify(exportData, null, 2), 'utf8');
	console.log(`✅ Saved ${vectors.length} vectors to ${VECTORS_FILE}`);

	// Stats
	const stats = errorVectorizer.getStats();
	console.log(`📊 Stats: ${stats.uniqueCodes} unique codes, ${stats.uniqueFiles} unique files`);

	return { errors: errors.length, vectors: vectors.length };
}

(async () => {
	try {
		await runSvelteCheck();
		const stats = await parseAndVectorize();
		console.log(`\n✅ Complete: ${stats.errors} errors → ${stats.vectors} vectors`);
		process.exit(0);
	} catch (err) {
		console.error('❌ Vectorization failed:', err);
		process.exit(1);
	}
})();
