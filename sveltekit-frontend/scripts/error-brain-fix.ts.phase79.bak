#!/usr/bin/env tsx
/**
 * Error Brain: Syntax Corruption Fix Orchestrator
 *
 * P0 Incident: Treat syntax corruption with deterministic, idempotent fixes.
 * Uses error-brain infrastructure (Tasks 15-36).
 *
 * Usage:
 *   npx tsx scripts/error-brain-fix.ts --dry-run   # Propose patches only
 *   npx tsx scripts/error-brain-fix.ts             # Apply patches (requires confirmation)
 *   npx tsx scripts/error-brain-fix.ts --force     # Apply without confirmation
 *
 * Environment:
 *   ERROR_BRAIN_ENABLED=1       # Required
 *   ERROR_BRAIN_APPLY_MODE=off  # safe | full (default: off)
 *   BATCH_REPORT_STAMP=...      # Optional: deterministic timestamp
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestErrors } from '../src/lib/error-brain/analyze/ingest.js';
import { generateProposals } from '../src/lib/error-brain/analyze/propose.js';
import {
    BATCH_REPORT_STAMP,
    ERROR_BRAIN_APPLY_MODE,
    ERROR_BRAIN_ENABLED,
    ERROR_BRAIN_TRANSPORT
} from '../src/lib/error-brain/config.js';
import { applyPatches } from '../src/lib/error-brain/diff/apply.js';
import { writeIncidentReport } from '../src/lib/error-brain/report-writer.js';
import { generateRunId } from '../src/lib/error-brain/run-id.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const TSCONFIG_PATH = resolve(PROJECT_ROOT, 'tsconfig.check.json');

/** Parse command-line arguments */
function parseArgs() {
	const args = process.argv.slice(2);
	return {
		dryRun: args.includes('--dry-run'),
		force: args.includes('--force')
	};
}

/** Validate environment and configuration */
function validateEnvironment() {
	// Check if error-brain is enabled
	if (!ERROR_BRAIN_ENABLED) {
		console.error('❌ ERROR_BRAIN_ENABLED=1 required');
		process.exit(1);
	}

	// Check if tsconfig exists
	if (!existsSync(TSCONFIG_PATH)) {
		console.error(`❌ tsconfig not found: ${TSCONFIG_PATH}`);
		process.exit(1);
	}

	console.log('✅ Environment validated');
	console.log(`   - Apply mode: ${ERROR_BRAIN_APPLY_MODE}`);
	console.log(`   - Transport: ${ERROR_BRAIN_TRANSPORT}`);
	console.log(`   - Report stamp: ${BATCH_REPORT_STAMP}`);
}

/** Main orchestration */
async function main() {
	const { dryRun, force } = parseArgs();

	console.log('🧠 Error Brain: Syntax Corruption Fix');
	console.log('=====================================\n');

	validateEnvironment();

	// Generate run ID
	const runId = generateRunId();
	console.log(`📋 Run ID: ${runId}\n`);

	// Initialize run state
	const runState = initializeRun(runId);
	await writeRunProgress(runState);

	try {
		// Step 1: Ingest errors
		console.log('🔍 Step 1: Ingesting TypeScript errors...');
		updateRunStep(runId, 'analyzing', 10);
		await writeRunProgress(getRunState(runId)!);

		const errorRecords = ingestErrors(TSCONFIG_PATH, PROJECT_ROOT);
		console.log(`   Found ${errorRecords.length} actionable errors\n`);

		updateRunProgress(runId, {
			counters: { errorsFound: errorRecords.length }
		});
		await writeRunProgress(runId);

		// Step 2: Generate proposals
		console.log('💡 Step 2: Generating patch proposals...');
		updateRunProgress(runId, { step: 'proposing' });
		await writeRunProgress(runId);

		const candidates = generateProposals(errorRecords, PROJECT_ROOT);
		console.log(`   Proposed ${candidates.length} patches\n`);

		updateRunProgress(runId, {
			candidates,
			counters: { patchesProposed: candidates.length }
		});
		await writeRunProgress(runId);

		// Step 3: Show proposals
		if (candidates.length === 0) {
			console.log('✅ No patches to apply');
			updateRunProgress(runId, { step: 'done' });
			await writeRunProgress(runId);
			return;
		}

		console.log('📝 Proposed patches:\n');
		for (const candidate of candidates) {
			console.log(`   ${candidate.file}`);
			console.log(`      Confidence: ${candidate.confidence}`);
			console.log(`      Delta: ${candidate.lineDelta} lines`);
			console.log(`      Rule: ${candidate.ruleId}`);
			console.log(`      Reason: ${candidate.reason}\n`);
		}

		// Step 4: Apply patches (if not dry-run)
		if (dryRun) {
			console.log('🔒 Dry run mode - patches not applied');
			console.log(`📊 Review proposals in: reports/runs/${runId}.json\n`);
			updateRunProgress(runId, { step: 'done' });
			await writeRunProgress(runId);
			return;
		}

		// Confirmation prompt (unless --force)
		if (!force) {
			console.log('⚠️  About to apply patches. Continue? (y/N)');
			const readline = (await import('node:readline')).default;
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			const answer = await new Promise<string>((resolve) => {
				rl.question('', (ans) => {
					rl.close();
					resolve(ans);
				});
			});

			if (answer.toLowerCase() !== 'y') {
				console.log('❌ Aborted by user\n');
				updateRunProgress(runId, { step: 'done' });
				await writeRunProgress(runId);
				return;
			}
		}

		console.log('🚀 Step 3: Applying patches...');
		updateRunProgress(runId, { step: 'applying' });
		await writeRunProgress(runId);

		const applyResult = await applyPatches(candidates, runId, false);
		console.log(`   Applied: ${applyResult.applied.length}`);
		console.log(`   Rejected: ${applyResult.rejected.length}\n`);

		updateRunProgress(runId, {
			counters: {
				patchesApplied: applyResult.applied.length,
				patchesRejected: applyResult.rejected.length
			}
		});

		// Step 5: Write incident report
		console.log('📄 Step 4: Writing incident report...');
		await writeIncidentReport(runId, errorRecords, candidates, applyResult);
		console.log('   Report written\n');

		updateRunProgress(runId, { step: 'done' });
		await writeRunProgress(runId);

		// Final summary
		console.log('✅ Syntax corruption fix complete');
		console.log(`📊 Reports: reports/runs/${runId}.json`);
		console.log(`📦 Patches: reports/patches/${BATCH_REPORT_STAMP}/${runId}/\n`);

		// Next steps
		if (applyResult.applied.length > 0) {
			console.log('🔍 Next steps:');
			console.log('   1. Run: npx tsc --noEmit --skipLibCheck -p tsconfig.check.json');
			console.log('   2. Verify: git diff');
			console.log('   3. Commit if verified\n');
		}
	} catch (error) {
		console.error('❌ Error during execution:', error);
		updateRunProgress(runId, {
			step: 'failed',
			lastError: error instanceof Error ? error.message : String(error)
		});
		await writeRunProgress(runId);
		process.exit(1);
	}
}

// Run
main().catch(console.error);
