// MCP Context7.2 - RabbitMQ and Redis Library Documentation
// Get proper library documentation to fix integration issues

import { mcpContext72GetLibraryDocs, type LibraryDocsResponse } from './mcp-context72-get-library-docs.js';

// Get RabbitMQ (amqplib) documentation
export async function getRabbitMQDocs(topic?: string, fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return mcpContext72GetLibraryDocs('/amqplib/amqplib', topic, { 
    format: 'typescript',
    tokens: 12000 
  }, fetchFn);
}

// Get Redis (ioredis) documentation
export async function getRedisDocs(topic?: string, fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return mcpContext72GetLibraryDocs('/ioredis/ioredis', topic, { 
    format: 'typescript',
    tokens: 10000 
  }, fetchFn);
}

// Get Node Redis client documentation
export async function getNodeRedisDocs(topic?: string, fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return mcpContext72GetLibraryDocs('/redis/node-redis', topic, { 
    format: 'typescript',
    tokens: 8000 
  }, fetchFn);
}

// Get LokiJS documentation
export async function getLokiJSDocs(topic?: string, fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return mcpContext72GetLibraryDocs('/lokijs/lokijs', topic, { 
    format: 'typescript',
    tokens: 8000 
  }, fetchFn);
}

// Get best practices for RabbitMQ + Redis integration
export async function getMessageQueueRedisBestPractices(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return mcpContext72GetLibraryDocs('/patterns/message-queue-redis', 'integration-patterns', { 
    format: 'typescript',
    tokens: 15000 
  }, fetchFn);
}

// Helper functions for specific Redis topics
export async function getRedisConnectionPatterns(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getRedisDocs('connection-patterns', fetchFn);
}

export async function getRedisPubSubPatterns(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getRedisDocs('pub-sub', fetchFn);
}

export async function getRedisErrorHandling(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getRedisDocs('error-handling', fetchFn);
}

export async function getRedisTypeScriptIntegration(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getRedisDocs('typescript', fetchFn);
}

export async function getNodeRedisAdvancedFeatures(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getNodeRedisDocs('advanced-features', fetchFn);
}

export async function getNodeRedisTransactions(fetchFn?: typeof fetch): Promise<LibraryDocsResponse> {
  return getNodeRedisDocs('transactions', fetchFn);
}

// Quick access to get all Redis documentation
export async function getAllRedisDocs(fetchFn?: typeof fetch): Promise<{
  ioredis: LibraryDocsResponse;
  nodeRedis: LibraryDocsResponse;
  patterns: LibraryDocsResponse;
}> {
  const [ioredis, nodeRedis, patterns] = await Promise.all([
    getRedisDocs(undefined, fetchFn),
    getNodeRedisDocs(undefined, fetchFn),
    getMessageQueueRedisBestPractices(fetchFn)
  ]);

  return { ioredis, nodeRedis, patterns };
}