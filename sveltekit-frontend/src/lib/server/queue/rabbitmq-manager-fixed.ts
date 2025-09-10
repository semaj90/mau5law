import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { EventEmitter } from 'events';

// Import using module syntax to avoid circular dependencies
const redisServicePromise = import('../redis-service.js').then(m => m.redisService).catch(() => null);
const lokiRedisPromise = import('$lib/cache/loki-redis-integration.js').then(m => m.lokiRedisCache).catch(() => null);
const ragPipelinePromise = import('$lib/services/enhanced-rag-pipeline.js').then(m => m.enhancedRAGPipeline).catch(() => null);
const searchEnginePromise = import('$lib/services/instant-search-engine.js').then(m => m.instantSearchEngine).catch(() => null);
const dbPromise = import('../db/drizzle.js').then(m => ({ db: m.db, sql: m.sql })).catch(() => null);
const schemaPromise = import('../db/schema-postgres.js').then(m => m).catch(() => null);

// Enhanced RabbitMQ Manager with improved error handling and type safety
export class RabbitMQManager extends EventEmitter {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private embeddings: OllamaEmbeddings;
  private isInitialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Services (loaded dynamically to avoid circular dependencies)
  private redisService: any = null;
  private lokiRedisCache: any = null;
  private enhancedRAGPipeline: any = null;
  private instantSearchEngine: any = null;
  private db: any = null;
  private sql: any = null;
  private schema: any = null;

  private readonly exchanges = {
    cache_invalidation: 'cache.invalidation',
    document_processing: 'document.processing',
    vector_updates: 'vector.updates',
    analytics: 'analytics.events',
  };

  private readonly queues = {
    cache_invalidate: 'cache.invalidate',
    document_embed: 'document.embed',
    evidence_process: 'evidence.process',
    vector_index: 'vector.index',
    chat_context: 'chat.context',
    analytics_track: 'analytics.track',
  };

