import amqp, { type Connection, type Channel } from 'amqplib';
import { getRabbitMQUrl } from '$lib/config/env.server';

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function getRabbitMQChannel(): Promise<Channel> {
  if (!channel) {
    const rabbitmqUrl = getRabbitMQUrl();
    try {
      connection = await amqp.connect(rabbitmqUrl);
      connection.on('error', (err) => {
        console.error('RabbitMQ Connection Error:', err);
        // Attempt to reconnect or handle gracefully
        closeRabbitMQConnection().then(() => {
          console.log('Attempting to reconnect to RabbitMQ...');
          // Implement a robust reconnection strategy if needed
        });
      });
      connection.on('close', () => {
        console.log('RabbitMQ Connection Closed.');
        channel = null;
        connection = null;
      });

      channel = await connection.createChannel();
      console.log('RabbitMQ channel created.');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }
  return channel;
}

export async function closeRabbitMQConnection() {
  if (channel) {
    try {
      await channel.close();
      console.log('RabbitMQ channel closed.');
    } catch (err) {
      console.error('Error closing RabbitMQ channel:', err);
    } finally {
      channel = null;
    }
  }
  if (connection) {
    try {
      await connection.close();
      console.log('RabbitMQ connection closed.');
    } catch (err) {
      console.error('Error closing RabbitMQ connection:', err);
    } finally {
      connection = null;
    }
  }
}

/**
 * Publishes a message to a specified queue.
 * @param queueName The name of the queue.
 * @param message The message payload (will be JSON stringified).
 * @param options Optional publish options.
 */
export async function publishMessage(
  queueName: string,
  message: any,
  options?: amqp.Options.Publish
): Promise<boolean> {
  const ch = await getRabbitMQChannel();
  await ch.assertQueue(queueName, { durable: true });
  return ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), options);
}

/**
 * Consumes messages from a specified queue.
 * @param queueName The name of the queue.
 * @param onMessage Callback function to handle incoming messages.
 * @param options Optional consume options.
 */
export async function consumeMessages(
  queueName: string,
  onMessage: (msg: amqp.ConsumeMessage | null) => void,
  options?: amqp.Options.Consume
): Promise<amqp.Replies.Consume> {
  const ch = await getRabbitMQChannel();
  await ch.assertQueue(queueName, { durable: true });
  return ch.consume(queueName, onMessage, options);
}
