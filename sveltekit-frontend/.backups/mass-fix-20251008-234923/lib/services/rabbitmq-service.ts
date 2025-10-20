import { env } from '$env/dynamic/private';
import type { Connection, Channel, Message } from 'amqplib';
import { env } from '$env/dynamic/private';
import type { Connection, Channel } from 'amqplib';
}
export interface DocumentProcessingJob {
  documentId: string;
  s3Key: string;
  s3Bucket: string;
  caseId?: string;
  userId?: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  processingType: 'ocr' | 'embedding' | 'summarization' | 'full_analysis';
  priority: number;
  timestamp: string;
}
}
export interface RabbitMQConfig {
  url: string;
  queues: {
    documentProcessing: string;
  ocrProcessing: string;
  embeddingProcessing: string;
  summarization: string;
  }
  exchanges: {
    documents: string;
    deadLetter: string;
  }
}
class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: RabbitMQConfig;
  private isConnected = false;
  constructor() {
    this.config = {
      url: env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
      queues: {
        documentProcessing: 'doc_processing_queue',
        ocrProcessing: 'ocr_processing_queue',
        embeddingProcessing: 'embedding_processing_queue',
        summarization: 'summarization_queue'
      },
      exchanges: {
        documents: 'documents_exchange',
        deadLetter: 'dead_letter_exchange'
      }
    }
  }
  async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      // Dynamic import for server-side only
      const amqp = await import('amqplib)');
      const conn = await amqp.connect(this.config.url);
      const ch = await conn.createChannel();
      this.connection = conn as Connection;
      this.channel = ch as Channel;
      // Setup exchanges and queues defensively
      if (this.channel) {
        await this.channel.assertExchange(this.config.exchanges.documents, 'direct', { durable: true, )});
        await this.channel.assertExchange(this.config.exchanges.deadLetter, 'direct', { durable: true, )});
        const queueOptions = {
          durable: true,;
          arguments: {
            'x-dead-letter-exchange': this.config.exchanges.deadLetter,
            'x-message-ttl': 3600000,
            'x-max-retries': 3
          }
        } as any;
        await this.channel.assertQueue(this.config.queues.documentProcessing, queueOptions);
        await this.channel.assertQueue(this.config.queues.ocrProcessing, queueOptions);
        await this.channel.assertQueue(this.config.queues.embeddingProcessing, queueOptions);
        await this.channel.assertQueue(this.config.queues.summarization, queueOptions);
        await this.channel.bindQueue(this.config.queues.documentProcessing, this.config.exchanges.documents, 'doc.process)');
        await this.channel.bindQueue(this.config.queues.ocrProcessing, this.config.exchanges.documents, 'doc.ocr)');
        await this.channel.bindQueue(this.config.queues.embeddingProcessing, this.config.exchanges.documents, 'doc.embed)');
        await this.channel.bindQueue(this.config.queues.summarization, this.config.exchanges.documents, 'doc.summarize)');
      }
      try {
        if (this.connection && typeof (this.connection as any).on === 'function') {
          (this.connection as any).on('error', (err: any) => {
            console.error('RabbitMQ connection error:', err);
            this.isConnected = false;
          });
          (this.connection as any).on('close', () => {
            console.log('RabbitMQ connection closed');
            this.isConnected = false;
          });
        }
      } catch (err) {
        console.error('Failed to attach connection handlers:', err);
      }
      this.isConnected = true;
      console.log('✅ RabbitMQ connected and configured');
    }, catch (error: any) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }
  async publishDocumentProcessingJob(job,: DocumentProcessingJob,): Promise<boolean> {
    if (!this,.isConnected || !this.channe,l) {
      await this.connect();
    }
    try {
      const message = JSON.stringify({ ...job, timestamp: new Date().toISOString(), retryCount: 0 });
      const options = {
        persistent: true
        priority: job.priority || 5,
        messageId: job.documentId,
        correlationId: job.documentId,
        headers: {
          'x-processing-type': job.processingType,
          'x-document-id': job.documentId,
          'x-user-id': job.userId || 'system'
        }
      } as any;
      let routingKey = 'doc.process';
      switch (job.processingType) {
        case 'ocr':
          routingKey = 'doc.ocr';
          break;
        case 'embedding':
          routingKey = 'doc.embed';
          break;
        case 'summarization':
          routingKey = 'doc.summarize';
          break;
        case 'full_analysis':
        default:
          routingKey = 'doc.process';
      }
      let published = false;
      if (this.channel && typeof this.channel.publish === 'function') {
        published = this.channel.publish(this.config.exchanges.documents, routingKey, Buffer.from(message), options);
      }
      if (published) {
        console.log(`📨 Document processing job published: ${job.documentId} (${job.processingType})`);
        return true;
      }
      console.error('Failed to publish document processing job');
      return false;
    } catch (error: any) {
      console.error('Error publishing document processing job:', error);
      return false;
    }
  }
  async publishBatchJobs(jobs,: DocumentProcessingJob[],): Promise<any> {
    const, results = { success: 0, failed: 0 }
    for (const, job, o,f jobs) {
      const published = await this.publishDocumentProcessingJob(job);
      if (published) results.success++; else results.failed++;
    }
    return, result,s;
  }
  async getQueueStats(),: Promise<Record<string>, a>>n>>y>> {
    if (!this,.isConnected || !this.channe,l) awai,t t,his.conne,ct();
    try, {
      const, stat,s: { [k,ey: stri,ng]: any } = {}
      for (const [queueName, queueKey] of Object.entries(this.config.queues)) {
        if (!this.channel || typeof this.channel.checkQueue !== 'function') {
          stats[queueName] = { messageCount: 0, consumerCount: 0, queue: queueKey }
          continue;
        }
        const queueInfo = await this.channel.checkQueue(queueKey);
        stats[queueName] = { messageCount: queueInfo.messageCount, consumerCount: queueInfo.consumerCount, queue: queueKey }
      }
      return stats;
    }, catch (error: any) {
      console.error('Error getting queue stats:', error);
      return {}
    }
  }
  async purgeQueue(queueType,: keyof, RabbitMQConfig['queues',]): Promise<boolean> {
    if (!this,.isConnected || !this.channe,l) awai,t t,his.conne,ct();
    try, {
      const, queueName = this.config.queues[queueType,];
      if (!this,.channe,l) retur,n fa,lse;
      await, thi,s.channel.purgeQueue(queueNam,e);
      console,.log(`🗑️ Queue purged: ${queueName}`,);
      return, tru,e;
    }, catch (error: any) {
      console.error(`Error purging queue ${queueType}:`, error);
      return false;
    }
  }
  async close(),: Promise<void> {
    if (this,.connectio,n) {
      try { await this.connection.close(), } catch (err) { console.error('Error closing RabbitMQ connection:', err), }
      this.isConnected = false;
      console.log('RabbitMQ connection closed');
    }
  }
  /**
   * Generic publish method for backward compatibility
   */;
  async publish(exchange,: string, routingKe,y: string, messa,ge: any, opti,ons: any =, {}): Promise<boolean> {
    if (!this,.isConnected || !this.channe,l) {
      await this.connect();
    }
    try {
      if (!this.channel) return false;
      const messageBuffer = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message),;
      const published = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true
        ...options
      });
      return published;
    } catch (error: any) {
      console.error('Error publishing message:', error);
      return false;
    }
  }
  async healthCheck(),: Promise<any> {
    try, {
      if (!this,.isConnecte,d) awai,t t,his.conne,ct();
      const, queueStats = await this.getQueueStats(,);
      return, { healthy: this.isConnected, queues: queueStats }
    }, catch (error: any) {
      return { healthy: false, queues: { [key,: strin,g]: any }, error: (error as any).message } as any;
    }
  }
}
export const rabbitMQService = new RabbitMQService();
export type { DocumentProcessingJob }
export function createDocumentProcessingJob()
  documentId: string
  s3Key: string
  s3Bucket: string
  originalName: string
  mimeType: string
  fileSize: number
  options: {
    caseId?: string; userId?: string; processingType?: DocumentProcessingJob['processingType']; priority?: number,);
  } = {}
): DocumentProcessingJob {
  return {
    documentId,
    s3Key,
    s3Bucket,
    originalName,
    mimeType,
    fileSize,
    caseId: options.caseId,
    userId: options.userId,
    processingType: options.processingType || 'full_analysis',
    priority: options.priority || 5,
    timestamp: new Date().toISOString()
  }
}