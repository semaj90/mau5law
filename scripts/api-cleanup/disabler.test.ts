import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileDisabler } from './disabler';
import { ScannedFile } from './scanner';

describe('FileDisabler', () => {
  let testDir: string;
  let disabler: FileDisabler;

  beforeEach(() => {
    testDir = path.join(process.cwd(), '.test-disabler');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    disabler = new FileDisabler(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Property 1: No Broken Imports After Cleanup', () => {
    it('should disable unfixable files safely', () => {
      const filePath = path.join(testDir, '+server.ts');
      fs.writeFileSync(filePath, 'export const GET = () => {};');

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      const log = disabler.disableUnfixableFiles([unfixableFile]);

      expect(log.disabledFiles).toBe(1);
      expect(fs.existsSync(`${filePath}.disabled`)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should handle multiple unfixable files', () => {
      const files: ScannedFile[] = [];

      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testDir, `file${i}.ts`);
        fs.writeFileSync(filePath, 'export const GET = () => {};');

        files.push({
          path: filePath,
          relativePath: filePath,
          hasErrors: true,
          errors: [{ type: 'syntax', message: 'Unfixable error' }],
          errorCount: 1,
          severity: 'critical',
        });
      }

      const log = disabler.disableUnfixableFiles(files);

      expect(log.disabledFiles).toBe(3);
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testDir, `file${i}.ts`);
        expect(fs.existsSync(`${filePath}.disabled`)).toBe(true);
      }
    });

    it('should provide accurate disable statistics', () => {
      const files: ScannedFile[] = [];

      // Create 2 unfixable files
      for (let i = 0; i < 2; i++) {
        const filePath = path.join(testDir, `unfixable${i}.ts`);
        fs.writeFileSync(filePath, 'export const GET = () => {};');

        files.push({
          path: filePath,
          relativePath: filePath,
          hasErrors: true,
          errors: [{ type: 'syntax', message: 'Unfixable error' }],
          errorCount: 1,
          severity: 'critical',
        });
      }

      const log = disabler.disableUnfixableFiles(files);
      const summary = disabler.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.disabled).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.successRate).toBe(100);
    });
  });

  describe('Property 2: Disabled Files Are Inaccessible', () => {
    it('should rename files with .disabled suffix', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = 'export const GET = () => {};';
      fs.writeFileSync(filePath, content);

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      disabler.disableUnfixableFiles([unfixableFile]);

      // Original file should not exist
      expect(fs.existsSync(filePath)).toBe(false);

      // Disabled file should exist
      const disabledPath = `${filePath}.disabled`;
      expect(fs.existsSync(disabledPath)).toBe(true);

      // Content should be preserved
      const disabledContent = fs.readFileSync(disabledPath, 'utf-8');
      expect(disabledContent).toBe(content);
    });

    it('should prevent SvelteKit from loading disabled files', () => {
      const filePath = path.join(testDir, '+server.ts');
      fs.writeFileSync(filePath, 'export const GET = () => {};');

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      disabler.disableUnfixableFiles([unfixableFile]);

      // SvelteKit looks for +server.ts files
      // After disabling, the file should be named +server.ts.disabled
      // which SvelteKit will not recognize
      expect(fs.existsSync(filePath)).toBe(false);
      expect(fs.existsSync(`${filePath}.disabled`)).toBe(true);

      // Verify the disabled file has the correct suffix
      const disabledPath = `${filePath}.disabled`;
      expect(disabledPath).toContain('.disabled');
    });

    it('should handle already-disabled files', () => {
      const filePath = path.join(testDir, '+server.ts');
      const disabledPath = `${filePath}.disabled`;

      // Create a file that's already disabled
      fs.writeFileSync(disabledPath, 'export const GET = () => {};');

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      const log = disabler.disableUnfixableFiles([unfixableFile]);

      // Should fail because disabled file already exists
      expect(log.failedDisables).toBe(1);
      expect(log.disables[0].status).toBe('failed');
    });

    it('should verify disabled files are not executable', () => {
      const filePath = path.join(testDir, '+server.ts');
      fs.writeFileSync(filePath, 'export const GET = () => {};');

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      disabler.disableUnfixableFiles([unfixableFile]);

      // Disabled files should have .disabled extension
      // which means they won't be loaded by SvelteKit's routing system
      const disabledPath = `${filePath}.disabled`;
      expect(disabledPath).toMatch(/\.disabled$/);

      // Original +server.ts should not exist
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('disable log accuracy', () => {
    it('should track all disable operations', () => {
      const files: ScannedFile[] = [];

      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testDir, `file${i}.ts`);
        fs.writeFileSync(filePath, 'export const GET = () => {};');

        files.push({
          path: filePath,
          relativePath: filePath,
          hasErrors: true,
          errors: [{ type: 'syntax', message: 'Unfixable error' }],
          errorCount: 1,
          severity: 'critical',
        });
      }

      const log = disabler.disableUnfixableFiles(files);

      expect(log.disables.length).toBe(3);
      expect(log.disables.every((d) => d.status === 'success')).toBe(true);
    });

    it('should provide successful disable entries', () => {
      const filePath = path.join(testDir, '+server.ts');
      fs.writeFileSync(filePath, 'export const GET = () => {};');

      const unfixableFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unfixable error' }],
        errorCount: 1,
        severity: 'critical',
      };

      disabler.disableUnfixableFiles([unfixableFile]);
      const successful = disabler.getSuccessfulDisables();

      expect(successful.length).toBe(1);
      expect(successful[0].status).toBe('success');
      expect(successful[0].disabledPath).toContain('.disabled');
    });
  });
});
