/**
 * Import Resolution Fixer Service
 * Fixes missing imports and resolves undefined symbols
 */

import { readFile, writeFile } from 'fs/promises';
import { BaseService } from '../base-service.js';
import type { CategorizedError, FixResult, Fix } from '../types.js';
import { generateId } from '../utils.js';

export class ImportFixer extends BaseService {
  constructor() {
    super('ImportFixer');
  }

  /**
   * Apply import fix to a file
   * Implements: Requirements 5.1, 5.2, 5.3, 5.4
   */
  async applyFix(file: string, error: CategorizedError): Promise<FixResult> {
    this.log(`Fixing import error in ${file}:${error.line}`);

    try {
      // Read file content
      const content = await readFile(file, 'utf-8');

      // Count errors before
      const errorsBefore = this.countImportErrors(content);

      // Extract undefined symbol from error message
      const undefinedSymbol = this.extractUndefinedSymbol(error.message);
      if (!undefinedSymbol) {
        return {
          success: false,
          file,
          errorsBefore,
          errorsAfter: errorsBefore,
          changes: [],
        };
      }

      // Find import source
      const importSource = this.findImportSource(undefinedSymbol, file);
      if (!importSource) {
        return {
          success: false,
          file,
          errorsBefore,
          errorsAfter: errorsBefore,
          changes: [],
        };
      }

      // Add import to file
      let fixed = this.addImport(content, undefinedSymbol, importSource);
      const changes: string[] = [
        `Added import: import { ${undefinedSymbol} } from '${importSource}'`,
      ];

      // Organize imports
      fixed = this.organizeImports(fixed);
      changes.push('Organized imports');

      // Write fixed content
      await writeFile(file, fixed, 'utf-8');

      // Count errors after
      const errorsAfter = this.countImportErrors(fixed);

      const fix: Fix = {
        id: generateId(),
        errorId: error.id,
        file,
        type: 'imports',
        before: content,
        after: fixed,
        applied: true,
        validated: false,
        rolledBack: false,
        timestamp: new Date(),
      };

      return {
        success: errorsAfter < errorsBefore,
        file,
        errorsBefore,
        errorsAfter,
        changes,
        fix,
      };
    } catch (error) {
      this.logError(`Failed to fix import error: ${error}`);
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
   * Extract undefined symbol from error message
   * Implements: Requirements 5.1
   */
  private extractUndefinedSymbol(message: string): string | null {
    // Pattern: "Cannot find name 'Symbol'"
    const match = message.match(/Cannot find name ['"](\w+)['"]/);
    if (match) {
      return match[1];
    }

    // Pattern: "'Symbol' is not defined"
    const match2 = message.match(/['"](\w+)['"] is not defined/);
    if (match2) {
      return match2[1];
    }

    // Pattern: "Property 'Symbol' does not exist"
    const match3 = message.match(/Property ['"](\w+)['"]/);
    if (match3) {
      return match3[1];
    }

    return null;
  }

  /**
   * Find import source for undefined symbol
   * Implements: Requirements 5.1, 5.2
   */
  private findImportSource(symbol: string, file: string): string | null {
    // Common import mappings for Svelte/SvelteKit
    const commonImports: Record<string, string> = {
      // Svelte
      'onMount': 'svelte',
      'onDestroy': 'svelte',
      'tick': 'svelte',
      'createEventDispatcher': 'svelte',
      'setContext': 'svelte',
      'getContext': 'svelte',
      'hasContext': 'svelte',
      'getAllContexts': 'svelte',

      // SvelteKit
      'goto': '$app/navigation',
      'page': '$app/stores',
      'session': '$app/stores',
      'dev': '$app/environment',
      'building': '$app/environment',
      'version': '$app/environment',

      // Common UI libraries
      'Button': 'bits-ui/components',
      'Input': 'bits-ui/components',
      'Select': 'bits-ui/components',
      'Modal': 'bits-ui/components',
      'Card': 'bits-ui/components',
      'Dialog': 'bits-ui/components',
      'Popover': 'bits-ui/components',
      'Tooltip': 'bits-ui/components',

      // Common utilities
      'clsx': 'clsx',
      'cn': 'clsx',
      'classnames': 'classnames',
      'twMerge': 'tailwind-merge',
    };

    // Check common imports first
    if (commonImports[symbol]) {
      return commonImports[symbol];
    }

    // Try to infer from symbol naming conventions
    if (symbol.startsWith('use')) {
      // Likely a hook
      return 'svelte';
    }

    if (symbol[0] === symbol[0].toUpperCase()) {
      // Likely a component
      return './components';
    }

    // Default to current directory
    return '.';
  }

  /**
   * Add import to file
   * Implements: Requirements 5.2
   */
  private addImport(content: string, symbol: string, source: string): string {
    const lines = content.split('\n');

    // Check if import already exists
    if (this.hasImport(content, symbol, source)) {
      return content;
    }

    // Find insertion point (after last import)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import\s+/)) {
        insertIndex = i + 1;
      } else if (insertIndex > 0 && !lines[i].match(/^import\s+/)) {
        // Found first non-import line after imports
        break;
      }
    }

    // Create import statement
    const importStatement = `import { ${symbol} } from '${source}';`;

    // Insert import
    lines.splice(insertIndex, 0, importStatement);

    return lines.join('\n');
  }

  /**
   * Check if import already exists
   * Implements: Requirements 5.4
   */
  private hasImport(content: string, symbol: string, source: string): boolean {
    // Check for exact import
    const exactPattern = new RegExp(
      `import\\s+{[^}]*\\b${symbol}\\b[^}]*}\\s+from\\s+['"]${source}['"]`
    );
    if (exactPattern.test(content)) {
      return true;
    }

    // Check for default import
    const defaultPattern = new RegExp(
      `import\\s+${symbol}\\s+from\\s+['"]${source}['"]`
    );
    if (defaultPattern.test(content)) {
      return true;
    }

    return false;
  }

  /**
   * Organize imports
   * Implements: Requirements 5.3
   */
  private organizeImports(content: string): string {
    const lines = content.split('\n');
    const imports: string[] = [];
    const nonImports: string[] = [];

    let inImportSection = false;

    for (const line of lines) {
      if (line.match(/^import\s+/)) {
        imports.push(line);
        inImportSection = true;
      } else if (inImportSection && line.trim() === '') {
        // Empty line after imports
        nonImports.push(line);
        inImportSection = false;
      } else {
        nonImports.push(line);
      }
    }

    // Sort imports
    imports.sort((a, b) => {
      // Svelte imports first
      const aIsSvelte = a.includes("from 'svelte'");
      const bIsSvelte = b.includes("from 'svelte'");
      if (aIsSvelte && !bIsSvelte) return -1;
      if (!aIsSvelte && bIsSvelte) return 1;

      // Then SvelteKit imports
      const aIsSvelteKit = a.includes("from '$app");
      const bIsSvelteKit = b.includes("from '$app");
      if (aIsSvelteKit && !bIsSvelteKit) return -1;
      if (!aIsSvelteKit && bIsSvelteKit) return 1;

      // Then relative imports
      const aIsRelative = a.includes("from '.");
      const bIsRelative = b.includes("from '.");
      if (aIsRelative && !bIsRelative) return 1;
      if (!aIsRelative && bIsRelative) return -1;

      // Alphabetical
      return a.localeCompare(b);
    });

    // Remove duplicates
    const uniqueImports = Array.from(new Set(imports));

    // Reconstruct content
    return [...uniqueImports, ...nonImports].join('\n');
  }

  /**
   * Count import errors in content
   */
  private countImportErrors(content: string): number {
    // Simple heuristic: count lines with import-related keywords
    const importKeywords = [
      'Cannot find name',
      'is not defined',
      'does not exist',
      'not exported',
    ];
    let count = 0;
    for (const keyword of importKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      count += matches ? matches.length : 0;
    }
    return count;
  }
}
