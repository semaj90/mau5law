/**
 * Property tests for diff idempotence and validation cycle
 *
 * Tests the full apply → validate → rollback cycle:
 * - Apply patches produces valid TypeScript
 * - Validation detects regressions correctly
 * - Rollback restores original state
 * - Multiple apply cycles are idempotent
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiffApplier } from '../DiffApplier.js';
import { DiffGenerator } from '../DiffGenerator.js';
import { computeSha256 } from '../unifiedDiff.js';
import { ValidationService } from '../ValidationService.js';

const TEST_DIR = join(tmpdir(), 'diff-idempotence-tests');

describe('Diff Idempotence Property Tests', () => {
	let applier: DiffApplier;
	let validator: ValidationService;
	let generator: DiffGenerator;

	beforeEach(async () => {
		applier = new DiffApplier(80);
		validator = new ValidationService(applier, TEST_DIR);
		generator = new DiffGenerator({
			maxPatchLines: 80,
			contextLines: 3,
			minConfidence: 0.7
		});

		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('Apply-Rollback Idempotence', () => {
		it('applying and rolling back restores original content', async () => {
			const testFile = join(TEST_DIR, 'test.ts');
			const original = 'const x = 1;\nconst y = 2;\n';
			const modified = 'const x = 42;\nconst y = 2;\n';

			await writeFile(testFile, original, 'utf8');

			// Generate patch
			const patch = await generator.generatePatch({
				filePath: testFile,
				originalContent: original,
				proposedContent: modified,
				ruleId: 'test-rule',
				reason: 'test change',
				confidence: 1.0,
				runId: 'run-1'
			});

			expect(patch).toBeDefined();
			if (!patch) return;

			// Apply patch
			const applyResult = await applier.applyPatch(patch, modified);
			expect(applyResult.success).toBe(true);

			const afterApply = await readFile(testFile, 'utf8');
			expect(afterApply).toBe(modified);

			// Rollback
			const rolledBack = await applier.rollback(testFile);
			expect(rolledBack).toBe(true);

			const afterRollback = await readFile(testFile, 'utf8');
			expect(afterRollback).toBe(original);
			expect(computeSha256(afterRollback)).toBe(computeSha256(original));
		});

		it('applying same patch twice produces identical result', async () => {
			const testFile = join(TEST_DIR, 'test2.ts');
			const original = 'let a = 1;\n';
			const modified = 'let a = 2;\n';

			await writeFile(testFile, original, 'utf8');

			// Generate patch
			const patch = await generator.generatePatch({
				filePath: testFile,
				originalContent: original,
				proposedContent: modified,
				ruleId: 'test-rule',
				reason: 'test',
				confidence: 1.0,
				runId: 'run-1'
			});

			expect(patch).toBeDefined();
			if (!patch) return;

			// Apply first time
			await applier.applyPatch(patch, modified);
			const firstApply = await readFile(testFile, 'utf8');
			const firstHash = computeSha256(firstApply);

			// Rollback
			await applier.rollback(testFile);

			// Apply second time
			await applier.applyPatch(patch, modified);
			const secondApply = await readFile(testFile, 'utf8');
			const secondHash = computeSha256(secondApply);

			expect(firstHash).toBe(secondHash);
			expect(firstApply).toBe(secondApply);
		});
	});

	describe('Validation Cycle', () => {
		it('detects no regression when errors decrease', () => {
			const beforeErrors = [
				'test.ts(1,5): error TS2304: Cannot find name "foo"',
				'test.ts(2,5): error TS2304: Cannot find name "bar"'
			];
			const afterErrors = [
				'test.ts(1,5): error TS2304: Cannot find name "foo"'
			];

			const regression = validator.detectRegression(beforeErrors, afterErrors);

			expect(regression.hasRegression).toBe(false);
			expect(regression.netChange).toBe(-1);
			expect(regression.fixedErrors).toHaveLength(1);
			expect(regression.newErrors).toHaveLength(0);
		});

		it('detects regression when new errors appear', () => {
			const beforeErrors = [
				'test.ts(1,5): error TS2304: Cannot find name "foo"'
			];
			const afterErrors = [
				'test.ts(1,5): error TS2304: Cannot find name "foo"',
				'test.ts(3,5): error TS2304: Cannot find name "baz"'
			];

			const regression = validator.detectRegression(beforeErrors, afterErrors);

			expect(regression.hasRegression).toBe(true);
			expect(regression.netChange).toBe(1);
			expect(regression.newErrors).toHaveLength(1);
			expect(regression.fixedErrors).toHaveLength(0);
		});

		it('detects no regression when errors stay the same', () => {
			const errors = [
				'test.ts(1,5): error TS2304: Cannot find name "foo"',
				'test.ts(2,5): error TS2304: Cannot find name "bar"'
			];

			const regression = validator.detectRegression(errors, errors);

			expect(regression.hasRegression).toBe(false);
			expect(regression.netChange).toBe(0);
			expect(regression.newErrors).toHaveLength(0);
			expect(regression.fixedErrors).toHaveLength(0);
		});
	});

	describe('Full Cycle Integration', () => {
		it('completes full cycle: generate → apply → validate → cleanup', async () => {
			const testFile = join(TEST_DIR, 'cycle.ts');
			const original = 'const valid = 1;\n';
			const modified = 'const valid = 42;\n';

			await writeFile(testFile, original, 'utf8');

			// Generate
			const patch = await generator.generatePatch({
				filePath: testFile,
				originalContent: original,
				proposedContent: modified,
				ruleId: 'test-rule',
				reason: 'test',
				confidence: 1.0,
				runId: 'run-1'
			});

			expect(patch).toBeDefined();
			if (!patch) return;

			// Apply
			const contentMap = new Map([[testFile, modified]]);
			const result = await validator.applyWithValidation([patch], contentMap, true);

			// Verify no regression (both valid TypeScript)
			expect(result.rolledBack).toBe(false);
			expect(result.regression?.hasRegression).toBe(false);

			// Verify file updated
			const finalContent = await readFile(testFile, 'utf8');
			expect(finalContent).toBe(modified);
		});

		it('rollback cycle restores original hash', async () => {
			const testFile = join(TEST_DIR, 'rollback-cycle.ts');
			const original = 'const value = 1;\n';
			const modified = 'const value = 2;\n';

			await writeFile(testFile, original, 'utf8');
			const originalHash = computeSha256(original);

			// Generate patch
			const patch = await generator.generatePatch({
				filePath: testFile,
				originalContent: original,
				proposedContent: modified,
				ruleId: 'test-rule',
				reason: 'test',
				confidence: 1.0,
				runId: 'run-1'
			});

			expect(patch).toBeDefined();
			if (!patch) return;

			// Apply and rollback multiple times
			for (let i = 0; i < 3; i++) {
				await applier.applyPatch(patch, modified);
				await applier.rollback(testFile);

				const content = await readFile(testFile, 'utf8');
				expect(computeSha256(content)).toBe(originalHash);
			}
		});
	});

	describe('Error Parsing', () => {
		it('parses TypeScript error output correctly', () => {
			const output = `
src/test.ts(10,5): error TS2304: Cannot find name 'foo'.
src/test.ts(15,10): error TS2322: Type 'string' is not assignable to type 'number'.
Found 2 errors in 1 file.
			`;

			// Access private method via type assertion
			const service = validator as any;
			const errors = service.parseTypeScriptErrors(output);

			expect(errors).toHaveLength(2);
			expect(errors[0]).toContain('TS2304');
			expect(errors[1]).toContain('TS2322');
		});

		it('handles empty error output', () => {
			const output = 'Compilation complete. No errors found.';

			const service = validator as any;
			const errors = service.parseTypeScriptErrors(output);

			expect(errors).toHaveLength(0);
		});
	});
});
