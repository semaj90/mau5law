import type { Handle } from "@sveltejs/kit";
import { createRuntimeConnection, closeConnections } from "$lib/server/db/client";
import { getRedisClient, closeRedisClient } from "$lib/server/cache/redis";
import { getRabbitMQChannel, closeRabbitMQConnection } from "$lib/server/messaging/rabbitmq";

async function initializeServices() {
  try {
    createRuntimeConnection();
    const redis = await getRedisClient();
    await redis.ping();
    await getRabbitMQChannel().catch(() => null);
  } catch (error) {
    console.error("Service initialization error:", error);
  }
}

initializeServices().catch((error) =>
  console.error("Unhandled service initialization error:", error)
);

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.db = createRuntimeConnection();
  event.locals.redis = await getRedisClient();
  try {
    event.locals.rabbitmqChannel = await getRabbitMQChannel();
  } catch {
    event.locals.rabbitmqChannel = null;
  }

  return resolve(event);
};

const shutdown = async () => {
  console.log("Shutting down services…");
  await closeConnections();
  await closeRedisClient();
  await closeRabbitMQConnection();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
