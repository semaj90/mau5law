import { execSync } from 'child_process';
import path from 'path';

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface BuildReport {
  timestamp: string;
  buildCommand: string;
  buildPath: string;
  success: boolean;
  duration: number;
  errors: BuildError[];
  warnings: BuildError[];
  errorSummary: {
    total: number;
    byType: Record<string, number>;
  };
}

export class BuildValidator {
  private buildPath: string;
  private buildCommand: string;

  constructor(buildPath: string = 'sveltekit-frontend', buildCommand: string = 'npm run build') {
    this.buildPath = buildPath;
    this.buildCommand = buildCommand;
  }

  /**
   * Parse esbuild/vite error output
   */
  private parseErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Match error patterns like: "file.ts:10:5: error: message"
      const errorMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/);

      if (errorMatch) {
        errors.push({
          file: errorMatch[1],
          line: parseInt(errorMatch[2]),
          column: parseInt(errorMatch[3]),
          severity: errorMatch[4] as 'error' | 'warning',
          message: errorMatch[5],
        });
      }

      // Match TypeScript error patterns
      const tsMatch = line.match(/error TS(\d+):\s*(.+)/);
      if (tsMatch) {
        errors.push({
          file: 'unknown',
          message: tsMatch[2],
          severity: 'error',
          code: `TS${tsMatch[1]}`,
        });
      }
    }

    return errors;
  }

  /**
   * Run the build and capture output
   */
  validate(): BuildReport {
    const startTime = Date.now();
    const report: BuildReport = {
      timestamp: new Date().toISOString(),
      buildCommand: this.buildCommand,
      buildPath: this.buildPath,
      success: false,
      duration: 0,
      errors: [],
      warnings: [],
      errorSummary: {
        total: 0,
        byType: {},
      },
    };

    try {
      // Run build command
      execSync(this.buildCommand, {
        cwd: this.buildPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      report.success = true;
    } catch (error) {
      const output = (error as any).stdout?.toString() || (error as any).stderr?.toString() || '';
      const allErrors = this.parseErrors(output);

      // Separate errors and warnings
      report.errors = allErrors.filter((e) => e.severity === 'error');
      report.warnings = allErrors.filter((e) => e.severity === 'warning');

      // Build error summary
      for (const err of report.errors) {
        const type = err.code || 'unknown';
        report.errorSummary.byType[type] = (report.errorSummary.byType[type] || 0) + 1;
      }

      report.errorSummary.total = report.errors.length;
      report.success = report.errors.length === 0;
    }

    report.duration = Date.now() - startTime;
    return report;
  }

  /**
   * Check if build has API-related errors
   */
  hasApiErrors(report: BuildReport): boolean {
    return report.errors.some(
      (e) =>
        e.file.includes('/api/') ||
        e.file.includes('\\api\\') ||
        e.message.includes('api') ||
        e.message.includes('route')
    );
  }

  /**
   * Get errors related to corrupted files
   */
  getCorruptionRelatedErrors(report: BuildReport): BuildError[] {
    return report.errors.filter(
      (e) =>
        e.message.includes('Unexpected token') ||
        e.message.includes('Expected') ||
        e.message.includes('Unmatched') ||
        e.message.includes('Missing') ||
        e.code?.startsWith('TS')
    );
  }

  /**
   * Generate remediation suggestions
   */
  generateSuggestions(report: BuildReport): string[] {
    const suggestions: string[] = [];

    if (report.errors.length === 0) {
      suggestions.push('✓ Build successful - no errors detected');
      return suggestions;
    }

    const apiErrors = this.getCorruptionRelatedErrors(report);

    if (apiErrors.length > 0) {
      suggestions.push(`Found ${apiErrors.length} corruption-related errors`);
      suggestions.push('Consider running the cleanup pipeline again');
    }

    // Group errors by type
    const errorsByType = new Map<string, number>();
    for (const err of report.errors) {
      const type = err.code || 'syntax';
      errorsByType.set(type, (errorsByType.get(type) || 0) + 1);
    }

    for (const [type, count] of errorsByType) {
      if (type.startsWith('TS')) {
        suggestions.push(`${count} TypeScript error(s) - check type definitions`);
      } else if (type === 'syntax') {
        suggestions.push(`${count} syntax error(s) - verify file structure`);
      }
    }

    return suggestions;
  }

  /**
   * Get summary statistics
   */
  getSummary(report: BuildReport): {
    success: boolean;
    totalErrors: number;
    totalWarnings: number;
    hasApiErrors: boolean;
    duration: number;
  } {
    return {
      success: report.success,
      totalErrors: report.errors.length,
      totalWarnings: report.warnings.length,
      hasApiErrors: this.hasApiErrors(report),
      duration: report.duration,
    };
  }
}
