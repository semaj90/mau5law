/**
 * Validation Service
 * Validates fixes using TypeScript compiler and svelte-check
 * Implements: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { BaseService } from '../base-service.js';
import { getConfig } from '../config.js';
import type {
  RawError,
  ValidationResult,
  ErrorResolutionConfig,
} from '../types.js';

const execAsync = promisify(exec);

export class ValidationService extends BaseService {
  private config: ErrorResolutionConfig;
  private errorCache: Map<string, RawError[]> = new Map();

  constructor(config?: Partial<ErrorResolutionConfig>) {
    super('ValidationService');
    this.config = getConfig(config);
  }

  /**
   * Validate a file using TypeScript compiler
   * Implements: Requirements 6.1
   */
  async validateTypeScript(file: string): Promise<ValidationResult> {
    this.validateFilePath(file);

    try {
      this.log(`Validating TypeScript for ${file}...`);

      // Run tsc on the specific file
      const { stdout, stderr } = await this.executeTypeScriptCheck(file);
      const errors = this.parseTypeScriptOutput(stdout || stderr);

      this.log(`TypeScript validation complete: ${errors.length} errors`);

      return {
        passed: errors.length === 0,
        errorCount: errors.length,
        errors,
        newErrors: [],
        resolvedErrors: [],
      };
    } catch (error) {
      this.logError(`TypeScript validation failed for ${file}`, error as Error);
      throw error;
    }
  }

  /**
   * Validate a file using svelte-check
   * Implements: Requirements 6.2
   */
  async validateSvelte(file: string): Promise<ValidationResult> {
    this.validateFilePath(file);

    try {
      this.log(`Validating Svelte for ${file}...`);

      // Run svelte-check on the specific file
      const { stdout, stderr } = await this.executeSvelteCheck(file);
      const errors = this.parseSvelteCheckOutput(stdout || stderr);

      this.log(`Svelte validation complete: ${errors.length} errors`);

      return {
        passed: errors.length === 0,
        errorCount: errors.length,
        errors,
        newErrors: [],
        resolvedErrors: [],
      };
    } catch (error) {
      this.logError(`Svelte validation failed for ${file}`, error as Error);
      throw error;
    }
  }

  /**
   * Compare error counts before and after fix
   * Implements: Requirements 6.3
   */
  compareErrorCounts(before: number, after: number): boolean {
    const increased = after > before;

    if (increased) {
      this.logWarn(
        `Error count increased: ${before} → ${after} (+${after - before})`
      );
    } else if (after < before) {
      this.log(`Error count decreased: ${before} → ${after} (-${before - after})`);
    } else {
      this.log(`Error count unchanged: ${before}`);
    }

    // Property 11: Error count never increases
    return !increased;
  }

  /**
   * Validate file before fix (baseline)
   * Implements: Requirements 6.1, 6.2
   */
  async validateBefore(file: string): Promise<ValidationResult> {
    this.validateFilePath(file);

    try {
      this.log(`Capturing baseline validation for ${file}...`);

      const tsResult = this.config.runTypeScriptValidation
        ? await this.validateTypeScript(file)
        : { passed: true, errorCount: 0, errors: [], newErrors: [], resolvedErrors: [] };

      const svelteResult = this.config.runSvelteCheck
        ? await this.validateSvelte(file)
        : { passed: true, errorCount: 0, errors: [], newErrors: [], resolvedErrors: [] };

      const allErrors = [...tsResult.errors, ...svelteResult.errors];
      const uniqueErrors = this.deduplicateErrors(allErrors);

      // Cache baseline errors
      this.errorCache.set(`${file}:before`, uniqueErrors);

      return {
        passed: tsResult.passed && svelteResult.passed,
        errorCount: uniqueErrors.length,
        errors: uniqueErrors,
        newErrors: [],
        resolvedErrors: [],
      };
    } catch (error) {
      this.logError(`Baseline validation failed for ${file}`, error as Error);
      throw error;
    }
  }

  /**
   * Validate file after fix and compare with baseline
   * Implements: Requirements 6.1, 6.2, 6.3, 6.4
   */
  async validateAfter(file: string): Promise<ValidationResult> {
    this.validateFilePath(file);

    try {
      this.log(`Validating after fix for ${file}...`);

      const tsResult = this.config.runTypeScriptValidation
        ? await this.validateTypeScript(file)
        : { passed: true, errorCount: 0, errors: [], newErrors: [], resolvedErrors: [] };

      const svelteResult = this.config.runSvelteCheck
        ? await this.validateSvelte(file)
        : { passed: true, errorCount: 0, errors: [], newErrors: [], resolvedErrors: [] };

      const allErrors = [...tsResult.errors, ...svelteResult.errors];
      const uniqueErrors = this.deduplicateErrors(allErrors);

      // Get baseline errors
      const baselineErrors = this.errorCache.get(`${file}:before`) || [];

      // Calculate new and resolved errors
      const newErrors = this.findNewErrors(baselineErrors, uniqueErrors);
      const resolvedErrors = this.findResolvedErrors(baselineErrors, uniqueErrors);

      // Property 11: Error count never increases
      const errorCountValid = this.compareErrorCounts(
        baselineErrors.length,
        uniqueErrors.length
      );

      const passed =
        tsResult.passed &&
        svelteResult.passed &&
        errorCountValid &&
        newErrors.length === 0;

      this.log(`After-fix validation complete:`);
      this.log(`  - Baseline errors: ${baselineErrors.length}`);
      this.log(`  - Current errors: ${uniqueErrors.length}`);
      this.log(`  - Resolved: ${resolvedErrors.length}`);
      this.log(`  - New: ${newErrors.length}`);
      this.log(`  - Passed: ${passed}`);

      return {
        passed,
        errorCount: uniqueErrors.length,
        errors: uniqueErrors,
        newErrors,
        resolvedErrors,
      };
    } catch (error) {
      this.logError(`After-fix validation failed for ${file}`, error as Error);
      throw error;
    }
  }

  /**
   * Execute TypeScript compiler check
   */
  private async executeTypeScriptCheck(file: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `npx tsc --noEmit "${file}"`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      return { stdout, stderr };
    } catch (error: any) {
      // tsc exits with non-zero when errors are found
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  }

  /**
   * Execute svelte-check
   */
  private async executeSvelteCheck(file: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `npx svelte-check --output machine --threshold error "${file}"`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      return { stdout, stderr };
    } catch (error: any) {
      // svelte-check exits with non-zero when errors are found
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  }

  /**
   * Parse TypeScript compiler output
   */
  private parseTypeScriptOutput(output: string): RawError[] {
    const errors: RawError[] = [];

    if (!output) return errors;

    // Parse tsc output format: file.ts(line,col): error TS1234: message
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/);

      if (match) {
        const [, file, lineStr, colStr, severity, code, message] = match;

        errors.push({
          file,
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10),
          message,
          code: `TS${code}`,
          severity: severity as 'error' | 'warning',
        });
      }
    }

    return errors;
  }

  /**
   * Parse svelte-check output
   */
  private parseSvelteCheckOutput(output: string): RawError[] {
    const errors: RawError[] = [];

    if (!output) return errors;

    // Parse svelte-check machine output format
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        // Try to parse as JSON first (machine format)
        const parsed = JSON.parse(line);

        if (parsed.filename && parsed.start) {
          errors.push({
            file: parsed.filename,
            line: parsed.start.line,
            column: parsed.start.character,
            message: parsed.message,
            code: parsed.code || 'SVELTE',
            severity: parsed.severity || 'error',
          });
        }
      } catch {
        // Fall back to text parsing
        const match = line.match(/^(.+?):(\d+):(\d+)\s+-\s+(error|warning):\s+(.+)$/);

        if (match) {
          const [, file, lineStr, colStr, severity, message] = match;

          errors.push({
            file,
            line: parseInt(lineStr, 10),
            column: parseInt(colStr, 10),
            message,
            code: 'SVELTE',
            severity: severity as 'error' | 'warning',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Deduplicate errors by file, line, column, and message
   */
  private deduplicateErrors(errors: RawError[]): RawError[] {
    const seen = new Set<string>();
    const unique: RawError[] = [];

    for (const error of errors) {
      const key = `${error.file}:${error.line}:${error.column}:${error.message}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(error);
      }
    }

    return unique;
  }

  /**
   * Find new errors introduced by fix
   * Implements: Requirements 6.4
   */
  private findNewErrors(before: RawError[], after: RawError[]): RawError[] {
    const beforeSet = new Set(
      before.map((e) => `${e.file}:${e.line}:${e.column}:${e.message}`)
    );

    return after.filter(
      (e) => !beforeSet.has(`${e.file}:${e.line}:${e.column}:${e.message}`)
    );
  }

  /**
   * Find errors resolved by fix
   * Implements: Requirements 6.4
   */
  private findResolvedErrors(before: RawError[], after: RawError[]): RawError[] {
    const afterSet = new Set(
      after.map((e) => `${e.file}:${e.line}:${e.column}:${e.message}`)
    );

    return before.filter(
      (e) => !afterSet.has(`${e.file}:${e.line}:${e.column}:${e.message}`)
    );
  }

  /**
   * Clear error cache
   */
  clearCache(): void {
    this.errorCache.clear();
    this.log('Error cache cleared');
  }

  /**
   * Get cached errors
   */
  getCachedErrors(file: string, phase: 'before' | 'after'): RawError[] | undefined {
    return this.errorCache.get(`${file}:${phase}`);
  }
}
