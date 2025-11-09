import type { User, Session } from 'lucia';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
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