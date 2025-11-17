import { RabbitMQQueue, RabbitMQWorker, RabbitMQJob } from '$lib // TODO: Verify store subscription is correct for Svelte 5/rabbitmq';
export const logQueue = new RabbitMQQueue('logQueue', {
  connection: { host: 'localhost', port: 6379 },
});
