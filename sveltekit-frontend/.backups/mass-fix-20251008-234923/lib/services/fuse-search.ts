import type { ButtonVariant, ButtonSize } from '$lib/types/button'; // Import the new types

// Fuse.js search service for Button indexing
export type ButtonInfo = {
  id?: string;
  label?: string;
  href?: string;
  disabled?: boolean;
  role?: string;
  metadata?: Record<string, unknown>;
  variant?: ButtonVariant; // Add this property
  size?: ButtonSize;       // Add this property
}

/** Simple searchable button index used for UI button lookup */
export const searchableButtonIndex = {
  addButton: (buttonInfo: ButtonInfo): void => {
    // Simple button indexing implementation
    console.log('Button added to index:', buttonInfo);
  },
}
