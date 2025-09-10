import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import { cacheManager } from '$lib/services/cache-layer-manager';
import { qdrant } from '../vector/qdrant-manager';
import { analytics } from '../database/connection';

// RabbitMQ Manager for async processing and cache invalidation
export class RabbitMQManager {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly exchanges = {
    cache_invalidation: 'cache.invalidation',
    document_processing: 'document.processing',
    vector_updates: 'vector.updates',
    analytics: 'analytics.events'
  };

  private readonly queues = {
    cache_invalidate: 'cache.invalidate',
    document_embed: 'document.embed',
    evidence_process: 'evidence.process',
    vector_index: 'vector.index',
    chat_context: 'chat.context',
    analytics_track: 'analytics.track'
  };

  constructor(private url = 'amqp://localhost') {}

  // Initialize connection and declare exchanges/queues
  async initialize() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Setup error handling
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.channel.on('error', this.handleChannelError.bind(this));

      // Declare exchanges
      for (const [name, exchange] of Object.entries(this.exchanges)) {
        await this.channel.assertExchange(exchange, 'topic', {
          durable: true
        });
        console.log(`✅ RabbitMQ exchange declared: ${exchange}`);
      }

      // Declare queues
      for (const [name, queue] of Object.entries(this.queues)) {
        await this.channel.assertQueue(queue, {
          durable: true,
          arguments: {
            'x-message-ttl': 300000, // 5 minutes TTL
            'x-max-retries': 3
          }
        });
        console.log(`✅ RabbitMQ queue declared: ${queue}`);
      }

      // Setup queue bindings
      await this.setupQueueBindings();

      // Start consumers
      await this.startConsumers();

