// Professional Legal AI bits-ui Components
// Modern Svelte 5 components with professional theme integration

export { default as ButtonBits } from '../button/ButtonBits.svelte';
export { default as CardBits } from '../card/CardBits.svelte';
export { default as InputBits } from '../input/InputBits.svelte';
export { default as DialogBits } from '../dialog/DialogBits.svelte';
export { default as DropdownBits } from '../dropdown/DropdownBits.svelte';
export { default as SelectBits } from '../select/SelectBits.svelte';
export { default as TooltipBits } from '../tooltip/TooltipBits.svelte';
export { default as TabsBits } from '../tabs/TabsBits.svelte';

// Re-export bits-ui primitives for advanced usage
export * from 'bits-ui';

// Professional theme utilities
export const LEGAL_AI_VARIANTS = {
  button: ['primary', 'secondary', 'ghost', 'outline', 'destructive', 'success', 'warning', 'info'] as const,
  card: ['default', 'elevated', 'outlined', 'filled'] as const,
  input: ['default', 'filled', 'outlined'] as const,
  dialog: ['sm', 'md', 'lg', 'xl', 'full'] as const,
  select: ['default', 'filled', 'outlined'] as const,
  tabs: ['default', 'pills', 'underline'] as const,
} as const;

export const LEGAL_AI_SIZES = {
  button: ['xs', 'sm', 'md', 'lg', 'xl'] as const,
  input: ['sm', 'md', 'lg'] as const,
  card: ['none', 'sm', 'md', 'lg', 'xl'] as const,
  select: ['sm', 'md', 'lg'] as const,
  tabs: ['sm', 'md', 'lg'] as const,
} as const;

// Type helpers for better TypeScript experience
export type ButtonVariant = typeof LEGAL_AI_VARIANTS.button[number];
export type CardVariant = typeof LEGAL_AI_VARIANTS.card[number];
export type InputVariant = typeof LEGAL_AI_VARIANTS.input[number];
export type DialogSize = typeof LEGAL_AI_VARIANTS.dialog[number];
export type SelectVariant = typeof LEGAL_AI_VARIANTS.select[number];
export type TabsVariant = typeof LEGAL_AI_VARIANTS.tabs[number];

export type ButtonSize = typeof LEGAL_AI_SIZES.button[number];
export type InputSize = typeof LEGAL_AI_SIZES.input[number];
export type CardPadding = typeof LEGAL_AI_SIZES.card[number];
export type SelectSize = typeof LEGAL_AI_SIZES.select[number];
export type TabsSize = typeof LEGAL_AI_SIZES.tabs[number];