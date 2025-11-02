import * as amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;
let connectionFailed = false;

function getRabbitMQUrls(): string[] {
  const urls: string[] = [];
  if (process.env.RABBITMQ_URL) urls.push(process.env.RABBITMQ_URL);
  urls.push('amqp://admin:admin123@localhost:5672');
  urls.push('amqp://guest:guest@localhost:5672');
  urls.push('amqp://legal_admin:123456@localhost:5672');
  urls.push('amqp://localhost:5672');
  return urls;
}

async function connectWithFallback(): Promise<amqp.Connection | null> {
  const urls = getRabbitMQUrls();
  for (const url of urls) {
    try {
      const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      console.log(`🔄 Trying RabbitMQ: ${safeUrl}`);
      const conn = await amqp.connect(url);
      console.log(`✅ Connected to RabbitMQ: ${safeUrl}`);
      return conn;
    } catch (err) {
      console.warn(`⚠️ Failed to connect: ${(err as Error).message}`);
    }
  }
  return null;
}

export async function getRabbitMQChannel(): Promise<amqp.Channel | null> {
  if (connectionFailed) return null;

  if (!channel) {
    connection = await connectWithFallback();
    if (!connection) {
      console.warn('⚠️ Could not connect to RabbitMQ — continuing without it.');
      connectionFailed = true;
      return null;
    }
    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
      connectionFailed = true;
      void closeRabbitMQConnection();
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
    } catch (err: any) {
      console.error('Error closing channel:', err);
    } finally {
      channel = null;
    }
  }
  if (connection) {
    try {
      await connection.close();
      console.log('RabbitMQ connection closed.');
    } catch (err: any) {
      console.error('Error closing connection:', err);
    } finally {
      connection = null;
    }
  }
}

export async function publishMessage(
  queueName: string,
  message: object,
  options?: amqp.Options.Publish
): Promise<boolean> {
  const ch = await getRabbitMQChannel();
  if (!ch) return false;
  await ch.assertQueue(queueName, { durable: true });
  return ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), options);
}
