import fs from 'fs';
import path from 'path';
import { ApiScanner } from './scanner';
import { ApiCategorizer } from './categorizer';
import { DataRecovery } from './recovery';
import { AutoFixer } from './fixer';
import { FileDisabler } from './disabler';
import { BuildValidator } from './build-validator';
import { ReportGenerator } from './reporter';

export interface PipelineConfig {
  apiDir: string;
  outputDir: string;
  buildPath: string;
  buildCommand: string;
  createBackup: boolean;
  runBuild: boolean;
  exportFormats: ('json' | 'markdown')[];
}

export interface PipelineResult {
  success: boolean;
  duration: number;
  steps: {
    scan: boolean;
    categorize: boolean;
    recover: boolean;
    fix: boolean;
    disable: boolean;
    validate: boolean;
    report: boolean;
  };
  reportPath?: string;
  recoveryGuidePath?: string;
  errors: string[];
}

export class CleanupPipeline {
  private config: PipelineConfig;
  private outputDir: string;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      apiDir: config.apiDir || 'sveltekit-frontend/src/routes/api',
      outputDir: config.outputDir || 'scripts/api-cleanup/reports',
      buildPath: config.buildPath || 'sveltekit-frontend',
      buildCommand: config.buildCommand || 'npm run build',
      createBackup: config.createBackup !== false,
      runBuild: config.runBuild !== false,
      exportFormats: config.exportFormats || ['json', 'markdown'],
    };

    this.outputDir = this.config.outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Create backup of API directory
   */
  private createBackup(): boolean {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.outputDir, `backup-${timestamp}`);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Copy API directory to backup
      this.copyDirectory(this.config.apiDir, backupDir);
      console.log(`✓ Backup created at ${backupDir}`);
      return true;
    } catch (error) {
      console.error('✗ Backup failed:', error);
      return false;
    }
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Run the complete cleanup pipeline
   */
  async run(): Promise<PipelineResult> {
    const startTime = Date.now();
    const result: PipelineResult = {
      success: false,
      duration: 0,
      steps: {
        scan: false,
        categorize: false,
        recover: false,
        fix: false,
        disable: false,
        validate: false,
        report: false,
      },
      errors: [],
    };

    try {
      console.log('🔍 Starting API Route Cleanup Pipeline...\n');

      // Step 1: Create backup
      if (this.config.createBackup) {
        console.log('📦 Creating backup...');
        this.createBackup();
      }

      // Step 2: Scan
      console.log('🔍 Scanning API routes...');
      const scanner = new ApiScanner(this.config.apiDir);
      const scanManifest = scanner.scan();
      result.steps.scan = true;
      console.log(`✓ Found ${scanManifest.totalFiles} files, ${scanManifest.filesWithErrors} with errors\n`);

      // Step 3: Categorize
      console.log('📊 Categorizing routes...');
      const categorizer = new ApiCategorizer();
      const categorizationManifest = categorizer.categorizeFiles(scanManifest.files);
      result.steps.categorize = true;
      console.log(`✓ Categorized: ${categorizationManifest.categorization.core} core, ${categorizationManifest.categorization.experimental} experimental\n`);

      // Step 4: Recover
      console.log('💾 Recovering from backups...');
      const recovery = new DataRecovery();
      const backupFiles = categorizationManifest.files.filter((f) => f.isBackup);
      const recoveryLog = recovery.recoverFromBackups(backupFiles);
      result.steps.recover = true;
      console.log(`✓ Recovered ${recoveryLog.successfulRecoveries} files\n`);

      // Step 5: Fix
      console.log('🔧 Fixing syntax errors...');
      const fixer = new AutoFixer();
      const fixLog = fixer.fixFiles(scanManifest.files);
      result.steps.fix = true;
      console.log(`✓ Fixed ${fixLog.filesFixed} files with ${fixLog.totalOperations} operations\n`);

      // Step 6: Disable unfixable files
      console.log('🚫 Disabling unfixable routes...');
      const unfixableFiles = scanManifest.files.filter(
        (f) => f.hasErrors && !categorizationManifest.files.find((cf) => cf.path === f.path)?.isBackup
      );
      const disabler = new FileDisabler(this.config.buildPath);
      const disableLog = disabler.disableUnfixableFiles(unfixableFiles);
      result.steps.disable = true;
      console.log(`✓ Disabled ${disableLog.disabledFiles} files\n`);

      // Step 7: Validate build
      if (this.config.runBuild) {
        console.log('🏗️  Validating build...');
        const validator = new BuildValidator(this.config.buildPath, this.config.buildCommand);
        const buildReport = validator.validate();
        result.steps.validate = true;

        if (buildReport.success) {
          console.log('✓ Build successful\n');
        } else {
          console.log(`✗ Build failed with ${buildReport.errors.length} errors\n`);
          result.errors.push(`Build validation failed: ${buildReport.errors.length} errors`);
        }
      }

      // Step 8: Generate reports
      console.log('📄 Generating reports...');
      const generator = new ReportGenerator();
      const buildValidator = new BuildValidator(this.config.buildPath, this.config.buildCommand);
      const buildReport = this.config.runBuild ? buildValidator.validate() : {
        timestamp: new Date().toISOString(),
        buildCommand: this.config.buildCommand,
        buildPath: this.config.buildPath,
        success: true,
        duration: 0,
        errors: [],
        warnings: [],
        errorSummary: { total: 0, byType: {} },
      };

      const cleanupReport = generator.generateCleanupReport(
        scanManifest,
        categorizationManifest,
        recoveryLog,
        fixLog,
        disableLog,
        buildReport
      );

      // Export reports
      for (const format of this.config.exportFormats) {
        if (format === 'json') {
          const jsonPath = path.join(this.outputDir, 'cleanup-report.json');
          generator.exportAsJson(cleanupReport, jsonPath);
          result.reportPath = jsonPath;
        } else if (format === 'markdown') {
          const mdPath = path.join(this.outputDir, 'cleanup-report.md');
          generator.exportAsMarkdown(cleanupReport, mdPath);
          result.reportPath = mdPath;
        }
      }

      // Generate recovery guide
      const recoveryGuide = generator.generateRecoveryGuide(disableLog, categorizationManifest);
      const guidePath = path.join(this.outputDir, 'recovery-guide.md');
      generator.exportRecoveryGuideAsMarkdown(recoveryGuide, guidePath);
      result.recoveryGuidePath = guidePath;

      result.steps.report = true;
      console.log(`✓ Reports generated in ${this.outputDir}\n`);

      // Summary
      const summary = generator.getSummary(cleanupReport);
      console.log('📊 Pipeline Summary:');
      console.log(`   Total Files Processed: ${summary.totalProcessed}`);
      console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`   Critical Issues: ${summary.criticalIssues}`);
      console.log(`   Build Status: ${summary.buildHealthy ? '✅ Healthy' : '⚠️ Issues'}\n`);

      result.success = true;
    } catch (error) {
      result.errors.push(`Pipeline error: ${(error as Error).message}`);
      console.error('✗ Pipeline failed:', error);
    }

    result.duration = Date.now() - startTime;
    console.log(`⏱️  Pipeline completed in ${(result.duration / 1000).toFixed(2)}s\n`);

    return result;
  }

  /**
   * Get pipeline configuration
   */
  getConfig(): PipelineConfig {
    return this.config;
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
