
/**
 * Layout Components - Golden Ratio Grid System
 *
 * Mathematical design system based on the golden ratio (φ ≈ 1.618)
 * Provides harmonious proportions for legal AI applications
 *
 * @see https://en.wikipedia.org/wiki/Golden_ratio
 * @see Context7 best practices for CSS Grid layouts
 */

export { default as GoldenRatioGrid } from "./GoldenRatioGrid.svelte";

/**
 * Golden Ratio Constants
 * Use these in your components for consistent mathematical proportions
 */
export const GOLDEN_RATIO = 1.618033988749;
export const INVERSE_GOLDEN_RATIO = 0.618033988749;
export const GOLDEN_RATIO_SQUARED = 2.618033988749;
export const GOLDEN_RATIO_CUBED = 4.236067977499;
;
/**
 * Utility functions for golden ratio calculations
 */
export const goldenRatioUtils = {
  /**
   * Calculate golden ratio proportion of a value
   * @param value - Base value to apply golden ratio to
   * @returns Value multiplied by φ
   */
  phi: (value: number): number => value * GOLDEN_RATIO,

  /**
   * Calculate inverse golden ratio proportion of a value
   * @param value - Base value to apply inverse golden ratio to
   * @returns Value multiplied by 1/φ
   */
  phiInverse: (value: number): number => value * INVERSE_GOLDEN_RATIO,

  /**
   * Split a value into golden ratio proportions
   * @param total - Total value to split
   * @returns Object with major and minor proportions
   */
  split: (total: number) => ({
    major: total * INVERSE_GOLDEN_RATIO,
    minor: total * (1 - INVERSE_GOLDEN_RATIO),
  }),

  /**
   * Calculate optimal font size based on golden ratio typography scale
   * @param baseSize - Base font size in rem
   * @param scale - Scale factor (positive for larger, negative for smaller)
   * @returns Calculated font size
   */
  fontSize: (baseSize: number = 1, scale: number = 0): number => {
    return baseSize * Math.pow(GOLDEN_RATIO, scale);
  },

  /**
   * Calculate spacing value based on golden ratio scale
   * @param baseSpacing - Base spacing in rem
   * @param scale - Scale factor
   * @returns Calculated spacing
   */
  spacing: (baseSpacing: number = 1, scale: number = 0): number => {
    return baseSpacing * Math.pow(GOLDEN_RATIO, scale);
  },
};

/**
 * Predefined golden ratio breakpoints for responsive design
 */
export const goldenBreakpoints = {
  mobile: Math.round(480 * GOLDEN_RATIO), // ~777px
  tablet: Math.round(768 * GOLDEN_RATIO), // ~1242px
  desktop: Math.round(1024 * GOLDEN_RATIO), // ~1657px
  wide: Math.round(1440 * GOLDEN_RATIO), // ~2330px
};

/**
 * CSS custom property names for golden ratio values
 */
export const goldenRatioCSSVars = {
  ratio: "--golden-ratio",
  inverse: "--inverse-golden-ratio",
  squared: "--golden-ratio-squared",
  cubed: "--golden-ratio-cubed",

  // Spacing scale
  spaceXs: "--space-phi-xs",
  spaceSm: "--space-phi-sm",
  spaceMd: "--space-phi-md",
  spaceLg: "--space-phi-lg",
  spaceXl: "--space-phi-xl",
  space2xl: "--space-phi-2xl",
  space3xl: "--space-phi-3xl",

  // Typography scale
  textXs: "--text-phi-xs",
  textSm: "--text-phi-sm",
  textBase: "--text-phi-base",
  textLg: "--text-phi-lg",
  textXl: "--text-phi-xl",
  text2xl: "--text-phi-2xl",
  text3xl: "--text-phi-3xl",
  text4xl: "--text-phi-4xl",

  // Layout proportions
  sidebarWidth: "--layout-phi-sidebar",
  mainWidth: "--layout-phi-main",
  contentWidth: "--layout-phi-content-width",

  // Aspect ratios
  aspectLandscape: "--aspect-phi-landscape",
  aspectPortrait: "--aspect-phi-portrait",
  aspectSquare: "--aspect-phi-square",
} as const;
