/**
 * Property-based tests for Runes Fixer
 * Feature: svelte5-ui-error-resolution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RunesFixer } from '../services/runes-fixer.js';

describe('RunesFixer', () => {
  const fixer = new RunesFixer();

  /**
   * Property 6: Runes syntax transformation preserves reactive logic
   * Feature: svelte5-ui-error-resolution, Property 6: Runes syntax transformation preserves reactive logic
   * Validates: Requirements 3.4
   *
   * For any Svelte 5 rune with type annotation, transforming it should preserve the reactive behavior
   */
  describe('Property 6: Runes reactive logic preservation', () => {
    it('should preserve $state reactive logic when fixing syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('boolean', 'number', 'string', 'object', 'any'),
          fc.oneof(
            fc.constant('true'),
            fc.constant('false'),
            fc.constant('0'),
            fc.constant('""'),
            fc.constant('{}')
          ),
          (type, value) => {
            const before = `let count = $state <${type}>(${value});`;

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify the fix was applied
            expect(fixed).toContain('$state(');
            expect(fixed).not.toContain(`$state <${type}>`);

            // Verify the value is preserved
            expect(fixed).toContain(value);

            // Verify the variable name is preserved
            expect(fixed).toContain('let count');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve $derived reactive logic when fixing syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('number', 'string', 'boolean'),
          fc.string({ minLength: 1, maxLength: 20 }),
          (type, expr) => {
            const before = `let doubled = $derived <${type}>(count * 2);`;

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify the fix was applied
            expect(fixed).toContain('$derived(');
            expect(fixed).not.toContain(`$derived <${type}>`);

            // Verify the expression is preserved
            expect(fixed).toContain('count * 2');

            // Verify the variable name is preserved
            expect(fixed).toContain('let doubled');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve $effect reactive logic when fixing syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('void', 'undefined'),
          (type) => {
            const before = `$effect <${type}>(() => {
  console.log('Effect running');
});`;

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify the fix was applied
            expect(fixed).toContain('$effect(');
            expect(fixed).not.toContain(`$effect <${type}>`);

            // Verify the effect body is preserved
            expect(fixed).toContain('console.log');
            expect(fixed).toContain('Effect running');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve $props reactive logic when fixing syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Props', 'ComponentProps', 'MyProps'),
          (type) => {
            const before = `let { name, age } = $props <${type}>();`;

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify the fix was applied
            expect(fixed).toContain('$props(');
            expect(fixed).not.toContain(`$props <${type}>`);

            // Verify the destructuring is preserved
            expect(fixed).toContain('{ name, age }');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle complex type annotations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Record<string, number>',
            'Array<string>',
            'Map<string, any>',
            'Promise<void>'
          ),
          (type) => {
            const before = `let data = $state <${type}>({});`;

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify the fix was applied
            expect(fixed).toContain('$state(');
            expect(fixed).not.toContain(`$state <${type}>`);

            // Verify the value is preserved
            expect(fixed).toContain('{}');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - fixing twice produces same result', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('boolean', 'number', 'string'),
          (type) => {
            const before = `let value = $state <${type}>(null);`;

            // Fix once
            const { fixed: fixed1 } = (fixer as any).fixRunesSyntax(before);

            // Fix again
            const { fixed: fixed2 } = (fixer as any).fixRunesSyntax(fixed1);

            // Both should be identical
            expect(fixed1).toBe(fixed2);

            // Should have no errors after first fix
            const hasErrors = fixer.hasRunesErrors(fixed1);
            expect(hasErrors).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple runes in the same file', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              rune: fc.constantFrom('$state', '$derived', '$effect', '$props'),
              type: fc.constantFrom('boolean', 'number', 'string'),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (runes) => {
            // Create content with multiple runes
            const before = runes
              .map((r, i) => `let var${i} = ${r.rune} <${r.type}>(null);`)
              .join('\n');

            const { fixed } = (fixer as any).fixRunesSyntax(before);

            // Verify all runes were fixed
            for (const r of runes) {
              expect(fixed).toContain(`${r.rune}(`);
              expect(fixed).not.toContain(`${r.rune} <${r.type}>`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count runes errors correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              rune: fc.constantFrom('$state', '$derived', '$effect', '$props'),
              type: fc.constantFrom('boolean', 'number', 'string'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (runes) => {
            // Create content with multiple runes errors
            const content = runes
              .map((r) => `let x = ${r.rune} <${r.type}>(null);`)
              .join('\n');

            const count = (fixer as any).countRunesErrors(content);

            // Count should match the number of runes
            expect(count).toBe(runes.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect runes errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('$state', '$derived', '$effect', '$props'),
          fc.constantFrom('boolean', 'number', 'string'),
          (rune, type) => {
            const content = `let x = ${rune} <${type}>(null);`;

            const hasErrors = fixer.hasRunesErrors(content);
            expect(hasErrors).toBe(true);

            const errors = fixer.getRunesErrors(content);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].type).toBe(rune);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect errors in correct syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('$state', '$derived', '$effect', '$props'),
          (rune) => {
            const content = `let x = ${rune}(null);`;

            const hasErrors = fixer.hasRunesErrors(content);
            expect(hasErrors).toBe(false);

            const count = (fixer as any).countRunesErrors(content);
            expect(count).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract type information correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('boolean', 'number', 'string'),
          (type) => {
            const content = `let x = $state <${type}>(null);`;

            const typeInfo = fixer.extractTypeInfo(content);

            // Should have extracted the type
            expect(typeInfo.size).toBeGreaterThan(0);
            expect(typeInfo.has(`state_${type}`)).toBe(true);
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
      const { fixed, changes } = (fixer as any).fixRunesSyntax('');
      expect(fixed).toBe('');
      expect(changes).toHaveLength(0);
    });

    it('should handle content with no runes', () => {
      const content = 'let x = 5;';
      const { fixed, changes } = (fixer as any).fixRunesSyntax(content);
      expect(fixed).toBe(content);
      expect(changes).toHaveLength(0);
    });

    it('should handle mixed correct and incorrect syntax', () => {
      const content = `
        let a = $state(5);
        let b = $state <number>(10);
        let c = $derived(a + b);
      `;

      const { fixed } = (fixer as any).fixRunesSyntax(content);

      // Should fix the incorrect one
      expect(fixed).toContain('$state(10)');
      expect(fixed).not.toContain('$state <number>');

      // Should preserve the correct ones
      expect(fixed).toContain('$state(5)');
      expect(fixed).toContain('$derived(a + b)');
    });

    it('should handle nested type annotations', () => {
      const content = 'let x = $state <Record<string, Array<number>>>(null);';

      const { fixed } = (fixer as any).fixRunesSyntax(content);

      expect(fixed).toContain('$state(');
      expect(fixed).not.toContain('$state <');
      expect(fixed).toContain('null');
    });

    it('should generate type declarations', () => {
      const content = `
        let a = $state <boolean>(true);
        let b = $derived <number>(5);
      `;

      const { typeDeclarations } = (fixer as any).fixRunesSyntax(content);

      expect(typeDeclarations.length).toBeGreaterThan(0);
      expect(typeDeclarations.some((d: string) => d.includes('boolean'))).toBe(true);
      expect(typeDeclarations.some((d: string) => d.includes('number'))).toBe(true);
    });
  });
});
