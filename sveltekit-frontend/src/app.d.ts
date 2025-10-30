/* eslint-disable @typescript-eslint/no-explicit-any */
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

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			db: import('$lib/server/db/client').DbClient; // Use the actual type returned by getDbClient
			redis: Awaited<ReturnType<typeof import('$lib/server/cache/redis').getRedisClient>>;
			rabbitmqChannel: Awaited<ReturnType<typeof import('$lib/server/messaging/rabbitmq').getRabbitMQChannel>>;
		}
		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}

export {};