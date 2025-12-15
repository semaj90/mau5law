import { describe, it, expect, beforeEach } from 'vitest';
import { ApiCategorizer } from './categorizer';
import { ScannedFile } from './scanner';

describe('ApiCategorizer', () => {
  let categorizer: ApiCategorizer;

  const createScannedFile = (path: string, hasErrors = false): ScannedFile => ({
    path,
    relativePath: path,
    hasErrors,
    errors: hasErrors ? [{ type: 'syntax', message: 'Test error' }] : [],
    errorCount: hasErrors ? 1 : 0,
    severity: hasErrors ? 'high' : 'none',
  });

  describe('core routes are identified correctly', () => {
    beforeEach(() => {
      categorizer = new ApiCategorizer();
    });

    it('should identify cases routes as core', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('core');
      expect(categorized.reason).toContain('cases');
    });

    it('should identify evidence routes as core', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/evidence/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('core');
      expect(categorized.reason).toContain('evidence');
    });

    it('should identify search routes as core', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/search/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('core');
      expect(categorized.reason).toContain('search');
    });

    it('should identify auth routes as core', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/auth/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('core');
      expect(categorized.reason).toContain('auth');
    });

    it('should assign high priority to core routes', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.priority).toBe('high');
    });

    it('should assign critical priority to core routes with errors', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/cases/+server.ts',
        true
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.priority).toBe('critical');
    });
  });

  describe('experimental routes are marked appropriately', () => {
    beforeEach(() => {
      categorizer = new ApiCategorizer();
    });

    it('should identify experimental routes', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/experimental/feature/+server.ts'
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('experimental');
    });

    it('should identify beta routes as experimental', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/beta/feature/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('experimental');
    });

    it('should identify alpha routes as experimental', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/alpha/feature/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('experimental');
    });

    it('should assign low priority to experimental routes without errors', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/experimental/feature/+server.ts'
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.priority).toBe('low');
    });

    it('should assign medium priority to experimental routes with errors', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/experimental/feature/+server.ts',
        true
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.priority).toBe('medium');
    });
  });

  describe('backup files are detected', () => {
    beforeEach(() => {
      categorizer = new ApiCategorizer();
    });

    it('should detect .disabled suffix', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/cases/+server.ts.disabled'
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.isBackup).toBe(true);
    });

    it('should detect _disabled suffix', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/cases/+server_disabled.ts'
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.isBackup).toBe(true);
    });

    it('should provide active file path for backup', () => {
      const file = createScannedFile(
        'sveltekit-frontend/src/routes/api/cases/+server.ts.disabled'
      );
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.backupPath).toBe(
        'sveltekit-frontend/src/routes/api/cases/+server.ts'
      );
    });

    it('should identify test files', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/test/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('test');
    });

    it('should identify phase-specific files', () => {
      const file = createScannedFile('sveltekit-frontend/src/routes/api/phase1/+server.ts');
      const categorized = categorizer.categorizeScannedFile(file);

      expect(categorized.category).toBe('phase-specific');
    });
  });

  describe('categorization manifest is accurate', () => {
    beforeEach(() => {
      categorizer = new ApiCategorizer();
    });

    it('should count files by category', () => {
      const files = [
        createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts'),
        createScannedFile('sveltekit-frontend/src/routes/api/evidence/+server.ts'),
        createScannedFile('sveltekit-frontend/src/routes/api/experimental/feature/+server.ts'),
        createScannedFile('sveltekit-frontend/src/routes/api/test/+server.ts'),
      ];

      const manifest = categorizer.categorizeFiles(files);

      expect(manifest.categorization.core).toBe(2);
      expect(manifest.categorization.experimental).toBe(1);
      expect(manifest.categorization.test).toBe(1);
    });

    it('should count files by priority', () => {
      const files = [
        createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts', true),
        createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts'),
        createScannedFile('sveltekit-frontend/src/routes/api/experimental/feature/+server.ts'),
      ];

      const manifest = categorizer.categorizeFiles(files);

      expect(manifest.prioritization.critical).toBe(1);
      expect(manifest.prioritization.high).toBe(1);
      expect(manifest.prioritization.low).toBe(1);
    });

    it('should provide accurate summary', () => {
      const files = [
        createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts', true),
        createScannedFile('sveltekit-frontend/src/routes/api/cases/+server.ts.disabled'),
        createScannedFile('sveltekit-frontend/src/routes/api/experimental/feature/+server.ts'),
      ];

      categorizer.categorizeFiles(files);
      const summary = categorizer.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.backupCount).toBe(1);
      expect(summary.criticalCount).toBe(1);
    });
  });
});
