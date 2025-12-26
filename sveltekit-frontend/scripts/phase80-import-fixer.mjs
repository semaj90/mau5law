#!/usr/bin/env node
/**
 * Phase 80: Import Auto-Fixer
 *
 * Automatically fix missing import errors by:
 * 1. Parsing "Cannot find name 'X'" errors
 * 2. Searching codebase for exports
 * 3. Auto-generating import statements
 *
 * Usage:
 *   node scripts/phase80-import-fixer.mjs [--dry-run] [--limit N]
 */

import { readFile, writeFile } from 'fs/promises';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : Infinity;

console.log('🔧 Phase 80: Import Auto-Fixer\n');
if (isDryRun) console.log('🔍 DRY RUN MODE\n');

// Common missing imports and their sources
const KNOWN_IMPORTS = {
	// SvelteKit
	'browser': "$app/environment",
	'building': "$app/environment",
	'dev': "$app/environment",
	'version': "$app/environment",
	'page': "$app/stores",
	'navigating': "$app/stores",
	'updated': "$app/stores",
	'goto': "$app/navigation",
	'invalidate': "$app/navigation",
	'invalidateAll': "$app/navigation",
	'preloadData': "$app/navigation",
	'preloadCode': "$app/navigation",
	'beforeNavigate': "$app/navigation",
	'afterNavigate': "$app/navigation",
	'disableScrollHandling': "$app/navigation",

	// Svelte
	'onMount': "svelte",
	'onDestroy': "svelte",
	'beforeUpdate': "svelte",
	'afterUpdate': "svelte",
	'tick': "svelte",
	'setContext': "svelte",
	'getContext': "svelte",
	'hasContext': "svelte",
	'getAllContexts': "svelte",
	'createEventDispatcher': "svelte",
	'SvelteComponent': "svelte",

	// Svelte stores
	'writable': "svelte/store",
	'readable': "svelte/store",
	'derived': "svelte/store",
	'get': "svelte/store",

	// Svelte transition
	'fade': "svelte/transition",
	'blur': "svelte/transition",
	'fly': "svelte/transition",
	'slide': "svelte/transition",
	'scale': "svelte/transition",
	'draw': "svelte/transition",
	'crossfade': "svelte/transition",

	// Svelte animate
	'flip': "svelte/animate",

	// Svelte easing
	'linear': "svelte/easing",
	'cubicOut': "svelte/easing",
	'cubicInOut': "svelte/easing",

	// Common project imports
	'db': "$lib/server/db",
	'redis': "$lib/server/redis",
	'CONFIG': "$lib/config",
	'env': "$lib/env",
	'logger': "$lib/server/utils/logger",

	// Database
	'drizzle': "drizzle-orm",
	'sql': "drizzle-orm",
	'eq': "drizzle-orm",
	'and': "drizzle-orm",
	'or': "drizzle-orm",

	// Validation
	'z': "zod",

	// Other common libraries
	'prisma': "@prisma/client",
};let fixesApplied = 0;
const filesFixed = new Set();

/**
 * Parse error report to find missing imports
 */
async function parseErrorReport() {
	const errorFile = 'reports/svelte-check-latest.txt';
	const content = await readFile(errorFile, 'utf-8');
	const lines = content.split('\n');

	const missingImports = new Map(); // file -> Set of missing names

	for (const line of lines) {
		// Pattern: ERROR "path/to/file.ts" line:col "Cannot find name 'X'"
		const match = line.match(/ERROR "([^"]+)"\s+\d+:\d+\s+"Cannot find name '([^']+)'/);
		if (match) {
			const [, filePath, name] = match;
			if (!missingImports.has(filePath)) {
				missingImports.set(filePath, new Set());
			}
			missingImports.get(filePath).add(name);
		}
	}

	return missingImports;
}

/**
 * Add import to file
 */
async function addImportToFile(filePath, importName, source) {
	try {
		const content = await readFile(filePath, 'utf-8');

		// Check if already imported
		const escapedSource = typeof source === 'string' ? source.replace(/\$/g, '\\$') : source;
		const importRegex = new RegExp(`import.*${importName}.*from.*['"]${escapedSource}['"]`);
		if (importRegex.test(content)) {
			return false; // Already imported
		}

		// Find where to insert import
		const lines = content.split('\n');
		let insertIndex = 0;

		// Find last import statement
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('import ')) {
				insertIndex = i + 1;
			} else if (insertIndex > 0 && lines[i].trim() && !lines[i].startsWith('import')) {
				break;
			}
		}

		// Generate import statement
		const importStatement = `import { ${importName} } from '${source}';`;

		// Insert import
		lines.splice(insertIndex, 0, importStatement);
		const newContent = lines.join('\n');

		if (!isDryRun) {
			await writeFile(filePath, newContent, 'utf-8');
		}

		return true;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error.message);
		return false;
	}
}

/**
 * Main execution
 */
async function main() {
	console.log('📋 Parsing error report...\n');

	const missingImports = await parseErrorReport();
	console.log(`Found ${missingImports.size} files with missing imports\n`);

	let processedFiles = 0;

	for (const [filePath, names] of missingImports) {
		if (processedFiles >= limit) break;

		let fileHadFixes = false;

		for (const name of names) {
			// Check if we know the source
			if (KNOWN_IMPORTS[name]) {
				const source = KNOWN_IMPORTS[name];
				const fixed = await addImportToFile(filePath, name, source);

				if (fixed) {
					console.log(`✅ ${filePath}: Added import { ${name} } from '${source}'`);
					fixesApplied++;
					fileHadFixes = true;
				}
			}
		}

		if (fileHadFixes) {
			filesFixed.add(filePath);
			processedFiles++;
		}
	}

	console.log('\n======================================');
	console.log('📊 Summary');
	console.log('======================================\n');
	console.log(`Files modified: ${filesFixed.size}`);
	console.log(`Imports added: ${fixesApplied}\n`);

	if (isDryRun) {
		console.log('🔍 DRY RUN COMPLETE - No files were modified');
	} else {
		console.log('✅ Imports added!');
		console.log('\n🔬 Run `npx svelte-check` to verify\n');
	}
}

main().catch(console.error);
