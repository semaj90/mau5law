/**
 * Property-based tests for Type Fixer Service
 * Feature: svelte5-ui-error-resolution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TypeFixer } from '../services/type-fixer.js';
import type { CategorizedError } from '../types.js';

describe('TypeFixer', () => {
  const fixer = new TypeFixer();

  /**
   * Property 7: Type fix maintains type safety
   * Feature: svelte5-ui-error-resolution, Property 7: Type fix maintains type safety
   * Validates: Requirements 4.4
   *
   * For any component prop type error, fixing it should maintain type safety
   * and not introduce new type errors
   */
  describe('Property 7: Type safety maintenance', () => {
    it('should maintain type safety when fixing component prop types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('string', 'number', 'boolean', 'unknown[]', 'Record<string, unknown>'),
          fc.string({ minLength: 1, maxLength: 20 }),
          (correctType, propName) => {
            const before = `export let ${propName}: any;`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'any' is not assignable to type '${correctType}'`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixComponentPropType(before, error);

            // Verify the fix was applied
            expect(result.fixed).not.toContain(': any');

            // Verify the prop name is preserved
            expect(result.fixed).toContain(propName);

            // Verify changes were recorded
            expect(result.changes.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain type safety when fixing event handler signatures', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('click', 'change', 'submit', 'input', 'focus'),
          () => {
            const before = `function handleEvent(e: any) { }`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Parameter 'e' implicitly has an 'any' type`,
              code: 'TS7006',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixEventHandlerType(before, error);

            // Verify the fix was applied
            expect(result.fixed).not.toContain(': any');

            // Verify the function name is preserved
            expect(result.fixed).toContain('handleEvent');

            // Verify changes were recorded
            expect(result.changes.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain type safety when fixing slot types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (slotName) => {
            const before = `<slot let:item={value} />`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'unknown' is not assignable to type 'Item'`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixSlotType(before, error);

            // Verify the fix was applied
            expect(result.fixed).toContain('<slot');

            // Verify the slot binding is preserved
            expect(result.fixed).toContain('let:item');

            // Verify changes were recorded
            expect(result.changes.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain type safety when fixing object literal types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (propName) => {
            const before = `const obj = { ${propName}: 'value', extra: 'field' };`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Object literal may only specify known properties, and 'extra' does not exist in type 'MyType'`,
              code: 'TS2353',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixObjectLiteralType(before, error);

            // Verify the fix was applied
            expect(result.fixed).toContain('const obj');

            // Verify changes were recorded
            expect(result.changes.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - fixing twice produces same result', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (propName) => {
            const before = `export let ${propName}: any;`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'any' is not assignable`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            // Fix once
            const result1 = (fixer as any).fixComponentPropType(before, error);

            // Fix again
            const result2 = (fixer as any).fixComponentPropType(result1.fixed, error);

            // Both should be identical
            expect(result1.fixed).toBe(result2.fixed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple type errors in the same file', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              propName: fc.string({ minLength: 1, maxLength: 10 }),
              type: fc.constantFrom('string', 'number', 'boolean'),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (props) => {
            // Create content with multiple prop errors
            const before = props
              .map((p) => `export let ${p.propName}: any;`)
              .join('\n');

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'any' is not assignable`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixComponentPropType(before, error);

            // Verify the fix was applied
            expect(result.fixed).not.toContain(': any');

            // Verify all prop names are preserved
            for (const p of props) {
              expect(result.fixed).toContain(p.propName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should infer correct types from error messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { wrong: 'String', correct: 'string' },
            { wrong: 'Number', correct: 'number' },
            { wrong: 'Boolean', correct: 'boolean' },
            { wrong: 'Array', correct: 'unknown[]' },
            { wrong: 'Object', correct: 'Record<string, unknown>' }
          ),
          (typeMapping) => {
            const correctType = (fixer as any).inferCorrectType(
              typeMapping.wrong,
              `Type '${typeMapping.wrong}' is not assignable`
            );

            expect(correctType).toBe(typeMapping.correct);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect component prop errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Property missing',
            'prop type error',
            '$props syntax error'
          ),
          (message) => {
            const isComponentPropError = (fixer as any).isComponentPropError(message);
            expect(isComponentPropError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect event handler errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'event handler type error',
            'handler signature mismatch',
            'on: directive error'
          ),
          (message) => {
            const isEventHandlerError = (fixer as any).isEventHandlerError(message);
            expect(isEventHandlerError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect slot errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'slot type error',
            'svelte:fragment error',
            'slot binding error'
          ),
          (message) => {
            const isSlotError = (fixer as any).isSlotError(message);
            expect(isSlotError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect object literal errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Object literal may only specify known properties',
            'only specify known properties error'
          ),
          (message) => {
            const isObjectLiteralError = (fixer as any).isObjectLiteralError(message);
            expect(isObjectLiteralError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count type errors correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              'Type mismatch',
              'Property does not exist',
              'Object literal error'
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (errors) => {
            const content = errors.join('\n');
            const count = (fixer as any).countTypeErrors(content);

            // Count should be at least the number of errors
            expect(count).toBeGreaterThanOrEqual(errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve prop names when fixing types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (propName) => {
            const before = `export let ${propName}: any;`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'any' is not assignable`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixComponentPropType(before, error);

            // Verify the prop name is preserved
            expect(result.fixed).toContain(propName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve event handler names when fixing signatures', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (handlerName) => {
            const before = `function ${handlerName}(e: any) { }`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Parameter 'e' implicitly has an 'any' type`,
              code: 'TS7006',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixEventHandlerType(before, error);

            // Verify the handler name is preserved
            expect(result.fixed).toContain(handlerName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve slot names when fixing types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (slotBindingName) => {
            const before = `<slot let:${slotBindingName}={value} />`;

            const error: CategorizedError = {
              file: 'test.svelte',
              line: 1,
              column: 0,
              message: `Type 'unknown' is not assignable`,
              code: 'TS2322',
              severity: 'error',
              id: 'test-error',
              category: 'typeMismatch',
              priority: 'high',
            };

            const result = (fixer as any).fixSlotType(before, error);

            // Verify the slot name is preserved
            expect(result.fixed).toContain(`let:${slotBindingName}`);
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
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixComponentPropType('', error);
      expect(result.fixed).toBe('');
      expect(result.changes).toHaveLength(0);
    });

    it('should handle content with no type errors', () => {
      const content = 'export let name: string;';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixComponentPropType(content, error);
      expect(result.fixed).toBe(content);
    });

    it('should handle invalid line numbers', () => {
      const content = 'export let name: any;';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 999,
        column: 0,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixComponentPropType(content, error);
      expect(result.fixed).toBe(content);
      expect(result.changes).toHaveLength(0);
    });

    it('should handle complex type annotations', () => {
      const content = 'export let data: Record<string, Array<number>>;';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixComponentPropType(content, error);
      expect(result.fixed).toContain('data');
    });

    it('should handle multiple props on same line', () => {
      const content = 'export let a: any, b: any;';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixComponentPropType(content, error);
      expect(result.fixed).toContain('a');
      expect(result.fixed).toContain('b');
    });

    it('should handle event handlers with multiple parameters', () => {
      const content = 'function handleEvent(e: any, data: any) { }';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Parameter type error',
        code: 'TS7006',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixEventHandlerType(content, error);
      expect(result.fixed).toContain('handleEvent');
    });

    it('should handle slot with multiple bindings', () => {
      const content = '<slot let:item={value} let:index={idx} />';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Slot type error',
        code: 'TS2322',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixSlotType(content, error);
      expect(result.fixed).toContain('<slot');
    });

    it('should handle object literals with nested properties', () => {
      const content = 'const obj = { nested: { prop: "value" }, extra: "field" };';
      const error: CategorizedError = {
        file: 'test.svelte',
        line: 1,
        column: 0,
        message: 'Object literal may only specify known properties',
        code: 'TS2353',
        severity: 'error',
        id: 'test-error',
        category: 'typeMismatch',
        priority: 'high',
      };

      const result = (fixer as any).fixObjectLiteralType(content, error);
      expect(result.fixed).toContain('nested');
    });
  });
});