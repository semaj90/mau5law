import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DataRecovery } from './recovery';
import { CategorizedFile } from './categorizer';

describe('DataRecovery', () => {
  let testDir: string;
  let recovery: DataRecovery;

  beforeEach(() => {
    testDir = path.join(process.cwd(), '.test-recovery');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    recovery = new DataRecovery();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Property 3: Data Recovery Preserves Functionality', () => {
    it('should recover valid TypeScript from backup files', () => {
      const backupPath = path.join(testDir, '+server.ts.disabled');
      const activePath = path.join(testDir, '+server.ts');

      // Create valid backup
      const validContent = `
export const GET = () => {
  return { status: 'ok' };
};
      `.trim();

      fs.writeFileSync(backupPath, validContent, 'utf-8');

      // Create backup file object
      const backupFile: CategorizedFile = {
        path: backupPath,
        relativePath: backupPath,
        hasErrors: false,
        errors: [],
        errorCount: 0,
        severity: 'none',
        category: 'core',
        priority: 'high',
        isBackup: true,
        backupPath: activePath,
        reason: 'Test backup',
      };

      const log = recovery.recoverFromBackups([backupFile]);

      // Verify recovery was successful
      expect(log.successfulRecoveries).toBe(1);
      expect(fs.existsSync(activePath)).toBe(true);

      // Verify content was restored
      const restoredContent = fs.readFileSync(activePath, 'utf-8');
      expect(restoredContent).toBe(validContent);
    });

    it('should skip recovery if active file is already valid', () => {
      const backupPath = path.join(testDir, '+server.ts.disabled');
      const activePath = path.join(testDir, '+server.ts');

      const validContent = `
export const GET = () => {
  return { status: 'ok' };
};
      `.trim();

      // Create both backup and active files with valid content
      fs.writeFileSync(backupPath, validContent, 'utf-8');
      fs.writeFileSync(activePath, validContent, 'utf-8');

      const backupFile: CategorizedFile = {
        path: backupPath,
        relativePath: backupPath,
        hasErrors: false,
        errors: [],
        errorCount: 0,
        severity: 'none',
        category: 'core',
        priority: 'high',
        isBackup: true,
        backupPath: activePath,
        reason: 'Test backup',
      };

      const log = recovery.recoverFromBackups([backupFile]);

      // Should skip recovery
      expect(log.recoveries[0].status).toBe('skipped');
      expect(log.recoveries[0].reason).toContain('already valid');
    });

    it('should fail recovery if backup content is invalid', () => {
      const backupPath = path.join(testDir, '+server.ts.disabled');
      const activePath = path.join(testDir, '+server.ts');

      // Create invalid backup (unmatched braces)
      const invalidContent = `
export const GET = () => {
  return { status: 'ok' };
      `.trim();

      fs.writeFileSync(backupPath, invalidContent, 'utf-8');

      const backupFile: CategorizedFile = {
        path: backupPath,
        relativePath: backupPath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unmatched braces' }],
        errorCount: 1,
        severity: 'high',
        category: 'core',
        priority: 'critical',
        isBackup: true,
        backupPath: activePath,
        reason: 'Test backup',
      };

      const log = recovery.recoverFromBackups([backupFile]);

      // Should fail recovery
      expect(log.failedRecoveries).toBe(1);
      expect(log.recoveries[0].status).toBe('failed');
    });

    it('should handle multiple backup files', () => {
      const backupFiles: CategorizedFile[] = [];

      // Create 3 backup files
      for (let i = 0; i < 3; i++) {
        const backupPath = path.join(testDir, `+server${i}.ts.disabled`);
        const activePath = path.join(testDir, `+server${i}.ts`);

        const validContent = `
export const GET = () => {
  return { id: ${i} };
};
        `.trim();

        fs.writeFileSync(backupPath, validContent, 'utf-8');

        backupFiles.push({
          path: backupPath,
          relativePath: backupPath,
          hasErrors: false,
          errors: [],
          errorCount: 0,
          severity: 'none',
          category: 'core',
          priority: 'high',
          isBackup: true,
          backupPath: activePath,
          reason: 'Test backup',
        });
      }

      const log = recovery.recoverFromBackups(backupFiles);

      expect(log.totalBackupFiles).toBe(3);
      expect(log.successfulRecoveries).toBe(3);
      expect(log.recoveries.every((r) => r.status === 'success')).toBe(true);
    });

    it('should provide accurate recovery statistics', () => {
      const backupFiles: CategorizedFile[] = [];

      // Create 2 valid backups
      for (let i = 0; i < 2; i++) {
        const backupPath = path.join(testDir, `valid${i}.ts.disabled`);
        const activePath = path.join(testDir, `valid${i}.ts`);

        fs.writeFileSync(
          backupPath,
          `export const GET = () => { return {}; };`,
          'utf-8'
        );

        backupFiles.push({
          path: backupPath,
          relativePath: backupPath,
          hasErrors: false,
          errors: [],
          errorCount: 0,
          severity: 'none',
          category: 'core',
          priority: 'high',
          isBackup: true,
          backupPath: activePath,
          reason: 'Test backup',
        });
      }

      // Create 1 invalid backup
      const invalidBackupPath = path.join(testDir, 'invalid.ts.disabled');
      const invalidActivePath = path.join(testDir, 'invalid.ts');
      fs.writeFileSync(invalidBackupPath, `export const GET = () => {`, 'utf-8');

      backupFiles.push({
        path: invalidBackupPath,
        relativePath: invalidBackupPath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unmatched braces' }],
        errorCount: 1,
        severity: 'high',
        category: 'core',
        priority: 'critical',
        isBackup: true,
        backupPath: invalidActivePath,
        reason: 'Test backup',
      });

      const log = recovery.recoverFromBackups(backupFiles);
      const summary = recovery.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.successRate).toBeCloseTo(66.67, 1);
    });
  });
});
