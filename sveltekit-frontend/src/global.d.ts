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
    }
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
export {}