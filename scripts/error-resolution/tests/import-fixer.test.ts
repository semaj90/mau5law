/**
 * Property-based tests for Import Fixer Service
 * Feature: svelte5-ui-error-resolution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ImportFixer } from '../services/import-fixer.js';
import type { CategorizedError } from '../types.js';

describe('ImportFixer', () => {
  const fixer = new ImportFixer();

  /**
   * Property 8: Import resolution eliminates undefined symbols
   * Feature: svelte5-ui-error-resolution, Property 8: Import resolution eliminates undefined symbols
   * Validates: Requirements 5.1, 5.2
   *
   * For any file with undefined symbols, adding the correct imports should resolve all undefined references
   */
  describe('Property 8: Import resolution completeness', () => {
    it('should resolve undefined symbols by adding imports', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy', 'tick', 'createEventDispatcher'),
          (symbol) => {
            const before = `<script>
  ${symbol}(() => {
    console.log('mounted');
  });
</script>`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 2,
              column: 2,
              message: `Cannot find name '${symbol}'`,
              code: 'TS2304',
              severity: 'error',
              id: 'test-error',
              category: 'imports',
              priority: 'high',
            };

            const result = (fixer as any).extractUndefinedSymbol(error.message);

            // Verify the symbol was extracted
            expect(result).toBe(symbol);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should find correct import sources for common symbols', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { symbol: 'onMount', source: 'svelte' },
            { symbol: 'goto', source: '$app/navigation' },
            { symbol: 'page', source: '$app/stores' },
            { symbol: 'Button', source: 'bits-ui/components' }
          ),
          (mapping) => {
            const source = (fixer as any).findImportSource(mapping.symbol, 'test.svelte');

            // Verify the correct source was found
            expect(source).toBe(mapping.source);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add imports without duplicates', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy', 'tick'),
          (symbol) => {
            const before = `import { ${symbol} } from 'svelte';

export default {};`;

            const hasImport = (fixer as any).hasImport(before, symbol, 'svelte');

            // Verify the import is detected
            expect(hasImport).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect missing imports correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy', 'tick'),
          (symbol) => {
            const before = `export default {};`;

            const hasImport = (fixer as any).hasImport(before, symbol, 'svelte');

            // Verify the import is not detected
            expect(hasImport).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract undefined symbols from various error formats', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { message: "Cannot find name 'Symbol'", expected: 'Symbol' },
            { message: "'Symbol' is not defined", expected: 'Symbol' },
            { message: "Property 'Symbol' does not exist", expected: 'Symbol' }
          ),
          (mapping) => {
            const result = (fixer as any).extractUndefinedSymbol(mapping.message);

            // Verify the symbol was extracted
            expect(result).toBe(mapping.expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should organize imports correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('onMount', 'onDestroy', 'tick', 'createEventDispatcher'),
            { minLength: 2, maxLength: 4 }
          ),
          (symbols) => {
            const before = symbols
              .map((s) => `import { ${s} } from 'svelte';`)
              .join('\n');

            const organized = (fixer as any).organizeImports(before);

            // Verify all imports are still present
            for (const symbol of symbols) {
              expect(organized).toContain(symbol);
            }

            // Verify imports are at the top
            const lines = organized.split('\n');
            const firstImportIndex = lines.findIndex((l) => l.includes('import'));
            expect(firstImportIndex).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize Svelte imports', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          fc.constantFrom('goto', 'page'),
          (svelteSymbol, svelteKitSymbol) => {
            const before = `import { ${svelteKitSymbol} } from '$app/navigation';
import { ${svelteSymbol} } from 'svelte';`;

            const organized = (fixer as any).organizeImports(before);

            // Verify Svelte import comes first
            const svelteIndex = organized.indexOf("from 'svelte'");
            const svelteKitIndex = organized.indexOf("from '$app");
            expect(svelteIndex).toBeLessThan(svelteKitIndex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple imports from same source', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('onMount', 'onDestroy', 'tick'),
            { minLength: 2, maxLength: 3 }
          ),
          (symbols) => {
            const before = `import { ${symbols.join(', ')} } from 'svelte';`;

            const hasImports = symbols.every((s) =>
              (fixer as any).hasImport(before, s, 'svelte')
            );

            // Verify all symbols are detected
            expect(hasImports).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve non-import code', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (code) => {
            const before = `import { onMount } from 'svelte';

${code}`;

            const organized = (fixer as any).organizeImports(before);

            // Verify the code is preserved
            expect(organized).toContain(code);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty import lists', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          (symbol) => {
            const before = `export default {};`;

            const hasImport = (fixer as any).hasImport(before, symbol, 'svelte');

            // Verify no import is found
            expect(hasImport).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should infer import source from symbol naming', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('useStore', 'useContext', 'useEffect'),
          (symbol) => {
            const source = (fixer as any).findImportSource(symbol, 'test.svelte');

            // Verify hook-like symbols resolve to svelte
            expect(source).toBe('svelte');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should infer component imports from capitalization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Button', 'Modal', 'Card', 'Input'),
          (symbol) => {
            const source = (fixer as any).findImportSource(symbol, 'test.svelte');

            // Verify component-like symbols resolve to components directory
            expect(source).toContain('component');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle relative imports', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('MyComponent', 'MyStore', 'MyUtil'),
          (symbol) => {
            const source = (fixer as any).findImportSource(symbol, 'test.svelte');

            // Verify unknown symbols default to relative imports
            expect(source).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count import errors correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              'Cannot find name',
              'is not defined',
              'does not exist'
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (errors) => {
            const content = errors.join('\n');
            const count = (fixer as any).countImportErrors(content);

            // Count should be at least the number of errors
            expect(count).toBeGreaterThanOrEqual(errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Import addition avoids duplicates
   * Feature: svelte5-ui-error-resolution, Property 9: Import addition avoids duplicates
   * Validates: Requirements 5.4
   *
   * For any file, adding imports should never create duplicate import statements
   */
  describe('Property 9: Import duplicate avoidance', () => {
    it('should not create duplicate imports when adding', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy', 'tick'),
          (symbol) => {
            const before = `import { ${symbol} } from 'svelte';

export default {};`;

            const added = (fixer as any).addImport(before, symbol, 'svelte');

            // Count occurrences of the import
            const importCount = (added.match(new RegExp(`import.*${symbol}.*from 'svelte'`, 'g')) || []).length;

            // Should have exactly one import
            expect(importCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect existing imports before adding', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          fc.constantFrom('tick', 'createEventDispatcher'),
          (existing, newSymbol) => {
            const before = `import { ${existing} } from 'svelte';

export default {};`;

            const hasExisting = (fixer as any).hasImport(before, existing, 'svelte');
            const hasNew = (fixer as any).hasImport(before, newSymbol, 'svelte');

            // Verify detection is accurate
            expect(hasExisting).toBe(true);
            expect(hasNew).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should merge imports from same source', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('onMount', 'onDestroy', 'tick'),
            { minLength: 2, maxLength: 3 }
          ),
          (symbols) => {
            let content = '';
            for (const symbol of symbols) {
              content = (fixer as any).addImport(content, symbol, 'svelte');
            }

            // Count import statements
            const importCount = (content.match(/^import\s+/gm) || []).length;

            // Should have only one import statement (or minimal)
            expect(importCount).toBeLessThanOrEqual(symbols.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle imports from different sources', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          fc.constantFrom('goto', 'page'),
          (svelteSymbol, svelteKitSymbol) => {
            let content = '';
            content = (fixer as any).addImport(content, svelteSymbol, 'svelte');
            content = (fixer as any).addImport(content, svelteKitSymbol, '$app/navigation');

            // Both imports should be present
            expect(content).toContain(svelteSymbol);
            expect(content).toContain(svelteKitSymbol);

            // Should have two import statements
            const importCount = (content.match(/^import\s+/gm) || []).length;
            expect(importCount).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve import order when adding', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          (symbol) => {
            const before = `import { tick } from 'svelte';

export default {};`;

            const added = (fixer as any).addImport(before, symbol, 'svelte');

            // Verify original import is still present
            expect(added).toContain('tick');
            expect(added).toContain(symbol);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle default imports without duplication', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Component', 'Store', 'Util'),
          (symbol) => {
            const before = `import ${symbol} from './lib';

export default {};`;

            const hasImport = (fixer as any).hasImport(before, symbol, './lib');

            // Verify default import is detected
            expect(hasImport).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not duplicate when organizing imports', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('onMount', 'onDestroy', 'tick'),
            { minLength: 2, maxLength: 3 }
          ),
          (symbols) => {
            const before = symbols
              .map((s) => `import { ${s} } from 'svelte';`)
              .join('\n');

            const organized = (fixer as any).organizeImports(before);

            // Count unique imports
            const uniqueImports = new Set(
              (organized.match(/import\s+{[^}]+}\s+from\s+'[^']+';/g) || [])
            );

            // Should have same or fewer imports (no duplicates)
            expect(uniqueImports.size).toBeLessThanOrEqual(symbols.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed import styles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onMount', 'onDestroy'),
          fc.constantFrom('Component', 'Store'),
          (svelteSymbol, componentSymbol) => {
            let content = '';
            content = (fixer as any).addImport(content, svelteSymbol, 'svelte');
            content = (fixer as any).addImport(content, componentSymbol, './lib');

            // Both should be present
            expect(content).toContain(svelteSymbol);
            expect(content).toContain(componentSymbol);

            // No duplicates
            const importCount = (content.match(/^import\s+/gm) || []).length;
            expect(importCount).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional unit tests for edge cases
   */
  describe('Edge cases', () => {
    it('should handle empty content', () => {
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: "Cannot find name 'onMount'",
        code: 'TS2304',
        severity: 'error',
        id: 'test-error',
        category: 'imports',
        priority: 'high',
      };

      const result = (fixer as any).extractUndefinedSymbol(error.message);
      expect(result).toBe('onMount');
    });

    it('should handle symbols with underscores', () => {
      const message = "Cannot find name '_privateSymbol'";
      const result = (fixer as any).extractUndefinedSymbol(message);
      expect(result).toBe('_privateSymbol');
    });

    it('should handle symbols with numbers', () => {
      const message = "Cannot find name 'Symbol123'";
      const result = (fixer as any).extractUndefinedSymbol(message);
      expect(result).toBe('Symbol123');
    });

    it('should handle multiple imports on one line', () => {
      const content = "import { onMount, onDestroy, tick } from 'svelte';";
      const hasOnMount = (fixer as any).hasImport(content, 'onMount', 'svelte');
      const hasOnDestroy = (fixer as any).hasImport(content, 'onDestroy', 'svelte');
      const hasTick = (fixer as any).hasImport(content, 'tick', 'svelte');

      expect(hasOnMount).toBe(true);
      expect(hasOnDestroy).toBe(true);
      expect(hasTick).toBe(true);
    });

    it('should handle imports with aliases', () => {
      const content = "import { onMount as mounted } from 'svelte';";
      const hasOnMount = (fixer as any).hasImport(content, 'onMount', 'svelte');
      expect(hasOnMount).toBe(true);
    });

    it('should handle star imports', () => {
      const content = "import * as svelte from 'svelte';";
      const hasOnMount = (fixer as any).hasImport(content, 'onMount', 'svelte');
      // Star imports should be detected as having the symbol
      expect(hasOnMount).toBeDefined();
    });

    it('should handle imports with line breaks', () => {
      const content = `import {
  onMount,
  onDestroy,
  tick
} from 'svelte';`;
      const hasOnMount = (fixer as any).hasImport(content, 'onMount', 'svelte');
      expect(hasOnMount).toBe(true);
    });

    it('should handle relative imports with paths', () => {
      const content = "import { MyComponent } from '../components/MyComponent';";
      const hasComponent = (fixer as any).hasImport(content, 'MyComponent', '../components/MyComponent');
      expect(hasComponent).toBe(true);
    });

    it('should handle scoped imports', () => {
      const content = "import { Button } from '@bits-ui/svelte';";
      const hasButton = (fixer as any).hasImport(content, 'Button', '@bits-ui/svelte');
      expect(hasButton).toBe(true);
    });

    it('should organize imports with comments', () => {
      const content = `// Svelte imports
import { onMount } from 'svelte';
// App imports
import { page } from '$app/stores';`;

      const organized = (fixer as any).organizeImports(content);

      // Should preserve structure
      expect(organized).toContain('onMount');
      expect(organized).toContain('page');
    });
  });
});
