// RabbitMQ Message Queue Service for Legal Document Processing
// Provides reliable message queuing with dead letter exchanges and retry logic

import amqp from 'amqplib';
import { logger } from '../ai/logger';
import { EventEmitter } from 'events';

export interface LegalDocumentMessage {
  id: string;
  documentId: string;
  caseId: string;
  documentType: 'contract' | 'evidence' | 'brief' | 'citation' | 'discovery';
  content: string;
  metadata: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  timestamp: number;
}

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  result?: any;
  error?: string;
  processingTime: number;
}

export type MessageHandler = (message: any, originalMessage?: any) => Promise<any> | any;

class RabbitMQService extends EventEmitter {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  // Queue configurations for legal document processing
  private queues = {
    documentIngestion: 'legal.document.ingestion',
    documentAnalysis: 'legal.document.analysis',
    vectorEmbedding: 'legal.vector.embedding',
    contractAnalysis: 'legal.contract.analysis',
    evidenceProcessing: 'legal.evidence.processing',
    citationExtraction: 'legal.citation.extraction',
    urgentProcessing: 'legal.urgent.processing',
    dlxDocumentIngestion: 'legal.dlx.document.ingestion',
    dlxDocumentAnalysis: 'legal.dlx.document.analysis',
    processingResults: 'legal.processing.results',
    notifications: 'legal.notifications',
  };

  private exchanges = {
    legal: 'legal.direct',
    legalTopic: 'legal.topic',
    dlx: 'legal.dlx',
  };

  constructor(url = 'amqp://localhost:5672') {
    super();
    this.url = url;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[RabbitMQ] Connecting to RabbitMQ server...');
      
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      await this.channel.prefetch(10);
      await this.setupExchanges();
      await this.setupQueues();
      await this.setupBindings();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('[RabbitMQ] ✅ Connected and configured successfully');
      this.emit('connected');
      
    } catch (error) {
      logger.error('[RabbitMQ] Failed to initialize:', error);
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');
    
    await this.channel.assertExchange(this.exchanges.legal, 'direct', { durable: true });
    await this.channel.assertExchange(this.exchanges.legalTopic, 'topic', { durable: true });
    await this.channel.assertExchange(this.exchanges.dlx, 'direct', { durable: true });
    
    logger.info('[RabbitMQ] Exchanges created successfully');
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');
    
    const queueConfig = {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.exchanges.dlx,
        'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours
      },
    };
    
    for (const [key, queueName] of Object.entries(this.queues)) {
      await this.channel.assertQueue(queueName, queueConfig);
    }
    
    logger.info('[RabbitMQ] Queues created successfully');
  }

  private async setupBindings(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');
    
    const bindings = [
      { queue: this.queues.documentIngestion, routingKey: 'document.ingest' },
      { queue: this.queues.documentAnalysis, routingKey: 'document.analyze' },
      { queue: this.queues.vectorEmbedding, routingKey: 'vector.embed' },
      { queue: this.queues.contractAnalysis, routingKey: 'contract.analyze' },
      { queue: this.queues.evidenceProcessing, routingKey: 'evidence.process' },
      { queue: this.queues.citationExtraction, routingKey: 'citation.extract' },
      { queue: this.queues.urgentProcessing, routingKey: 'urgent.*' },
    ];
    
    for (const binding of bindings) {
      await this.channel.bindQueue(binding.queue, this.exchanges.legal, binding.routingKey);
    }
    
    logger.info('[RabbitMQ] Queue bindings configured successfully');
  }

  async publishDocumentForAnalysis(document: LegalDocumentMessage): Promise<boolean> {
    if (!this.isConnected || !this.channel) return false;
    
    try {
      const routingKey = this.getRoutingKey(document);
      const messageBuffer = Buffer.from(JSON.stringify(document));
      
      const published = await this.channel.publish(
        this.exchanges.legal,
        routingKey,
        messageBuffer,
        { persistent: true, timestamp: Date.now() }
      );
      
      if (published) {
        logger.info(`[RabbitMQ] Published document ${document.id}`);
        this.emit('messagePublished', { documentId: document.id, routingKey });
      }
      
      return published;
    } catch (error) {
      logger.error('[RabbitMQ] Failed to publish message:', error);
      return false;
    }
  }

  private getRoutingKey(document: LegalDocumentMessage): string {
    if (document.priority === 'urgent') return 'urgent.processing';
    
    switch (document.documentType) {
      case 'contract': return 'contract.analyze';
      case 'evidence': return 'evidence.process';  
      case 'citation': return 'citation.extract';
      default: return 'document.analyze';
    }
  }

  async getQueueStats(): Promise<Record<string, any>> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ not connected');
    }
    
    const stats: Record<string, any> = {};
    
    for (const [key, queueName] of Object.entries(this.queues)) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        stats[key] = {
          queue: queueName,
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
        };
      } catch (error) {
        stats[key] = { error: 'Queue not found' };
      }
    }
    
    return stats;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get queueNames() {
    return this.queues;
  }

  /**
   * Health check method for compatibility
   */
  async healthCheck(): Promise<{ healthy: boolean; queues?: any }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const queueStats = await this.getQueueStats();
      return { healthy: this.isConnected, queues: queueStats };
    } catch (error) {
      return { healthy: false, error: (error as any).message };
    }
  }

  /**
   * Generic publish method for compatibility
   */
  async publish(exchange: string, routingKey: string, message: any, options: any = {}): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }

    try {
      if (!this.channel) return false;

      const messageBuffer = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
      const published = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        ...options
      });

      return published;
    } catch (error) {
      logger.error('[RabbitMQ] Failed to publish message:', error);
      return false;
    }
  }
}

export const rabbitmqService = new RabbitMQService();
