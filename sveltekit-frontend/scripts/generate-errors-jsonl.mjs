#!/usr/bin/env node
/**
 * Generate errors.jsonl from TypeScript and Svelte checks
 * WITH CHUNKED STREAMING + COMPREHENSIVE LOGGING
 *
 * Usage: node scripts/generate-errors-jsonl.mjs [--tool tsc|svelte-check|both] [--chunk-size 1000]
 *
 * Features:
 * - Streams errors in configurable chunks
 * - Logs all operations to phase72_logs/ directory
 * - Generates recommendations for error patterns
 * - Progress monitoring with ETA
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
const tool = args.includes('--tool') ? args[args.indexOf('--tool') + 1] : 'both';
const chunkSize = args.includes('--chunk-size') ? parseInt(args[args.indexOf('--chunk-size') + 1], 10) : 1000;

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

// Setup directories
const outputDir = path.join(__dirname, '..', 'reports', 'latest');
const logsDir = path.join(__dirname, '..', 'phase72_logs');
const sessionLogDir = path.join(logsDir, `session_${timestamp}`);
const outputFile = path.join(outputDir, 'errors.jsonl');
const logFile = path.join(sessionLogDir, 'generation.log');
const statsFile = path.join(sessionLogDir, 'stats.json');
const recommendationsFile = path.join(sessionLogDir, 'recommendations.md');

// Create directories
[outputDir, logsDir, sessionLogDir].forEach(dir => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
});

console.log('\n📝 Phase 72 - Chunked Error Generation\n');
console.log(`🔧 Tool: ${tool}`);
console.log(`📦 Chunk Size: ${chunkSize} errors`);
console.log(`📂 Session Log: ${sessionLogDir}\n`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Clear existing file
if (fs.existsSync(outputFile)) {
	fs.unlinkSync(outputFile);
}

let totalErrors = 0;

/**
 * Categorize error for recommendations
 */
function categorizeError(message) {
	const msg = (message || '').toLowerCase();
	if (msg.includes('semicolon') || msg.includes("';' expected")) return 'syntax-semicolon';
	if (msg.includes('declaration or statement expected')) return 'syntax-declaration';
	if (msg.includes('type') && msg.includes('not assignable')) return 'type-mismatch';
	if (msg.includes('cannot find name')) return 'undeclared-identifier';
	if (msg.includes('property') && msg.includes('does not exist')) return 'property-missing';
	if (msg.includes('import') || msg.includes('export')) return 'module-import';
	if (msg.includes('async') || msg.includes('promise')) return 'async-await';
	return 'misc-error';
}

/**
 * Strip ANSI codes from string
 */
