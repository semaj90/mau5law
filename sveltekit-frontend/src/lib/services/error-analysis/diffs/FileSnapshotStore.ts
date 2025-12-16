/**
 * Error Brain: File Snapshot Store
 *
 * Creates .bak files before applying patches to enable rollback.
 * All operations are idempotent and hash-verified.
 */

import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { computeSha256 } from './unifiedDiff.js';

export interface Snapshot {
	filePath: string;
	backupPath: string;
	contentHash: string;
	createdAt: Date;
}

export class FileSnapshotStore {
	private snapshots: Map<string, Snapshot> = new Map();
	private backupDir: string;

	constructor(backupDir = '.error-brain/backups') {
		this.backupDir = backupDir;
	}

	/**
	 * Create a snapshot of a file before modification
	 *
	 * @param filePath - Absolute path to file
	 * @returns Snapshot metadata
	 */
	async createSnapshot(filePath: string): Promise<Snapshot> {
		// Read current content
		const content = await readFile(filePath, 'utf8');
		const contentHash = computeSha256(content);

		// Generate backup path
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = filePath.replace(/[\/\\]/g, '_');
		const backupPath = join(this.backupDir, `${timestamp}_${fileName}.bak`);

		// Ensure backup directory exists
		await mkdir(dirname(backupPath), { recursive: true });

		// Write backup
		await writeFile(backupPath, content, 'utf8');

		const snapshot: Snapshot = {
			filePath,
			backupPath,
			contentHash,
			createdAt: new Date()
		};

		this.snapshots.set(filePath, snapshot);
		return snapshot;
	}

	/**
	 * Restore a file from its snapshot
	 *
	 * @param filePath - Absolute path to file
	 * @returns True if restored successfully
	 */
	async restoreSnapshot(filePath: string): Promise<boolean> {
		const snapshot = this.snapshots.get(filePath);
		if (!snapshot) {
			return false;
		}

		// Check backup exists
		try {
			await access(snapshot.backupPath);
		} catch {
			return false;
		}

		// Read backup content
		const backupContent = await readFile(snapshot.backupPath, 'utf8');

		// Verify hash
		const backupHash = computeSha256(backupContent);
		if (backupHash !== snapshot.contentHash) {
			throw new Error(`Backup hash mismatch for ${filePath}`);
		}

		// Restore file
		await writeFile(filePath, backupContent, 'utf8');

		return true;
	}

	/**
	 * Delete a snapshot after successful application
	 *
	 * @param filePath - Absolute path to file
	 */
	async deleteSnapshot(filePath: string): Promise<void> {
		const snapshot = this.snapshots.get(filePath);
		if (!snapshot) {
			return;
		}

		try {
			await unlink(snapshot.backupPath);
		} catch {
			// Ignore if already deleted
		}

		this.snapshots.delete(filePath);
	}

	/**
	 * Get snapshot for a file (if exists)
	 */
	getSnapshot(filePath: string): Snapshot | undefined {
		return this.snapshots.get(filePath);
	}

	/**
	 * Clear all snapshots
	 */
	clear(): void {
		this.snapshots.clear();
	}
}
