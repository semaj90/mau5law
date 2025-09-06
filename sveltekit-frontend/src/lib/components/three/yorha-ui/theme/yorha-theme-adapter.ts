/**
 * YoRHa Theme Adapter
 * Bridges 3D YoRHa component color usage with UnoCSS tokens, NES.css fallback palette,
 * and Bits UI v2 semantic roles. Allows future theming without touching core geometry logic.
 */

import { YORHA_COLORS } from '../YoRHaUI3D';

// NES.css retro fallback palette (selected core colors)
export const NES_PALETTE = {
  blue: '#209cee',
  green: '#92cc41',
  yellow: '#f7d51d',
  red: '#e76e55',
  orange: '#f59e0b',
  grey: '#7c7c7c',
  black: '#000000',
  white: '#ffffff'
} as const;

// Bits UI v2 style semantic roles we want to map (simplified)
// These reference UnoCSS theme token names (see uno.config.ts)
const TOKEN_ROLE_MAP: Record<string, { bg: string; border: string; text: string; accent?: string }> = {
  primary: { bg: 'yorha-accent', border: 'yorha-border', text: 'yorha-text-primary' },
  secondary: { bg: 'yorha-bg-secondary', border: 'yorha-border', text: 'yorha-text-secondary' },
  accent: { bg: 'yorha-accent', border: 'yorha-border', text: 'yorha-text-primary' },
  ghost: { bg: 'yorha-bg-primary', border: 'yorha-border', text: 'yorha-text-primary' },
  danger: { bg: 'yorha-error', border: 'yorha-border', text: 'yorha-text-primary' },
  success: { bg: 'yorha-success', border: 'yorha-border', text: 'yorha-text-primary' },
  warning: { bg: 'yorha-warning', border: 'yorha-border', text: 'yorha-text-primary' },
  info: { bg: 'ai-status-processing', border: 'yorha-border', text: 'yorha-text-primary' },
  terminal: { bg: 'gothic-bg-secondary', border: 'gothic-border-primary', text: 'gothic-text-primary' },
  alert: { bg: 'yorha-error', border: 'yorha-border', text: 'yorha-text-primary' },
  confirm: { bg: 'yorha-success', border: 'yorha-border', text: 'yorha-text-primary' }
};

// Cache of resolved tokens to numeric hex for Three.js
const resolvedCache = new Map<string, number>();

// Simple hex validator
function isHexColor(str: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(str);
}

// Convert hex string (with or without #) to number for Three.js
function hexToNumber(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(clean, 16);
}

// Attempt to read CSS variable from document (runtime fallback).
function readCssVar(name: string): string | undefined {
  if (typeof window === 'undefined' || !window.document) return undefined;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || undefined;
}

// Primary resolution pipeline:
// 1. Direct numeric value already provided
// 2. Hex string literal
// 3. CSS var --color-name
// 4. Uno token -> try css var --uno-color-name (common pattern)
// 5. NES palette fallback
// 6. YORHA_COLORS fallback
export function resolveColorToken(tokenOrHex: string | number | undefined, fallback: number = YORHA_COLORS.primary.beige): number {
  if (tokenOrHex === undefined) return fallback;
  if (typeof tokenOrHex === 'number') return tokenOrHex;

  if (resolvedCache.has(tokenOrHex)) return resolvedCache.get(tokenOrHex)!;

  // Hex literal
  if (isHexColor(tokenOrHex)) {
    const v = hexToNumber(tokenOrHex);
    resolvedCache.set(tokenOrHex, v);
    return v;
  }

  // CSS var notation e.g. var(--yorha-accent)
  const varMatch = tokenOrHex.match(/var\((--[a-zA-Z0-9-_]+)\)/);
  if (varMatch) {
    const cssVal = readCssVar(varMatch[1]);
    if (cssVal && isHexColor(cssVal)) {
      const v = hexToNumber(cssVal);
      resolvedCache.set(tokenOrHex, v);
      return v;
    }
  }

  // Uno token -> attempt CSS var naming: --color-NAME or --uno-NAME (project-specific)
  const candidateVars = [
    `--${tokenOrHex}`,
    `--color-${tokenOrHex}`,
    `--uno-${tokenOrHex}`
  ];
  for (const cv of candidateVars) {
    const cssVal = readCssVar(cv);
    if (cssVal && isHexColor(cssVal)) {
      const v = hexToNumber(cssVal);
      resolvedCache.set(tokenOrHex, v);
      return v;
    }
  }

  // NES palette fallback
  if ((NES_PALETTE as any)[tokenOrHex]) {
    const v = hexToNumber((NES_PALETTE as any)[tokenOrHex]);
    resolvedCache.set(tokenOrHex, v);
    return v;
  }

  // Final fallback
  return fallback;
}

export interface VariantResolvedStyle {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hover?: { backgroundColor?: number; textColor?: number; opacity?: number };
  glow?: { enabled: boolean; color?: number; intensity?: number };
  opacity?: number;
  borderWidth?: number;
}

export function resolveVariantStyle(variant: string, options?: { enableGlow?: boolean }): VariantResolvedStyle {
  const role = TOKEN_ROLE_MAP[variant] || TOKEN_ROLE_MAP['primary'];

  const backgroundColor = resolveColorToken(role.bg, YORHA_COLORS.primary.beige);
  const borderColor = resolveColorToken(role.border, YORHA_COLORS.primary.black);
  const textColor = resolveColorToken(role.text, YORHA_COLORS.primary.black);

  const glow = options?.enableGlow ? {
    enabled: true,
    color: backgroundColor,
    intensity: 0.35
  } : undefined;

  // Derive simple hover (lighten by adding small value) – naive approach
  const hoverColor = Math.min(backgroundColor + 0x111111, 0xffffff);

  return {
    backgroundColor,
    borderColor,
    textColor,
    glow,
    hover: { backgroundColor: hoverColor }
  };
}

// Central exported theme adapter
export const yoRHaThemeAdapter = {
  resolveVariantStyle,
  resolveColorToken,
  NES_PALETTE,
  TOKEN_ROLE_MAP
};

export default yoRHaThemeAdapter;
