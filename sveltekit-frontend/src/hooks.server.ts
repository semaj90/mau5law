import type { Handle } from '@sveltejs/kit';
import { getDbClient, closeDbClient } from '$lib/server/db/client';
import { getRedisClient, closeRedisClient } from '$lib/server/cache/redis';
import { getRabbitMQChannel, closeRabbitMQConnection } from '$lib/server/messaging/rabbitmq';

// Initialize services on server startup
async function initializeServices() {
  try {
    // Initialize Drizzle DB client
    getDbClient(); // No need to assign to a variable if not directly used here
    // You might want to run a simple query to test connection
    // await db.execute(sql`SELECT 1`);
    console.log('Database client initialized successfully.');

    // Initialize Redis client
    const redis = await getRedisClient();
    await redis.ping();
    console.log('Redis client initialized successfully.');

    // Initialize RabbitMQ channel
    await getRabbitMQChannel(); // No need to assign to a variable if not directly used here
    console.log('RabbitMQ channel initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize one or more services:', error);
    // Depending on severity, you might want to exit the process
    // process.exit(1);
  }
}

// Call initialization once when the server starts
initializeServices();

// Handle function to make clients available in `event.locals`
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.db = getDbClient();
  event.locals.redis = await getRedisClient();
  event.locals.rabbitmqChannel = await getRabbitMQChannel();

  const response = await resolve(event);
  return response;
};

// Cleanup services on server shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: Closing services.');
  await closeDbClient();
  await closeRedisClient();
  await closeRabbitMQConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: Closing services.');
  await closeDbClient();
  await closeRedisClient();
  await closeRabbitMQConnection();
  process.exit(0);
});