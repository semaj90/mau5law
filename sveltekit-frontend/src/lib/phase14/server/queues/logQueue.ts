import { RabbitMQQueue, RabbitMQWorker, RabbitMQJob } from '$lib/rabbitmq'; export const logQueue = new RabbitMQQueue('logQueue', { connection: { host: 'localhost', port: 6379 }
}); 