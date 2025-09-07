/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {}
    interface ElementClass {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
  
  interface Navigator {
    gpu?: GPU;
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