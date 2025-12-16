/**
 * Error Brain: Diff Repository
 *
 * Database persistence for generated patches.
 * Provides CRUD operations and query methods.
 */

import { db } from '$lib/server/db';
import type { ErrorBrainDiff, ErrorBrainDiffInsert } from '$lib/server/db/schema/errorBrainDiffs';
import { errorBrainDiffsTable } from '$lib/server/db/schema/errorBrainDiffs';
import { and, desc, eq } from 'drizzle-orm';
import type { DiffApplicationResult, DiffPatch } from './diffTypes';

export class DiffRepository {
	/**
	 * Insert a new diff record
	 *
	 * @param patch - Patch to persist
	 * @returns Inserted record
	 */
	async insert(patch: DiffPatch): Promise<ErrorBrainDiff> {
		const record: ErrorBrainDiffInsert = {
			runId: patch.runId,
			filePath: patch.filePath,
			beforeSha256: patch.beforeSha256,
			afterSha256: patch.afterSha256,
			diffText: patch.diffText,
			linesChanged: patch.linesChanged,
			confidence: patch.confidence,
			reason: patch.reason,
			ruleId: patch.ruleId,
			applied: 'pending'
		};

		const [inserted] = await db.insert(errorBrainDiffsTable).values(record).returning();
		return inserted;
	}

	/**
	 * Insert multiple diffs in a batch
	 *
	 * @param patches - Patches to persist
	 * @returns Inserted records
	 */
	async insertBatch(patches: DiffPatch[]): Promise<ErrorBrainDiff[]> {
		if (patches.length === 0) return [];

		const records: ErrorBrainDiffInsert[] = patches.map((patch) => ({
			runId: patch.runId,
			filePath: patch.filePath,
			beforeSha256: patch.beforeSha256,
			afterSha256: patch.afterSha256,
			diffText: patch.diffText,
			linesChanged: patch.linesChanged,
			confidence: patch.confidence,
			reason: patch.reason,
			ruleId: patch.ruleId,
			applied: 'pending'
		}));

		return await db.insert(errorBrainDiffsTable).values(records).returning();
	}

	/**
	 * Update diff status after application
	 *
	 * @param patchId - Patch ID
	 * @param result - Application result
	 */
	async updateApplicationStatus(
		patchId: string,
		result: DiffApplicationResult
	): Promise<void> {
		await db
			.update(errorBrainDiffsTable)
			.set({
				applied: result.success ? 'applied' : 'failed',
				appliedAt: result.appliedAt,
				updatedAt: new Date()
			})
			.where(eq(errorBrainDiffsTable.id, patchId));
	}

	/**
	 * Update validation results
	 *
	 * @param patchId - Patch ID
	 * @param status - Validation status
	 * @param errorCountBefore - Error count before apply
	 * @param errorCountAfter - Error count after apply
	 */
	async updateValidationStatus(
		patchId: string,
		status: 'passed' | 'failed' | 'regression',
		errorCountBefore: number,
		errorCountAfter: number
	): Promise<void> {
		await db
			.update(errorBrainDiffsTable)
			.set({
				validationStatus: status,
				errorCountBefore,
				errorCountAfter,
				updatedAt: new Date()
			})
			.where(eq(errorBrainDiffsTable.id, patchId));
	}

	/**
	 * Mark diff as rolled back
	 *
	 * @param patchId - Patch ID
	 */
	async markRolledBack(patchId: string): Promise<void> {
		await db
			.update(errorBrainDiffsTable)
			.set({
				applied: 'rolled_back',
				updatedAt: new Date()
			})
			.where(eq(errorBrainDiffsTable.id, patchId));
	}

	/**
	 * Find all diffs for a run
	 *
	 * @param runId - Run ID
	 * @returns Array of diffs
	 */
	async findByRunId(runId: string): Promise<ErrorBrainDiff[]> {
		return await db
			.select()
			.from(errorBrainDiffsTable)
			.where(eq(errorBrainDiffsTable.runId, runId))
			.orderBy(desc(errorBrainDiffsTable.createdAt));
	}

	/**
	 * Find all diffs for a specific file
	 *
	 * @param filePath - File path
	 * @returns Array of diffs
	 */
	async findByFile(filePath: string): Promise<ErrorBrainDiff[]> {
		return await db
			.select()
			.from(errorBrainDiffsTable)
			.where(eq(errorBrainDiffsTable.filePath, filePath))
			.orderBy(desc(errorBrainDiffsTable.createdAt));
	}

	/**
	 * Find diffs for a file in a specific run
	 *
	 * @param runId - Run ID
	 * @param filePath - File path
	 * @returns Array of diffs
	 */
	async findByRunAndFile(runId: string, filePath: string): Promise<ErrorBrainDiff[]> {
		return await db
			.select()
			.from(errorBrainDiffsTable)
			.where(
				and(
					eq(errorBrainDiffsTable.runId, runId),
					eq(errorBrainDiffsTable.filePath, filePath)
				)
			)
			.orderBy(desc(errorBrainDiffsTable.createdAt));
	}

	/**
	 * Get diff by ID
	 *
	 * @param id - Diff ID
	 * @returns Diff record or null
	 */
	async findById(id: string): Promise<ErrorBrainDiff | null> {
		const [record] = await db
			.select()
			.from(errorBrainDiffsTable)
			.where(eq(errorBrainDiffsTable.id, id))
			.limit(1);

		return record || null;
	}

	/**
	 * Get statistics for a run
	 *
	 * @param runId - Run ID
	 * @returns Stats object
	 */
	async getRunStats(runId: string): Promise<{
		total: number;
		pending: number;
		applied: number;
		failed: number;
		rolledBack: number;
		avgConfidence: number;
		totalLinesChanged: number;
	}> {
		const diffs = await this.findByRunId(runId);

		return {
			total: diffs.length,
			pending: diffs.filter((d) => d.applied === 'pending').length,
			applied: diffs.filter((d) => d.applied === 'applied').length,
			failed: diffs.filter((d) => d.applied === 'failed').length,
			rolledBack: diffs.filter((d) => d.applied === 'rolled_back').length,
			avgConfidence: diffs.length > 0
				? diffs.reduce((sum, d) => sum + d.confidence, 0) / diffs.length
				: 0,
			totalLinesChanged: diffs.reduce((sum, d) => sum + d.linesChanged, 0)
		};
	}
}
