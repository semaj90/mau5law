import amqp from 'amqplib';
import type { Connection, Channel, Options, ConsumeMessage, Replies } from 'amqplib';
import { writable, get } from 'svelte/store'; // Import 'get'

let connection: Connection | null = null;
let channel: Channel | null = null;
const connectionFailed = writable(false); // Track if connection has failed
/**
 * Get RabbitMQ connection URLs to try in order
 * Priority: ENV var → Docker Desktop (legal-ai-rabbitmq) → Other Docker → Windows Native
 */
function getRabbitMQUrls(): string[] {
  const urls: string[] = [];
  // 1. Try environment variable first (highest priority)
  if (process.env.RABBITMQ_URL) {
    urls.push(process.env.RABBITMQ_URL);
  }
  // 2. Try Docker Desktop container (legal-ai-rabbitmq from go-microservice)
  // This is the running container: legal-ai-rabbitmq with admin:admin123
  urls.push('amqp://admin:admin123@localhost:5672'); // Port exposed to host
  // 3. Try other Docker containers with custom credentials
  urls.push('amqp://legal_admin:123456@rabbitmq:5672'); // Docker network name
  urls.push('amqp://admin:admin123@rabbitmq:5672');
  // 4. Try Docker containers with default credentials
  urls.push('amqp://guest:guest@rabbitmq:5672');
  urls.push('amqp://guest:guest@localhost:5672');
  // 5. Try localhost with custom credentials
  urls.push('amqp://legal_admin:123456@localhost:5672');
  // 6. Try without authentication (for local dev)
  urls.push('amqp://localhost:5672');
  return urls;
}
/**
 * Try to connect to RabbitMQ with fallback URLs
 */
async function connectWithFallback(): Promise<Connection | null> {
  const urls = getRabbitMQUrls();
  for (const url of urls) {
    try {
      // Hide password in logs
      const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      console.log(`🔄 Trying RabbitMQ: ${safeUrl}`);
      const conn = await amqp.connect(url);
      console.log(`✅ RabbitMQ connected: ${safeUrl}`);
      return conn;
    } catch (error) {
      // Continue to next URL
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ENOTFOUND')) {
        // Connection refused or host not found - try next
        continue;
      } else if (errMsg.includes('ACCESS-REFUSED')) {
        // Wrong credentials - try next
        continue;
      } else {
        // Other error - log but continue
        console.warn(`⚠️ RabbitMQ connection attempt failed: ${errMsg.substring(0, 100)}`);
        continue;
      }
    }
  }
  return null; // All attempts failed
}
export async function getRabbitMQChannel(): Promise<Channel | null> {
  // If connection already failed, return null immediately
  const $connectionFailed = get(connectionFailed); // Synchronously get the current value
  if ($connectionFailed) {
    return null;
  }
  if (!channel) {
    try {
      connection = await connectWithFallback();
      if (!connection) {
        console.log('⚠️ Could not connect to RabbitMQ with any configuration.');
        console.log('⚠️ RabbitMQ is optional - continuing without it.');
        console.log('💡 Tip: Start RabbitMQ with: docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management');
        connectionFailed.set(true);
        return null;
      }
      connection.on('error', (err) => {
        console.error('RabbitMQ Connection Error:', err);
        connectionFailed.set(true);
        closeRabbitMQConnection().then(() => {
          console.log('RabbitMQ connection closed after error.');
        });
      });
      connection.on('close', () => {
        console.log('RabbitMQ Connection Closed.');
        channel = null;
        connection = null;
      });
      channel = await connection.createChannel();
      console.log('✅ RabbitMQ channel created.');
    } catch (error) {
      console.error('⚠️ Failed to create RabbitMQ channel:', error instanceof Error ? error.message : error);
      console.log('⚠️ RabbitMQ is optional - continuing without it.');
      connectionFailed.set(true);
      return null;
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
  message: object, // Changed from 'any' to 'object' for better type safety
  options?: Options.Publish
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
  onMessage: (msg: ConsumeMessage | null) => void,
  options?: Options.Consume
): Promise<Replies.Consume> {
  const ch = await getRabbitMQChannel();
  await ch.assertQueue(queueName, { durable: true });
  return ch.consume(queueName, onMessage, options);
}
}
