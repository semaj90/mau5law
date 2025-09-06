/**
 * RabbitMQ Configuration for Background Job Processing
 * Handles embedding generation and document processing queues
 */

export interface RabbitMQConfig {
  connection: {
    protocol: 'amqp' | 'amqps';
    hostname: string;
    port: number;
    username: string;
    password: string;
    vhost: string;
    heartbeat?: number;
    connection_timeout?: number;
    channel_max?: number;
  };
  exchanges: {
    name: string;
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    options?: {
      durable?: boolean;
      autoDelete?: boolean;
    };
  }[];
  queues: {
    name: string;
    routingKey?: string;
    exchange?: string;
    options?: {
      durable?: boolean;
      autoDelete?: boolean;
      exclusive?: boolean;
      messageTtl?: number;
      maxLength?: number;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
    };
  }[];
}

// Environment-based configuration
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || '5672');
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'legal_ai';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'legal_ai_2024';
const RABBITMQ_VHOST = process.env.RABBITMQ_VHOST || '/';
const RABBITMQ_PROTOCOL = (process.env.RABBITMQ_PROTOCOL as 'amqp' | 'amqps') || 'amqp';

// Queue and exchange names
export const EXCHANGES = {
  LEGAL_AI_MAIN: 'legal_ai.main',
  LEGAL_AI_DLX: 'legal_ai.dlx' // Dead letter exchange
} as const;

export const QUEUES = {
  // Document processing queues
  DOCUMENT_EMBEDDING: 'legal_ai.document.embedding',
  DOCUMENT_INDEXING: 'legal_ai.document.indexing',
  DOCUMENT_ANALYSIS: 'legal_ai.document.analysis',
  
  // Case processing queues
  CASE_EMBEDDING: 'legal_ai.case.embedding',
  CASE_SIMILARITY: 'legal_ai.case.similarity',
  
  // AI processing queues
  AI_SUMMARIZATION: 'legal_ai.ai.summarization',
  AI_ENTITY_EXTRACTION: 'legal_ai.ai.entity_extraction',
  AI_CLASSIFICATION: 'legal_ai.ai.classification',
  
  // Search and retrieval
  VECTOR_SEARCH_UPDATE: 'legal_ai.vector.search_update',
  
  // Dead letter queues
  DEAD_LETTER: 'legal_ai.dead_letter',
  RETRY: 'legal_ai.retry'
} as const;

export const ROUTING_KEYS = {
  // Document operations
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_DELETED: 'document.deleted',
  
  // Embedding operations
  GENERATE_EMBEDDING: 'embedding.generate',
  UPDATE_EMBEDDING: 'embedding.update',
  BULK_EMBEDDING: 'embedding.bulk',
  
  // AI operations
  ANALYZE_DOCUMENT: 'ai.analyze.document',
  EXTRACT_ENTITIES: 'ai.extract.entities',
  SUMMARIZE_CONTENT: 'ai.summarize.content',
  CLASSIFY_DOCUMENT: 'ai.classify.document',
  
  // Case operations
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  FIND_SIMILAR_CASES: 'case.find_similar',
  
  // Vector operations
  VECTOR_INDEX_UPDATE: 'vector.index.update',
  VECTOR_SEARCH: 'vector.search',
  
  // System operations
  HEALTH_CHECK: 'system.health_check',
  CLEANUP: 'system.cleanup',
  
  // Error handling
  RETRY_FAILED_JOB: 'error.retry',
  MOVE_TO_DLQ: 'error.dead_letter'
} as const;

