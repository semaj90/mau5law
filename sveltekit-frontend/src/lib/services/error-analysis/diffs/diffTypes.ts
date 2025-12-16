/**
 * Error Brain: Diff Type System
 *
 * Strict types for deterministic patch generation and application.
 * All diffs are hash-guarded and confidence-scored.
 */

export type PatchConfidence = number; // 0..1

export interface DiffPatch {
	/** Unique patch ID (UUID) */
	id: string;

	/** Run ID this patch belongs to */
	runId: string;

	/** File path relative to project root */
	filePath: string;

	/** SHA256 of original file content (normalized EOL) */
	beforeSha256: string;

	/** SHA256 of proposed file content (normalized EOL) */
	afterSha256: string;

	/** Unified diff text (standard format) */
	diffText: string;

	/** Number of lines changed (added + removed) */
	linesChanged: number;

	/** Confidence score (0..1) - higher = safer */
	confidence: PatchConfidence;

	/** Human-readable explanation of what this patch does */
	reason: string;

	/** Rule/pattern ID that generated this patch (e.g., "missing-semicolon-union") */
	ruleId?: string;

	/** Timestamp when patch was generated */
	createdAt: Date;
}

export interface DiffGenerationResult {
	/** Generated patch, or null if no change needed */
	patch: DiffPatch | null;

	/** Why patch generation succeeded/failed */
	reason: string;

	/** True if generation succeeded */
	success: boolean;
}

export interface DiffApplicationResult {
	/** Patch that was applied */
	patch: DiffPatch;

	/** True if application succeeded */
	success: boolean;

	/** Why application succeeded/failed */
	reason: string;

	/** Path to backup file (if created) */
	backupPath?: string;

	/** Timestamp when applied */
	appliedAt: Date;
}

export interface DiffValidationResult {
	/** Patch that was validated */
	patch: DiffPatch;

	/** True if file is valid after patch */
	isValid: boolean;

	/** Validation errors (if any) */
	errors: string[];

	/** True if rollback was performed */
	rolledBack: boolean;

	/** Reason for validation result */
	reason: string;
}

export interface DiffGeneratorConfig {
	/** Maximum lines a single patch can change */
	maxPatchLines: number;

	/** Include this many context lines before/after changes */
	contextLines: number;

	/** Minimum confidence to generate a patch */
	minConfidence: number;
}

export const DEFAULT_DIFF_CONFIG: DiffGeneratorConfig = {
	maxPatchLines: 80,
	contextLines: 3,
	minConfidence: 0.7
};
