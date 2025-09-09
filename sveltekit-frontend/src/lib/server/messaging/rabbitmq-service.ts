/**
 * Re-export RabbitMQ service from monitoring location
 * This file provides the expected import path for compatibility
 */

export {
  rabbitmqService,
  QUEUES,
  type MessageHandler
} from '../monitoring/messaging/rabbitmq-service.js';

// Also export the main service class
export { RabbitMQService } from '../monitoring/messaging/rabbitmq-service.js';
