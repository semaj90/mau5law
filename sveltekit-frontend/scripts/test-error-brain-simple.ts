#!/usr/bin/env tsx
/**
 * Simple Error Brain Test - Dry Run Only
 *
 * Tests the core analysis and proposal engine without full state management
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ingestErrors } from '../src/lib/error-brain/analyze/ingest.js';
import { generateProposals } from '../src/lib/error-brain/analyze/propose.js';

const PROJECT_ROOT = resolve(process.cwd());
const TSCONFIG_PATH = resolve(PROJECT_ROOT, 'tsconfig.check.json');

console.log('🧠 Error Brain Simple Test\n');

// Check environment
if (process.env.ERROR_BRAIN_ENABLED !== '1') {
	console.log('💡 Tip: Set ERROR_BRAIN_ENABLED=1 for full functionality');
}

// Check tsconfig
if (!existsSync(TSCONFIG_PATH)) {
	console.error(`❌ tsconfig not found: ${TSCONFIG_PATH}`);
	process.exit(1);
}

console.log(`📁 Project root: ${PROJECT_ROOT}`);
console.log(`📝 Using tsconfig: ${TSCONFIG_PATH}\n`);

try {
	// Step 1: Ingest errors
	console.log('🔍 Step 1: Ingesting TypeScript errors...');
	const errorRecords = ingestErrors(TSCONFIG_PATH, PROJECT_ROOT);
	console.log(`   Found ${errorRecords.length} actionable errors\n`);

	if (errorRecords.length > 0) {
		console.log('📋 Error breakdown:');
		for (const record of errorRecords.slice(0, 10)) {
			console.log(`   - ${record.file}:${record.line} [TS${record.code}]`);
			console.log(`     Rule: ${record.ruleId || 'none'}`);
			console.log(`     Message: ${record.message}\n`);
		}

		if (errorRecords.length > 10) {
			console.log(`   ... and ${errorRecords.length - 10} more\n`);
		}
	}

	// Step 2: Generate proposals
	console.log('💡 Step 2: Generating patch proposals...');
	const candidates = generateProposals(errorRecords, PROJECT_ROOT);
	console.log(`   Proposed ${candidates.length} patches\n`);

	if (candidates.length > 0) {
		console.log('📝 Patch proposals:');
		for (const candidate of candidates) {
			console.log(`\n   File: ${candidate.file}`);
			console.log(`   Rule: ${candidate.ruleId}`);
			console.log(`   Confidence: ${candidate.confidence}`);
			console.log(`   Line delta: ${candidate.lineDelta} lines`);
			console.log(`   Reason: ${candidate.reason}`);
			console.log(`   Before hash: ${candidate.beforeHash.substring(0, 12)}...`);
			console.log(`   After hash: ${candidate.afterHash.substring(0, 12)}...`);
		}

		console.log('\n✅ Analysis complete!');
		console.log(`\n📊 Summary:`);
		console.log(`   - Errors found: ${errorRecords.length}`);
		console.log(`   - Patches proposed: ${candidates.length}`);
		console.log(`   - Success rate: ${((candidates.length / errorRecords.length) * 100).toFixed(1)}%`);
	} else {
		console.log('✅ No patches needed - all errors resolved or not fixable by rules');
	}

} catch (error) {
	console.error('❌ Error during analysis:', error);
	if (error instanceof Error) {
		console.error(error.stack);
	}
	process.exit(1);
}
