import fs from 'fs';
import path from 'path';
import { ScanManifest } from './scanner';
import { CategorizationManifest } from './categorizer';
import { RecoveryLog } from './recovery';
import { FixLog } from './fixer';
import { DisableLog } from './disabler';
import { BuildReport } from './build-validator';

export interface CleanupReport {
  timestamp: string;
  summary: {
    totalFilesScanned: number;
    filesWithErrors: number;
    filesRecovered: number;
    filesFixed: number;
    filesDisabled: number;
    buildSuccess: boolean;
  };
  details: {
    scan: ScanManifest;
    categorization: CategorizationManifest;
    recovery: RecoveryLog;
    fixes: FixLog;
    disables: DisableLog;
    build: BuildReport;
  };
}

export interface RecoveryGuide {
  timestamp: string;
  disabledFiles: Array<{
    originalPath: string;
    disabledPath: string;
    reason: string;
    category: string;
    priority: string;
  }>;
  reEnablingInstructions: string[];
  backupLocations: string[];
  troubleshootingGuide: string[];
}

export class ReportGenerator {
  /**
   * Generate comprehensive cleanup report
   */
  generateCleanupReport(
    scan: ScanManifest,
    categorization: CategorizationManifest,
    recovery: RecoveryLog,
    fixes: FixLog,
    disables: DisableLog,
    build: BuildReport
  ): CleanupReport {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesScanned: scan.totalFiles,
        filesWithErrors: scan.filesWithErrors,
        filesRecovered: recovery.successfulRecoveries,
        filesFixed: fixes.filesFixed,
        filesDisabled: disables.disabledFiles,
        buildSuccess: build.success,
      },
      details: {
        scan,
        categorization,
        recovery,
        fixes,
        disables,
        build,
      },
    };
  }

  /**
   * Generate recovery guide for disabled files
   */
  generateRecoveryGuide(
    disables: DisableLog,
    categorization: CategorizationManifest
  ): RecoveryGuide {
    const disabledFiles = disables.disables
      .filter((d) => d.status === 'success')
      .map((d) => {
        const categorized = categorization.files.find((f) => f.path === d.filePath);
        return {
          originalPath: d.filePath,
          disabledPath: d.disabledPath,
          reason: d.reason || 'Unfixable corruption',
          category: categorized?.category || 'unknown',
          priority: categorized?.priority || 'unknown',
        };
      });

    const reEnablingInstructions = [
      '1. Locate the disabled file with .disabled suffix',
      '2. Review the file content to understand the issues',
      '3. Fix the issues manually or restore from backup',
      '4. Rename the file back to original name (remove .disabled)',
      '5. Run npm run build to verify the fix',
      '6. Test the route functionality',
    ];

    const backupLocations = [
      'scripts/api-cleanup/reports/scan-manifest.json - Original scan results',
      'scripts/api-cleanup/reports/categorization-manifest.json - File categorization',
      'scripts/api-cleanup/reports/recovery-log.json - Recovery operations',
      'scripts/api-cleanup/reports/fix-log.json - Automated fixes applied',
      'scripts/api-cleanup/reports/disable-log.json - Disabled files',
    ];

    const troubleshootingGuide = [
      'Issue: Build still fails after cleanup',
      '  Solution: Check build-report.json for remaining errors',
      '',
      'Issue: Route not accessible after re-enabling',
      '  Solution: Verify file is in correct location and has valid syntax',
      '',
      'Issue: Imports broken after disabling files',
      '  Solution: Check import-updates in disable-log.json',
      '',
      'Issue: Need to recover original file',
      '  Solution: Look for .disabled backup files in same directory',
    ];

    return {
      timestamp: new Date().toISOString(),
      disabledFiles,
      reEnablingInstructions,
      backupLocations,
      troubleshootingGuide,
    };
  }

  /**
   * Export report as JSON
   */
  exportAsJson(report: CleanupReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Export report as Markdown
   */
  exportAsMarkdown(report: CleanupReport, outputPath: string): void {
    const md = this.generateMarkdown(report);
    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(report: CleanupReport): string {
    const { summary, details } = report;

    return `# API Route Cleanup Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Executive Summary

- **Total Files Scanned**: ${summary.totalFilesScanned}
- **Files with Errors**: ${summary.filesWithErrors}
- **Files Recovered**: ${summary.filesRecovered}
- **Files Fixed**: ${summary.filesFixed}
- **Files Disabled**: ${summary.filesDisabled}
- **Build Status**: ${summary.buildSuccess ? '✅ Success' : '❌ Failed'}

## Scan Results

- **Total Files**: ${details.scan.totalFiles}
- **Files with Errors**: ${details.scan.filesWithErrors}
- **Error Breakdown**:
  - Syntax Errors: ${details.scan.errorSummary.syntax}
  - Import Errors: ${details.scan.errorSummary.import}
  - Type Errors: ${details.scan.errorSummary.type}
  - Unknown Errors: ${details.scan.errorSummary.unknown}

## Categorization

- **Core Routes**: ${details.categorization.categorization.core}
- **Experimental Routes**: ${details.categorization.categorization.experimental}
- **Test Routes**: ${details.categorization.categorization.test}
- **Phase-Specific Routes**: ${details.categorization.categorization['phase-specific']}
- **Unknown Routes**: ${details.categorization.categorization.unknown}

## Recovery Operations

- **Total Backup Files**: ${details.recovery.totalBackupFiles}
- **Successful Recoveries**: ${details.recovery.successfulRecoveries}
- **Failed Recoveries**: ${details.recovery.failedRecoveries}

## Automated Fixes

- **Total Files Fixed**: ${details.fixes.filesFixed}
- **Total Operations**: ${details.fixes.totalOperations}
- **Failed Fixes**: ${details.fixes.filesFailed}

## File Disabling

- **Files Disabled**: ${details.disables.disabledFiles}
- **Failed Disables**: ${details.disables.failedDisables}
- **Broken Imports**: ${details.disables.brokenImports}

## Build Validation

- **Build Command**: ${details.build.buildCommand}
- **Build Path**: ${details.build.buildPath}
- **Success**: ${details.build.success ? 'Yes' : 'No'}
- **Duration**: ${details.build.duration}ms
- **Total Errors**: ${details.build.errors.length}
- **Total Warnings**: ${details.build.warnings.length}

${
  details.build.errors.length > 0
    ? `
### Build Errors

\`\`\`
${details.build.errors.map((e) => `${e.file}:${e.line}:${e.column} - ${e.message}`).join('\n')}
\`\`\`
`
    : ''
}

## Recommendations

${
  summary.buildSuccess
    ? '✅ Build is successful. All API routes are functioning correctly.'
    : '⚠️ Build has errors. Review the error details above and consider:'
}

- Review disabled files in the recovery guide
- Check import updates for broken references
- Verify core routes are functioning
- Test API endpoints manually

## Next Steps

1. Review this report for any issues
2. Check the recovery guide for disabled files
3. Run \`npm run build\` to verify the build
4. Test API endpoints in your application
5. Commit changes to version control

---

Report generated on ${new Date(report.timestamp).toLocaleString()}
`;
  }

  /**
   * Export recovery guide as Markdown
   */
  exportRecoveryGuideAsMarkdown(guide: RecoveryGuide, outputPath: string): void {
    const md = this.generateRecoveryGuideMarkdown(guide);
    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  /**
   * Generate recovery guide Markdown
   */
  private generateRecoveryGuideMarkdown(guide: RecoveryGuide): string {
    return `# API Route Recovery Guide

Generated: ${new Date(guide.timestamp).toLocaleString()}

## Disabled Files

${
  guide.disabledFiles.length > 0
    ? guide.disabledFiles
        .map(
          (f) => `
### ${f.originalPath}

- **Disabled Path**: ${f.disabledPath}
- **Category**: ${f.category}
- **Priority**: ${f.priority}
- **Reason**: ${f.reason}
`
        )
        .join('\n')
    : 'No files were disabled.'
}

## Re-enabling Instructions

${guide.reEnablingInstructions.map((i) => `${i}`).join('\n')}

## Backup Locations

${guide.backupLocations.map((l) => `- ${l}`).join('\n')}

## Troubleshooting Guide

\`\`\`
${guide.troubleshootingGuide.join('\n')}
\`\`\`

## Important Notes

- Always backup your code before making changes
- Test thoroughly after re-enabling files
- Keep the disabled files as reference for future fixes
- Review the cleanup report for detailed information

---

Recovery guide generated on ${new Date(guide.timestamp).toLocaleString()}
`;
  }

  /**
   * Get summary statistics
   */
  getSummary(report: CleanupReport): {
    totalProcessed: number;
    successRate: number;
    criticalIssues: number;
    buildHealthy: boolean;
  } {
    const { summary, details } = report;
    const totalProcessed = summary.totalFilesScanned;
    const totalFixed = summary.filesRecovered + summary.filesFixed;
    const successRate = totalProcessed > 0 ? (totalFixed / totalProcessed) * 100 : 0;
    const criticalIssues = details.build.errors.length;
    const buildHealthy = summary.buildSuccess;

    return {
      totalProcessed,
      successRate,
      criticalIssues,
      buildHealthy,
    };
  }
}
