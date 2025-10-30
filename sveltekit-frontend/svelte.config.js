import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Use official Vite preprocessor
  preprocess: vitePreprocess(),

  kit: {
    // Explicit Node adapter (for Docker, Redis, MinIO, SSE, etc.)
    adapter: adapter({ out: 'build' }),

    // Common path aliases (update to match your repo layout)
    alias: {
      '$lib/server/db/utils': './src/lib/server/db/utils.ts',
      '$lib/server/db/drizzle': './src/lib/server/db/drizzle.ts',
      '$lib/server/db/client': './src/lib/server/db/client.ts',
      '$lib/server/db/schema-postgres': './src/lib/server/db/schema-postgres.ts',
      '$lib/server/db/drizzle-vector-config': './src/lib/server/db/drizzle-vector-config.ts',
      '$lib/server/auth/lucia': './src/lib/server/auth/lucia.ts',
      '$lib/server/cache/redis': './src/lib/server/cache/redis.ts',
      '$lib/server/optimize/query-cache': './src/lib/server/optimize/query-cache.ts',
      '$lib/server/vector/qdrant': './src/lib/server/vector/qdrant.ts',
      '$lib/server/storage/minio': './src/lib/server/storage/minio.ts',
      '$lib/server/ai/summarization': './src/lib/server/ai/summarization.ts',
      '$lib/api/production-service-client': './src/lib/api/production-service-client.ts',
      '$lib/services/xstate-integration': './src/lib/services/xstate-integration.ts',
      '$lib/messaging/rabbitmq-xstate-integration': './src/lib/messaging/rabbitmq-xstate-integration.ts',
      '$lib/webasm/llama-cpp-engine': './src/lib/webasm/llama-cpp-engine.ts',
      '$lib/cache/proto-serializer': './src/lib/cache/proto-serializer.ts',
      '$lib/components/ui': './src/lib/components/ui',
      '$lib/utils': './src/lib/utils',
    },
  },
}; // Added semicolon to explicitly terminate the config object

// If 'export default config;' is causing a 'multiple default exports' error,
// it implies it's duplicated elsewhere or implicitly handled.
// Removing it here addresses that specific error.
// Ensure your SvelteKit setup correctly exports the config object if this is removed.
export default config;
