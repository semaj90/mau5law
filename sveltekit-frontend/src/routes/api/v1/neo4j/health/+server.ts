// Fallback stub: neo4j service may not be available; provide a simple health response
const getNeo4jService = () => ({
  async getHealthStatus() {
    return { connected: false, mode: 'stub' };
  },
});
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const neo4jService = getNeo4jService();
    const health = await neo4jService.getHealthStatus();

    return new Response(
      JSON.stringify({
        neo4j: health,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        neo4j: {
          connected: false,
          mode: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
