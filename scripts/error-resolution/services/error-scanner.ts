/**
 * Error Scanner Service
 * Scans codebase for TypeScript/Svelte errors and categorizes them
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseService } from '../base-service.js';
import { getConfig } from '../config.js';
import {
  toCategorizedError,
  matchesPattern,
  deduplicateErrors,
  sortByPriority,
} from '../utils.js';
import type {
  RawError,
  CategorizedError,
  CategorizedErrors,
  PrioritizedErrors,
  ErrorCategory,
  ErrorPriority,
  ErrorResolutionConfig,
} from '../types.js';

const execAsync = promisify(exec);

export class ErrorScanner extends BaseService {
  private config: ErrorResolutionConfig;

  constructor(config?: Partial<ErrorResolutionConfig>) {
    super('ErrorScanner');
    this.config = getConfig(config);
  }

  /**
   * Scan errors from svelte-check
   * Implements: Requirements 1.1
   */
  async scanErrors(): Promise<CategorizedErrors> {
    this.log('Starting error scan...');

    try {
      // Execute svelte-check
      const rawErrors = await this.executeSvelteCheck();
      this.log(`Found ${rawErrors.length} raw errors`);

      // Deduplicate errors
      const uniqueErrors = deduplicateErrors(rawErrors);
      this.log(`After deduplication: ${uniqueErrors.length} unique errors`);

      // Categorize errors
      const categorized = this.categorizeErrors(uniqueErrors);

      const total =
        categorized.transition.length +
        categorized.runes.length +
        categorized.typeMismatch.length +
        categorized.imports.length;

      this.log(`Categorized ${total} errors:`);
      this.log(`  - Transition: ${categorized.transition.length}`);
      this.log(`  - Runes: ${categorized.runes.length}`);
      this.log(`  - Type Mismatch: ${categorized.typeMismatch.length}`);
      this.log(`  - Imports: ${categorized.imports.length}`);

      return categorized;
    } catch (error) {
      this.logError('Failed to scan errors', error as Error);
      throw error;
    }
  }

  /**
   * Execute svelte-check and parse output
   * Implements: Requirements 1.1
   */
  private async executeSvelteCheck(): Promise<RawError[]> {
    try {
      // Run svelte-check with JSON output
      const { stdout, stderr } = await execAsync(
        'npx svelte-check --output machine --threshold error',
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      );

      // Parse JSON output
      return this.parseSvelteCheckOutput(stdout || stderr);
    } catch (error: any) {
      // svelte-check exits with non-zero when errors are found
      // Parse the output anyway
      if (error.stdout || error.stderr) {
        return this.parseSvelteCheckOutput(error.stdout || error.stderr);
      }
      throw error;
    }
  }

  /**
   * Parse svelte-check JSON output
   */
  private parseSvelteCheckOutput(output: string): RawError[] {
    const errors: RawError[] = [];
    const lines = output.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // svelte-check outputs in this format
        if (parsed.filename && parsed.start) {
          errors.push({
            file: parsed.filename,
            line: parsed.start.line,
            column: parsed.start.column,
            message: parsed.text || parsed.message || '',
            code: parsed.code || '',
            severity: parsed.severity === 'warning' ? 'warning' : 'error',
          });
        }
      } catch (e) {
        // Skip lines that aren't valid JSON
        continue;
      }
    }

    return errors;
  }

  /**
   * Categorize errors by type
   * Implements: Requirements 1.1, 1.4
   */
  private categorizeErrors(errors: RawError[]): CategorizedErrors {
    const categorized: CategorizedErrors = {
      transition: [],
      runes: [],
      typeMismatch: [],
      imports: [],
    };

    for (const error of errors) {
      const category = this.categorizeError(error);
      const priority = this.assignPriority(error, category);
      const categorizedError = toCategorizedError(error, category, priority);

      categorized[category].push(categorizedError);
    }

    return categorized;
  }

  /**
   * Categorize a single error
   * Implements: Requirements 1.1
   */
  categorizeError(error: RawError): ErrorCategory {
    const message = error.message.toLowerCase();

    // Check transition patterns
    if (matchesPattern(message, this.config.transitionPatterns)) {
      return 'transition';
    }

    // Check runes patterns
    if (matchesPattern(message, this.config.runesPatterns)) {
      return 'runes';
    }

    // Check import patterns
    if (matchesPattern(message, this.config.importPatterns)) {
      return 'imports';
    }

    // Default to type mismatch
    return 'typeMismatch';
  }

  /**
   * Assign priority to error
   * Implements: Requirements 1.2
   */
  private assignPriority(error: RawError, category: ErrorCategory): ErrorPriority {
    const message = error.message.toLowerCase();

    // Check high priority keywords
    for (const keyword of this.config.highPriorityKeywords) {
      if (message.includes(keyword.toLowerCase())) {
        return 'high';
      }
    }

    // Check medium priority keywords
    for (const keyword of this.config.mediumPriorityKeywords) {
      if (message.includes(keyword.toLowerCase())) {
        return 'medium';
      }
    }

    // Transition and runes are high priority by default
    if (category === 'transition' || category === 'runes') {
      return 'high';
    }

    // Everything else is medium
    return 'medium';
  }

  /**
   * Prioritize errors (high -> medium -> low)
   * Implements: Requirements 1.3
   */
  prioritizeErrors(errors: CategorizedErrors): PrioritizedErrors {
    const allErrors: CategorizedError[] = [
      ...errors.transition,
      ...errors.runes,
      ...errors.typeMismatch,
      ...errors.imports,
    ];

    const prioritized: PrioritizedErrors = {
      high: [],
      medium: [],
      low: [],
    };

    for (const error of allErrors) {
      prioritized[error.priority].push(error);
    }

    // Sort each priority group by file and line
    prioritized.high = this.sortByFileAndLine(prioritized.high);
    prioritized.medium = this.sortByFileAndLine(prioritized.medium);
    prioritized.low = this.sortByFileAndLine(prioritized.low);

    this.log(`Prioritized errors:`);
    this.log(`  - High: ${prioritized.high.length}`);
    this.log(`  - Medium: ${prioritized.medium.length}`);
    this.log(`  - Low: ${prioritized.low.length}`);

    return prioritized;
  }

  /**
   * Sort errors by file and line number
   */
  private sortByFileAndLine(errors: CategorizedError[]): CategorizedError[] {
    return [...errors].sort((a, b) => {
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      return a.line - b.line;
    });
  }

  /**
   * Get errors for a specific file
   */
  getErrorsForFile(errors: CategorizedErrors, filePath: string): CategorizedError[] {
    const allErrors: CategorizedError[] = [
      ...errors.transition,
      ...errors.runes,
      ...errors.typeMismatch,
      ...errors.imports,
    ];

    return allErrors.filter((error) => error.file === filePath);
  }

  /**
   * Get error statistics
   */
  getStatistics(errors: CategorizedErrors): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    byPriority: Record<ErrorPriority, number>;
    filesAffected: number;
  } {
    const allErrors: CategorizedError[] = [
      ...errors.transition,
      ...errors.runes,
      ...errors.typeMismatch,
      ...errors.imports,
    ];

    const uniqueFiles = new Set(allErrors.map((e) => e.file));

    const byPriority: Record<ErrorPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const error of allErrors) {
      byPriority[error.priority]++;
    }

    return {
      total: allErrors.length,
      byCategory: {
        transition: errors.transition.length,
        runes: errors.runes.length,
        typeMismatch: errors.typeMismatch.length,
        imports: errors.imports.length,
      },
      byPriority,
      filesAffected: uniqueFiles.size,
    };
  }
}
