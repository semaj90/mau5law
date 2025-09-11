// Enhanced Bits Compound Component Exports
// For legacy compatibility with compound syntax (Button.Root, Card.Root, etc.)

import {
  CompoundButton,
  Dialog as CompoundDialog,
  Card as CompoundCard,
  Select as CompoundSelect
} from "./index.js";

// Re-export compound components with compound syntax support
export const Button = CompoundButton;
export const Dialog = CompoundDialog;
export const Card = CompoundCard;
export const Select = CompoundSelect;

// Legacy compatibility - these provide the .Root syntax
export {
  CompoundButton as ButtonCompound,
  CompoundDialog as DialogCompound,
  CompoundCard as CardCompound,
  CompoundSelect as SelectCompound
};
