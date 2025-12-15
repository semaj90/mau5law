import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ReportGenerator } from './reporter';
import { ScanManifest } from './scanner';
import { CategorizationManifest } from './categorizer';
import { RecoveryLog } from './recovery';
import { FixLog } from './fixer';
import { DisableLog } from './disabler';
import { BuildReport } from './build-validator';

describe('ReportGenerator', () => {
  let testDir: string;
  let generator: ReportGenerator;

  beforeEach(() => {
    testDir = path.join(process.cwd(), '.test-reporter');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    generator = new ReportGenerator();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Property 6: Manifest Completeness', () => {
    it('should include all corrupted files in manifest', () => {
      const scan: ScanManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 3,
        filesWithErrors: 2,
        errorSummary: { syntax: 2, import: 0, type: 0, unknown: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error 1' }],
            errorCount: 1,
            severity: 'high',
          },
          {
            path: 'file2.ts',
            relativePath: 'file2.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error 2' }],
            errorCount: 1,
            severity: 'high',
          },
          {
            path: 'file3.ts',
            relativePath: 'file3.ts',
            hasErrors: false,
            errors: [],
            errorCount: 0,
            severity: 'none',
          },
        ],
      };

      const categorization: CategorizationManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 3,
        categorization: { core: 2, experimental: 0, test: 0, 'phase-specific': 0, unknown: 1 },
        prioritization: { critical: 1, high: 1, medium: 0, low: 1 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error 1' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'critical',
            isBackup: false,
            reason: 'Core route',
          },
          {
            path: 'file2.ts',
            relativePath: 'file2.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error 2' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'high',
            isBackup: false,
            reason: 'Core route',
          },
          {
            path: 'file3.ts',
            relativePath: 'file3.ts',
            hasErrors: false,
            errors: [],
            errorCount: 0,
            severity: 'none',
            category: 'unknown',
            priority: 'low',
            isBackup: false,
            reason: 'Unknown',
          },
        ],
      };

      const recovery: RecoveryLog = {
        timestamp: new Date().toISOString(),
        totalBackupFiles: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        recoveries: [],
      };

      const fixes: FixLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 3,
        filesFixed: 1,
        filesFailed: 0,
        totalOperations: 2,
        fixes: [],
      };

      const disables: DisableLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 0,
        disabledFiles: 0,
        failedDisables: 0,
        brokenImports: 0,
        disables: [],
        importUpdates: [],
      };

      const build: BuildReport = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: true,
        duration: 1000,
        errors: [],
        warnings: [],
        errorSummary: { total: 0, byType: {} },
      };

      const report = generator.generateCleanupReport(
        scan,
        categorization,
        recovery,
        fixes,
        disables,
        build
      );

      // Verify all corrupted files are in the manifest
      expect(report.details.scan.files.length).toBe(3);
      expect(report.details.categorization.files.length).toBe(3);

      // Verify each corrupted file has categorization
      for (const file of report.details.scan.files) {
        if (file.hasErrors) {
          const categorized = report.details.categorization.files.find((f) => f.path === file.path);
          expect(categorized).toBeDefined();
          expect(categorized?.category).toBeDefined();
          expect(categorized?.priority).toBeDefined();
        }
      }
    });

    it('should export report as JSON with all data', () => {
      const scan: ScanManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        filesWithErrors: 1,
        errorSummary: { syntax: 1, import: 0, type: 0, unknown: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
          },
        ],
      };

      const categorization: CategorizationManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        categorization: { core: 1, experimental: 0, test: 0, 'phase-specific': 0, unknown: 0 },
        prioritization: { critical: 1, high: 0, medium: 0, low: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'critical',
            isBackup: false,
            reason: 'Core route',
          },
        ],
      };

      const recovery: RecoveryLog = {
        timestamp: new Date().toISOString(),
        totalBackupFiles: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        recoveries: [],
      };

      const fixes: FixLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        filesFixed: 0,
        filesFailed: 0,
        totalOperations: 0,
        fixes: [],
      };

      const disables: DisableLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 0,
        disabledFiles: 0,
        failedDisables: 0,
        brokenImports: 0,
        disables: [],
        importUpdates: [],
      };

      const build: BuildReport = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: false,
        duration: 1000,
        errors: [
          {
            file: 'file1.ts',
            line: 10,
            column: 5,
            message: 'Syntax error',
            severity: 'error',
          },
        ],
        warnings: [],
        errorSummary: { total: 1, byType: { syntax: 1 } },
      };

      const report = generator.generateCleanupReport(
        scan,
        categorization,
        recovery,
        fixes,
        disables,
        build
      );

      const outputPath = path.join(testDir, 'report.json');
      generator.exportAsJson(report, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const exported = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(exported.summary).toBeDefined();
      expect(exported.details).toBeDefined();
      expect(exported.details.scan.files.length).toBe(1);
    });

    it('should export report as Markdown', () => {
      const scan: ScanManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        filesWithErrors: 1,
        errorSummary: { syntax: 1, import: 0, type: 0, unknown: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
          },
        ],
      };

      const categorization: CategorizationManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        categorization: { core: 1, experimental: 0, test: 0, 'phase-specific': 0, unknown: 0 },
        prioritization: { critical: 1, high: 0, medium: 0, low: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'critical',
            isBackup: false,
            reason: 'Core route',
          },
        ],
      };

      const recovery: RecoveryLog = {
        timestamp: new Date().toISOString(),
        totalBackupFiles: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        recoveries: [],
      };

      const fixes: FixLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 1,
        filesFixed: 0,
        filesFailed: 0,
        totalOperations: 0,
        fixes: [],
      };

      const disables: DisableLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 0,
        disabledFiles: 0,
        failedDisables: 0,
        brokenImports: 0,
        disables: [],
        importUpdates: [],
      };

      const build: BuildReport = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: true,
        duration: 1000,
        errors: [],
        warnings: [],
        errorSummary: { total: 0, byType: {} },
      };

      const report = generator.generateCleanupReport(
        scan,
        categorization,
        recovery,
        fixes,
        disables,
        build
      );

      const outputPath = path.join(testDir, 'report.md');
      generator.exportAsMarkdown(report, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('API Route Cleanup Report');
      expect(content).toContain('Executive Summary');
      expect(content).toContain('Scan Results');
    });

    it('should generate recovery guide with all disabled files', () => {
      const disables: DisableLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 2,
        disabledFiles: 2,
        failedDisables: 0,
        brokenImports: 0,
        disables: [
          {
            filePath: 'file1.ts',
            disabledPath: 'file1.ts.disabled',
            status: 'success',
          },
          {
            filePath: 'file2.ts',
            disabledPath: 'file2.ts.disabled',
            status: 'success',
          },
        ],
        importUpdates: [],
      };

      const categorization: CategorizationManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 2,
        categorization: { core: 2, experimental: 0, test: 0, 'phase-specific': 0, unknown: 0 },
        prioritization: { critical: 2, high: 0, medium: 0, low: 0 },
        files: [
          {
            path: 'file1.ts',
            relativePath: 'file1.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'critical',
            isBackup: false,
            reason: 'Core route',
          },
          {
            path: 'file2.ts',
            relativePath: 'file2.ts',
            hasErrors: true,
            errors: [{ type: 'syntax', message: 'Error' }],
            errorCount: 1,
            severity: 'high',
            category: 'core',
            priority: 'critical',
            isBackup: false,
            reason: 'Core route',
          },
        ],
      };

      const guide = generator.generateRecoveryGuide(disables, categorization);

      expect(guide.disabledFiles.length).toBe(2);
      expect(guide.reEnablingInstructions.length).toBeGreaterThan(0);
      expect(guide.backupLocations.length).toBeGreaterThan(0);
      expect(guide.troubleshootingGuide.length).toBeGreaterThan(0);
    });

    it('should provide accurate summary statistics', () => {
      const scan: ScanManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 10,
        filesWithErrors: 5,
        errorSummary: { syntax: 3, import: 2, type: 0, unknown: 0 },
        files: Array(10)
          .fill(null)
          .map((_, i) => ({
            path: `file${i}.ts`,
            relativePath: `file${i}.ts`,
            hasErrors: i < 5,
            errors: i < 5 ? [{ type: 'syntax', message: 'Error' }] : [],
            errorCount: i < 5 ? 1 : 0,
            severity: i < 5 ? 'high' : 'none',
          })),
      };

      const categorization: CategorizationManifest = {
        timestamp: new Date().toISOString(),
        totalFiles: 10,
        categorization: { core: 5, experimental: 3, test: 2, 'phase-specific': 0, unknown: 0 },
        prioritization: { critical: 2, high: 3, medium: 3, low: 2 },
        files: Array(10)
          .fill(null)
          .map((_, i) => ({
            path: `file${i}.ts`,
            relativePath: `file${i}.ts`,
            hasErrors: i < 5,
            errors: i < 5 ? [{ type: 'syntax', message: 'Error' }] : [],
            errorCount: i < 5 ? 1 : 0,
            severity: i < 5 ? 'high' : 'none',
            category: i < 5 ? 'core' : 'experimental',
            priority: i < 2 ? 'critical' : i < 5 ? 'high' : 'low',
            isBackup: false,
            reason: 'Test',
          })),
      };

      const recovery: RecoveryLog = {
        timestamp: new Date().toISOString(),
        totalBackupFiles: 2,
        successfulRecoveries: 2,
        failedRecoveries: 0,
        recoveries: [],
      };

      const fixes: FixLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 10,
        filesFixed: 3,
        filesFailed: 0,
        totalOperations: 5,
        fixes: [],
      };

      const disables: DisableLog = {
        timestamp: new Date().toISOString(),
        totalFiles: 0,
        disabledFiles: 0,
        failedDisables: 0,
        brokenImports: 0,
        disables: [],
        importUpdates: [],
      };

      const build: BuildReport = {
        timestamp: new Date().toISOString(),
        buildCommand: 'npm run build',
        buildPath: 'sveltekit-frontend',
        success: true,
        duration: 5000,
        errors: [],
        warnings: [],
        errorSummary: { total: 0, byType: {} },
      };

      const report = generator.generateCleanupReport(
        scan,
        categorization,
        recovery,
        fixes,
        disables,
        build
      );

      const summary = generator.getSummary(report);

      expect(summary.totalProcessed).toBe(10);
      expect(summary.successRate).toBeGreaterThan(0);
      expect(summary.criticalIssues).toBe(0);
      expect(summary.buildHealthy).toBe(true);
    });
  });
});
