/**
 * Error Brain: Diff Generator
 *
 * Turns LLM-suggested changes into deterministic, hash-guarded unified diffs.
 *
 * Key invariants:
 * - One patch = one file
 * - Include 3-5 context lines
 * - Include beforeSha256 + afterSha256
 * - Add confidence + reason
 * - Enforce MAX_PATCH_LINES
 */

import { randomUUID } from 'node:crypto';
import type {
    DiffGenerationResult,
    DiffGeneratorConfig,
    DiffPatch
} from './diffTypes.js';
import { DEFAULT_DIFF_CONFIG } from './diffTypes.js';
import {
    computeSha256,
    contentsEqual,
    countLinesChanged,
    generateUnifiedDiff
} from './unifiedDiff.js';

export class DiffGenerator {
	private config: DiffGeneratorConfig;

	constructor(config: Partial<DiffGeneratorConfig> = {}) {
		this.config = {
			...DEFAULT_DIFF_CONFIG,
			...config
		};
	}

	/**
	 * Generate a patch from before/after content
	 *
	 * @param runId - Run ID this patch belongs to
	 * @param filePath - File path relative to project root
	 * @param before - Original file content
	 * @param after - Proposed file content
	 * @param reason - Human-readable explanation
	 * @param confidence - Confidence score (0..1)
	 * @param ruleId - Optional rule ID that generated this patch
	 * @returns Generation result with patch or error
	 */
	generatePatch(
		runId: string,
		filePath: string,
		before: string,
		after: string,
		reason: string,
		confidence: number,
		ruleId?: string
	): DiffGenerationResult {
		// Guard: Check if contents are identical
		if (contentsEqual(before, after)) {
			return {
				patch: null,
				reason: 'No changes needed - contents identical',
				success: false
			};
		}

		// Guard: Check confidence threshold
		if (confidence < this.config.minConfidence) {
			return {
				patch: null,
				reason: `Confidence ${confidence} below threshold ${this.config.minConfidence}`,
				success: false
			};
		}

		// Guard: Check line count
		const linesChanged = countLinesChanged(before, after);
		if (linesChanged > this.config.maxPatchLines) {
			return {
				patch: null,
				reason: `Lines changed (${linesChanged}) exceeds limit (${this.config.maxPatchLines})`,
				success: false
			};
		}

		// Generate hashes
		const beforeSha256 = computeSha256(before);
		const afterSha256 = computeSha256(after);

		// Generate unified diff
		const diffText = generateUnifiedDiff(filePath, before, after, this.config.contextLines);

		// Create patch
		const patch: DiffPatch = {
			id: randomUUID(),
			runId,
			filePath,
			beforeSha256,
			afterSha256,
			diffText,
			linesChanged,
			confidence,
			reason,
			ruleId,
			createdAt: new Date()
		};

		return {
			patch,
			reason: 'Patch generated successfully',
			success: true
		};
	}

	/**
	 * Generate multiple patches (one per file, enforced)
	 *
	 * @param runId - Run ID for all patches
	 * @param changes - Array of change requests
	 * @returns Array of generation results
	 */
	generatePatches(
		runId: string,
		changes: Array<{
			filePath: string;
			before: string;
			after: string;
			reason: string;
			confidence: number;
			ruleId?: string;
		}>
	): DiffGenerationResult[] {
		// Enforce: one patch per file
		const seenFiles = new Set<string>();
		const results: DiffGenerationResult[] = [];

		for (const change of changes) {
			if (seenFiles.has(change.filePath)) {
				results.push({
					patch: null,
					reason: `Duplicate file in batch: ${change.filePath}`,
					success: false
				});
				continue;
			}

			seenFiles.add(change.filePath);
			const result = this.generatePatch(
				runId,
				change.filePath,
				change.before,
				change.after,
				change.reason,
				change.confidence,
				change.ruleId
			);
			results.push(result);
		}

		return results;
	}

	/**
	 * Validate a patch's hashes match expected content
	 *
	 * @param patch - Patch to validate
	 * @param currentContent - Current file content
	 * @returns True if beforeSha256 matches current content
	 */
	validatePatchHash(patch: DiffPatch, currentContent: string): boolean {
		const currentHash = computeSha256(currentContent);
		return currentHash === patch.beforeSha256;
	}
}
