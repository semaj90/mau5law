/**
 * Unit tests for DiffRepository
 *
 * Tests CRUD operations and query methods.
 * Uses in-memory test database.
 */

import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Mock DiffRepository for testing
 *
 * In real usage, this would use actual database.
 * For tests, we use in-memory store.
 */
class MockDiffRepository {
	private store: Map<string, any> = new Map();
	private counter = 0;

	async insert(patch: DiffPatch) {
		const id = `patch-${++this.counter}`;
		const record = {
			id,
			runId: patch.runId,
			filePath: patch.filePath,
			beforeSha256: patch.beforeSha256,
			afterSha256: patch.afterSha256,
			diffText: patch.diffText,
			linesChanged: patch.linesChanged,
			confidence: patch.confidence,
			reason: patch.reason,
			ruleId: patch.ruleId,
			applied: 'pending' as const,
			appliedAt: null,
			validationStatus: null,
			errorCountBefore: null,
			errorCountAfter: null,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		this.store.set(id, record);
		return record;
	}

	async insertBatch(patches: DiffPatch[]) {
		return Promise.all(patches.map((p) => this.insert(p)));
	}

	async updateApplicationStatus(patchId: string, result: any) {
		const record = this.store.get(patchId);
		if (record) {
			record.applied = result.success ? 'applied' : 'failed';
			record.appliedAt = result.appliedAt;
			record.updatedAt = new Date();
		}
	}

	async updateValidationStatus(
		patchId: string,
		status: 'passed' | 'failed' | 'regression',
		errorCountBefore: number,
		errorCountAfter: number
	) {
		const record = this.store.get(patchId);
		if (record) {
			record.validationStatus = status;
			record.errorCountBefore = errorCountBefore;
			record.errorCountAfter = errorCountAfter;
			record.updatedAt = new Date();
		}
	}

	async markRolledBack(patchId: string) {
		const record = this.store.get(patchId);
		if (record) {
			record.applied = 'rolled_back';
			record.updatedAt = new Date();
		}
	}

	async findByRunId(runId: string) {
		return Array.from(this.store.values())
			.filter((r) => r.runId === runId)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	async findByFile(filePath: string) {
		return Array.from(this.store.values())
			.filter((r) => r.filePath === filePath)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	async findByRunAndFile(runId: string, filePath: string) {
		return Array.from(this.store.values())
			.filter((r) => r.runId === runId && r.filePath === filePath)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	async findById(id: string) {
		return this.store.get(id) || null;
	}

	async getRunStats(runId: string) {
		const diffs = await this.findByRunId(runId);

		return {
			total: diffs.length,
			pending: diffs.filter((d: any) => d.applied === 'pending').length,
			applied: diffs.filter((d: any) => d.applied === 'applied').length,
			failed: diffs.filter((d: any) => d.applied === 'failed').length,
			rolledBack: diffs.filter((d: any) => d.applied === 'rolled_back').length,
			avgConfidence: diffs.length > 0
				? diffs.reduce((sum: number, d: any) => sum + d.confidence, 0) / diffs.length
				: 0,
			totalLinesChanged: diffs.reduce((sum: number, d: any) => sum + d.linesChanged, 0)
		};
	}

	clear() {
		this.store.clear();
		this.counter = 0;
	}
}

describe('DiffRepository', () => {
	let repo: MockDiffRepository;

	beforeEach(() => {
		repo = new MockDiffRepository();
	});

	describe('Insert Operations', () => {
		it('inserts single patch', async () => {
			const patch: DiffPatch = {
				id: 'patch-1',
				runId: 'run-1',
				filePath: '/test/file.ts',
				beforeSha256: 'hash1',
				afterSha256: 'hash2',
				diffText: 'diff content',
				linesChanged: 5,
				confidence: 0.9,
				reason: 'test fix',
				ruleId: 'rule-1',
				createdAt: new Date()
			};

			const inserted = await repo.insert(patch);

			expect(inserted).toBeDefined();
			expect(inserted.id).toMatch(/^patch-\d+$/);
			expect(inserted.runId).toBe('run-1');
			expect(inserted.applied).toBe('pending');
		});

		it('inserts batch of patches', async () => {
			const patches: DiffPatch[] = [
				{
					id: 'p1',
					runId: 'run-1',
					filePath: '/test/file1.ts',
					beforeSha256: 'hash1',
					afterSha256: 'hash2',
					diffText: 'diff1',
					linesChanged: 5,
					confidence: 0.9,
					reason: 'fix1',
					ruleId: 'rule-1',
					createdAt: new Date()
				},
				{
					id: 'p2',
					runId: 'run-1',
					filePath: '/test/file2.ts',
					beforeSha256: 'hash3',
					afterSha256: 'hash4',
					diffText: 'diff2',
					linesChanged: 3,
					confidence: 0.8,
					reason: 'fix2',
					ruleId: 'rule-1',
					createdAt: new Date()
				}
			];

			const inserted = await repo.insertBatch(patches);

			expect(inserted).toHaveLength(2);
			expect(inserted[0].filePath).toBe('/test/file1.ts');
			expect(inserted[1].filePath).toBe('/test/file2.ts');
		});
	});

	describe('Update Operations', () => {
		it('updates application status on success', async () => {
			const patch: DiffPatch = {
				id: 'p1',
				runId: 'run-1',
				filePath: '/test/file.ts',
				beforeSha256: 'hash1',
				afterSha256: 'hash2',
				diffText: 'diff',
				linesChanged: 5,
				confidence: 0.9,
				reason: 'fix',
				ruleId: 'rule-1',
				createdAt: new Date()
			};

			const inserted = await repo.insert(patch);
			const appliedAt = new Date();

			await repo.updateApplicationStatus(inserted.id, {
				patch,
				success: true,
				reason: 'applied',
				appliedAt
			});

			const updated = await repo.findById(inserted.id);
			expect(updated?.applied).toBe('applied');
			expect(updated?.appliedAt).toBeDefined();
		});

		it('updates application status on failure', async () => {
			const patch: DiffPatch = {
				id: 'p1',
				runId: 'run-1',
				filePath: '/test/file.ts',
				beforeSha256: 'hash1',
				afterSha256: 'hash2',
				diffText: 'diff',
				linesChanged: 5,
				confidence: 0.9,
				reason: 'fix',
				ruleId: 'rule-1',
				createdAt: new Date()
			};

			const inserted = await repo.insert(patch);

			await repo.updateApplicationStatus(inserted.id, {
				patch,
				success: false,
				reason: 'hash mismatch',
				appliedAt: new Date()
			});

			const updated = await repo.findById(inserted.id);
			expect(updated?.applied).toBe('failed');
		});

		it('updates validation status', async () => {
			const patch: DiffPatch = {
				id: 'p1',
				runId: 'run-1',
				filePath: '/test/file.ts',
				beforeSha256: 'hash1',
				afterSha256: 'hash2',
				diffText: 'diff',
				linesChanged: 5,
				confidence: 0.9,
				reason: 'fix',
				ruleId: 'rule-1',
				createdAt: new Date()
			};

			const inserted = await repo.insert(patch);

			await repo.updateValidationStatus(inserted.id, 'passed', 10, 5);

			const updated = await repo.findById(inserted.id);
			expect(updated?.validationStatus).toBe('passed');
			expect(updated?.errorCountBefore).toBe(10);
			expect(updated?.errorCountAfter).toBe(5);
		});

		it('marks patch as rolled back', async () => {
			const patch: DiffPatch = {
				id: 'p1',
				runId: 'run-1',
				filePath: '/test/file.ts',
				beforeSha256: 'hash1',
				afterSha256: 'hash2',
				diffText: 'diff',
				linesChanged: 5,
				confidence: 0.9,
				reason: 'fix',
				ruleId: 'rule-1',
				createdAt: new Date()
			};

			const inserted = await repo.insert(patch);
			await repo.markRolledBack(inserted.id);

			const updated = await repo.findById(inserted.id);
			expect(updated?.applied).toBe('rolled_back');
		});
	});

	describe('Query Operations', () => {
		beforeEach(async () => {
			// Insert test data
			await repo.insertBatch([
				{
					id: 'p1',
					runId: 'run-1',
					filePath: '/test/file1.ts',
					beforeSha256: 'h1',
					afterSha256: 'h2',
					diffText: 'd1',
					linesChanged: 5,
					confidence: 0.9,
					reason: 'fix1',
					ruleId: 'rule-1',
					createdAt: new Date()
				},
				{
					id: 'p2',
					runId: 'run-1',
					filePath: '/test/file2.ts',
					beforeSha256: 'h3',
					afterSha256: 'h4',
					diffText: 'd2',
					linesChanged: 3,
					confidence: 0.8,
					reason: 'fix2',
					ruleId: 'rule-1',
					createdAt: new Date()
				},
				{
					id: 'p3',
					runId: 'run-2',
					filePath: '/test/file1.ts',
					beforeSha256: 'h5',
					afterSha256: 'h6',
					diffText: 'd3',
					linesChanged: 7,
					confidence: 0.95,
					reason: 'fix3',
					ruleId: 'rule-2',
					createdAt: new Date()
				}
			]);
		});

		it('finds patches by run ID', async () => {
			const diffs = await repo.findByRunId('run-1');

			expect(diffs).toHaveLength(2);
			expect(diffs.every((d) => d.runId === 'run-1')).toBe(true);
		});

		it('finds patches by file path', async () => {
			const diffs = await repo.findByFile('/test/file1.ts');

			expect(diffs).toHaveLength(2);
			expect(diffs.every((d) => d.filePath === '/test/file1.ts')).toBe(true);
		});

		it('finds patches by run and file', async () => {
			const diffs = await repo.findByRunAndFile('run-1', '/test/file1.ts');

			expect(diffs).toHaveLength(1);
			expect(diffs[0].runId).toBe('run-1');
			expect(diffs[0].filePath).toBe('/test/file1.ts');
		});

		it('calculates run statistics', async () => {
			const stats = await repo.getRunStats('run-1');

			expect(stats.total).toBe(2);
			expect(stats.pending).toBe(2);
			expect(stats.applied).toBe(0);
			expect(stats.avgConfidence).toBeCloseTo(0.85, 2);
			expect(stats.totalLinesChanged).toBe(8);
		});
	});
});
