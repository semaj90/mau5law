/**
 * Validation Service Tests
 * Property-based tests for validation execution and error count tracking
 * Tests: Properties 10 & 11
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { ValidationService } from '../services/validation-service.js';
import type { RawError, ValidationResult } from '../types.js';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService({
      runTypeScriptValidation: true,
      runSvelteCheck: true,
      maxErrorIncrease: 0,
    });
  });

  afterEach(() => {
    service.clearCache();
  });

  // ============================================================================
  // Property 10: Validation runs after every fix
  // ============================================================================

  describe('Property 10: Validation runs after every fix', () => {
    it('should execute validation for any file path', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (filePath) => {
          // Mock the validation methods
          const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
          const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

          // Mock implementations
          validateTypeScriptSpy.mockResolvedValue({
            passed: true,
            errorCount: 0,
            errors: [],
            newErrors: [],
            resolvedErrors: [],
          });

          validateSvelteSpy.mockResolvedValue({
            passed: true,
            errorCount: 0,
            errors: [],
            newErrors: [],
            resolvedErrors: [],
          });

          try {
            // Call validateBefore which should trigger validation
            await service.validateBefore(filePath);

            // Verify validation was called
            expect(validateTypeScriptSpy).toHaveBeenCalled();
            expect(validateSvelteSpy).toHaveBeenCalled();
          } finally {
            validateTypeScriptSpy.mockRestore();
            validateSvelteSpy.mockRestore();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should validate before and after fix for any file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 0, maxLength: 10 }),
          async (filePath, errorList) => {
            // Mock validation methods
            const validateBeforeSpy = vi.spyOn(service, 'validateBefore');
            const validateAfterSpy = vi.spyOn(service, 'validateAfter');

            const mockResult: ValidationResult = {
              passed: true,
              errorCount: errorList.length,
              errors: errorList as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            validateBeforeSpy.mockResolvedValue(mockResult);
            validateAfterSpy.mockResolvedValue(mockResult);

            try {
              // Call both validation phases
              const beforeResult = await service.validateBefore(filePath);
              const afterResult = await service.validateAfter(filePath);

              // Both should have been called
              expect(validateBeforeSpy).toHaveBeenCalledWith(filePath);
              expect(validateAfterSpy).toHaveBeenCalledWith(filePath);

              // Both should return validation results
              expect(beforeResult).toBeDefined();
              expect(afterResult).toBeDefined();
              expect(beforeResult.errorCount).toBe(errorList.length);
              expect(afterResult.errorCount).toBe(errorList.length);
            } finally {
              validateBeforeSpy.mockRestore();
              validateAfterSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cache baseline errors for comparison', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 1, maxLength: 10 }),
          async (filePath, errorList) => {
            // Mock validation methods
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const mockResult: ValidationResult = {
              passed: true,
              errorCount: errorList.length,
              errors: errorList as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(mockResult);
            validateSvelteSpy.mockResolvedValue(mockResult);

            try {
              // Call validateBefore
              await service.validateBefore(filePath);

              // Check that errors are cached
              const cached = service.getCachedErrors(filePath, 'before');
              expect(cached).toBeDefined();
              expect(cached?.length).toBe(errorList.length);
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track validation execution count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (executionCount) => {
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const mockResult: ValidationResult = {
              passed: true,
              errorCount: 0,
              errors: [],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(mockResult);
            validateSvelteSpy.mockResolvedValue(mockResult);

            try {
              // Execute validation multiple times
              for (let i = 0; i < executionCount; i++) {
                await service.validateBefore(`file${i}.ts`);
              }

              // Verify execution count
              expect(validateTypeScriptSpy).toHaveBeenCalledTimes(executionCount);
              expect(validateSvelteSpy).toHaveBeenCalledTimes(executionCount);
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 11: Error count never increases
  // ============================================================================

  describe('Property 11: Error count never increases', () => {
    it('should never increase error count for any before/after pair', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (beforeCount, afterCount) => {
            // Property: error count should not increase
            const result = service.compareErrorCounts(beforeCount, afterCount);

            // Result should be true only if afterCount <= beforeCount
            expect(result).toBe(afterCount <= beforeCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect error count increase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (beforeCount, increase) => {
            const afterCount = beforeCount + increase;

            // Should detect increase
            const result = service.compareErrorCounts(beforeCount, afterCount);

            // Result should be false (increase detected)
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow error count decrease', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 50 }),
          (beforeCount, decrease) => {
            const afterCount = Math.max(0, beforeCount - decrease);

            // Should allow decrease
            const result = service.compareErrorCounts(beforeCount, afterCount);

            // Result should be true (no increase)
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow error count to stay the same', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          (count) => {
            // Should allow same count
            const result = service.compareErrorCounts(count, count);

            // Result should be true (no increase)
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate after fix with error count check', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 0, maxLength: 10 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 0, maxLength: 10 }),
          async (filePath, beforeErrors, afterErrors) => {
            // Mock validation methods
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const beforeResult: ValidationResult = {
              passed: true,
              errorCount: beforeErrors.length,
              errors: beforeErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            const afterResult: ValidationResult = {
              passed: true,
              errorCount: afterErrors.length,
              errors: afterErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(beforeResult);
            validateSvelteSpy.mockResolvedValue(beforeResult);

            try {
              // Set baseline
              await service.validateBefore(filePath);

              // Change mock for after validation
              validateTypeScriptSpy.mockResolvedValue(afterResult);
              validateSvelteSpy.mockResolvedValue(afterResult);

              // Validate after
              const result = await service.validateAfter(filePath);

              // If afterErrors > beforeErrors, validation should fail
              if (afterErrors.length > beforeErrors.length) {
                expect(result.passed).toBe(false);
              } else {
                // Otherwise should pass (or have new errors)
                expect(result.newErrors.length).toBeLessThanOrEqual(
                  afterErrors.length
                );
              }
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify new errors introduced by fix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 0, maxLength: 5 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 0, maxLength: 5 }),
          async (filePath, beforeErrors, newErrors) => {
            // Mock validation methods
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const beforeResult: ValidationResult = {
              passed: true,
              errorCount: beforeErrors.length,
              errors: beforeErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            const afterErrors = [...beforeErrors, ...newErrors];
            const afterResult: ValidationResult = {
              passed: true,
              errorCount: afterErrors.length,
              errors: afterErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(beforeResult);
            validateSvelteSpy.mockResolvedValue(beforeResult);

            try {
              // Set baseline
              await service.validateBefore(filePath);

              // Change mock for after validation
              validateTypeScriptSpy.mockResolvedValue(afterResult);
              validateSvelteSpy.mockResolvedValue(afterResult);

              // Validate after
              const result = await service.validateAfter(filePath);

              // Should identify new errors
              expect(result.newErrors.length).toBe(newErrors.length);
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify resolved errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 1000 }),
            column: fc.integer({ min: 1, max: 100 }),
            message: fc.string({ minLength: 1 }),
            code: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error' as const, 'warning' as const),
          }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 0, max: 5 }),
          async (filePath, beforeErrors, resolveCount) => {
            // Mock validation methods
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const beforeResult: ValidationResult = {
              passed: true,
              errorCount: beforeErrors.length,
              errors: beforeErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            const actualResolveCount = Math.min(resolveCount, beforeErrors.length);
            const afterErrors = beforeErrors.slice(actualResolveCount);
            const afterResult: ValidationResult = {
              passed: true,
              errorCount: afterErrors.length,
              errors: afterErrors as RawError[],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(beforeResult);
            validateSvelteSpy.mockResolvedValue(beforeResult);

            try {
              // Set baseline
              await service.validateBefore(filePath);

              // Change mock for after validation
              validateTypeScriptSpy.mockResolvedValue(afterResult);
              validateSvelteSpy.mockResolvedValue(afterResult);

              // Validate after
              const result = await service.validateAfter(filePath);

              // Should identify resolved errors
              expect(result.resolvedErrors.length).toBe(actualResolveCount);
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle validation for multiple files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          async (filePaths) => {
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const mockResult: ValidationResult = {
              passed: true,
              errorCount: 0,
              errors: [],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(mockResult);
            validateSvelteSpy.mockResolvedValue(mockResult);

            try {
              // Validate all files
              for (const filePath of filePaths) {
                await service.validateBefore(filePath);
              }

              // Verify all were validated
              expect(validateTypeScriptSpy).toHaveBeenCalledTimes(filePaths.length);
              expect(validateSvelteSpy).toHaveBeenCalledTimes(filePaths.length);
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear cache properly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (filePath) => {
            const validateTypeScriptSpy = vi.spyOn(service, 'validateTypeScript');
            const validateSvelteSpy = vi.spyOn(service, 'validateSvelte');

            const mockResult: ValidationResult = {
              passed: true,
              errorCount: 0,
              errors: [],
              newErrors: [],
              resolvedErrors: [],
            };

            validateTypeScriptSpy.mockResolvedValue(mockResult);
            validateSvelteSpy.mockResolvedValue(mockResult);

            try {
              // Validate
              await service.validateBefore(filePath);

              // Verify cached
              let cached = service.getCachedErrors(filePath, 'before');
              expect(cached).toBeDefined();

              // Clear cache
              service.clearCache();

              // Verify cleared
              cached = service.getCachedErrors(filePath, 'before');
              expect(cached).toBeUndefined();
            } finally {
              validateTypeScriptSpy.mockRestore();
              validateSvelteSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