      console.log('🚀 RabbitMQ Manager initialized successfully');
      return true;

    } catch (error: any) {
      console.error('❌ RabbitMQ initialization failed:', error);
      return false;
    }
  }

  // Setup routing between exchanges and queues
  private async setupQueueBindings() {
    if (!this.channel) return;

    const bindings = [
      // Cache invalidation
      {
        queue: this.queues.cache_invalidate,
        exchange: this.exchanges.cache_invalidation,
        routingKey: '*.invalidate'
      },

      // Document processing
      {
        queue: this.queues.document_embed,
        exchange: this.exchanges.document_processing,
        routingKey: 'document.embed'
      },
      {
        queue: this.queues.evidence_process,
        exchange: this.exchanges.document_processing,
        routingKey: 'evidence.*'
      },

      // Vector operations
      {
        queue: this.queues.vector_index,
        exchange: this.exchanges.vector_updates,
        routingKey: 'vector.index.*'
      },
      {
        queue: this.queues.chat_context,
        exchange: this.exchanges.vector_updates,
        routingKey: 'chat.context.*'
      },

      // Analytics
      {
        queue: this.queues.analytics_track,
        exchange: this.exchanges.analytics,
        routingKey: 'analytics.*'
      }
    ];

    for (const binding of bindings) {
      await this.channel.bindQueue(
        binding.queue,
        binding.exchange,
        binding.routingKey
      );
    }
  }

  // Start all consumers
  private async startConsumers() {
    if (!this.channel) return;

    // Cache invalidation consumer
    await this.channel.consume(this.queues.cache_invalidate,
      this.handleCacheInvalidation.bind(this), { noAck: false });

    // Document embedding consumer
    await this.channel.consume(this.queues.document_embed,
      this.handleDocumentEmbedding.bind(this), { noAck: false });

    // Evidence processing consumer
    await this.channel.consume(this.queues.evidence_process,
      this.handleEvidenceProcessing.bind(this), { noAck: false });

    // Vector indexing consumer
    await this.channel.consume(this.queues.vector_index,
      this.handleVectorIndexing.bind(this), { noAck: false });

    // Chat context consumer
    await this.channel.consume(this.queues.chat_context,
      this.handleChatContext.bind(this), { noAck: false });

    // Analytics consumer
    await this.channel.consume(this.queues.analytics_track,
      this.handleAnalytics.bind(this), { noAck: false });

    console.log('👂 All RabbitMQ consumers started');
  }

  // Publishers for different event types
  async publishCacheInvalidation(data: {
    type: 'document' | 'evidence' | 'case' | 'chat';
    id: string;
    keys?: string[];
  }) {
    const routingKey = `${data.type}.invalidate`;
    await this.publish(this.exchanges.cache_invalidation, routingKey, {
      ...data,
      timestamp: Date.now()
    });
  }

  async publishDocumentProcessing(data: {
    document_id: string;
    content: string;
    document_type: string;
    case_id?: string;
  }) {
    await this.publish(this.exchanges.document_processing, 'document.embed', {
      ...data,
      timestamp: Date.now(),
      priority: 'normal'
    });
  }

  async publishEvidenceProcessing(data: {
    evidence_id: string;
    content: string;
    case_id: string;
    priority: 'low' | 'normal' | 'high';
  }) {
    const routingKey = `evidence.${data.priority}`;
    await this.publish(this.exchanges.document_processing, routingKey, {
      ...data,
      timestamp: Date.now()
    });
  }

  async publishVectorUpdate(data: {
    type: 'index' | 'similarity' | 'cache';
    collection: string;
    id: string;
    embedding?: number[];
    metadata?: any;
  }) {
    const routingKey = `vector.${data.type}.${data.collection}`;
    await this.publish(this.exchanges.vector_updates, routingKey, {
      ...data,
      timestamp: Date.now()
    });
  }

  async publishChatContext(data: {
    user_id: string;
    session_id: string;
    message: string;
    embedding: number[];
    context_type: 'new' | 'update';
  }) {
    const routingKey = `chat.context.${data.context_type}`;
    await this.publish(this.exchanges.vector_updates, routingKey, {
      ...data,
      timestamp: Date.now()
    });
  }

  // Analytics event publisher used by search and other APIs
  async publishAnalyticsEvent(data: {
    event_type: string;
    event_data: any;
    response_time_ms?: number;
    cache_hit?: boolean;
  }) {
    const routingKey = 'analytics.event';
    await this.publish(this.exchanges.analytics, routingKey, {
      ...data,
      timestamp: Date.now()
    });
  }

  // Generic publish method
  private async publish(exchange: string, routingKey: string, data: any) {
    if (!this.channel) {
      console.error('RabbitMQ channel not available');
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));
      await this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        timestamp: Date.now()
      });

      console.log(`📤 Published to ${exchange}:${routingKey}`);
    } catch (error: any) {
      console.error('Failed to publish message:', error);
    }
  }

  // Message handlers/consumers
  private async handleCacheInvalidation(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const { type, id, keys } = data;

      console.log(`🗑️ Cache invalidation: ${type}:${id}`);

      // Invalidate specific cache keys
      if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          await cacheManager.set(key, null, type, 0); // Expire immediately
        }
      } else {
        // Pattern-based invalidation
        const patterns = this.getCachePatterns(type, id);
        for (const pattern of patterns) {
          // Implementation would depend on cache manager
          console.log(`Invalidating cache pattern: ${pattern}`);
        }
      }

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Cache invalidation error:', error);
      this.channel?.nack(msg, false, true); // Requeue
    }
  }

  private async handleDocumentEmbedding(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const { document_id, content, document_type, case_id } = data;

      console.log(`📄 Processing document embedding: ${document_id}`);

      // Generate embeddings (this would call your embedding service)
      const contentEmbedding = await this.generateEmbedding(content);
      const summary = content.substring(0, 500);
      const summaryEmbedding = await this.generateEmbedding(summary);

      // Store in Qdrant
      await qdrant.storeDocument({
        id: document_id,
        title: `Document ${document_id}`,
        content,
        contentEmbedding,
        summaryEmbedding,
        metadata: {
          document_type,
          case_id,
          processed_at: new Date().toISOString()
        }
      });

      // Invalidate related caches
      await this.publishCacheInvalidation({
        type: 'document',
        id: document_id,
        keys: [`document:${document_id}`, `case:${case_id}:documents`]
      });

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Document embedding error:', error);
      this.channel?.nack(msg, false, true);
    }
  }

  private async handleEvidenceProcessing(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const { evidence_id, content, case_id, priority } = data;

      console.log(`🔍 Processing evidence: ${evidence_id} (${priority})`);

      // Generate embedding for evidence
      const embedding = await this.generateEmbedding(content);

      // Find related evidence
      const relatedEvidence = await qdrant.findRelatedEvidence(
        evidence_id,
        embedding,
        5
      );

      // Update evidence relationships in database
      // Implementation would update the evidence table with related items

      // Invalidate evidence caches
      await this.publishCacheInvalidation({
        type: 'evidence',
        id: evidence_id,
        keys: [`evidence:${evidence_id}`, `case:${case_id}:evidence`]
      });

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Evidence processing error:', error);
      this.channel?.nack(msg, false, true);
    }
  }

  private async handleVectorIndexing(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());
      console.log(`🔢 Vector indexing: ${data.type} in ${data.collection}`);

      // Handle different vector operations
      switch (data.type) {
        case 'index':
          // Index new vectors
          break;
        case 'similarity':
          // Update similarity cache
          break;
        case 'cache':
          // Cache embeddings
          if (data.embedding) {
            await qdrant.cacheEmbedding(data.id, data.embedding, data.metadata || {});
          }
          break;
      }

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Vector indexing error:', error);
      this.channel?.nack(msg, false, true);
    }
  }

  private async handleChatContext(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const { user_id, session_id, message, embedding, context_type } = data;

      console.log(`💬 Chat context ${context_type}: ${user_id}`);

      // Store chat message with embedding in Qdrant for contextual search
      await qdrant.batchUpsert({
        collection: 'chat_history',
        points: [{
          id: `${session_id}-${Date.now()}`,
          vector: {
            message: embedding
          },
          payload: {
            user_id,
            session_id,
            content: message,
            created_at: new Date().toISOString(),
            context_type
          }
        }]
      });

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Chat context error:', error);
      this.channel?.nack(msg, false, true);
    }
  }

  private async handleAnalytics(msg: amqp.ConsumeMessage | null) {
    if (!msg || !this.channel) return;

    try {
      const data = JSON.parse(msg.content.toString());

      // Track analytics asynchronously
      await analytics.trackEvent(data.event_type, data.event_data, {
        responseTimeMs: data.response_time_ms,
        cacheHit: data.cache_hit,
        cacheLayer: data.cache_layer
      });

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('Analytics tracking error:', error);
      this.channel?.nack(msg, false, false); // Don't requeue analytics
    }
  }

  // Helper methods
  private getCachePatterns(type: string, id: string): string[] {
    switch (type) {
      case 'document':
        return [`document:${id}`, `documents:*`, `search:*document*`];
      case 'evidence':
        return [`evidence:${id}`, `evidence:*`, `search:*evidence*`];
      case 'case':
        return [`case:${id}`, `cases:*`, `timeline:${id}`];
      default:
        return [`${type}:${id}`];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - implement with your embedding service
    // Could be OpenAI, local model, etc.
    return new Array(1536).fill(0.1);
  }

  // Error handlers
  private handleConnectionError(error: Error) {
    console.error('RabbitMQ connection error:', error);
    // Implement reconnection logic
  }

  private handleChannelError(error: Error) {
    console.error('RabbitMQ channel error:', error);
    // Implement channel recovery logic
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.connection || !this.channel) {
        return { status: 'disconnected' };
      }

      // Simple health check by asserting a test queue
      await this.channel.checkQueue(this.queues.cache_invalidate);

      return {
        status: 'healthy',
        connection: 'active',
        channel: 'active',
        exchanges: Object.keys(this.exchanges).length,
        queues: Object.keys(this.queues).length
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Graceful shutdown
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('RabbitMQ connection closed gracefully');
    } catch (error: any) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

// Singleton instance
export const rabbitmq = new RabbitMQManager();

// Initialize on module load in server environment
if (typeof window === 'undefined') {
  rabbitmq.initialize().catch(console.error);
}