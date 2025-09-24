/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email?: string;
        role:
          | 'admin'
          | 'lead_prosecutor'
          | 'prosecutor'
          | 'paralegal'
          | 'investigator'
          | 'analyst'
          | 'viewer'
          | 'user';
      } | null;
      // Keep session loosely typed to avoid hard dependency on lucia types here
      session: any | null;
      // Common runtime helpers attached to locals in hooks
      db?: any;
      audit?: any;
      userAgent?: string;
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
}

export {};
