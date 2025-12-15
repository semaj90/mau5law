/**
 * Property-based tests for Transition Fixer
 * Feature: svelte5-ui-error-resolution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TransitionFixer } from '../services/transition-fixer.js';

describe('TransitionFixer', () => {
  const fixer = new TransitionFixer();

  /**
   * Property 5: Transition directive transformation preserves parameters
   * Feature: svelte5-ui-error-resolution, Property 5: Transition directive transformation preserves parameters
   * Validates: Requirements 2.4, 2.5
   *
   * For any transition directive with parameters, transforming it should preserve all parameter values exactly
   */
  describe('Property 5: Transition parameter preservation', () => {
    it('should preserve parameters when fixing transition directives', () => {
      fc.assert(
        fc.property(
          // Generate transition types
          fc.constantFrom('fade', 'slide', 'fly', 'scale', 'blur', 'draw'),
          // Generate parameters
          fc.record({
            duration: fc.integer({ min: 100, max: 2000 }),
            delay: fc.integer({ min: 0, max: 1000 }),
            easing: fc.constantFrom('linear', 'ease-in', 'ease-out', 'ease-in-out'),
          }),
          (transitionType, params) => {
            // Create content with incorrect transition syntax
            const before = `<div transition${transitionType}={{ duration: ${params.duration}, delay: ${params.delay}, easing: '${params.easing}' }}>Content</div>`;

            // Fix the transition
            const { fixed } = (fixer as any).fixTransitionDirectives(before);

            // Verify the fix was applied
            expect(fixed).toContain(`transition:${transitionType}`);
            expect(fixed).not.toContain(`transition${transitionType}`);

            // Verify all parameters are preserved
            expect(fixed).toContain(`duration: ${params.duration}`);
            expect(fixed).toContain(`delay: ${params.delay}`);
            expect(fixed).toContain(`easing: '${params.easing}'`);

            // Verify the structure is maintained
            expect(fixed).toContain('{{');
            expect(fixed).toContain('}}');
            expect(fixed).toContain('>Content</div>');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve complex parameter objects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly'),
          fc.record({
            x: fc.integer({ min: -1000, max: 1000 }),
            y: fc.integer({ min: -1000, max: 1000 }),
            duration: fc.integer({ min: 100, max: 2000 }),
          }),
          (transitionType, params) => {
            const before = `<div transition${transitionType}={{ x: ${params.x}, y: ${params.y}, duration: ${params.duration} }}>Test</div>`;

            const { fixed } = (fixer as any).fixTransitionDirectives(before);

            // Verify parameters are preserved
            expect(fixed).toContain(`x: ${params.x}`);
            expect(fixed).toContain(`y: ${params.y}`);
            expect(fixed).toContain(`duration: ${params.duration}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve parameters with no spaces', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly'),
          fc.integer({ min: 100, max: 2000 }),
          (transitionType, duration) => {
            const before = `<div transition${transitionType}={{duration:${duration}}}>Test</div>`;

            const { fixed } = (fixer as any).fixTransitionDirectives(before);

            // Verify parameter is preserved (even without spaces)
            expect(fixed).toContain(`duration:${duration}`);
            expect(fixed).toContain(`transition:${transitionType}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle transitions without parameters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly', 'scale', 'blur', 'draw'),
          (transitionType) => {
            const before = `<div transition${transitionType}>Content</div>`;

            const { fixed } = (fixer as any).fixTransitionDirectives(before);

            // Verify the fix was applied
            expect(fixed).toContain(`transition:${transitionType}`);
            expect(fixed).not.toContain(`transition${transitionType}`);
            expect(fixed).toContain('>Content</div>');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve multiple transitions in the same file', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('fade', 'slide', 'fly'),
              duration: fc.integer({ min: 100, max: 2000 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (transitions) => {
            // Create content with multiple transitions
            const before = transitions
              .map(
                (t, i) =>
                  `<div transition${t.type}={{ duration: ${t.duration} }}>Content ${i}</div>`
              )
              .join('\n');

            const { fixed } = (fixer as any).fixTransitionDirectives(before);

            // Verify all transitions were fixed
            for (const t of transitions) {
              expect(fixed).toContain(`transition:${t.type}`);
              expect(fixed).toContain(`duration: ${t.duration}`);
            }

            // Verify no old syntax remains
            for (const t of transitions) {
              expect(fixed).not.toContain(`transition${t.type}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count transition errors correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('fade', 'slide', 'fly', 'scale'),
            { minLength: 1, maxLength: 10 }
          ),
          (transitionTypes) => {
            // Create content with multiple transition errors
            const content = transitionTypes
              .map((type) => `<div transition${type}>Test</div>`)
              .join('\n');

            const count = (fixer as any).countTransitionErrors(content);

            // Count should match the number of transitions
            expect(count).toBe(transitionTypes.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect transition errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly', 'scale', 'blur', 'draw'),
          (transitionType) => {
            const content = `<div transition${transitionType}>Test</div>`;

            const hasErrors = fixer.hasTransitionErrors(content);
            expect(hasErrors).toBe(true);

            const errors = fixer.getTransitionErrors(content);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].type).toBe(transitionType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect errors in correct syntax', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly', 'scale', 'blur', 'draw'),
          (transitionType) => {
            const content = `<div transition:${transitionType}>Test</div>`;

            const hasErrors = fixer.hasTransitionErrors(content);
            expect(hasErrors).toBe(false);

            const count = (fixer as any).countTransitionErrors(content);
            expect(count).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - fixing twice produces same result', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fade', 'slide', 'fly'),
          fc.integer({ min: 100, max: 2000 }),
          (transitionType, duration) => {
            const before = `<div transition${transitionType}={{ duration: ${duration} }}>Test</div>`;

            // Fix once
            const { fixed: fixed1 } = (fixer as any).fixTransitionDirectives(before);

            // Fix again
            const { fixed: fixed2 } = (fixer as any).fixTransitionDirectives(fixed1);

            // Both should be identical
            expect(fixed1).toBe(fixed2);

            // Should have no errors after first fix
            const hasErrors = fixer.hasTransitionErrors(fixed1);
            expect(hasErrors).toBe(false);
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
      const { fixed, changes } = (fixer as any).fixTransitionDirectives('');
      expect(fixed).toBe('');
      expect(changes).toHaveLength(0);
    });

    it('should handle content with no transitions', () => {
      const content = '<div>No transitions here</div>';
      const { fixed, changes } = (fixer as any).fixTransitionDirectives(content);
      expect(fixed).toBe(content);
      expect(changes).toHaveLength(0);
    });

    it('should handle mixed correct and incorrect syntax', () => {
      const content = `
        <div transition:fade>Correct</div>
        <div transitionslide>Incorrect</div>
        <div transition:fly>Correct</div>
      `;

      const { fixed } = (fixer as any).fixTransitionDirectives(content);

      // Should fix the incorrect one
      expect(fixed).toContain('transition:slide');
      expect(fixed).not.toContain('transitionslide');

      // Should preserve the correct ones
      expect(fixed).toContain('transition:fade');
      expect(fixed).toContain('transition:fly');
    });
  });
});
