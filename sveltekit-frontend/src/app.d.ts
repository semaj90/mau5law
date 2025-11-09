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
}

export {};