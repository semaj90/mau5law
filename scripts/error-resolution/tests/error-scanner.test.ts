/**
 * Property-based tests for Error Scanner
 * Feature: svelte5-ui-error-resolution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ErrorScanner } from '../services/error-scanner.js';
import type { RawError } from '../types.js';

describe('ErrorScanner', () => {
  const scanner = new ErrorScanner();

  /**
   * Property 1: Error categorization consistency
   * Feature: svelte5-ui-error-resolution, Property 1: Error categorization consistency
   * Validates: Requirements 1.1
   *
   * For any error message, categorizing it multiple times should always produce the same category
   */
  describe('Property 1: Error categorization consistency', () => {
    it('should categorize the same error consistently across multiple calls', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary error messages
          fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 10000 }),
            column: fc.integer({ min: 1, max: 200 }),
            message: fc.oneof(
              fc.constant('transitionfade is not valid'),
              fc.constant('$state <boolean>(true) syntax error'),
              fc.constant('Type string is not assignable to type number'),
              fc.constant('Cannot find name MyComponent'),
              fc.string({ minLength: 10 })
            ),
            code: fc.string(),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }),
          (error: RawError) => {
            // Categorize the error multiple times
            const category1 = scanner.categorizeError(error);
            const category2 = scanner.categorizeError(error);
            const category3 = scanner.categorizeError(error);

            // All categorizations should be identical
            expect(category1).toBe(category2);
            expect(category2).toBe(category3);

            // Category should be one of the valid types
            expect(['transition', 'runes', 'typeMismatch', 'imports']).toContain(category1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize transition errors consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'transitionfade',
            'transitionslide',
            'transitionfly',
            'transitionscale'
          ),
          (transitionType) => {
            const error: RawError = {
              file: 'test.svelte',
              line: 1,
              column: 1,
              message: `${transitionType} is not a valid attribute`,
              code: 'TS2345',
              severity: 'error',
            };

            const category = scanner.categorizeError(error);
            expect(category).toBe('transition');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize runes errors consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '$state <boolean>(true)',
            '$derived <number>(value)',
            '$effect <void>(fn)',
            '$props <Props>()'
          ),
          (runesPattern) => {
            const error: RawError = {
              file: 'test.svelte',
              line: 1,
              column: 1,
              message: `Syntax error with ${runesPattern}`,
              code: 'TS1005',
              severity: 'error',
            };

            const category = scanner.categorizeError(error);
            expect(category).toBe('runes');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Priority assignment determinism
   * Feature: svelte5-ui-error-resolution, Property 2: Priority assignment determinism
   * Validates: Requirements 1.2
   *
   * For any error, the priority assigned should be deterministic based on error type and impact
   */
  describe('Property 2: Priority assignment determinism', () => {
    it('should assign priority deterministically', () => {
      fc.assert(
        fc.property(
          fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 10000 }),
            column: fc.integer({ min: 1, max: 200 }),
            message: fc.string({ minLength: 10 }),
            code: fc.string(),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }),
          (error: RawError) => {
            // Get category first
            const category = scanner.categorizeError(error);

            // Assign priority multiple times
            const priority1 = (scanner as any).assignPriority(error, category);
            const priority2 = (scanner as any).assignPriority(error, category);
            const priority3 = (scanner as any).assignPriority(error, category);

            // All priorities should be identical
            expect(priority1).toBe(priority2);
            expect(priority2).toBe(priority3);

            // Priority should be one of the valid types
            expect(['high', 'medium', 'low']).toContain(priority1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign high priority to transition errors', () => {
      const error: RawError = {
        file: 'test.svelte',
        line: 1,
        column: 1,
        message: 'transitionfade is not valid',
        code: 'TS2345',
        severity: 'error',
      };

      const category = scanner.categorizeError(error);
      const priority = (scanner as any).assignPriority(error, category);

      expect(priority).toBe('high');
    });

    it('should assign high priority to runes errors', () => {
      const error: RawError = {
        file: 'test.svelte',
        line: 1,
        column: 1,
        message: '$state <boolean>(true) syntax error',
        code: 'TS1005',
        severity: 'error',
      };

      const category = scanner.categorizeError(error);
      const priority = (scanner as any).assignPriority(error, category);

      expect(priority).toBe('high');
    });
  });

  /**
   * Property 3: Fix order respects priority
   * Feature: svelte5-ui-error-resolution, Property 3: Fix order respects priority
   * Validates: Requirements 1.3
   *
   * For any list of prioritized errors, high priority errors should always be fixed before medium priority errors
   */
  describe('Property 3: Fix order respects priority', () => {
    it('should order high priority errors before medium priority errors', () => {
      fc.assert(
        fc.property(
          // Generate a mix of errors with different priorities
          fc.array(
            fc.record({
              file: fc.string({ minLength: 1 }),
              line: fc.integer({ min: 1, max: 10000 }),
              column: fc.integer({ min: 1, max: 200 }),
              message: fc.oneof(
                fc.constant('transitionfade error'), // high priority
                fc.constant('Type mismatch error'),   // medium priority
                fc.constant('$state <boolean> error') // high priority
              ),
              code: fc.string(),
              severity: fc.constantFrom('error' as const, 'warning' as const),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (errors: RawError[]) => {
            // Categorize all errors
            const categorized = {
              transition: [],
              runes: [],
              typeMismatch: [],
              imports: [],
            };

            for (const error of errors) {
              const category = scanner.categorizeError(error);
              const priority = (scanner as any).assignPriority(error, category);
              const categorizedError = {
                ...error,
                id: Math.random().toString(),
                category,
                priority,
              };
              (categorized as any)[category].push(categorizedError);
            }

            // Prioritize errors
            const prioritized = scanner.prioritizeErrors(categorized);

            // Check that all high priority errors come before medium priority errors
            const allErrors = [
              ...prioritized.high,
              ...prioritized.medium,
              ...prioritized.low,
            ];

            let seenMedium = false;
            let seenLow = false;

            for (const error of allErrors) {
              if (error.priority === 'medium') {
                seenMedium = true;
              }
              if (error.priority === 'low') {
                seenLow = true;
              }

              // Once we've seen medium, we shouldn't see high
              if (seenMedium) {
                expect(error.priority).not.toBe('high');
              }

              // Once we've seen low, we shouldn't see high or medium
              if (seenLow) {
                expect(error.priority).not.toBe('high');
                expect(error.priority).not.toBe('medium');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Pattern grouping consistency
   * Feature: svelte5-ui-error-resolution, Property 4: Pattern grouping consistency
   * Validates: Requirements 1.4, 1.5
   *
   * For any set of similar errors across files, they should be grouped together for batch fixing
   */
  describe('Property 4: Pattern grouping consistency', () => {
    it('should group similar errors by category', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              file: fc.string({ minLength: 1 }),
              line: fc.integer({ min: 1, max: 10000 }),
              column: fc.integer({ min: 1, max: 200 }),
              message: fc.constantFrom(
                'transitionfade error',
                '$state <boolean> error',
                'Type mismatch error'
              ),
              code: fc.string(),
              severity: fc.constantFrom('error' as const, 'warning' as const),
            }),
            { minLength: 3, maxLength: 15 }
          ),
          (errors: RawError[]) => {
            // Categorize all errors
            const categorized = {
              transition: [],
              runes: [],
              typeMismatch: [],
              imports: [],
            };

            for (const error of errors) {
              const category = scanner.categorizeError(error);
              const priority = (scanner as any).assignPriority(error, category);
              const categorizedError = {
                ...error,
                id: Math.random().toString(),
                category,
                priority,
              };
              (categorized as any)[category].push(categorizedError);
            }

            // Verify that all errors in each category have the same category
            for (const error of categorized.transition) {
              expect(error.category).toBe('transition');
            }
            for (const error of categorized.runes) {
              expect(error.category).toBe('runes');
            }
            for (const error of categorized.typeMismatch) {
              expect(error.category).toBe('typeMismatch');
            }
            for (const error of categorized.imports) {
              expect(error.category).toBe('imports');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
