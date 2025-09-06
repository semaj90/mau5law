// Phase 1 – CommonProps central definition
// Extend incrementally; keep minimal initially to reduce noise without over-constraining.
export interface CommonProps {
  id?: string;
  class?: string;              // Svelte 5 canonical 'class'
  className?: string;          // Transitional alias; to be folded into class merging utility
  role?: string;
  style?: string | undefined;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-controls'?: string;
  // Accept arbitrary data-* attributes (loose index signature limited to data- & aria- to avoid swallowing real errors)
  [attr: `data-${string}`]: unknown;
  [attr: `aria-${string}`]: unknown;
}

// Utility to merge class + className while preserving optional chaining.
export function mergeClass(base?: string, extra?: string): string | undefined;
;