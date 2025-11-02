import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private'; // For server-side environment variables

export const load: PageServerLoad = async () => {
  // This is where you would load initial data for the page on the server.
  // For example, fetching initial precedent data or system status.

  // Demonstrate accessing environment variables for backend services.
  // These would typically be used by backend services, not directly passed to frontend
  // unless they are non-sensitive configuration.
  const ollamaUrl = env.OLLAMA_URL || 'http://localhost:11434';
  const qdrantUrl = env.QDRANT_URL || 'http://localhost:6333';
  const databaseUrl = env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db';
  const redisUrl = env.REDIS_URL || 'redis://:redis@localhost:6379/0';

  console.log('Server-side environment variables for Precedent, Matching:');
  console.log(`OLLAMA_URL: ${ollamaUrl}`);
  console.log(`QDRANT_URL: ${qdrantUrl}`);
  console.log(`DATABASE_URL: ${databaseUrl}`);
  console.log(`REDIS_URL: ${redisUrl}`);

  // You could return data here to be used by the +page.svelte
  return {
    // Example: initialSystemStatus: await getSystemStatus(ollamaUrl, qdrantUrl),
    // For this specific page, we don't have initial data to load,'
    // as the search is triggered by user interaction.
    // But this demonstrates the pattern for server-side env var access.
    serverConfig: {
      // Only expose non-sensitive configuration to the client if absolutely necessary.
      // For example, if the client needs to know which vector DB is active.
      // ollamaUrl: ollamaUrl,
      // qdrantUrl: qdrantUrl
    }
  };
};
