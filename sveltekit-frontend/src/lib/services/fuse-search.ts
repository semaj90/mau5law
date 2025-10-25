import type { ButtonVariant, ButtonSize } from '$lib/types/button'; // Import the new types

// Fuse.js search service for Button indexing
export type ButtonInfo = {
  id: string;
  keywords: string[]; // Add this line
  variant?: ButtonVariant; // Add this property
  size?: ButtonSize; // Add this property
  label: string;
  element: HTMLElement | null;
};

/** Simple searchable button index used for UI button lookup */
export const searchableButtonIndex = {
  addButton: (buttonInfo: ButtonInfo): void => {
    // Simple button indexing implementation
    console.log('Button added to index:', buttonInfo);
  },
};
