// Ambient declarations to help TypeScript treat Svelte components as constructors
// This is a conservative fallback to reduce widespread "instance vs constructor" type
// errors during migration to Svelte 5. It's meant as a temporary compatibility shim.

declare module '*.svelte' {
  // Permissive fallback: treat any imported .svelte as 'any' to avoid
  // constructor-vs-instance type errors while migrating to Svelte 5.
  const component: any;
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
    gpu?: any; // Use 'any' to avoid Navigator interface conflicts
  }
  // Global WebGPU types (simplified)
  interface GPU {
    requestAdapter(): Promise<any>;
  }
  // Telemetry and GPU Manager global properties
  interface Window {
    __TELEMETRY__?: any;
    __GPU_MANAGER__?: {
      getAcceleration(): any;
    };
  }
}
// Stub out problematic drizzle-orm gel module types
declare module 'gel' {
  export interface Duration {
    [key: string]: any;
  }
  export interface LocalDate {
    [key: string]: any;
  }
  export interface LocalTime {
    [key: string]: any;
  }
  export interface Timestamp {
    [key: string]: any;
  }
  export interface DateDuration {
    [key: string]: any;
  }
  export interface RelativeDuration {
    [key: string]: any;
  }
}
export {};
