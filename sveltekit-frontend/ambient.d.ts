// Minimal ambient declarations to reduce common TS lookup noise in the frontend
/// <reference types="svelte" />

declare module '*.svelte' {
  import type { SvelteComponentTyped } from 'svelte';
  const component: SvelteComponentTyped<any, any, any>;
  export default component;
}

declare const __CURRENT_USER_ID__: string | undefined;
declare const __DEV__: boolean;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  }
}

// Allow importing arbitrary JSON modules if needed
declare module '*.json' {
  const value: any;
  export default value;
}
