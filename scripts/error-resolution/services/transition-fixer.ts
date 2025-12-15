/**
 * Transition Directive Fixer Service
 * Fixes Svelte transition directive syntax errors
 */

import { readFile, writeFile } from 'fs/promises';
import { BaseService } from '../base-service.js';
import type { CategorizedError, FixResult, Fix } from '../types.js';
import { generateId } from '../utils.js';

export class TransitionFixer extends BaseService {
  constructor() {
    super('TransitionFixer');
  }

  /**
   * Apply transition fix to a file
   * Implements: Requirements 2.1, 2.4
   */
  async applyFix(file: string, error: CategorizedError): Promise<FixResult> {
    this.log(`Fixing transition directive in ${file}:${error.line}`);

    try {
      // Read file content
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      // Count errors before
      const errorsBefore = this.countTransitionErrors(content);

      // Apply fix
      const { fixed, changes } = this.fixTransitionDirectives(content);

      // Write fixed content
      await writeFile(file, fixed, 'utf-8');

      // Count errors after
      const errorsAfter = this.countTransitionErrors(fixed);

      const fix: Fix = {
        id: generateId(),
        errorId: error.id,
        file,
        type: 'transition',
        before: content,
        after: fixed,
        applied: true,
        validated: false,
        rolledBack: false,
        timestamp: new Date(),
      };

      this.log(`Fixed ${errorsBefore - errorsAfter} transition errors in ${file}`);

      return {
        success: true,
        file,
        errorsBefore,
        errorsAfter,
        changes,
        fix,
      };
    } catch (error) {
      this.logError(`Failed to fix transition in ${file}`, error as Error);
      return {
        success: false,
        file,
        errorsBefore: 0,
        errorsAfter: 0,
        changes: [],
      };
    }
  }

  /**
   * Fix all transition directives in content
   * Implements: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private fixTransitionDirectives(content: string): { fixed: string; changes: string[] } {
    let fixed = content;
    const changes: string[] = [];

    // Define transition patterns and their fixes
    const transitions = [
      { pattern: /\btransitionfade\b/g, replacement: 'transition:fade', name: 'fade' },
      { pattern: /\btransitionslide\b/g, replacement: 'transition:slide', name: 'slide' },
      { pattern: /\btransitionfly\b/g, replacement: 'transition:fly', name: 'fly' },
      { pattern: /\btransitionscale\b/g, replacement: 'transition:scale', name: 'scale' },
      { pattern: /\btransitionblur\b/g, replacement: 'transition:blur', name: 'blur' },
      { pattern: /\btransitiondraw\b/g, replacement: 'transition:draw', name: 'draw' },
    ];

    // Apply each transition fix
    for (const { pattern, replacement, name } of transitions) {
      const matches = fixed.match(pattern);
      if (matches) {
        fixed = fixed.replace(pattern, replacement);
        changes.push(`Fixed ${matches.length} ${name} transition(s)`);
        this.log(`  - Replaced ${matches.length} ${name} transition(s)`);
      }
    }

    return { fixed, changes };
  }

  /**
   * Count transition errors in content
   */
  private countTransitionErrors(content: string): number {
    const patterns = [
      /\btransitionfade\b/g,
      /\btransitionslide\b/g,
      /\btransitionfly\b/g,
      /\btransitionscale\b/g,
      /\btransitionblur\b/g,
      /\btransitiondraw\b/g,
    ];

    let count = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Check if content has transition errors
   */
  hasTransitionErrors(content: string): boolean {
    return this.countTransitionErrors(content) > 0;
  }

  /**
   * Get transition error details
   */
  getTransitionErrors(content: string): Array<{ line: number; type: string; text: string }> {
    const errors: Array<{ line: number; type: string; text: string }> = [];
    const lines = content.split('\n');

    const patterns = [
      { pattern: /\btransitionfade\b/, type: 'fade' },
      { pattern: /\btransitionslide\b/, type: 'slide' },
      { pattern: /\btransitionfly\b/, type: 'fly' },
      { pattern: /\btransitionscale\b/, type: 'scale' },
      { pattern: /\btransitionblur\b/, type: 'blur' },
      { pattern: /\btransitiondraw\b/, type: 'draw' },
    ];

    lines.forEach((line, index) => {
      for (const { pattern, type } of patterns) {
        if (pattern.test(line)) {
          errors.push({
            line: index + 1,
            type,
            text: line.trim(),
          });
        }
      }
    });

    return errors;
  }

  /**
   * Preview fix without applying
   */
  async previewFix(file: string): Promise<{ before: string; after: string; changes: string[] }> {
    const content = await readFile(file, 'utf-8');
    const { fixed, changes } = this.fixTransitionDirectives(content);

    return {
      before: content,
      after: fixed,
      changes,
    };
  }

  /**
   * Batch fix multiple files
   */
  async batchFix(files: string[]): Promise<FixResult[]> {
    this.log(`Batch fixing ${files.length} files...`);
    const results: FixResult[] = [];

    for (const file of files) {
      const error: CategorizedError = {
        id: generateId(),
        file,
        line: 0,
        column: 0,
        message: 'Transition directive error',
        code: '',
        severity: 'error',
        category: 'transition',
        priority: 'high',
      };

      const result = await this.applyFix(file, error);
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;
    this.log(`Batch fix complete: ${successful}/${files.length} successful`);

    return results;
  }
}
