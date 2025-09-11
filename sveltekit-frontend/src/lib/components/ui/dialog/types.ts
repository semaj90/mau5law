import type { ComponentProps, Snippet } from 'svelte';

// Fallback Dialog namespace if bits-ui import fails
declare namespace Dialog {
  export interface Root {
    open?: boolean;
    children?: Snippet;
    [key: string]: any;
  }
  export interface Content {
    children?: Snippet;
    [key: string]: any;
  }
  export interface Title {
    children?: Snippet;
    [key: string]: any;
  }
  export interface Description {
    children?: Snippet;
    [key: string]: any;
  }
}

// Try to import from bits-ui, fall back to namespace declaration
let DialogImport: typeof Dialog | undefined;
try {
  DialogImport = require('bits-ui').Dialog;
} catch {
  // Use fallback namespace
}

export interface DialogProps extends ComponentProps<Dialog.Root> {
  children?: Snippet;
  class?: string;
}

export interface DialogContentProps extends ComponentProps<Dialog.Content> {
  children?: Snippet;
  class?: string;
}

export interface DialogHeaderProps {
  children?: Snippet;
  class?: string;
}

export interface DialogTitleProps extends ComponentProps<Dialog.Title> {
  children?: Snippet;
  class?: string;
}

export interface DialogDescriptionProps extends ComponentProps<Dialog.Description> {
  children?: Snippet;
  class?: string;
}

export interface DialogFooterProps {
  children?: Snippet;
  class?: string;
}