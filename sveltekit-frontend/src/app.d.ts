/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email?: string;
        role: 'admin' | 'lead_prosecutor' | 'prosecutor' | 'paralegal' | 'investigator' | 'analyst' | 'viewer' | 'user';
      } | null;
      // Keep session loosely typed to avoid hard dependency on lucia types here
      session: any | null;
      // Common runtime helpers attached to locals in hooks
      db?: any;
      audit?: any;
      userAgent?: string;
      // Embedding services
      embed?: {
        embedText: (text: string) => Promise<number[]>;
      };
      llamaWasm?: {
        embedText: (text: string) => Promise<number[]>;
      };
      llama?: {
        embed: (text: string) => Promise<number[]>;
      };
      ollama?: {
        embed: (text: string) => Promise<number[]>;
        // Add other Ollama methods if they are commonly used on locals.ollama
      };
      // Allow additional service bindings attached in hooks without strict typing
      [key: string]: any;
    }
  }
  // Node.js process polyfill for browser compatibility
  interface ProcessEnv {
    NODE_ENV: string;
    BROWSER?: string;
    [key: string]: string | undefined;
  }
  interface Process {
    env: ProcessEnv;
    browser?: boolean;
    version?: string;
    versions?: { node: string; [key: string]: string };
    cwd(): string;
  }
  declare const process: Process;

  // Declare global functions or properties here
  // This declares nomicEmbedText as an optional function on the global scope,
  // resolving the TypeScript error without changing the runtime logic.
  declare const nomicEmbedText: ((text: string) => Promise<number[]>) | undefined;
}

// See https://kit.svelte.dev/docs/types#app for information about these interfaces
// and how to augment them.
declare namespace App {
  // interface Locals {}
  // interface PageData {}
  // interface Error {}
  // interface Platform {}
}

// Interface for the detail of the CustomEvent emitted by RealTimeLegalSearch's onselect
interface SearchResultEventDetail {
  title: string;
  // Add other properties if known, e.g., id, type, url
}

// Augment RealTimeLegalSearch component's events for type checking
declare module '$lib/components/search/RealTimeLegalSearch.svelte' {
  interface $$Events {
    select: CustomEvent<SearchResultEventDetail>;
  }
}
export {}