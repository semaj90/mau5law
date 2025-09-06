// Modular UI Components - Bits UI + UnoCSS + Svelte 5
// Export all modular components for clean imports

export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Dialog } from './Dialog.svelte';
export { default as Input } from './Input.svelte';
export { default as Form } from './Form.svelte';
export { default as Progress } from './Progress.svelte';
export { default as Badge } from './Badge.svelte';
export { default as FileUpload } from './FileUpload.svelte';

// Type exports
export type {
  ButtonProps,
  CardProps,
  DialogProps,
  InputProps,
  FormProps,
  ProgressProps,
  BadgeProps,
  FileUploadProps
} from './types';

// Component variants and types for external use
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'yorha' | 'legal' | 'evidence' | 'case';
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'yorha' | 'glass';
export type DialogVariant = 'default' | 'yorha' | 'legal' | 'fullscreen' | 'drawer';
export type InputVariant = 'default' | 'outlined' | 'filled' | 'ghost' | 'yorha' | 'legal';
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' | 'yorha' | 'legal' | 'evidence' | 'case';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'yorha' | 'legal';
export type FileUploadVariant = 'default' | 'compact' | 'card' | 'yorha' | 'legal' | 'evidence';

export type ComponentSize = 'sm' | 'default' | 'lg';
export type ComponentState = 'default' | 'error' | 'warning' | 'success';

// Utility functions
export { cn } from '$lib/utils';

// Re-export CVA for external variant creation
export { cva, type VariantProps } from 'class-variance-authority';