/**
 * Error Brain: Diff Generator Property Tests
 *
 * Property-based tests for diff generation invariants:
 * - Idempotence: generating same patch twice yields identical result
 * - Hash consistency: beforeSha256 always matches original content
 * - Line limits: never exceeds MAX_PATCH_LINES
 * - One file rule: batch operations reject duplicates
 */

import { describe, expect, it } from 'vitest';
import { DiffGenerator } from '../DiffGenerator';
import { computeSha256 } from '../unifiedDiff';

describe('DiffGenerator - Property Tests', () => {
	describe('Idempotence', () => {
		it('should generate identical patches for same inputs', () => {
			const generator = new DiffGenerator();
			const runId = 'test-run-001';
			const filePath = 'src/test.ts';
			const before = 'const x = 1;';
			const after = 'const x = 2;';
			const reason = 'Update value';
			const confidence = 0.95;

			const result1 = generator.generatePatch(runId, filePath, before, after, reason, confidence);
			const result2 = generator.generatePatch(runId, filePath, before, after, reason, confidence);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(result1.patch?.beforeSha256).toBe(result2.patch?.beforeSha256);
			expect(result1.patch?.afterSha256).toBe(result2.patch?.afterSha256);
			expect(result1.patch?.diffText).toBe(result2.patch?.diffText);
			expect(result1.patch?.linesChanged).toBe(result2.patch?.linesChanged);
		});

		it('should reject identical before/after content', () => {
			const generator = new DiffGenerator();
			const content = 'const x = 1;';

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				content,
				content,
				'No change',
				0.95
			);

			expect(result.success).toBe(false);
			expect(result.patch).toBeNull();
			expect(result.reason).toContain('identical');
		});
	});

	describe('Hash Consistency', () => {
		it('should always match beforeSha256 to original content', () => {
			const generator = new DiffGenerator();
			const before = 'line1\nline2\nline3';
			const after = 'line1\nLINE2\nline3';

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				before,
				after,
				'Case change',
				0.9
			);

			expect(result.success).toBe(true);
			expect(result.patch?.beforeSha256).toBe(computeSha256(before));
			expect(result.patch?.afterSha256).toBe(computeSha256(after));
		});

		it('should normalize EOL before hashing', () => {
			const generator = new DiffGenerator();
			const beforeUnix = 'line1\nline2';
			const beforeWindows = 'line1\r\nline2';
			const after = 'line1\nLINE2';

			const result1 = generator.generatePatch(
				'run-001',
				'test.ts',
				beforeUnix,
				after,
				'Change',
				0.9
			);
			const result2 = generator.generatePatch(
				'run-001',
				'test.ts',
				beforeWindows,
				after,
				'Change',
				0.9
			);

			expect(result1.patch?.beforeSha256).toBe(result2.patch?.beforeSha256);
		});

		it('should validate patch hash against current content', () => {
			const generator = new DiffGenerator();
			const before = 'original';
			const after = 'modified';

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				before,
				after,
				'Change',
				0.9
			);

			expect(result.success).toBe(true);
			expect(generator.validatePatchHash(result.patch!, before)).toBe(true);
			expect(generator.validatePatchHash(result.patch!, 'different')).toBe(false);
		});
	});

	describe('Line Limits', () => {
		it('should reject patches exceeding MAX_PATCH_LINES', () => {
			const generator = new DiffGenerator({ maxPatchLines: 5 });

			const before = Array(10)
				.fill(0)
				.map((_, i) => `line${i}`)
				.join('\n');
			const after = Array(10)
				.fill(0)
				.map((_, i) => `LINE${i}`)
				.join('\n');

			const result = generator.generatePatch('run-001', 'test.ts', before, after, 'Change', 0.9);

			expect(result.success).toBe(false);
			expect(result.patch).toBeNull();
			expect(result.reason).toContain('exceeds limit');
		});

		it('should accept patches within limit', () => {
			const generator = new DiffGenerator({ maxPatchLines: 10 });

			const before = Array(5)
				.fill(0)
				.map((_, i) => `line${i}`)
				.join('\n');
			const after = Array(5)
				.fill(0)
				.map((_, i) => `LINE${i}`)
				.join('\n');

			const result = generator.generatePatch('run-001', 'test.ts', before, after, 'Change', 0.9);

			expect(result.success).toBe(true);
			expect(result.patch).not.toBeNull();
		});
	});

	describe('Confidence Threshold', () => {
		it('should reject patches below minConfidence', () => {
			const generator = new DiffGenerator({ minConfidence: 0.8 });

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				'before',
				'after',
				'Low confidence change',
				0.5
			);

			expect(result.success).toBe(false);
			expect(result.patch).toBeNull();
			expect(result.reason).toContain('below threshold');
		});

		it('should accept patches meeting threshold', () => {
			const generator = new DiffGenerator({ minConfidence: 0.7 });

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				'before',
				'after',
				'High confidence change',
				0.95
			);

			expect(result.success).toBe(true);
			expect(result.patch).not.toBeNull();
		});
	});

	describe('One File Rule', () => {
		it('should reject duplicate files in batch', () => {
			const generator = new DiffGenerator();

			const results = generator.generatePatches('run-001', [
				{
					filePath: 'test.ts',
					before: 'v1',
					after: 'v2',
					reason: 'First',
					confidence: 0.9
				},
				{
					filePath: 'test.ts',
					before: 'v2',
					after: 'v3',
					reason: 'Second',
					confidence: 0.9
				}
			]);

			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(false);
			expect(results[1].reason).toContain('Duplicate file');
		});

		it('should allow different files in batch', () => {
			const generator = new DiffGenerator();

			const results = generator.generatePatches('run-001', [
				{
					filePath: 'file1.ts',
					before: 'v1',
					after: 'v2',
					reason: 'Change 1',
					confidence: 0.9
				},
				{
					filePath: 'file2.ts',
					before: 'v1',
					after: 'v2',
					reason: 'Change 2',
					confidence: 0.9
				}
			]);

			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);
		});
	});

	describe('Unified Diff Format', () => {
		it('should include file headers', () => {
			const generator = new DiffGenerator();

			const result = generator.generatePatch(
				'run-001',
				'src/test.ts',
				'before',
				'after',
				'Change',
				0.9
			);

			expect(result.success).toBe(true);
			expect(result.patch?.diffText).toContain('--- a/src/test.ts');
			expect(result.patch?.diffText).toContain('+++ b/src/test.ts');
		});

		it('should include hunk headers', () => {
			const generator = new DiffGenerator();

			const result = generator.generatePatch(
				'run-001',
				'test.ts',
				'line1\nline2',
				'line1\nmodified',
				'Change',
				0.9
			);

			expect(result.success).toBe(true);
			expect(result.patch?.diffText).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
		});
	});
});