// Production RabbitMQ configuration
export const getRabbitMQConfig = (): RabbitMQConfig => ({
  connection: {
    protocol: RABBITMQ_PROTOCOL,
    hostname: RABBITMQ_HOST,
    port: RABBITMQ_PORT,
    username: RABBITMQ_USERNAME,
    password: RABBITMQ_PASSWORD,
    vhost: RABBITMQ_VHOST,
    heartbeat: 60,
    connection_timeout: 10000,
    channel_max: 100
  },
  exchanges: [
    {
      name: EXCHANGES.LEGAL_AI_MAIN,
      type: 'topic',
      options: {
        durable: true,
        autoDelete: false
      }
    },
    {
      name: EXCHANGES.LEGAL_AI_DLX,
      type: 'direct',
      options: {
        durable: true,
        autoDelete: false
      }
    }
  ],
  queues: [
    // Document processing queues
    {
      name: QUEUES.DOCUMENT_EMBEDDING,
      routingKey: ROUTING_KEYS.GENERATE_EMBEDDING,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 600000, // 10 minutes
        maxLength: 1000,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    {
      name: QUEUES.DOCUMENT_INDEXING,
      routingKey: ROUTING_KEYS.VECTOR_INDEX_UPDATE,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 300000, // 5 minutes
        maxLength: 500,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    {
      name: QUEUES.DOCUMENT_ANALYSIS,
      routingKey: ROUTING_KEYS.ANALYZE_DOCUMENT,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 1200000, // 20 minutes (AI processing can be slow)
        maxLength: 200,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    
    // Case processing queues
    {
      name: QUEUES.CASE_EMBEDDING,
      routingKey: ROUTING_KEYS.CASE_CREATED,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 300000, // 5 minutes
        maxLength: 100,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    {
      name: QUEUES.CASE_SIMILARITY,
      routingKey: ROUTING_KEYS.FIND_SIMILAR_CASES,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 180000, // 3 minutes
        maxLength: 300,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    
    // AI processing queues
    {
      name: QUEUES.AI_SUMMARIZATION,
      routingKey: ROUTING_KEYS.SUMMARIZE_CONTENT,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 900000, // 15 minutes
        maxLength: 100,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    {
      name: QUEUES.AI_ENTITY_EXTRACTION,
      routingKey: ROUTING_KEYS.EXTRACT_ENTITIES,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 600000, // 10 minutes
        maxLength: 200,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    {
      name: QUEUES.AI_CLASSIFICATION,
      routingKey: ROUTING_KEYS.CLASSIFY_DOCUMENT,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 300000, // 5 minutes
        maxLength: 500,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    
    // Vector operations
    {
      name: QUEUES.VECTOR_SEARCH_UPDATE,
      routingKey: ROUTING_KEYS.VECTOR_SEARCH,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 120000, // 2 minutes
        maxLength: 1000,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    },
    
    // Error handling queues
    {
      name: QUEUES.DEAD_LETTER,
      exchange: EXCHANGES.LEGAL_AI_DLX,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 86400000 // 24 hours in dead letter queue
      }
    },
    {
      name: QUEUES.RETRY,
      routingKey: ROUTING_KEYS.RETRY_FAILED_JOB,
      exchange: EXCHANGES.LEGAL_AI_MAIN,
      options: {
        durable: true,
        autoDelete: false,
        messageTtl: 300000, // 5 minutes
        maxLength: 100,
        deadLetterExchange: EXCHANGES.LEGAL_AI_DLX,
        deadLetterRoutingKey: ROUTING_KEYS.MOVE_TO_DLQ
      }
    }
  ]
});

// Message priority levels
export const PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10
} as const;

// Consumer configuration
export interface ConsumerConfig {
  concurrency: number;
  prefetchCount: number;
  autoAck: boolean;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
}

export const getConsumerConfig = (queueName: string): ConsumerConfig => {
  const baseConfig: ConsumerConfig = {
    concurrency: 3,
    prefetchCount: 10,
    autoAck: false,
    retryAttempts: 3,
    retryDelay: 5000,
    exponentialBackoff: true
  };

  // Queue-specific configurations
  switch (queueName) {
    case QUEUES.DOCUMENT_EMBEDDING:
    case QUEUES.CASE_EMBEDDING:
      return {
        ...baseConfig,
        concurrency: 2, // Embedding generation is CPU intensive
        prefetchCount: 5
      };

    case QUEUES.DOCUMENT_ANALYSIS:
    case QUEUES.AI_SUMMARIZATION:
      return {
        ...baseConfig,
        concurrency: 1, // AI operations are resource intensive
        prefetchCount: 2,
        retryAttempts: 2,
        retryDelay: 30000 // 30 seconds
      };

    case QUEUES.VECTOR_SEARCH_UPDATE:
      return {
        ...baseConfig,
        concurrency: 5, // Fast database operations
        prefetchCount: 20
      };

    case QUEUES.AI_ENTITY_EXTRACTION:
    case QUEUES.AI_CLASSIFICATION:
      return {
        ...baseConfig,
        concurrency: 2,
        prefetchCount: 5,
        retryAttempts: 2
      };

    default:
      return baseConfig;
  }
};

// Connection URL helper
export const getRabbitMQConnectionURL = (): string => {
  const config = getRabbitMQConfig();
  const { protocol, hostname, port, username, password, vhost } = config.connection;
  
  const encodedVhost = encodeURIComponent(vhost);
  return `${protocol}://${username}:${password}@${hostname}:${port}${encodedVhost !== '%2F' ? `/${encodedVhost}` : ''}`;
};

// Health check configuration
export const HEALTH_CHECK = {
  interval: 30000, // 30 seconds
  timeout: 5000,   // 5 seconds
  retries: 3
} as const;