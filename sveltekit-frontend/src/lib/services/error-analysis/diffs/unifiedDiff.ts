/**
 * Error Brain: Unified Diff Generator
 *
 * Pure helper functions for generating standard unified diff format.
 * No side effects, fully deterministic.
 */

import { createHash } from 'node:crypto';

/**
 * Compute SHA256 hash of content (normalized EOL)
 */
export function computeSha256(content: string): string {
	const normalized = content.replace(/\r\n/g, '\n');
	return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Normalize EOL characters to \n
 */
export function normalizeEOL(content: string): string {
	return content.replace(/\r\n/g, '\n');
}

/**
 * Generate unified diff between two strings
 *
 * @param filePath - File path for diff header
 * @param before - Original content
 * @param after - Modified content
 * @param contextLines - Number of context lines (default: 3)
 * @returns Unified diff string
 */
export function generateUnifiedDiff(
	filePath: string,
	before: string,
	after: string,
	contextLines = 3
): string {
	const beforeNorm = normalizeEOL(before);
	const afterNorm = normalizeEOL(after);

	const beforeLines = beforeNorm.split('\n');
	const afterLines = afterNorm.split('\n');

	// Build diff hunks
	const hunks: string[] = [];
	let i = 0;
	let j = 0;

	while (i < beforeLines.length || j < afterLines.length) {
		// Find next difference
		while (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
			i++;
			j++;
		}

		if (i >= beforeLines.length && j >= afterLines.length) break;

		// Start of hunk (with context)
		const hunkStartBefore = Math.max(0, i - contextLines);
		const hunkStartAfter = Math.max(0, j - contextLines);

		const hunkLines: string[] = [];

		// Add context before
		for (let k = hunkStartBefore; k < i && k < beforeLines.length; k++) {
			hunkLines.push(` ${beforeLines[k]}`);
		}

		// Find end of difference block
		let hunkEndBefore = i;
		let hunkEndAfter = j;

		while (
			(hunkEndBefore < beforeLines.length || hunkEndAfter < afterLines.length) &&
			(hunkEndBefore >= beforeLines.length ||
				hunkEndAfter >= afterLines.length ||
				beforeLines[hunkEndBefore] !== afterLines[hunkEndAfter])
		) {
			if (hunkEndBefore < beforeLines.length) {
				hunkLines.push(`-${beforeLines[hunkEndBefore]}`);
				hunkEndBefore++;
			}
			if (hunkEndAfter < afterLines.length) {
				hunkLines.push(`+${afterLines[hunkEndAfter]}`);
				hunkEndAfter++;
			}
		}

		// Add context after
		const contextEnd = Math.min(beforeLines.length, hunkEndBefore + contextLines);
		for (let k = hunkEndBefore; k < contextEnd; k++) {
			hunkLines.push(` ${beforeLines[k]}`);
		}

		// Build hunk header
		const hunkHeader = `@@ -${hunkStartBefore + 1},${hunkEndBefore - hunkStartBefore} +${hunkStartAfter + 1},${hunkEndAfter - hunkStartAfter} @@`;
		hunks.push(hunkHeader);
		hunks.push(...hunkLines);

		i = hunkEndBefore;
		j = hunkEndAfter;
	}

	// Build full diff
	const diff: string[] = [
		`--- a/${filePath}`,
		`+++ b/${filePath}`,
		...hunks
	];

	return diff.join('\n');
}

/**
 * Count lines changed in a diff
 *
 * @param before - Original content
 * @param after - Modified content
 * @returns Number of lines changed (added + removed)
 */
export function countLinesChanged(before: string, after: string): number {
	const beforeNorm = normalizeEOL(before);
	const afterNorm = normalizeEOL(after);

	const beforeLines = beforeNorm.split('\n');
	const afterLines = afterNorm.split('\n');

	let changed = 0;
	const maxLen = Math.max(beforeLines.length, afterLines.length);

	for (let i = 0; i < maxLen; i++) {
		if (beforeLines[i] !== afterLines[i]) {
			changed++;
		}
	}

	return changed;
}

/**
 * Check if two file contents are identical (after EOL normalization)
 */
export function contentsEqual(a: string, b: string): boolean {
	return normalizeEOL(a) === normalizeEOL(b);
}