function stripAnsi(str) {
	return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Parse TypeScript errors - MORE ROBUST REGEX
 */
function parseTscErrors(output) {
	const errors = [];
	const lines = output.split('\n');

	for (const rawLine of lines) {
		const line = stripAnsi(rawLine).trim();
		if (!line) continue;

		// Match: src/file.ts(123,45): error TS1234: Message
		// More flexible to catch all error formats
		const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
		if (match) {
			const [, file, lineNum, column, severity, code, message] = match;
			const category = categorizeError(message);
			const hash = createHash('sha256').update(`${file}:${lineNum}:${message}`).digest('hex').slice(0, 16);

			errors.push({
				file: file.replace(/\\/g, '/').trim(),
				line: parseInt(lineNum, 10),
				column: parseInt(column, 10),
				code,
				message: message.trim(),
				severity,
				category,
				tool: 'tsc',
				hash,
				timestamp: new Date().toISOString()
			});
		}
	}

	return errors;
}

/**
 * Parse Svelte check errors
 */
function parseSvelteErrors(output) {
	const errors = [];
	const lines = output.split('\n');

	for (const line of lines) {
		// Match various svelte-check formats
		// Error: Message (src/file.svelte:123:45)
		const match1 = line.match(/^Error:\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
		if (match1) {
			errors.push({
				file: match1[2].replace(/\\/g, '/'),
				line: parseInt(match1[3], 10),
				column: parseInt(match1[4], 10),
				code: 'SVELTE',
				message: match1[1].trim(),
				severity: 'error',
				tool: 'svelte-check',
				timestamp: new Date().toISOString()
			});
			continue;
		}

		// Match: src/file.svelte:123:45 Error: Message
		const match2 = line.match(/^(.+?):(\d+):(\d+)\s+Error:\s+(.+)$/);
		if (match2) {
			errors.push({
				file: match2[1].replace(/\\/g, '/'),
				line: parseInt(match2[2], 10),
				column: parseInt(match2[3], 10),
				code: 'SVELTE',
				message: match2[4].trim(),
				severity: 'error',
				tool: 'svelte-check',
				timestamp: new Date().toISOString()
			});
		}
	}

	return errors;
}

/**
 * Draw progress bar (with safety check for redirected output)
 */
function drawProgressBar(current, total, label = 'Progress') {
	// Skip progress bar if output is redirected
	if (!process.stdout.isTTY || !process.stdout.clearLine) {
		// Just print percentage every 10%
		const percentage = Math.floor((current / total) * 100);
		if (percentage % 10 === 0 && percentage > 0) {
			console.log(`   ${label}: ${percentage}% (${current.toLocaleString()}/${total.toLocaleString()})`);
		}
		return;
	}

	const width = 40;
	const percentage = Math.min(100, (current / total) * 100);
	const filled = Math.round((width * percentage) / 100);
	const empty = width - filled;
	const bar = '█'.repeat(filled) + '░'.repeat(empty);

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`${label}: [${bar}] ${percentage.toFixed(1)}% (${current.toLocaleString()}/${total.toLocaleString()})`);
}/**
 * Run TypeScript check with 8GB memory + progress bar
 */
function runTscCheck() {
	console.log('⏳ Running TypeScript check (8GB memory allocated)...\n');
	const startTime = Date.now();
	const startMem = process.memoryUsage();

	try {
		// Try to run tsc - will throw if errors exist
		execSync('npx tsc --noEmit', {
			encoding: 'utf-8',
			cwd: path.join(__dirname, '..'),
			maxBuffer: 100 * 1024 * 1024,
			stdio: 'pipe', // CRITICAL: Capture output explicitly
			env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
		});

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`\n✅ No TypeScript errors found (${duration}s)\n`);

		fs.appendFileSync(logFile, `[${new Date().toISOString()}] TypeScript check: 0 errors, ${duration}s\n`);
		return [];
	} catch (error) {
		// TypeScript errors are in error.stdout when using default stdio
		const stdout = error.stdout ? error.stdout.toString() : '';
		const stderr = error.stderr ? error.stderr.toString() : '';
		const allOutput = stdout + '\n' + stderr;
		fs.writeFileSync(path.join(sessionLogDir, 'tsc_raw_error.log'), allOutput);

		console.log(`   📊 Captured ${allOutput.length.toLocaleString()} bytes of output`);

		// Parse errors with progress
		const lines = allOutput.split('\n');
		const errors = [];
		let processed = 0;		// Strip ANSI codes regex
		const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

		for (const rawLine of lines) {
			const line = rawLine.replace(ansiRegex, '').trim();
			if (!line) continue;

			const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
			if (match) {
				const [, file, lineNum, column, severity, code, message] = match;
				const category = categorizeError(message);
				const hash = createHash('sha256').update(`${file}:${lineNum}:${message}`).digest('hex').slice(0, 16);

				errors.push({
					file: file.replace(/\\/g, '/'),
					line: parseInt(lineNum, 10),
					column: parseInt(column, 10),
					code,
					message: message.trim(),
					severity,
					category,
					tool: 'tsc',
					hash,
					timestamp: new Date().toISOString()
				});

				processed++;
				if (processed % 100 === 0) {
					drawProgressBar(processed, lines.length, '   Parsing');
				}
			}
		}

		process.stdout.write('\n');

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		const memDelta = Math.round((process.memoryUsage().heapUsed - startMem.heapUsed) / 1024 / 1024);

		console.log(`✅ Found ${errors.length.toLocaleString()} TypeScript errors (${duration}s, ${memDelta}MB heap)\n`);

		// Detailed logging
		const logMsg = `[${new Date().toISOString()}] TypeScript check: ${errors.length} errors, ${duration}s, ${memDelta}MB heap\n`;
		fs.appendFileSync(logFile, logMsg);

		// Save sample errors to log
		if (errors.length > 0) {
			fs.appendFileSync(logFile, `Sample errors:\n`);
			errors.slice(0, 10).forEach(err => {
				fs.appendFileSync(logFile, `  - ${err.file}(${err.line},${err.column}): ${err.code} - ${err.message.slice(0, 80)}\n`);
			});
			fs.appendFileSync(logFile, '\n');
		}

		return errors;
	}
}

