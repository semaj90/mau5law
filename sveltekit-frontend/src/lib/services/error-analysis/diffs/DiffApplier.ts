/**
 * Error Brain: Diff Applier
 *
 * Applies patches safely with hash guards and automatic rollback.
 *
 * Guards enforced:
 * - File must exist
 * - beforeSha256 must match current content
 * - Lines changed must not exceed MAX_PATCH_LINES
 *
 * Always produces:
 * - reports/patches/<stamp>/apply-log.json
 * - reports/patches/<stamp>/*.diff
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
    DiffApplicationResult,
    DiffPatch
} from './diffTypes.js';
import { FileSnapshotStore } from './FileSnapshotStore.js';
import { computeSha256 } from './unifiedDiff.js';

export interface ApplyLogEntry {
	patch: DiffPatch;
	result: DiffApplicationResult;
	timestamp: Date;
}

export interface ApplyLog {
	runId: string;
	stamp: string;
	entries: ApplyLogEntry[];
	summary: {
		applied: number;
		rejected: number;
		rolledBack: number;
	};
}

export class DiffApplier {
	private snapshotStore: FileSnapshotStore;
	private maxPatchLines: number;

	constructor(maxPatchLines = 80) {
		this.snapshotStore = new FileSnapshotStore();
		this.maxPatchLines = maxPatchLines;
	}

	/**
	 * Apply a single patch with guards and rollback support
	 *
	 * @param patch - Patch to apply
	 * @param targetContent - New content to write (caller must generate from diff)
	 * @param dryRun - If true, only validate without applying
	 * @returns Application result
	 */
	async applyPatch(
		patch: DiffPatch,
		targetContent: string,
		dryRun = false
	): Promise<DiffApplicationResult> {
		const startTime = new Date();

		try {
			// Guard: Check file exists
			let currentContent: string;
			try {
				currentContent = await readFile(patch.filePath, 'utf8');
			} catch (error) {
				return {
					patch,
					success: false,
					reason: `File not found: ${patch.filePath}`,
					appliedAt: startTime
				};
			}

			// Guard: Verify beforeSha256 matches current content
			const currentHash = computeSha256(currentContent);
			if (currentHash !== patch.beforeSha256) {
				return {
					patch,
					success: false,
					reason: `Hash mismatch: expected ${patch.beforeSha256}, got ${currentHash}`,
					appliedAt: startTime
				};
			}

			// Guard: Check line limit
			if (patch.linesChanged > this.maxPatchLines) {
				return {
					patch,
					success: false,
					reason: `Lines changed (${patch.linesChanged}) exceeds limit (${this.maxPatchLines})`,
					appliedAt: startTime
				};
			}

			// Guard: Verify afterSha256 matches target content
			const targetHash = computeSha256(targetContent);
			if (targetHash !== patch.afterSha256) {
				return {
					patch,
					success: false,
					reason: `Target hash mismatch: expected ${patch.afterSha256}, got ${targetHash}`,
					appliedAt: startTime
				};
			}

			if (dryRun) {
				return {
					patch,
					success: true,
					reason: 'Dry run: validation passed',
					appliedAt: startTime
				};
			}

			// Create snapshot before applying
			const snapshot = await this.snapshotStore.createSnapshot(patch.filePath);

			// Apply patch
			try {
				await writeFile(patch.filePath, targetContent, 'utf8');

				return {
					patch,
					success: true,
					reason: 'Patch applied successfully',
					backupPath: snapshot.backupPath,
					appliedAt: startTime
				};
			} catch (error) {
				// Rollback on write failure
				await this.snapshotStore.restoreSnapshot(patch.filePath);
				throw error;
			}
		} catch (error) {
			return {
				patch,
				success: false,
				reason: `Error applying patch: ${error instanceof Error ? error.message : String(error)}`,
				appliedAt: startTime
			};
		}
	}

	/**
	 * Apply multiple patches in sequence
	 *
	 * @param patches - Patches to apply
	 * @param contentMap - Map of filePath -> new content
	 * @param dryRun - If true, only validate
	 * @returns Array of application results
	 */
	async applyPatches(
		patches: DiffPatch[],
		contentMap: Map<string, string>,
		dryRun = false
	): Promise<DiffApplicationResult[]> {
		const results: DiffApplicationResult[] = [];

		for (const patch of patches) {
			const targetContent = contentMap.get(patch.filePath);
			if (!targetContent) {
				results.push({
					patch,
					success: false,
					reason: `No target content provided for ${patch.filePath}`,
					appliedAt: new Date()
				});
				continue;
			}

			const result = await this.applyPatch(patch, targetContent, dryRun);
			results.push(result);

			// Stop on first failure (unless dry run)
			if (!dryRun && !result.success) {
				break;
			}
		}

		return results;
	}

	/**
	 * Rollback a patch using snapshot
	 *
	 * @param filePath - File to rollback
	 * @returns True if rolled back successfully
	 */
	async rollback(filePath: string): Promise<boolean> {
		return await this.snapshotStore.restoreSnapshot(filePath);
	}

	/**
	 * Write apply log to disk
	 *
	 * @param runId - Run ID
	 * @param stamp - Batch report stamp
	 * @param results - Application results
	 * @param outputDir - Base output directory (default: reports/patches)
	 */
	async writeApplyLog(
		runId: string,
		stamp: string,
		results: DiffApplicationResult[],
		outputDir = 'reports/patches'
	): Promise<void> {
		const patchDir = join(outputDir, stamp);
		await mkdir(patchDir, { recursive: true });

		// Build log
		const log: ApplyLog = {
			runId,
			stamp,
			entries: results.map((result) => ({
				patch: result.patch,
				result,
				timestamp: result.appliedAt
			})),
			summary: {
				applied: results.filter((r) => r.success).length,
				rejected: results.filter((r) => !r.success).length,
				rolledBack: 0 // Updated by caller if rollbacks occur
			}
		};

		// Write log
		const logPath = join(patchDir, 'apply-log.json');
		await writeFile(logPath, JSON.stringify(log, null, 2), 'utf8');

		// Write individual diff files
		for (const result of results) {
			const diffFileName = result.patch.filePath.replace(/[\/\\]/g, '_') + '.diff';
			const diffPath = join(patchDir, diffFileName);
			await writeFile(diffPath, result.patch.diffText, 'utf8');
		}
	}

	/**
	 * Clean up snapshots after successful application
	 *
	 * @param filePaths - Files to clean up
	 */
	async cleanupSnapshots(filePaths: string[]): Promise<void> {
		for (const filePath of filePaths) {
			await this.snapshotStore.deleteSnapshot(filePath);
		}
	}
}
