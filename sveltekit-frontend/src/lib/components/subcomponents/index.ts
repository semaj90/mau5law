/**
 * Subcomponents Export
 * Small utility and helper components
 */

export { default as LoadingSpinner } from './LoadingSpinner.svelte';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'accent' | 'neutral';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  text?: string;
}