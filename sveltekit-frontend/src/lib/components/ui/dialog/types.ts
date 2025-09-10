import type { ComponentProps, Snippet } from 'svelte';
import { Dialog } from 'bits-ui';

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