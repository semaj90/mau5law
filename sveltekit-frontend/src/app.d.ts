declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email?: string;
        role: 'admin' | 'user' | 'prosecutor' | 'detective';
      } | null;
      session: import('lucia').Session | null;
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


