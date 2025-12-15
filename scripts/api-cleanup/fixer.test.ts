import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AutoFixer } from './fixer';
import { ScannedFile } from './scanner';

describe('AutoFixer', () => {
  let testDir: string;
  let fixer: AutoFixer;

  beforeEach(() => {
    testDir = path.join(process.cwd(), '.test-fixer');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fixer = new AutoFixer();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Property 4: Automated Fixes Maintain Semantics', () => {
    it('should add missing semicolons to variable declarations', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
const x = 5
const y = 10
export const handler = () => {};
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Missing semicolons' }],
        errorCount: 2,
        severity: 'high',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(1);
      expect(log.fixes[0].operations.length).toBeGreaterThan(0);

      // Verify fixed content
      const fixed = fs.readFileSync(filePath, 'utf-8');
      expect(fixed).toContain('const x = 5;');
      expect(fixed).toContain('const y = 10;');
    });

    it('should fix unmatched braces', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
export const GET = () => {
  const x = 5;
  return x;
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Unmatched braces' }],
        errorCount: 1,
        severity: 'high',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(1);

      // Verify fixed content has matching braces
      const fixed = fs.readFileSync(filePath, 'utf-8');
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should remove duplicate imports', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
import { json } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
export const GET = () => json({});
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'import', message: 'Duplicate imports' }],
        errorCount: 1,
        severity: 'high',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(1);

      // Verify duplicate removed
      const fixed = fs.readFileSync(filePath, 'utf-8');
      const importCount = (fixed.match(/import.*from/g) || []).length;
      expect(importCount).toBe(1);
    });

    it('should preserve semantic meaning when fixing', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
export const GET = () => {
  const result = { status: 'ok' }
  return result
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [{ type: 'syntax', message: 'Missing semicolons' }],
        errorCount: 2,
        severity: 'high',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(1);

      // Verify semantic meaning is preserved
      const fixed = fs.readFileSync(filePath, 'utf-8');
      expect(fixed).toContain('status');
      expect(fixed).toContain('ok');
      expect(fixed).toContain('return result');
    });

    it('should handle multiple fixes in one file', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
import { json } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
export const GET = () => {
  const x = 5
  return json({ x })
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: true,
        errors: [
          { type: 'syntax', message: 'Missing semicolons' },
          { type: 'import', message: 'Duplicate imports' },
        ],
        errorCount: 3,
        severity: 'high',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(1);
      expect(log.totalOperations).toBeGreaterThan(1);

      // Verify all fixes applied
      const fixed = fs.readFileSync(filePath, 'utf-8');
      const importCount = (fixed.match(/import.*from/g) || []).length;
      expect(importCount).toBe(1);
      expect(fixed).toContain('const x = 5;');
    });

    it('should skip files without errors', () => {
      const filePath = path.join(testDir, '+server.ts');
      const content = `
export const GET = () => {
  return { status: 'ok' };
};
      `.trim();

      fs.writeFileSync(filePath, content, 'utf-8');

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath: filePath,
        hasErrors: false,
        errors: [],
        errorCount: 0,
        severity: 'none',
      };

      const log = fixer.fixFiles([scannedFile]);

      expect(log.filesFixed).toBe(0);
    });

    it('should provide accurate fix statistics', () => {
      const files: ScannedFile[] = [];

      // Create 3 files with errors
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testDir, `file${i}.ts`);
        fs.writeFileSync(filePath, `const x = ${i}\nconst y = ${i + 1}`, 'utf-8');

        files.push({
          path: filePath,
          relativePath: filePath,
          hasErrors: true,
          errors: [{ type: 'syntax', message: 'Missing semicolons' }],
          errorCount: 2,
          severity: 'high',
        });
      }

      const log = fixer.fixFiles(files);
      const summary = fixer.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.fixed).toBe(3);
      expect(summary.failed).toBe(0);
      expect(summary.totalOperations).toBeGreaterThan(0);
      expect(summary.successRate).toBe(100);
    });
  });
});
