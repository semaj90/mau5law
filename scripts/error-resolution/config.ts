/**
 * Configuration for Svelte 5 UI Error Resolution
 */

import type { ErrorResolutionConfig } from './types.js';

export const defaultConfig: ErrorResolutionConfig = {
  // Error patterns for categorization
  transitionPatterns: [
    /transitionfade/i,
    /transitionslide/i,
    /transitionfly/i,
    /transitionscale/i,
    /transitionblur/i,
    /transitiondraw/i,
  ],

  runesPatterns: [
    /\$state\s*<[^>]+>\s*\(/i,
    /\$derived\s*<[^>]+>\s*\(/i,
    /\$effect\s*<[^>]+>\s*\(/i,
    /\$props\s*<[^>]+>\s*\(/i,
  ],

  typeMismatchPatterns: [
    /Type .* is not assignable to type/i,
    /Property .* does not exist on type/i,
    /Argument of type .* is not assignable/i,
    /Object literal may only specify known properties/i,
  ],

  importPatterns: [
    /Cannot find name/i,
    /Module .* has no exported member/i,
    /'.*' is not defined/i,
  ],

  // Priority keywords
  highPriorityKeywords: [
    'transition',
    'transitionfade',
    'transitionslide',
    '$state',
    '$derived',
    '$effect',
    'blocking',
    'critical',
  ],

  mediumPriorityKeywords: [
    'type',
    'assignable',
    'property',
    'import',
    'export',
  ],

  // Validation settings
  runTypeScriptValidation: true,
  runSvelteCheck: true,
  maxErrorIncrease: 0, // Don't allow any new errors

  // Rollback settings
  enableAutoRollback: true,
  preserveGitHistory: true,

  // Performance settings
  maxConcurrentFixes: 1, // Process one at a time for safety
  validationTimeout: 30000, // 30 seconds
};

/**
 * Get configuration with optional overrides
 */
export function getConfig(overrides?: Partial<ErrorResolutionConfig>): ErrorResolutionConfig {
  return {
    ...defaultConfig,
    ...overrides,
  };
}
