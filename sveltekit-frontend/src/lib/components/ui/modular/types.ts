// TypeScript type definitions for modular UI components

import type {     Snippet     } from 'svelte';
import type { HTMLAttributes, HTMLButtonAttributes, HTMLInputAttributes } from 'svelte/elements';

// Base component props
export interface BaseProps {
  children?: Snippet;
}

// Button component props
export interface ButtonProps extends HTMLButtonAttributes, BaseProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'yorha' | 'legal' | 'evidence' | 'case';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  loading?: boolean;
  icon?: string;
  href?: string;
  target?: string;
}

// Card component props
export interface CardProps extends HTMLAttributes<HTMLDivElement>, BaseProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'yorha' | 'glass';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'default' | 'lg';
  header?: Snippet;
  footer?: Snippet;
  hoverable?: boolean;
  interactive?: boolean;
}

// Dialog component props
export interface DialogProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'yorha' | 'legal' | 'fullscreen' | 'drawer';
  size?: 'sm' | 'default' | 'lg' | 'xl' | '2xl';
  title?: string;
  description?: string;
  trigger?: Snippet;
  header?: Snippet;
  footer?: Snippet;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

// Input component props
export interface InputProps extends Omit<HTMLInputAttributes, 'size'>, BaseProps {
  variant?: 'default' | 'outlined' | 'filled' | 'ghost' | 'yorha' | 'legal';
  size?: 'sm' | 'default' | 'lg';
  state?: 'default' | 'error' | 'warning' | 'success';
  label?: string;
  helperText?: string;
  errorMessage?: string;
  icon?: string;
  suffix?: string;
  oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
  onchange?: (event: Event & { currentTarget: HTMLInputElement }) => void;
  onfocus?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
  onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
}

// Form component props
export interface FormProps extends HTMLAttributes<HTMLFormElement>, BaseProps {
  variant?: 'default' | 'card' | 'inline' | 'modal' | 'yorha' | 'legal';
  size?: 'sm' | 'default' | 'lg';
  header?: Snippet;
  footer?: Snippet;
  onsubmit?: (event: SubmitEvent) => void;
  method?: 'get' | 'post';
  action?: string;
  enctype?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  target?: string;
  novalidate?: boolean;
  autocomplete?: 'on' | 'off';
}

// Progress component props
export interface ProgressProps extends HTMLAttributes<HTMLDivElement>, BaseProps {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'yorha' | 'legal';
  size?: 'sm' | 'default' | 'lg';
  indeterminate?: boolean;
  showPercentage?: boolean;
  label?: string;
}

// Badge component props
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, BaseProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' | 'yorha' | 'legal' | 'evidence' | 'case';
  size?: 'sm' | 'default' | 'lg';
  icon?: string;
  removable?: boolean;
  onremove?: () => void;
}

// File upload types
export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

// File upload component props
export interface FileUploadProps extends HTMLAttributes<HTMLDivElement>, BaseProps {
  variant?: 'default' | 'compact' | 'card' | 'yorha' | 'legal' | 'evidence';
  size?: 'sm' | 'default' | 'lg';
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  files?: UploadFile[];
  onfileschange?: (files: UploadFile[]) => void;
  onupload?: (file: UploadFile) => Promise<void>;
  onremove?: (fileId: string) => void;
  dragDropText?: string;
  browseText?: string;
  supportedFormats?: string[];
}

// Common variant types
export type ComponentVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'yorha'
  | 'legal'
  | 'evidence'
  | 'case';

export type ComponentSize = 'sm' | 'default' | 'lg';
export type ComponentState = 'default' | 'error' | 'warning' | 'success';

// Theme types
export type YoRHaVariant = 'yorha' | 'yorha-secondary' | 'yorha-accent';
export type LegalVariant = 'legal' | 'evidence' | 'case';

// Animation types
export type AnimationType = 'fade' | 'scale' | 'slide' | 'bounce';
export type AnimationDuration = 'fast' | 'normal' | 'slow';

// Layout types
export interface LayoutProps {
  container?: boolean;
  centered?: boolean;
  fullHeight?: boolean;
  spacing?: 'tight' | 'normal' | 'loose';
}