// Minimal ambient declarations to reduce "any" usage and satisfy TypeScript diagnostics.

import type { SvelteComponentTyped } from 'svelte';

declare module '*.svelte' {
  // Constructor type for Svelte components with unknown-safe generics
  const component: new (
    ...args: unknown[]
  ) => SvelteComponentTyped<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
  export default component;
}

// Allow imports of common asset modules
declare module '*.svg';
declare module '*.css';
// Svelte 5 + SvelteKit global type declarations
/// <reference types="svelte" />
/// <reference types="vite/client" />
declare global {
  // WebGPU support (avoid conflict with @webgpu/types)
  interface Navigator {
    gpu?: GPU | undefined;
  }

  // Minimal WebGPU-related interfaces (keeps usage typed without pulling full @webgpu/types)
  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>;
  }
  interface GPUAdapter {
    // Descriptor can be any structured object; use Record<string, unknown> to avoid `any`.
    requestDevice(descriptor?: Record<string, unknown>): Promise<GPUDevice | null>;
    // ...other adapter members may be added as needed
  }
  interface GPUDevice {
    // Keep minimal device shape; expand if the codebase needs more detailed typing.
    // Use unknown for flexible shapes instead of `any`.
    destroy?: () => void;
    // Other members intentionally left generic.
  }

  // Telemetry and GPU Manager global properties
  interface Window {
    __TELEMETRY__?: Record<string, unknown> | undefined;
    __GPU_MANAGER__?:
      | {
          getAcceleration(): number | undefined;
          // additional manager methods can be added with explicit types
        }
      | undefined;
  }
}

// Stub out problematic drizzle-orm gel module types using unknown values instead of any
declare module 'gel' {
  export interface Duration {
    [key: string]: unknown;
  }
  export interface LocalDate {
    [key: string]: unknown;
  }
  export interface LocalTime {
    [key: string]: unknown;
  }
  export interface Timestamp {
    [key: string]: unknown;
  }
  export interface DateDuration {
    [key: string]: unknown;
  }
  export interface RelativeDuration {
    [key: string]: unknown;
  }
}
export {};
