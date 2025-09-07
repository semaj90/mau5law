/**
 * RabbitMQ Service Worker
 * Handles background message processing for the legal AI platform
 */

import { rabbitmqService, QUEUES, type MessageHandler } from '$lib/server/messaging/rabbitmq-service.js';
import { publishToQueue } from '$lib/server/rabbitmq.js';

export interface ServiceWorkerConfig {
  enableLogging?: boolean;
  maxRetries?: number;
  processingTimeout?: number;
  enableN64Logging?: boolean;
}

export class RabbitMQServiceWorker {
  private static instance: RabbitMQServiceWorker;
  private config: Required<ServiceWorkerConfig>;
  private handlers = new Map<string, MessageHandler>();
  private isRunning = false;
  private processingStats = {
    messagesProcessed: 0,
    errors: 0,
    startTime: Date.now(),
    avgProcessingTime: 0
  };

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      maxRetries: config.maxRetries ?? 3,
      processingTimeout: config.processingTimeout ?? 30000,
      enableN64Logging: config.enableN64Logging ?? false
    };
  }

  static getInstance(config?: ServiceWorkerConfig): RabbitMQServiceWorker {
    if (!RabbitMQServiceWorker.instance) {
      RabbitMQServiceWorker.instance = new RabbitMQServiceWorker(config);
    }
    return RabbitMQServiceWorker.instance;
  }

  private log(message: string, type: 'info' | 'error' | 'success' = 'info') {
    if (!this.config.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = this.config.enableN64Logging ? '🎮 [RabbitMQ Worker]' : '[RabbitMQ Worker]';
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌ ${timestamp}: ${message}`);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${timestamp}: ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️ ${timestamp}: ${message}`);
    }
  }

  /**
   * Register a message handler for a specific queue
   */
  registerHandler(queueName: string, handler: MessageHandler): void {
    this.handlers.set(queueName, handler);
    this.log(`Handler registered for queue: ${queueName}`);
  }

  /**
   * Start the service worker and begin consuming messages
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Worker already running', 'info');
      return;
    }

    try {
      // Connect to RabbitMQ
      const connected = await rabbitmqService.connect();
      if (!connected) {
        throw new Error('Failed to connect to RabbitMQ');
      }

      this.isRunning = true;
      this.processingStats.startTime = Date.now();

      // Setup default handlers
      this.setupDefaultHandlers();

      // Start consuming messages from registered queues
      for (const [queueName, handler] of this.handlers) {
        await this.startConsumer(queueName, handler);
      }

      this.log(this.config.enableN64Logging ? 
        '🎮 RABBITMQ WORKER ONLINE - READY FOR LEGAL AI PROCESSING!' : 
        'RabbitMQ Service Worker started successfully', 'success');

    } catch (error: any) {
      this.isRunning = false;
      this.log(`Failed to start worker: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Stop the service worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    await rabbitmqService.disconnect();
    
    this.log(this.config.enableN64Logging ? 
      '🎮 RABBITMQ WORKER SHUTDOWN COMPLETE' : 
      'RabbitMQ Service Worker stopped', 'success');
  }

  /**
   * Start consuming messages from a specific queue
   */
  private async startConsumer(queueName: string, handler: MessageHandler): Promise<void> {
    await rabbitmqService.consume(queueName, async (message, originalMessage) => {
      const startTime = Date.now();

      try {
        this.log(`Processing message from ${queueName}: ${JSON.stringify(message).substring(0, 100)}...`);

        // Add timeout wrapper
        await Promise.race([
          handler(message, originalMessage),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Processing timeout')), this.config.processingTimeout)
          )
        ]);

        const processingTime = Date.now() - startTime;
        this.processingStats.messagesProcessed++;
        this.updateAvgProcessingTime(processingTime);

        this.log(`Message processed successfully in ${processingTime}ms`, 'success');

      } catch (error: any) {
        this.processingStats.errors++;
        this.log(`Error processing message from ${queueName}: ${error.message}`, 'error');
        
        // Handle retry logic here if needed
        throw error;
      }
    });
  }

  /**
   * Setup default message handlers for legal AI operations
   */
  private setupDefaultHandlers(): void {
    // Document processing handler
    this.registerHandler(QUEUES.DOCUMENT_PROCESSING, async (message) => {
      this.log(`🧠 Processing document: ${message.documentId || 'unknown'}`);
      
      // Simulate document processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Publish to next stage
      await publishToQueue(QUEUES.VECTOR_EMBEDDING, {
        ...message,
        stage: 'embedding_ready',
        processedAt: Date.now()
      });
    });

    // File upload handler
    this.registerHandler(QUEUES.FILE_UPLOAD, async (message) => {
      this.log(`📁 Processing file upload: ${message.fileName || 'unknown'}`);
      
      // Handle file upload processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (message.evidenceId) {
        await publishToQueue(QUEUES.EVIDENCE_ANALYSIS, {
          evidenceId: message.evidenceId,
          fileName: message.fileName,
          stage: 'analysis_ready',
          cudaAccelerated: message.cudaAccelerated || false
        });
      }
    });

    // Vector embedding handler
    this.registerHandler(QUEUES.VECTOR_EMBEDDING, async (message) => {
      this.log(`🔤 Generating embeddings for: ${message.documentId || 'unknown'}`);
      
      // Simulate embedding generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await publishToQueue(QUEUES.SEARCH_INDEXING, {
        ...message,
        embeddings: 'generated',
        stage: 'indexing_ready'
      });
    });

    // Evidence analysis handler
    this.registerHandler(QUEUES.EVIDENCE_ANALYSIS, async (message) => {
      this.log(`🔍 Analyzing evidence: ${message.evidenceId || 'unknown'}`);
      
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await publishToQueue(QUEUES.CASE_UPDATES, {
        caseId: message.caseId,
        evidenceId: message.evidenceId,
        analysisComplete: true,
        insights: {
          confidence: 0.85,
          keyEntities: ['contract', 'signature', 'date'],
          summary: 'Legal document analysis completed'
        }
      });
    });

    // RAG processing handler
    this.registerHandler(QUEUES.RAG_PROCESSING, async (message) => {
      this.log(`🤖 RAG processing query: ${message.query?.substring(0, 50) || 'unknown'}...`);
      
      // Simulate RAG processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Could publish result back to a response queue
    });

    // Email notifications handler
    this.registerHandler(QUEUES.EMAIL_NOTIFICATIONS, async (message) => {
      this.log(`📧 Sending notification: ${message.type || 'unknown'}`);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 800));
    });

    // Search indexing handler
    this.registerHandler(QUEUES.SEARCH_INDEXING, async (message) => {
      this.log(`🔍 Indexing for search: ${message.documentId || 'unknown'}`);
      
      // Simulate search index update
      await new Promise(resolve => setTimeout(resolve, 1200));
    });

    // Case updates handler
    this.registerHandler(QUEUES.CASE_UPDATES, async (message) => {
      this.log(`⚖️ Processing case update: ${message.caseId || 'unknown'}`);
      
      // Simulate case update processing
      await new Promise(resolve => setTimeout(resolve, 600));
    });
  }

  /**
   * Update average processing time statistics
   */
  private updateAvgProcessingTime(processingTime: number): void {
    const currentAvg = this.processingStats.avgProcessingTime;
    const messageCount = this.processingStats.messagesProcessed;
    
    this.processingStats.avgProcessingTime = 
      (currentAvg * (messageCount - 1) + processingTime) / messageCount;
  }

  /**
   * Get worker performance statistics
   */
  getStats(): typeof this.processingStats & { uptime: number; isRunning: boolean } {
    return {
      ...this.processingStats,
      uptime: Date.now() - this.processingStats.startTime,
      isRunning: this.isRunning
    };
  }

  /**
   * Health check for the service worker
   */
  async healthCheck(): Promise<{ status: string; stats: any; rabbitmq: any }> {
    const rabbitmqHealth = await rabbitmqService.healthCheck();
    const stats = this.getStats();

    return {
      status: this.isRunning && rabbitmqHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      stats,
      rabbitmq: rabbitmqHealth
    };
  }

  /**
   * Publish a message to a queue (convenience method)
   */
  async publishMessage(queueName: string, message: any): Promise<boolean> {
    try {
      const success = await rabbitmqService.publish(queueName, {
        ...message,
        publishedAt: Date.now(),
        workerVersion: '1.0.0'
      });

      if (success) {
        this.log(`Message published to ${queueName}`, 'success');
      } else {
        this.log(`Failed to publish message to ${queueName}`, 'error');
      }

      return success;
    } catch (error: any) {
      this.log(`Error publishing to ${queueName}: ${error.message}`, 'error');
      return false;
    }
  }
}

// Export singleton instance
export const rabbitmqServiceWorker = RabbitMQServiceWorker.getInstance();

// Export utility functions
export async function startRabbitMQWorker(config?: ServiceWorkerConfig): Promise<RabbitMQServiceWorker> {
  const worker = RabbitMQServiceWorker.getInstance(config);
  await worker.start();
  return worker;
}

export async function stopRabbitMQWorker(): Promise<void> {
  await rabbitmqServiceWorker.stop();
}

export { QUEUES };