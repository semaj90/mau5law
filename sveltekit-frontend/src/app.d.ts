import type { User, Session } from 'lucia';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
    // Define your User type based on what your authentication system provides
    interface User {
      id: string;
      email: string;
      // Add any other user properties you expect, e.g., name, roles
    }

    interface Locals {
      session: {
        user: User | null;
        // Add other session-related properties if needed
      };
      // Add other locals properties if needed
    }
    // interface PageData {}
    // interface Error {}
    // interface Platform {}
  }

	interface ImportMetaEnv {
		readonly NODE_ENV: string;
		readonly SENTRY_DSN?: string;
		readonly CUSTOM_LOGGING_ENDPOINT?: string;
		readonly LOGGING_API_KEY?: string;
		readonly ADMIN_API_KEY?: string;
		readonly DEV_ADMIN_API_KEY?: string; // For development log clearing
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};