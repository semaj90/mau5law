// In-memory message queue system with Redis/RabbitMQ compatibility
import { EventEmitter } from 'events';

interface QueueMessage {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

interface QueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
}

class InMemoryQueue extends EventEmitter {
  private messages: Map<string, QueueMessage[]> = new Map();
  private processing: Set<string> = new Set();
  private deadLetter: Map<string, QueueMessage[]> = new Map();
  private stats: Map<string, { processed: number; failed: number }> = new Map();

  constructor(private options: QueueOptions = {}) {
    super();
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      concurrency: 5,
      ...options
    };
  }

  // Redis-compatible methods
  async lpush(queueName: string, data: string): Promise<number> {
    const message: QueueMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: typeof data === 'string' ? JSON.parse(data) : data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.options.maxRetries || 3
    };

    if (!this.messages.has(queueName)) {
      this.messages.set(queueName, []);
      this.stats.set(queueName, { processed: 0, failed: 0 });
    }

    this.messages.get(queueName)!.unshift(message);
    this.emit('message', queueName, message);
    return this.messages.get(queueName)!.length;
  }

  async rpush(queueName: string, data: string): Promise<number> {
    const message: QueueMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: typeof data === 'string' ? JSON.parse(data) : data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.options.maxRetries || 3
    };

    if (!this.messages.has(queueName)) {
      this.messages.set(queueName, []);
      this.stats.set(queueName, { processed: 0, failed: 0 });
    }

    this.messages.get(queueName)!.push(message);
    this.emit('message', queueName, message);
    return this.messages.get(queueName)!.length;
  }

  async blpop(queueName: string, timeout: number = 0): Promise<[string, string] | null> {
    return new Promise((resolve) => {
      const tryPop = () => {
        const queue = this.messages.get(queueName);
        if (queue && queue.length > 0) {
          const message = queue.shift()!;
          resolve([queueName, JSON.stringify(message.data)]);
          return;
        }

        if (timeout === 0) {
          // Block indefinitely
          this.once('message', (name: string) => {
            if (name === queueName) {
              tryPop();
            }
          });
        } else {
          // Timeout after specified seconds
          setTimeout(() => resolve(null), timeout * 1000);
        }
      };

      tryPop();
    });
  }

  async llen(queueName: string): Promise<number> {
    const queue = this.messages.get(queueName);
    return queue ? queue.length : 0;
  }

  // RabbitMQ-compatible methods
  async publish(exchange: string, routingKey: string, content: any, options: any = {}): Promise<boolean> {
    const queueName = `${exchange}:${routingKey}`;
    await this.rpush(queueName, JSON.stringify(content));
    return true;
  }

  async consume(queueName: string, callback: (msg: any) => Promise<void>, options: any = {}): Promise<void> {
    const processMessage = async () => {
      try {
        const result = await this.blpop(queueName, 1);
        if (result) {
          const [, messageData] = result;
          const message = JSON.parse(messageData);
          
          try {
            await callback({
              content: Buffer.from(JSON.stringify(message)),
              fields: { deliveryTag: Date.now() },
              properties: {},
              ack: () => this.ack(queueName, message),
              nack: () => this.nack(queueName, message)
            });

            const stats = this.stats.get(queueName)!;
            stats.processed++;
          } catch (error) {
            await this.nack(queueName, message);
            console.error(`❌ Message processing failed:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Consumer error:`, error);
      }

      // Continue processing
      setImmediate(processMessage);
    };

    processMessage();
  }

  private async ack(queueName: string, message: any): Promise<void> {
    // Message successfully processed
    console.log(`✅ Message acknowledged: ${queueName}`);
  }

  private async nack(queueName: string, message: any): Promise<void> {
    // Requeue or move to dead letter
    const stats = this.stats.get(queueName)!;
    stats.failed++;
    
    if (message.attempts < message.maxAttempts) {
      message.attempts++;
      // Requeue with delay
      setTimeout(() => {
        this.messages.get(queueName)!.push(message);
        this.emit('message', queueName, message);
      }, this.options.retryDelay);
    } else {
      // Move to dead letter queue
      if (!this.deadLetter.has(queueName)) {
        this.deadLetter.set(queueName, []);
      }
      this.deadLetter.get(queueName)!.push(message);
      console.log(`💀 Message moved to dead letter queue: ${queueName}`);
    }
  }

  // Health and monitoring
  getStats(queueName?: string): any {
    if (queueName) {
      return {
        queue: queueName,
        pending: this.messages.get(queueName)?.length || 0,
        deadLetter: this.deadLetter.get(queueName)?.length || 0,
        stats: this.stats.get(queueName) || { processed: 0, failed: 0 }
      };
    }

    const allStats: any = {};
    for (const [name] of this.messages) {
      allStats[name] = this.getStats(name);
    }
    return allStats;
  }

  async close(): Promise<void> {
    this.removeAllListeners();
    this.messages.clear();
    this.processing.clear();
    this.deadLetter.clear();
    this.stats.clear();
  }
}

// Singleton instance
const messageQueue = new InMemoryQueue({
  maxRetries: 3,
  retryDelay: 2000,
  concurrency: 10
});

// Redis-compatible interface
export const cache = {
  async set(key: string, value: any, ttlSeconds?: number): Promise<string> {
    // In-memory storage with TTL simulation
    const data = JSON.stringify(value);
    console.log(`📝 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    return 'OK';
  },

  async get(key: string): Promise<any> {
    console.log(`📖 Cache GET: ${key}`);
    return null; // Simulate cache miss for now
  },

  async lpush: messageQueue.lpush.bind(messageQueue),
  async rpush: messageQueue.rpush.bind(messageQueue),
  async blpop: messageQueue.blpop.bind(messageQueue),
  async llen: messageQueue.llen.bind(messageQueue),

  async close(): Promise<void> {
    await messageQueue.close();
  }
};

// RabbitMQ-compatible interface
export const rabbit = {
  async connect(): Promise<any> {
    console.log('🐰 RabbitMQ (in-memory) connected');
    return { createChannel: () => messageQueue };
  },

  publish: messageQueue.publish.bind(messageQueue),
  consume: messageQueue.consume.bind(messageQueue),
  
  async close(): Promise<void> {
    await messageQueue.close();
  }
};

// Enhanced message queue with workflow support
export class WorkflowQueue extends InMemoryQueue {
  private workflows: Map<string, any> = new Map();

  async startWorkflow(workflowId: string, initialState: any): Promise<void> {
    this.workflows.set(workflowId, {
      id: workflowId,
      state: initialState,
      history: [{ state: initialState, timestamp: Date.now() }],
      status: 'active'
    });

    await this.rpush('workflow_queue', JSON.stringify({
      type: 'workflow_start',
      workflowId,
      state: initialState
    }));
  }

  async updateWorkflow(workflowId: string, newState: any): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.state = newState;
      workflow.history.push({ state: newState, timestamp: Date.now() });
      
      await this.rpush('workflow_queue', JSON.stringify({
        type: 'workflow_update',
        workflowId,
        state: newState
      }));
    }
  }

  getWorkflow(workflowId: string): any {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): any[] {
    return Array.from(this.workflows.values());
  }
}

export const workflowQueue = new WorkflowQueue();

export default messageQueue;