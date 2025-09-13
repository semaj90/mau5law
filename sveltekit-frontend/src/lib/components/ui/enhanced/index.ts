
// Enhanced Svelte 5 + UnoCSS Component Library
// Optimized for legal AI application with NieR theming

import crypto from "crypto";

export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Input } from "./Input.svelte";
export { buttonVariants, type ButtonVariants } from "./button-variants";

// Re-export commonly used types
export type { HTMLButtonAttributes } from "svelte/elements";
export type { HTMLInputAttributes } from "svelte/elements";
export type { HTMLAttributes } from "svelte/elements";

// Component utility functions
export const createComponentId = () => crypto.randomUUID();
;
// UnoCSS class helpers for dynamic styling
export const mergeClasses = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};

// Theme helpers
export const getThemeVar = (varName: string) => {
  if (typeof window !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(
      `--${varName}`,
    );
  }
  return "";
};

// Animation helpers for UnoCSS
export const animationClasses = {
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  processing: "animate-processing",
  pulseSlow: "animate-pulse-slow",
  bounceSubtle: "animate-bounce-subtle",
} as const;

// NieR styling shortcuts
export const nierClasses = {
  button: "yorha-button",
  buttonPrimary: "yorha-button-primary",
  card: "yorha-card",
  cardElevated: "yorha-card-elevated",
  input: "yorha-input",
  panel: "yorha-panel",
  separator: "yorha-separator",
  scrollbar: "yorha-scrollbar",
} as const;

// Shadcn-compatible classes
// Compatibility class mappings (previously shadcn-prefixed)
export const compatClasses = {
  button: 'bits-btn',
  buttonDefault: 'bits-btn-default',
  buttonOutline: 'bits-btn-outline',
  card: 'bits-card',
  input: 'bits-input',
  label: 'bits-label',
  dialog: 'bits-dialog-content',
  select: 'bits-select-trigger',
} as const;
