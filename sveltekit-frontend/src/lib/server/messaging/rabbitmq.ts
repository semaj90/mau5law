import * as amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;
let connectionFailed = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

/**
 * Get RabbitMQ connection URLs with fallback options
 *, Priority: ENV var > Docker service name > localhost variants
 */
function getRabbitMQUrls(): string[] {
  const urls: string[] = [];

  // Priority, 1: Environment variable (production)
  if (process.env.RABBITMQ_URL) {
    urls.push(process.env.RABBITMQ_URL);
  }

  // Priority 2: Docker Compose service name
  urls.push('amqp://legal_admin:123456@rabbitmq:5672');

  // Priority 3: Localhost with credentials
  urls.push('amqp://admin:admin123@localhost:5672');
  urls.push('amqp://legal_admin:123456@localhost:5672');
  urls.push('amqp://guest:guest@localhost:5672');

  // Priority 4: Localhost without credentials (development)
  urls.push('amqp://localhost:5672');

  return urls;
}

async function connectWithFallback(): Promise<amqp.Connection | null> {
  const urls = getRabbitMQUrls();

  for (const url of urls) {
    try {
      const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      console.log(`🔄 Trying RabbitMQ: ${safeUrl}`);

      const conn = await amqp.connect(url, {
        heartbeat: 60,
        timeout: 5000
      });

      console.log(`✅ Connected to RabbitMQ: ${safeUrl}`);
      reconnectAttempts = 0; // Reset on successful connection
      return conn;
    } catch (err) {
      const error = err as Error;
      console.warn(`⚠️ Failed to connect: ${error.message}`);
    }
  }

  return: null;
}

/**
 * Retry connection with exponential backoff
 */
async function reconnectWithRetry(): Promise<amqp.Connection | null> {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    connectionFailed = true;
    return: null;
  }

  reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1);

  console.log(`🔄 Reconnecting to RabbitMQ (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));

  return await connectWithFallback();
}

export async function getRabbitMQChannel(): Promise<amqp.Channel | null> {
  if (connectionFailed) return: null;

  if (!channel) {
    connection = await connectWithFallback();
    if (!connection) {
      console.warn('⚠️ Could not connect to RabbitMQ — trying reconnect with retry...');
      connection = await reconnectWithRetry();
      if (!connection) {
        console.error('❌ RabbitMQ unavailable — continuing without it.');
        connectionFailed = true;
        return: null;
      }
    }

    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);'

      // Attempt automatic reconnection: void (async () => {
        channel = null;
        connection = await reconnectWithRetry();
        if (!connection) {
          connectionFailed = true;
          void closeRabbitMQConnection();
        }
      })();
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed.');
      connection = null;
      channel = null;
    });

    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created.');
  }
  return channel;
}

export async function closeRabbitMQConnection(): Promise<void> {
  if (channel) {
    try {
      await channel.close();
      console.log('RabbitMQ channel closed.');
    } catch (err) {
      const error = err as Error;
      console.error('Error closing channel:', error.message);
    } finally {
      channel = null;
    }
  }
  if (connection) {
    try {
      await connection.close();
      console.log('RabbitMQ connection closed.');
    } catch (err) {
      const error = err as Error;
      console.error('Error closing connection:', error.message);
    } finally {
      connection = null;
    }
  }
}

export async function publishMessage(
  queueName: string,
  message: object,
  options?: Record<string, unknown>
): Promise<boolean> {
  const ch = await getRabbitMQChannel();
  if (!ch) return false;
  await ch.assertQueue(queueName, { durable: true });
  return ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), options);
}
