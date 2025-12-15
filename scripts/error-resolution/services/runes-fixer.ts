/**
 * Svelte 5 Runes Fixer Service
 * Fixes Svelte 5 runes syntax errors ($state, $derived, $effect, $props)
 */

import { readFile, writeFile } from 'fs/promises';
import { BaseService } from '../base-service.js';
import type { CategorizedError, FixResult, Fix } from '../types.js';
import { generateId } from '../utils.js';

export class RunesFixer extends BaseService {
  constructor() {
    super('RunesFixer');
  }

  /**
   * Apply runes fix to a file
   * Implements: Requirements 3.1, 3.4
   */
  async applyFix(file: string, error: CategorizedError): Promise<FixResult> {
    this.log(`Fixing runes syntax in ${file}:${error.line}`);

    try {
      // Read file content
      const content = await readFile(file, 'utf-8');

      // Count errors before
      const errorsBefore = this.countRunesErrors(content);

      // Apply fix
      const { fixed, changes, typeDeclarations } = this.fixRunesSyntax(content);

      // Write fixed content
      await writeFile(file, fixed, 'utf-8');

      // Count errors after
      const errorsAfter = this.countRunesErrors(fixed);

      const fix: Fix = {
        id: generateId(),
        errorId: error.id,
        file,
        type: 'runes',
        before: content,
        after: fixed,
        applied: true,
        validated: false,
        rolledBack: false,
        timestamp: new Date(),
      };

      this.log(`Fixed ${errorsBefore - errorsAfter} runes errors in ${file}`);
      if (typeDeclarations.length > 0) {
        this.log(`  - Added ${typeDeclarations.length} type declaration(s)`);
      }

      return {
        success: true,
        file,
        errorsBefore,
        errorsAfter,
        changes,
        fix,
      };
    } catch (error) {
      this.logError(`Failed to fix runes in ${file}`, error as Error);
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
   * Fix all runes syntax errors in content
   * Implements: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private fixRunesSyntax(content: string): {
    fixed: string;
    changes: string[];
    typeDeclarations: string[];
  } {
    let fixed = content;
    const changes: string[] = [];
    const typeDeclarations: string[] = [];

    // Fix $state <Type>(value) -> $state(value)
    const stateMatches = content.match(/\$state\s*<([^>]+)>\s*\(/g);
    if (stateMatches) {
      for (const match of stateMatches) {
        const typeMatch = match.match(/\$state\s*<([^>]+)>/);
        if (typeMatch) {
          const type = typeMatch[1];
          fixed = fixed.replace(match, '$state(');
          typeDeclarations.push(`type StateType = ${type};`);
          changes.push(`Fixed $state <${type}> syntax`);
          this.log(`  - Fixed $state <${type}> syntax`);
        }
      }
    }

    // Fix $derived <Type>(expr) -> $derived(expr)
    const derivedMatches = content.match(/\$derived\s*<([^>]+)>\s*\(/g);
    if (derivedMatches) {
      for (const match of derivedMatches) {
        const typeMatch = match.match(/\$derived\s*<([^>]+)>/);
        if (typeMatch) {
          const type = typeMatch[1];
          fixed = fixed.replace(match, '$derived(');
          typeDeclarations.push(`type DerivedType = ${type};`);
          changes.push(`Fixed $derived <${type}> syntax`);
          this.log(`  - Fixed $derived <${type}> syntax`);
        }
      }
    }

    // Fix $effect <Type>(fn) -> $effect(fn)
    const effectMatches = content.match(/\$effect\s*<([^>]+)>\s*\(/g);
    if (effectMatches) {
      for (const match of effectMatches) {
        const typeMatch = match.match(/\$effect\s*<([^>]+)>/);
        if (typeMatch) {
          const type = typeMatch[1];
          fixed = fixed.replace(match, '$effect(');
          typeDeclarations.push(`type EffectType = ${type};`);
          changes.push(`Fixed $effect <${type}> syntax`);
          this.log(`  - Fixed $effect <${type}> syntax`);
        }
      }
    }

    // Fix $props <Type>() -> $props()
    const propsMatches = content.match(/\$props\s*<([^>]+)>\s*\(/g);
    if (propsMatches) {
      for (const match of propsMatches) {
        const typeMatch = match.match(/\$props\s*<([^>]+)>/);
        if (typeMatch) {
          const type = typeMatch[1];
          fixed = fixed.replace(match, '$props(');
          typeDeclarations.push(`type PropsType = ${type};`);
          changes.push(`Fixed $props <${type}> syntax`);
          this.log(`  - Fixed $props <${type}> syntax`);
        }
      }
    }

    return { fixed, changes, typeDeclarations };
  }

  /**
   * Count runes errors in content
   */
  private countRunesErrors(content: string): number {
    const patterns = [
      /\$state\s*<[^>]+>\s*\(/g,
      /\$derived\s*<[^>]+>\s*\(/g,
      /\$effect\s*<[^>]+>\s*\(/g,
      /\$props\s*<[^>]+>\s*\(/g,
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
   * Check if content has runes errors
   */
  hasRunesErrors(content: string): boolean {
    return this.countRunesErrors(content) > 0;
  }

  /**
   * Get runes error details
   */
  getRunesErrors(content: string): Array<{ line: number; type: string; text: string }> {
    const errors: Array<{ line: number; type: string; text: string }> = [];
    const lines = content.split('\n');

    const patterns = [
      { pattern: /\$state\s*<[^>]+>\s*\(/, type: '$state' },
      { pattern: /\$derived\s*<[^>]+>\s*\(/, type: '$derived' },
      { pattern: /\$effect\s*<[^>]+>\s*\(/, type: '$effect' },
      { pattern: /\$props\s*<[^>]+>\s*\(/, type: '$props' },
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
  async previewFix(file: string): Promise<{
    before: string;
    after: string;
    changes: string[];
    typeDeclarations: string[];
  }> {
    const content = await readFile(file, 'utf-8');
    const { fixed, changes, typeDeclarations } = this.fixRunesSyntax(content);

    return {
      before: content,
      after: fixed,
      changes,
      typeDeclarations,
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
        message: 'Runes syntax error',
        code: '',
        severity: 'error',
        category: 'runes',
        priority: 'high',
      };

      const result = await this.applyFix(file, error);
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;
    this.log(`Batch fix complete: ${successful}/${files.length} successful`);

    return results;
  }

  /**
   * Extract type information from runes
   */
  extractTypeInfo(content: string): Map<string, string> {
    const typeInfo = new Map<string, string>();

    // Extract $state types
    const stateMatches = content.matchAll(/\$state\s*<([^>]+)>/g);
    for (const match of stateMatches) {
      typeInfo.set(`state_${match[1]}`, match[1]);
    }

    // Extract $derived types
    const derivedMatches = content.matchAll(/\$derived\s*<([^>]+)>/g);
    for (const match of derivedMatches) {
      typeInfo.set(`derived_${match[1]}`, match[1]);
    }

    // Extract $effect types
    const effectMatches = content.matchAll(/\$effect\s*<([^>]+)>/g);
    for (const match of effectMatches) {
      typeInfo.set(`effect_${match[1]}`, match[1]);
    }

    // Extract $props types
    const propsMatches = content.matchAll(/\$props\s*<([^>]+)>/g);
    for (const match of propsMatches) {
      typeInfo.set(`props_${match[1]}`, match[1]);
    }

    return typeInfo;
  }
}