/**
 * Run Svelte check with memory optimization
 */
function runSvelteCheck() {
	console.log('⏳ Running Svelte check...');
	const startTime = Date.now();
	const startMem = process.memoryUsage();

	try {
		const output = execSync('npx svelte-check --output machine --threshold warning', {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: path.join(__dirname, '..'),
			maxBuffer: 100 * 1024 * 1024, // 100MB buffer
			env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
		});

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ No Svelte errors found (${duration}s)\n`);
		return [];
	} catch (error) {
		if (error.code === 'ENOBUFS') {
			console.error('❌ Svelte check output exceeded buffer size');
		}
		const rawOutput = (error.stdout || '') + '\n' + (error.stderr || '');
		fs.writeFileSync(path.join(sessionLogDir, 'svelte_raw_error.log'), rawOutput);

		const errors = parseSvelteErrors(rawOutput);
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		const memDelta = Math.round((process.memoryUsage().heapUsed - startMem.heapUsed) / 1024 / 1024);

		console.log(`✅ Found ${errors.length.toLocaleString()} Svelte errors (${duration}s, ${memDelta}MB used)\n`);

		// Log to file
		fs.appendFileSync(logFile, `[${new Date().toISOString()}] Svelte check: ${errors.length} errors, ${duration}s, ${memDelta}MB\n`);

		return errors;
	}
}

/**
 * Main execution with comprehensive logging
 */
try {
	const pipelineStart = Date.now();
	fs.appendFileSync(logFile, `\n=== Phase 72 Error Generation Session ===\n`);
	fs.appendFileSync(logFile, `Started: ${new Date().toISOString()}\n`);
	fs.appendFileSync(logFile, `Tool: ${tool}\n`);
	fs.appendFileSync(logFile, `Chunk Size: ${chunkSize}\n\n`);

	let allErrors = [];

	if (tool === 'tsc' || tool === 'both') {
		const tscErrors = runTscCheck();
		allErrors = allErrors.concat(tscErrors);

		// Force garbage collection if available
		if (global.gc) {
			console.log('🗑️  Running garbage collection...');
			global.gc();
		}
	}

	if (tool === 'svelte-check' || tool === 'both') {
		const svelteErrors = runSvelteCheck();
		allErrors = allErrors.concat(svelteErrors);

		// Force garbage collection if available
		if (global.gc) {
			console.log('🗑️  Running garbage collection...');
			global.gc();
		}
	}

	// Write to JSONL in chunks with progress bar
	console.log('💾 Writing errors to JSONL...\n');
	const writeStart = Date.now();
	const stream = fs.createWriteStream(outputFile);

	for (let i = 0; i < allErrors.length; i++) {
		stream.write(JSON.stringify(allErrors[i]) + '\n');
		totalErrors++;

		// Update progress bar every 50 errors
		if (i % 50 === 0 || i === allErrors.length - 1) {
			drawProgressBar(i + 1, allErrors.length, '   Writing');
		}
	}

	stream.end();
	process.stdout.write('\n');
	const writeDuration = ((Date.now() - writeStart) / 1000).toFixed(2);
	console.log(`   ✅ Wrote ${totalErrors.toLocaleString()} errors in ${writeDuration}s\n`);

	// Generate statistics
	const stats = {
		timestamp: new Date().toISOString(),
		tool,
		totalErrors,
		duration: ((Date.now() - pipelineStart) / 1000).toFixed(2),
		writeDuration,
		memoryUsage: {
			heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
			external: Math.round(process.memoryUsage().external / 1024 / 1024)
		},
		errorsByType: {},
		errorsByFile: {}
	};

	// Analyze errors
	allErrors.forEach(err => {
		stats.errorsByType[err.code] = (stats.errorsByType[err.code] || 0) + 1;
		const fileKey = err.file.split('/').slice(-2).join('/'); // Last 2 path segments
		stats.errorsByFile[fileKey] = (stats.errorsByFile[fileKey] || 0) + 1;
	});

	// Sort by count
	stats.errorsByType = Object.fromEntries(
		Object.entries(stats.errorsByType).sort((a, b) => b[1] - a[1]).slice(0, 20)
	);
	stats.errorsByFile = Object.fromEntries(
		Object.entries(stats.errorsByFile).sort((a, b) => b[1] - a[1]).slice(0, 20)
	);

	// Write stats
	fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

	// Generate recommendations
	let recommendations = `# Phase 72 - Error Analysis Recommendations\n\n`;
	recommendations += `Generated: ${new Date().toISOString()}\n\n`;
	recommendations += `## Summary\n\n`;
	recommendations += `- **Total Errors**: ${totalErrors.toLocaleString()}\n`;
	recommendations += `- **Duration**: ${stats.duration}s\n`;
	recommendations += `- **Memory Used**: ${stats.memoryUsage.heapUsed}MB / ${stats.memoryUsage.heapTotal}MB\n\n`;

	recommendations += `## Top Error Types\n\n`;
	Object.entries(stats.errorsByType).slice(0, 10).forEach(([code, count]) => {
		recommendations += `- **${code}**: ${count.toLocaleString()} occurrences\n`;
	});

	recommendations += `\n## Most Affected Files\n\n`;
	Object.entries(stats.errorsByFile).slice(0, 10).forEach(([file, count]) => {
		recommendations += `- \`${file}\`: ${count.toLocaleString()} errors\n`;
	});

	recommendations += `\n## Next Steps\n\n`;
	recommendations += `1. Run embedding generation:\n`;
	recommendations += `   \`\`\`bash\n`;
	recommendations += `   node --expose-gc --max-old-space-size=8192 scripts/embed-errors-phase72.mjs --limit ${totalErrors}\n`;
	recommendations += `   \`\`\`\n\n`;
	recommendations += `2. Verify semantic search:\n`;
	recommendations += `   \`\`\`bash\n`;
	recommendations += `   node scripts/test-error-search.mjs "Cannot find name"\n`;
	recommendations += `   \`\`\`\n\n`;

	fs.writeFileSync(recommendationsFile, recommendations);

	// Final output
	console.log(`\n✅ Generated ${totalErrors.toLocaleString()} errors in ${stats.duration}s`);
	console.log(`📄 Output: ${outputFile}`);
	console.log(`📊 Stats: ${statsFile}`);
	console.log(`📋 Recommendations: ${recommendationsFile}\n`);

	// Log completion
	fs.appendFileSync(logFile, `\nCompleted: ${new Date().toISOString()}\n`);
	fs.appendFileSync(logFile, `Total Errors: ${totalErrors}\n`);
	fs.appendFileSync(logFile, `Duration: ${stats.duration}s\n`);
	fs.appendFileSync(logFile, `Memory Peak: ${stats.memoryUsage.heapUsed}MB\n`);

	console.log('📍 Next: Run embedding generation');
	console.log(`   node --expose-gc --max-old-space-size=8192 scripts/embed-errors-phase72.mjs --limit ${totalErrors}\n`);

} catch (error) {
	console.error(`\n❌ Error: ${error.message}\n`);
	fs.appendFileSync(logFile, `\nFATAL ERROR: ${error.message}\n${error.stack}\n`);
	process.exit(1);
}
