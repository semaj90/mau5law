import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ApiScanner } from './scanner';

describe('ApiScanner', () => {
  let testDir: string;
  let scanner: ApiScanner;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(process.cwd(), '.test-api-cleanup');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    scanner = new ApiScanner(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('scanner identifies all files in directory', () => {
    it('should find all +server.ts files recursively', () => {
      // Create test file structure
      const subDir1 = path.join(testDir, 'users');
      const subDir2 = path.join(testDir, 'cases', 'evidence');

      fs.mkdirSync(subDir1, { recursive: true });
      fs.mkdirSync(subDir2, { recursive: true });

      // Create +server.ts files
      fs.writeFileSync(path.join(testDir, '+server.ts'), 'export const GET = () => {};');
      fs.writeFileSync(path.join(subDir1, '+server.ts'), 'export const POST = () => {};');
      fs.writeFileSync(path.join(subDir2, '+server.ts'), 'export const DELETE = () => {};');

      // Create non-server files (should be ignored)
      fs.writeFileSync(path.join(testDir, 'utils.ts'), 'export const util = () => {};');

      const manifest = scanner.scan();

      expect(manifest.totalFiles).toBe(3);
      expect(manifest.files.length).toBe(3);
      expect(manifest.files.every((f) => f.path.includes('+server.ts'))).toBe(true);
    });

    it('should handle empty directories', () => {
      const manifest = scanner.scan();

      expect(manifest.totalFiles).toBe(0);
      expect(manifest.files.length).toBe(0);
    });

    it('should handle nested directory structures', () => {
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(deepDir, '+server.ts'), 'export const GET = () => {};');

      const manifest = scanner.scan();

      expect(manifest.totalFiles).toBe(1);
      expect(manifest.files[0].path).toContain('+server.ts');
      expect(manifest.files[0].path).toContain('a');
    });
  });

  describe('scanner detects syntax errors correctly', () => {
    it('should detect unmatched braces', () => {
      const serverFile = path.join(testDir, '+server.ts');
      fs.writeFileSync(
        serverFile,
        `
export const GET = () => {
  const x = 5;
  return x;
      `.trim()
      );

      const manifest = scanner.scan();

      expect(manifest.files[0].hasErrors).toBe(true);
      expect(manifest.files[0].errors.length).toBeGreaterThan(0);
      expect(manifest.files[0].errors.some((e) => e.type === 'syntax')).toBe(true);
    });

    it('should detect missing semicolons in variable declarations', () => {
      const serverFile = path.join(testDir, '+server.ts');
      fs.writeFileSync(
        serverFile,
        `
const x = 5
const y = 10;
      `.trim()
      );

      const manifest = scanner.scan();

      expect(manifest.files[0].hasErrors).toBe(true);
      expect(manifest.files[0].errors.length).toBeGreaterThan(0);
    });

    it('should handle valid files without errors', () => {
      const serverFile = path.join(testDir, '+server.ts');
      fs.writeFileSync(
        serverFile,
        `
import { json } from '@sveltejs/kit';

export const GET = () => {
  return json({ status: 'ok' });
};
      `.trim()
      );

      const manifest = scanner.scan();

      expect(manifest.files[0].hasErrors).toBe(false);
      expect(manifest.files[0].errors.length).toBe(0);
      expect(manifest.files[0].severity).toBe('none');
    });
  });

  describe('scanner categorizes error types accurately', () => {
    it('should assign high severity for syntax errors', () => {
      const serverFile = path.join(testDir, '+server.ts');
      fs.writeFileSync(
        serverFile,
        `
const x = 5
const y = 10
const z = 15
const a = 20
const b = 25
      `.trim()
      );

      const manifest = scanner.scan();

      expect(manifest.files[0].severity).toBe('high');
    });

    it('should assign severity based on error count', () => {
      const serverFile = path.join(testDir, '+server.ts');
      fs.writeFileSync(
        serverFile,
        `
const x = 5
const y = 10
const z = 15
const a = 20
const b = 25
      `.trim()
      );

      const manifest = scanner.scan();

      // The file has multiple errors
      expect(manifest.files[0].hasErrors).toBe(true);
      expect(manifest.files[0].errors.length).toBeGreaterThan(0);
      expect(['high', 'critical']).toContain(manifest.files[0].severity);
    });

    it('should provide accurate summary statistics', () => {
      // Create files with different error levels
      fs.writeFileSync(path.join(testDir, '+server.ts'), 'export const GET = () => {};');

      const subDir = path.join(testDir, 'users');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(
        path.join(subDir, '+server.ts'),
        `
const x = 5
const y = 10
      `.trim()
      );

      const manifest = scanner.scan();
      const summary = scanner.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.withErrors).toBeGreaterThan(0);
      expect(summary.high).toBeGreaterThan(0);
    });
  });
});
