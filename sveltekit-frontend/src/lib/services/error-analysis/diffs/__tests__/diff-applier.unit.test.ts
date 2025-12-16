/**
 * Unit tests for DiffApplier
 *
 * Tests:
 * - Guard enforcement (file exists, hash match, line limit)
 * - Rollback on failure
 * - Dry-run mode
 * - Apply log generation
 * - Snapshot cleanup
 */

import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiffApplier } from '../DiffApplier.js';
import type { DiffPatch } from '../diffTypes.js';
import { computeSha256, generateUnifiedDiff } from '../unifiedDiff.js';

const TEST_DIR = join(tmpdir(), 'diff-applier-tests');

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

describe('DiffApplier', () => {
	let applier: DiffApplier;
	let testFile: string;
	let originalContent: string;
	let modifiedContent: string;

	beforeEach(async () => {
		applier = new DiffApplier(80);
		await mkdir(TEST_DIR, { recursive: true });

		testFile = join(TEST_DIR, 'test.ts');
		originalContent = 'const foo = 1;\nconst bar = 2;\n';
		modifiedContent = 'const foo = 42;\nconst bar = 2;\n';

		await writeFile(testFile, originalContent, 'utf8');
	});

	afterEach(async () => {
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('Guard: File Exists', () => {
		it('rejects patch if file does not exist', async () => {
			const nonExistentFile = join(TEST_DIR, 'nonexistent.ts');
			const patch: DiffPatch = {
				id: 'patch-1',
				runId: 'run-1',
				filePath: nonExistentFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, nonExistentFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent);

			expect(result.success).toBe(false);
			expect(result.reason).toContain('File not found');
		});
	});

	describe('Guard: Hash Match', () => {
		it('rejects patch if beforeSha256 does not match current content', async () => {
			const wrongHash = computeSha256('wrong content');
			const patch: DiffPatch = {
				id: 'patch-2',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: wrongHash,
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent);

			expect(result.success).toBe(false);
			expect(result.reason).toContain('Hash mismatch');
		});

		it('rejects patch if afterSha256 does not match target content', async () => {
			const wrongTargetContent = 'const foo = 99;\nconst bar = 2;\n';
			const patch: DiffPatch = {
				id: 'patch-3',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, wrongTargetContent);

			expect(result.success).toBe(false);
			expect(result.reason).toContain('Target hash mismatch');
		});
	});

	describe('Guard: Line Limit', () => {
		it('rejects patch exceeding maxPatchLines', async () => {
			const applier81 = new DiffApplier(5); // Low limit

			const largeDiff = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
			const patch: DiffPatch = {
				id: 'patch-4',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(largeDiff),
				diffText: generateUnifiedDiff(originalContent, largeDiff, testFile, 3),
				linesChanged: 100,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier81.applyPatch(patch, largeDiff);

			expect(result.success).toBe(false);
			expect(result.reason).toContain('exceeds limit');
		});
	});

	describe('Patch Application', () => {
		it('applies valid patch and creates snapshot', async () => {
			const patch: DiffPatch = {
				id: 'patch-5',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent);

			expect(result.success).toBe(true);
			expect(result.backupPath).toBeDefined();

			// Verify file updated
			const newContent = await readFile(testFile, 'utf8');
			expect(newContent).toBe(modifiedContent);

			// Verify backup exists
			const backupExists = await fileExists(result.backupPath!);
			expect(backupExists).toBe(true);
		});

		it('does not modify file in dry-run mode', async () => {
			const patch: DiffPatch = {
				id: 'patch-6',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent, true);

			expect(result.success).toBe(true);
			expect(result.reason).toContain('Dry run');

			// Verify file unchanged
			const content = await readFile(testFile, 'utf8');
			expect(content).toBe(originalContent);
		});
	});

	describe('Batch Application', () => {
		it('applies multiple patches in sequence', async () => {
			const file2 = join(TEST_DIR, 'test2.ts');
			const original2 = 'let x = 1;\n';
			const modified2 = 'let x = 2;\n';
			await writeFile(file2, original2, 'utf8');

			const patches: DiffPatch[] = [
				{
					id: 'patch-7a',
					runId: 'run-1',
					filePath: testFile,
					beforeSha256: computeSha256(originalContent),
					afterSha256: computeSha256(modifiedContent),
					diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
					linesChanged: 1,
					confidence: 1.0,
					reason: 'test',
					ruleId: 'test-rule',
					createdAt: new Date()
				},
				{
					id: 'patch-7b',
					runId: 'run-1',
					filePath: file2,
					beforeSha256: computeSha256(original2),
					afterSha256: computeSha256(modified2),
					diffText: generateUnifiedDiff(original2, modified2, file2, 3),
					linesChanged: 1,
					confidence: 1.0,
					reason: 'test',
					ruleId: 'test-rule',
					createdAt: new Date()
				}
			];

			const contentMap = new Map([
				[testFile, modifiedContent],
				[file2, modified2]
			]);

			const results = await applier.applyPatches(patches, contentMap);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);

			// Verify files updated
			const content1 = await readFile(testFile, 'utf8');
			const content2 = await readFile(file2, 'utf8');
			expect(content1).toBe(modifiedContent);
			expect(content2).toBe(modified2);
		});

		it('stops on first failure', async () => {
			const patches: DiffPatch[] = [
				{
					id: 'patch-8a',
					runId: 'run-1',
					filePath: testFile,
					beforeSha256: 'wrong-hash',
					afterSha256: computeSha256(modifiedContent),
					diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
					linesChanged: 1,
					confidence: 1.0,
					reason: 'test',
					ruleId: 'test-rule',
					createdAt: new Date()
				},
				{
					id: 'patch-8b',
					runId: 'run-1',
					filePath: testFile,
					beforeSha256: computeSha256(originalContent),
					afterSha256: computeSha256(modifiedContent),
					diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
					linesChanged: 1,
					confidence: 1.0,
					reason: 'test',
					ruleId: 'test-rule',
					createdAt: new Date()
				}
			];

			const contentMap = new Map([[testFile, modifiedContent]]);

			const results = await applier.applyPatches(patches, contentMap);

			// Only first patch attempted
			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});
	});

	describe('Rollback', () => {
		it('restores file from snapshot', async () => {
			const patch: DiffPatch = {
				id: 'patch-9',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			// Apply patch
			await applier.applyPatch(patch, modifiedContent);

			// Rollback
			const rolled = await applier.rollback(testFile);
			expect(rolled).toBe(true);

			// Verify file restored
			const content = await readFile(testFile, 'utf8');
			expect(content).toBe(originalContent);
		});
	});

	describe('Apply Log', () => {
		it('writes apply-log.json and diff files', async () => {
			const patch: DiffPatch = {
				id: 'patch-10',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent);
			const stamp = '2025-01-14_12-00-00';
			const outputDir = join(TEST_DIR, 'reports');

			await applier.writeApplyLog('run-1', stamp, [result], outputDir);

			// Verify apply-log.json exists
			const logPath = join(outputDir, stamp, 'apply-log.json');
			const logExists = await fileExists(logPath);
			expect(logExists).toBe(true);

			const logContent = await readFile(logPath, 'utf8');
			const log = JSON.parse(logContent);
			expect(log.runId).toBe('run-1');
			expect(log.stamp).toBe(stamp);
			expect(log.entries).toHaveLength(1);
			expect(log.summary.applied).toBe(1);

			// Verify diff file exists
			const diffFileName = testFile.replace(/[\/\\]/g, '_') + '.diff';
			const diffPath = join(outputDir, stamp, diffFileName);
			const diffExists = await fileExists(diffPath);
			expect(diffExists).toBe(true);
		});
	});

	describe('Snapshot Cleanup', () => {
		it('removes snapshots after successful application', async () => {
			const patch: DiffPatch = {
				id: 'patch-11',
				runId: 'run-1',
				filePath: testFile,
				beforeSha256: computeSha256(originalContent),
				afterSha256: computeSha256(modifiedContent),
				diffText: generateUnifiedDiff(originalContent, modifiedContent, testFile, 3),
				linesChanged: 1,
				confidence: 1.0,
				reason: 'test',
				ruleId: 'test-rule',
				createdAt: new Date()
			};

			const result = await applier.applyPatch(patch, modifiedContent);
			expect(result.backupPath).toBeDefined();

			// Verify backup exists
			const backupExists1 = await fileExists(result.backupPath!);
			expect(backupExists1).toBe(true);

			// Cleanup
			await applier.cleanupSnapshots([testFile]);

			// Verify backup removed
			const backupExists2 = await fileExists(result.backupPath!);
			expect(backupExists2).toBe(false);
		});
	});
});