  constructor(private url = 'amqp://localhost:5672') {
    super();
    
    // Initialize Gemma embeddings
    this.embeddings = new OllamaEmbeddings({
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: 'embeddinggemma:latest', // Primary Gemma embedding model
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('connection_lost', () => {
      console.warn('🔄 RabbitMQ connection lost, attempting to reconnect...');
      this.attemptReconnect();
    });
  }

  // Initialize connection and load services
  async initialize(): Promise<boolean> {
    try {
      // Load services dynamically
      await this.loadServices();

      // Connect to RabbitMQ
      await this.connect();

      // Setup exchanges and queues
      await this.setupInfrastructure();

      // Start consumers
      await this.startConsumers();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('🚀 RabbitMQ Manager initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ RabbitMQ initialization failed:', error.message);
      return false;
    }
  }

  private async loadServices(): Promise<void> {
    try {
      console.log('📦 Loading services...');
      
      this.redisService = await redisServicePromise;
      this.lokiRedisCache = await lokiRedisPromise;
      this.enhancedRAGPipeline = await ragPipelinePromise;
      this.instantSearchEngine = await searchEnginePromise;
      
      const dbModule = await dbPromise;
      if (dbModule) {
        this.db = dbModule.db;
        this.sql = dbModule.sql;
      }
      
      this.schema = await schemaPromise;

      console.log('✅ Services loaded successfully');
    } catch (error: any) {
      console.warn('⚠️ Some services failed to load:', error.message);
      // Continue without failing services
    }
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Setup error handling
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', () => {
        this.emit('connection_lost');
      });

      this.channel.on('error', this.handleChannelError.bind(this));

      console.log('✅ RabbitMQ connected');
    } catch (error: any) {
      throw new Error(`RabbitMQ connection failed: ${error.message}`);
    }
  }

  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');

    // Declare exchanges
    for (const [name, exchange] of Object.entries(this.exchanges)) {
      await this.channel.assertExchange(exchange, 'topic', {
        durable: true,
      });
      console.log(`✅ Exchange declared: ${exchange}`);
    }

    // Declare queues
    for (const [name, queue] of Object.entries(this.queues)) {
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 300000, // 5 minutes TTL
          'x-max-retries': 3,
        },
      });
      console.log(`✅ Queue declared: ${queue}`);
    }

    // Setup queue bindings
    await this.setupQueueBindings();
  }

  private async setupQueueBindings(): Promise<void> {
    if (!this.channel) return;

    const bindings = [
      // Cache invalidation
      {
        queue: this.queues.cache_invalidate,
        exchange: this.exchanges.cache_invalidation,
        routingKey: '*.invalidate',
      },

      // Document processing
      {
        queue: this.queues.document_embed,
        exchange: this.exchanges.document_processing,
        routingKey: 'document.embed',
      },
      {
        queue: this.queues.evidence_process,
        exchange: this.exchanges.document_processing,
        routingKey: 'evidence.*',
      },

      // Vector operations
      {
        queue: this.queues.vector_index,
        exchange: this.exchanges.vector_updates,
        routingKey: 'vector.index.*',
      },
      {
        queue: this.queues.chat_context,
        exchange: this.exchanges.vector_updates,
        routingKey: 'chat.context.*',
      },

      // Analytics
      {
        queue: this.queues.analytics_track,
        exchange: this.exchanges.analytics,
        routingKey: 'analytics.*',
      },
    ];

    for (const binding of bindings) {
      await this.channel.bindQueue(binding.queue, binding.exchange, binding.routingKey);
    }

    console.log('✅ Queue bindings configured');
  }

  private async startConsumers(): Promise<void> {
    if (!this.channel) return;

    const consumers = [
      { queue: this.queues.cache_invalidate, handler: this.handleCacheInvalidation.bind(this) },
      { queue: this.queues.document_embed, handler: this.handleDocumentEmbedding.bind(this) },
      { queue: this.queues.evidence_process, handler: this.handleEvidenceProcessing.bind(this) },
      { queue: this.queues.vector_index, handler: this.handleVectorIndexing.bind(this) },
      { queue: this.queues.chat_context, handler: this.handleChatContext.bind(this) },
      { queue: this.queues.analytics_track, handler: this.handleAnalytics.bind(this) },
    ];

    for (const consumer of consumers) {
      await this.channel.consume(consumer.queue, consumer.handler, { noAck: false });
    }

    console.log('👂 All RabbitMQ consumers started');
  }

  // Publishers for different event types
  async publishCacheInvalidation(data: {
    type: 'document' | 'evidence' | 'case' | 'chat';
    id: string;
    keys?: string[];
  }): Promise<void> {
    if (!this.isReady()) return;

    const routingKey = `${data.type}.invalidate`;
    await this.publish(this.exchanges.cache_invalidation, routingKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async publishDocumentProcessing(data: {
    document_id: string;
    content: string;
    document_type: string;
    case_id?: string;
  }): Promise<void> {
    if (!this.isReady()) return;

    await this.publish(this.exchanges.document_processing, 'document.embed', {
      ...data,
      timestamp: Date.now(),
      priority: 'normal',
    });
  }

  async publishEvidenceProcessing(data: {
    evidence_id: string;
    content: string;
    case_id: string;
    priority: 'low' | 'normal' | 'high';
  }): Promise<void> {
    if (!this.isReady()) return;

    const routingKey = `evidence.${data.priority}`;
    await this.publish(this.exchanges.document_processing, routingKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async publishVectorUpdate(data: {
    type: 'index' | 'similarity' | 'cache';
    collection: string;
    id: string;
    embedding?: number[];
    metadata?: any;
  }): Promise<void> {
    if (!this.isReady()) return;

    const routingKey = `vector.${data.type}.${data.collection}`;
    await this.publish(this.exchanges.vector_updates, routingKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async publishChatContext(data: {
    user_id: string;
    session_id: string;
    message: string;
    embedding: number[];
    context_type: 'new' | 'update';
  }): Promise<void> {
    if (!this.isReady()) return;

    const routingKey = `chat.context.${data.context_type}`;
    await this.publish(this.exchanges.vector_updates, routingKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async publishAnalyticsEvent(data: {
    event_type: string;
    event_data: any;
    response_time_ms?: number;
    cache_hit?: boolean;
  }): Promise<void> {
    if (!this.isReady()) return;

    const routingKey = 'analytics.event';
    await this.publish(this.exchanges.analytics, routingKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  // Generic publish method with error handling
  private async publish(exchange: string, routingKey: string, data: any): Promise<void> {
    if (!this.channel) {
      console.error('❌ RabbitMQ channel not available for publish');
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));
      const success = this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        timestamp: Date.now(),
      });

      if (!success) {
        console.warn(`⚠️ RabbitMQ publish backpressure: ${exchange}:${routingKey}`);
      } else {
        console.log(`📤 Published to ${exchange}:${routingKey}`);
      }
    } catch (error: any) {
      console.error(`❌ Publish failed for ${exchange}:${routingKey}:`, error.message);
    }
  }

  // Message handlers with improved error handling
  private async handleCacheInvalidation(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      const { type, id, keys } = data;

      console.log(`🗑️ Cache invalidation: ${type}:${id}`);

      // Invalidate specific cache keys
      if (keys && Array.isArray(keys)) {
        await this.invalidateSpecificKeys(keys);
      } else {
        await this.invalidateByPattern(type, id);
      }

      // Clear search cache
      if (this.instantSearchEngine?.clearCache) {
        await this.instantSearchEngine.clearCache();
      }

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Cache invalidation error:', error.message);
      this.safeNack(msg);
    }
  }

  private async handleDocumentEmbedding(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      const { document_id, content, document_type, case_id, title = null } = data;

      console.log(`📄 Processing document embedding: ${document_id}`);

      // Generate document data
      const docData = {
        id: document_id,
        title: title || `Document ${document_id}`,
        documentType: document_type,
        content,
        fullText: content,
        caseId: case_id,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Index with RAG pipeline if available
      if (this.enhancedRAGPipeline?.indexDocument) {
        const indexResult = await this.enhancedRAGPipeline.indexDocument(docData);
        if (indexResult.success) {
          console.log(`✅ Document ${document_id} indexed with ${indexResult.chunksCreated} chunks`);
        }
      }

      // Store in Loki cache if available
      if (this.lokiRedisCache?.storeDocument) {
        await this.lokiRedisCache.storeDocument({
          id: document_id,
          type: document_type,
          size: content.length,
          priority: 100,
          riskLevel: 'medium',
          confidenceLevel: 0.85,
          metadata: {
            title: docData.title,
            description: content.substring(0, 200),
            keywords: [],
            jurisdiction: 'Unknown',
          },
          cacheTimestamp: Date.now(),
          accessCount: 1,
          cacheLocation: 'loki',
          compressed: false,
          syncStatus: 'synced',
        });
      }

      // Update instant search if available
      if (this.instantSearchEngine?.addDocument) {
        await this.instantSearchEngine.addDocument({
          id: document_id,
          title: docData.title,
          content,
          type: document_type,
          metadata: {
            case_id,
            document_type,
            processed_at: new Date().toISOString(),
          },
        });
      }

      // Invalidate related caches
      await this.publishCacheInvalidation({
        type: 'document',
        id: document_id,
        keys: [`document:${document_id}`, `case:${case_id}:documents`, `search:*`],
      });

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Document embedding error:', error.message);
      this.safeNack(msg);
    }
  }

  private async handleEvidenceProcessing(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      const { evidence_id, content, case_id, priority, evidence_type = 'document' } = data;

      console.log(`🔍 Processing evidence: ${evidence_id} (${priority})`);

      // Generate embedding using Gemma
      const embedding = await this.embeddings.embedQuery(content);

      // Store in database if available
      if (this.db && this.schema?.evidenceVectors) {
        try {
          await this.db
            .insert(this.schema.evidenceVectors)
            .values({
              evidenceId: evidence_id,
              content,
              embedding: `[${embedding.join(',')}]`,
              metadata: {
                evidence_type,
                case_id,
                priority,
                processed_at: new Date().toISOString(),
              },
            })
            .onConflictDoUpdate({
              target: [this.schema.evidenceVectors.evidenceId],
              set: {
                content,
                embedding: `[${embedding.join(',')}]`,
                metadata: {
                  evidence_type,
                  case_id,
                  priority,
                  processed_at: new Date().toISOString(),
                },
              },
            });
        } catch (dbError: any) {
          console.warn('⚠️ Database storage failed:', dbError.message);
        }
      }

      // Store in Loki cache
      if (this.lokiRedisCache?.storeDocument) {
        await this.lokiRedisCache.storeDocument({
          id: evidence_id,
          type: 'evidence',
          size: content.length,
          priority: priority === 'high' ? 200 : priority === 'normal' ? 100 : 50,
          riskLevel: 'medium',
          confidenceLevel: 0.8,
          metadata: {
            title: `Evidence ${evidence_id}`,
            description: content.substring(0, 200),
            keywords: [],
            jurisdiction: 'Unknown',
          },
          cacheTimestamp: Date.now(),
          accessCount: 1,
          cacheLocation: 'loki',
          compressed: false,
          syncStatus: 'synced',
        });
      }

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Evidence processing error:', error.message);
      this.safeNack(msg);
    }
  }

  private async handleVectorIndexing(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      console.log(`🔢 Vector indexing: ${data.type} in ${data.collection}`);

      switch (data.type) {
        case 'index':
          if (data.content && data.id) {
            const embedding = await this.embeddings.embedQuery(data.content);
            // Store embedding in cache
            if (this.redisService?.set) {
              const cacheKey = `embedding:${data.collection}:${data.id}`;
              await this.redisService.set(
                cacheKey,
                {
                  embedding,
                  metadata: data.metadata || {},
                  timestamp: Date.now(),
                },
                7200 // 2 hours
              );
            }
            console.log(`✅ Indexed vector for ${data.id}`);
          }
          break;

        case 'similarity':
        case 'cache':
          if (data.embedding && data.id && this.redisService?.set) {
            const cacheKey = `${data.type}:${data.collection}:${data.id}`;
            await this.redisService.set(
              cacheKey,
              {
                embedding: data.embedding,
                metadata: data.metadata || {},
                timestamp: Date.now(),
              },
              data.type === 'similarity' ? 3600 : 7200
            );
            console.log(`✅ Cached ${data.type} for ${data.id}`);
          }
          break;
      }

      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Vector indexing error:', error.message);
      this.safeNack(msg);
    }
  }

  private async handleChatContext(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      const { user_id, session_id, message, embedding, context_type } = data;

      console.log(`💬 Chat context ${context_type}: ${user_id}`);

      // Generate embedding if not provided
      const messageEmbedding = embedding || (await this.embeddings.embedQuery(message));

      // Store in database if available
      if (this.db && this.schema?.chatEmbeddings) {
        const conversationId = `${user_id}_${session_id}`;
        const messageId = `${session_id}_${Date.now()}`;

        try {
          await this.db.insert(this.schema.chatEmbeddings).values({
            conversationId,
            messageId,
            content: message,
            embedding: `[${messageEmbedding.join(',')}]`,
            role: context_type === 'user' ? 'user' : 'assistant',
            metadata: {
              user_id,
              session_id,
              context_type,
              created_at: new Date().toISOString(),
            },
          });
        } catch (dbError: any) {
          console.warn('⚠️ Chat storage failed:', dbError.message);
        }
      }

      // Cache context in Redis if available
      if (this.redisService?.get && this.redisService?.set) {
        const contextKey = `chat:context:${session_id}`;
        const existingContext = (await this.redisService.get(contextKey)) || [];
        const updatedContext = [
          ...existingContext.slice(-10), // Keep last 10 messages
          {
            messageId: `${session_id}_${Date.now()}`,
            content: message,
            role: context_type,
            timestamp: Date.now(),
            embedding: messageEmbedding,
          },
        ];

        await this.redisService.set(contextKey, updatedContext, 3600); // 1 hour
      }

      console.log(`✅ Stored chat context for session ${session_id}`);
      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Chat context error:', error.message);
      this.safeNack(msg);
    }
  }

  private async handleAnalytics(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const data = this.parseMessage(msg);
      const { event_type, event_data, response_time_ms, cache_hit, user_id } = data;

      console.log(`📊 Analytics event: ${event_type}`);

      // Store analytics in database if available
      if (user_id && this.db && this.schema?.userAiQueries) {
        try {
          await this.db
            .insert(this.schema.userAiQueries)
            .values({
              userId: user_id,
              query: event_data.query || 'Analytics Event',
              response: event_data.response || 'No response',
              model: event_data.model || 'unknown',
              queryType: event_type,
              tokensUsed: event_data.tokensUsed || null,
              processingTime: response_time_ms || null,
              contextUsed: event_data.contextUsed || [],
              metadata: {
                cache_hit,
                event_data,
                timestamp: Date.now(),
              },
              isSuccessful: event_data.success !== false,
              errorMessage: event_data.error || null,
            })
            .onConflictDoNothing();
        } catch (dbError: any) {
          console.warn('⚠️ Analytics storage failed:', dbError.message);
        }
      }

      // Store aggregate analytics in Redis
      if (this.redisService?.get && this.redisService?.set) {
        const analyticsKey = `analytics:${event_type}:${new Date().toISOString().split('T')[0]}`;
        const currentStats = (await this.redisService.get(analyticsKey)) || {
          count: 0,
          totalResponseTime: 0,
          cacheHits: 0,
          errors: 0,
        };

        currentStats.count += 1;
        currentStats.totalResponseTime += response_time_ms || 0;
        if (cache_hit) currentStats.cacheHits += 1;
        if (event_data.error) currentStats.errors += 1;

        await this.redisService.set(analyticsKey, currentStats, 86400 * 7); // 7 days
      }

      console.log(`✅ Analytics tracked for ${event_type}`);
      this.channel.ack(msg);
    } catch (error: any) {
      console.error('❌ Analytics tracking error:', error.message);
      this.channel?.nack(msg, false, false); // Don't requeue analytics
    }
  }

  // Helper methods
  private parseMessage(msg: amqp.ConsumeMessage): any {
    try {
      return JSON.parse(msg.content.toString());
    } catch (error: any) {
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }

  private async invalidateSpecificKeys(keys: string[]): Promise<void> {
    if (!this.redisService?.del) return;

    for (const key of keys) {
      try {
        await this.redisService.del(key);
      } catch (error: any) {
        console.warn(`Failed to delete key ${key}:`, error.message);
      }
    }
  }

  private async invalidateByPattern(type: string, id: string): Promise<void> {
    if (!this.redisService?.keys || !this.redisService?.del) return;

    const patterns = this.getCachePatterns(type, id);
    for (const pattern of patterns) {
      try {
        const keys = await this.redisService.keys(pattern);
        for (const key of keys) {
          await this.redisService.del(key);
        }
        console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      } catch (error: any) {
        console.warn(`Pattern invalidation failed for ${pattern}:`, error.message);
      }
    }
  }

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

  private safeNack(msg: amqp.ConsumeMessage | null): void {
    if (msg && this.channel) {
      try {
        this.channel.nack(msg, false, true); // Requeue
      } catch (error: any) {
        console.error('Failed to nack message:', error.message);
      }
    }
  }

  private isReady(): boolean {
    if (!this.isInitialized || !this.connection || !this.channel) {
      console.warn('⚠️ RabbitMQ not ready for publishing');
      return false;
    }
    return true;
  }

  // Error handlers with reconnection logic
  private handleConnectionError(error: Error): void {
    console.error('❌ RabbitMQ connection error:', error.message);
    this.emit('connection_lost');
  }

  private handleChannelError(error: Error): void {
    console.error('❌ RabbitMQ channel error:', error.message);
    this.channel = null;
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.initialize();
        this.reconnectAttempts = 0;
        console.log('✅ RabbitMQ reconnected successfully');
      } catch (error: any) {
        console.error('❌ Reconnection failed:', error.message);
        this.attemptReconnect();
      }
    }, delay);
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      if (!this.connection || !this.channel) {
        return { status: 'disconnected' };
      }

      await this.channel.checkQueue(this.queues.cache_invalidate);

      return {
        status: 'healthy',
        connection: 'active',
        channel: 'active',
        exchanges: Object.keys(this.exchanges).length,
        queues: Object.keys(this.queues).length,
        reconnectAttempts: this.reconnectAttempts,
        servicesLoaded: {
          redisService: !!this.redisService,
          lokiRedisCache: !!this.lokiRedisCache,
          enhancedRAGPipeline: !!this.enhancedRAGPipeline,
          instantSearchEngine: !!this.instantSearchEngine,
          database: !!this.db,
          schema: !!this.schema,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        reconnectAttempts: this.reconnectAttempts,
      };
    }
  }

  // Graceful shutdown
  async close(): Promise<void> {
    try {
      this.isInitialized = false;

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      console.log('✅ RabbitMQ connection closed gracefully');
    } catch (error: any) {
      console.error('❌ Error closing RabbitMQ connection:', error.message);
    }
  }
}

// Singleton instance
export const rabbitmq = new RabbitMQManager();

// Initialize on module load in server environment
if (typeof window === 'undefined') {
  rabbitmq.initialize().catch((error) => {
    console.error('❌ RabbitMQ auto-initialization failed:', error.message);
  });
}