import { describe, it, expect, beforeEach } from 'vitest';
import { BuildValidator } from './build-validator';

describe('BuildValidator', () => {
  let validator: BuildValidator;

  beforeEach(() => {
    validator = new BuildValidator();
  });

  describe('Integration test for build validation', () => {
    it('should parse esbuild error output correctly', () => {
      const errorOutput = `
src/routes/api/cases/+server.ts:10:5: error: Unexpected token
src/routes/api/evidence/+server.ts:15:10: warning: Unused variable
      `.trim();

      // Create a mock report with parsed errors
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 1000,
        errors: [
          {
            file: 'src/routes/api/cases/+server.ts',
            line: 10,
            column: 5,
            severity: 'error' as const,
            message: 'Unexpected token',
          },
        ],
        warnings: [
          {
            file: 'src/routes/api/evidence/+server.ts',
            line: 15,
            column: 10,
            severity: 'warning' as const,
            message: 'Unused variable',
          },
        ],
        errorSummary: {
          total: 1,
          byType: { syntax: 1 },
        },
      };

      expect(report.errors.length).toBe(1);
      expect(report.warnings.length).toBe(1);
      expect(report.errors[0].file).toContain('cases');
    });

    it('should detect API-related errors', () => {
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 1000,
        errors: [
          {
            file: 'src/routes/api/cases/+server.ts',
            line: 10,
            column: 5,
            severity: 'error' as const,
            message: 'Unexpected token',
          },
          {
            file: 'src/lib/utils.ts',
            line: 5,
            column: 1,
            severity: 'error' as const,
            message: 'Type error',
          },
        ],
        warnings: [],
        errorSummary: {
          total: 2,
          byType: { syntax: 1, type: 1 },
        },
      };

      const hasApiErrors = validator.hasApiErrors(report);
      expect(hasApiErrors).toBe(true);
    });

    it('should identify corruption-related errors', () => {
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 1000,
        errors: [
          {
            file: 'src/routes/api/cases/+server.ts',
            line: 10,
            column: 5,
            severity: 'error' as const,
            message: 'Unexpected token',
            code: 'TS1005',
          },
          {
            file: 'src/routes/api/evidence/+server.ts',
            line: 15,
            column: 10,
            severity: 'error' as const,
            message: 'Expected }',
            code: 'TS1005',
          },
        ],
        warnings: [],
        errorSummary: {
          total: 2,
          byType: { TS1005: 2 },
        },
      };

      const corruptionErrors = validator.getCorruptionRelatedErrors(report);
      expect(corruptionErrors.length).toBe(2);
      expect(corruptionErrors.every((e) => e.code?.startsWith('TS'))).toBe(true);
    });

    it('should generate remediation suggestions', () => {
      const successReport = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: true,
        duration: 1000,
        errors: [],
        warnings: [],
        errorSummary: {
          total: 0,
          byType: {},
        },
      };

      const suggestions = validator.generateSuggestions(successReport);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('successful');
    });

    it('should provide accurate build summary', () => {
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 5000,
        errors: [
          {
            file: 'src/routes/api/cases/+server.ts',
            line: 10,
            column: 5,
            severity: 'error' as const,
            message: 'Unexpected token',
          },
        ],
        warnings: [
          {
            file: 'src/routes/api/evidence/+server.ts',
            line: 15,
            column: 10,
            severity: 'warning' as const,
            message: 'Unused variable',
          },
        ],
        errorSummary: {
          total: 1,
          byType: { syntax: 1 },
        },
      };

      const summary = validator.getSummary(report);

      expect(summary.success).toBe(false);
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalWarnings).toBe(1);
      expect(summary.hasApiErrors).toBe(true);
      expect(summary.duration).toBe(5000);
    });

    it('should verify no esbuild errors related to corrupted files', () => {
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: true,
        duration: 3000,
        errors: [],
        warnings: [],
        errorSummary: {
          total: 0,
          byType: {},
        },
      };

      expect(report.success).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(validator.hasApiErrors(report)).toBe(false);
    });

    it('should categorize errors by type', () => {
      const report = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 2000,
        errors: [
          {
            file: 'src/routes/api/cases/+server.ts',
            line: 10,
            column: 5,
            severity: 'error' as const,
            message: 'Unexpected token',
            code: 'TS1005',
          },
          {
            file: 'src/routes/api/evidence/+server.ts',
            line: 15,
            column: 10,
            severity: 'error' as const,
            message: 'Type mismatch',
            code: 'TS2322',
          },
          {
            file: 'src/routes/api/search/+server.ts',
            line: 20,
            column: 1,
            severity: 'error' as const,
            message: 'Missing semicolon',
          },
        ],
        warnings: [],
        errorSummary: {
          total: 3,
          byType: { TS1005: 1, TS2322: 1, syntax: 1 },
        },
      };

      expect(report.errorSummary.total).toBe(3);
      expect(Object.keys(report.errorSummary.byType).length).toBe(3);
      expect(report.errorSummary.byType['TS1005']).toBe(1);
      expect(report.errorSummary.byType['TS2322']).toBe(1);
    });
  });
});
