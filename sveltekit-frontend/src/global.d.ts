// Svelte 5 + SvelteKit global type declarations
/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  // WebGPU support (avoid conflict with @webgpu/types)
  interface Navigator {
    gpu?: any; // Use 'any' to avoid Navigator interface conflicts
  }

  // Global WebGPU types (simplified)
  interface GPU {
    requestAdapter(): Promise<any>;
  }
}

// Stub out problematic drizzle-orm gel module types
declare module 'gel' {
  export interface Duration {}
  export interface LocalDate {}
  export interface LocalTime {}
  export interface Timestamp {}
  export interface DateDuration {}
  export interface RelativeDuration {}
}

export {};