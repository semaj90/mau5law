import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { context7CompatibleLibraryID, topic, tokens = 10000 } = await request.json();
    
    if (!context7CompatibleLibraryID) {
      return json({ error: 'context7CompatibleLibraryID is required' }, { status: 400 });
    }

    const libraryDocs = {
      '/svelte/svelte': {
        content: '# Svelte 5 Runes\n\n- `let count = $state(0)` - reactive state\n- `let doubled = $derived(count * 2)` - computed values\n- `$effect(() => console.log(count))` - side effects',
        metadata: { library: 'svelte', topic: topic || 'runes', tokenCount: 150 },
        snippets: [{ title: 'State', code: 'let count = $state(0);', description: 'Reactive state' }]
      },
      '/melt-ui/melt-ui': {
        content: '# Melt UI v0.39.0\n\n```js\nconst { elements: { root } } = createButton();\n```\n```svelte\n<button use:melt={$root}>Click</button>\n```',
        metadata: { library: 'melt-ui', version: '0.39.0', topic: topic || 'builders', tokenCount: 120 },
        snippets: [{ title: 'Button', code: 'const { elements: { root } } = createButton();', description: 'Melt button builder' }]
      },
      '/bits-ui/bits-ui': {
        content: '# Bits UI v2\n\n```svelte\n<Dialog.Root bind:open={isOpen}>\n  <Dialog.Trigger>Open</Dialog.Trigger>\n  <Dialog.Content>\n    <Dialog.Title>Title</Dialog.Title>\n  </Dialog.Content>\n</Dialog.Root>\n```',
        metadata: { library: 'bits-ui', version: '2.x', topic: topic || 'dialog', tokenCount: 140 }
      },
      '/xstate/xstate': {
        content: '# XState v5\n\n```js\nconst machine = createMachine({\n  initial: "idle",\n  states: {\n    idle: { on: { START: "active" } },\n    active: { on: { STOP: "idle" } }\n  }\n});\n```',
        metadata: { library: 'xstate', version: '5.x', topic: topic || 'machines', tokenCount: 130 }
      },
      '/ioredis/ioredis': {
        content: `# IORedis - Advanced Redis Client for Node.js

## Connection Patterns

### Basic Connection
\`\`\`typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'yourpassword',
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,  // Connect on first command
  keepAlive: 30000,
  family: 4,          // IPv4
  keyPrefix: 'myapp:', // Auto-prefix keys
});
\`\`\`

### Connection Pool with Pub/Sub
\`\`\`typescript
class RedisService {
  private pool: {
    primary: Redis;
    subscriber: Redis;
    publisher: Redis;
  };

  async initialize() {
    this.pool = {
      // Primary connection for read/write
      primary: new Redis({
        host: 'localhost',
        port: 6379,
        connectionName: 'primary',
        lazyConnect: false,
      }),
      
      // Dedicated subscriber (required for pub/sub)
      subscriber: new Redis({
        host: 'localhost', 
        port: 6379,
        connectionName: 'subscriber',
      }),
      
      // Dedicated publisher
      publisher: new Redis({
        host: 'localhost',
        port: 6379, 
        connectionName: 'publisher',
      }),
    };

    // Setup event handlers
    this.pool.primary.on('connect', () => console.log('Primary connected'));
    this.pool.primary.on('ready', () => console.log('Primary ready'));
    this.pool.primary.on('error', (err) => console.error('Primary error:', err));
    this.pool.primary.on('close', () => console.log('Primary closed'));
    this.pool.primary.on('reconnecting', () => console.log('Primary reconnecting'));
  }
}
\`\`\`

## Event Handling and Error Management

### Connection Events
\`\`\`typescript
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('ready', () => {
  console.log('Redis ready to receive commands');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Handle graceful degradation
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  console.log(\`Reconnecting in \${delay}ms\`);
});

redis.on('end', () => {
  console.log('Redis connection ended');
});
\`\`\`

### Automatic Reconnection
\`\`\`typescript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Exponential backoff for reconnection
redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('Redis server refused connection');
    // Implement custom backoff logic
  }
});
\`\`\`

## Pub/Sub Implementation

### Setting Up Subscriber
\`\`\`typescript
// Subscriber client (separate from main client)
const subscriber = new Redis({
  host: 'localhost',
  port: 6379,
});

// Subscribe to patterns
await subscriber.psubscribe('legal-ai:document:*');
await subscriber.subscribe('legal-ai:cache:invalidate');

// Handle pattern messages
subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
  try {
    const data = JSON.parse(message);
    console.log(\`Pattern \${pattern} on \${channel}:\`, data);
    
    // Handle document updates
    if (pattern === 'legal-ai:document:*') {
      handleDocumentUpdate(data);
    }
  } catch (err) {
    console.error('Error processing pmessage:', err);
  }
});

// Handle direct channel messages
subscriber.on('message', (channel: string, message: string) => {
  try {
    const data = JSON.parse(message);
    
    if (channel === 'legal-ai:cache:invalidate') {
      invalidateCache(data);
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
});
\`\`\`

### Publishing Messages
\`\`\`typescript
// Publisher client
const publisher = new Redis({
  host: 'localhost',
  port: 6379,
});

// Publish document updates
async function notifyDocumentUpdate(docId: string, operation: string) {
  const message = JSON.stringify({
    documentId: docId,
    operation, // 'create', 'update', 'delete'
    timestamp: Date.now(),
  });
  
  await publisher.publish(\`legal-ai:document:\${docId}\`, message);
}

// Publish cache invalidation
async function invalidateSearchCache(criteria: any) {
  await publisher.publish('legal-ai:cache:invalidate', JSON.stringify(criteria));
}
\`\`\`

## Advanced Operations

### Pipeline for Batch Operations
\`\`\`typescript
// Create pipeline for atomic operations
const pipeline = redis.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.expire('key1', 3600);

// Execute all commands atomically
const results = await pipeline.exec();

// Check results
results?.forEach(([err, result], index) => {
  if (err) {
    console.error(\`Command \${index} failed:\`, err);
  } else {
    console.log(\`Command \${index} result:\`, result);
  }
});
\`\`\`

### Lua Scripts for Complex Operations
\`\`\`typescript
// Define atomic increment with max value
const incrementScript = \`
  local current = redis.call('GET', KEYS[1])
  if current == false then
    current = 0
  else
    current = tonumber(current)
  end
  
  local max_val = tonumber(ARGV[1])
  local increment = tonumber(ARGV[2])
  
  if current + increment <= max_val then
    local new_val = current + increment
    redis.call('SET', KEYS[1], new_val)
    return new_val
  else
    return -1
  end
\`;

// Execute Lua script
const result = await redis.eval(
  incrementScript,
  1,              // Number of keys
  'rate_limit:user:123',  // KEYS[1]
  100,            // ARGV[1] - max value
  1               // ARGV[2] - increment
);
\`\`\`

### Redis Streams for Message Queues
\`\`\`typescript
// Add to stream
await redis.xadd(
  'legal-ai:processing-queue',
  '*',              // Auto-generate ID
  'documentId', '123',
  'operation', 'analyze',
  'priority', 'high'
);

// Read from stream
const messages = await redis.xrevrange(
  'legal-ai:processing-queue',
  '+',              // End
  '-',              // Start
  'COUNT', 10       // Limit
);

// Process messages
for (const [id, fields] of messages) {
  const data = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }
  console.log(\`Message \${id}:\`, data);
}
\`\`\`

## TypeScript Integration

### Type-Safe Redis Operations
\`\`\`typescript
import Redis from 'ioredis';

interface CacheDocument {
  id: string;
  content: string;
  metadata: {
    type: 'contract' | 'evidence' | 'brief';
    priority: number;
    timestamp: number;
  };
}

class TypedRedisService {
  constructor(private redis: Redis) {}

  async setDocument(key: string, doc: CacheDocument, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(doc);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Failed to set document:', error);
      return false;
    }
  }

  async getDocument(key: string): Promise<CacheDocument | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as CacheDocument;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  async incrementCounter(key: string, by: number = 1): Promise<number> {
    return await this.redis.incrby(key, by);
  }

  async addToSet(key: string, member: string): Promise<number> {
    return await this.redis.sadd(key, member);
  }
}
\`\`\`

## Best Practices

### 1. Connection Management
- Use separate connections for pub/sub and regular operations
- Implement connection pooling for high-throughput applications  
- Set appropriate timeouts and retry logic
- Use \`lazyConnect: true\` to defer connection until first command

### 2. Error Handling
- Always wrap Redis operations in try-catch blocks
- Implement circuit breaker pattern for resilience
- Log errors but don't crash the application
- Provide fallback mechanisms when Redis is unavailable

### 3. Performance Optimization
- Use pipelines for batch operations
- Implement connection pooling
- Set appropriate TTL values to prevent memory bloat
- Use Lua scripts for complex atomic operations

### 4. Security
- Use Redis AUTH if available
- Encrypt connections with TLS
- Implement rate limiting
- Validate and sanitize all inputs`,
        metadata: { library: 'ioredis', version: '5.x', topic: topic || 'client-patterns', tokenCount: 2800 },
        snippets: [
          { 
            title: 'Connection Pool', 
            code: `const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
});`, 
            description: 'Basic Redis connection with retry logic' 
          },
          { 
            title: 'Pub/Sub Setup', 
            code: `await subscriber.psubscribe('legal-ai:document:*');
subscriber.on('pmessage', (pattern, channel, message) => {
  const data = JSON.parse(message);
  handleDocumentUpdate(data);
});`, 
            description: 'Pattern-based pub/sub subscription' 
          },
          { 
            title: 'Pipeline Operations', 
            code: `const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.expire('key1', 3600);
const results = await pipeline.exec();`, 
            description: 'Atomic batch operations with pipeline' 
          }
        ]
      },
      '/redis/node-redis': {
        content: `# Node Redis - Official Redis Client

## Basic Connection

### Simple Connection
\`\`\`typescript
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379',
  password: 'yourpassword',
  database: 0,
});

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();
\`\`\`

### Advanced Configuration
\`\`\`typescript
const client = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    connectTimeout: 60000,
    lazyConnect: true,
  },
  password: 'yourpassword',
  database: 0,
  name: 'legal-ai-client',
});
\`\`\`

## Pub/Sub with Node Redis

### Subscriber Setup
\`\`\`typescript
// Create separate client for subscription
const subscriber = client.duplicate();
await subscriber.connect();

// Subscribe to specific channels
await subscriber.subscribe('legal-ai:updates', (message, channel) => {
  console.log(\`Received message on \${channel}:\`, message);
  
  try {
    const data = JSON.parse(message);
    handleUpdate(data);
  } catch (err) {
    console.error('Error parsing message:', err);
  }
});

// Pattern-based subscription
await subscriber.pSubscribe('legal-ai:document:*', (message, channel) => {
  console.log(\`Pattern message on \${channel}:\`, message);
});
\`\`\`

### Publisher Operations
\`\`\`typescript
// Publish to specific channel
await client.publish('legal-ai:updates', JSON.stringify({
  type: 'document_updated',
  documentId: '123',
  timestamp: Date.now(),
}));

// Publish document-specific updates
async function notifyDocumentChange(docId: string, operation: string) {
  const message = JSON.stringify({
    documentId: docId,
    operation,
    timestamp: Date.now(),
  });
  
  await client.publish(\`legal-ai:document:\${docId}\`, message);
}
\`\`\`

## Error Handling and Reconnection

### Connection Management
\`\`\`typescript
const client = createClient({
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

client.on('error', (err) => {
  console.error('Redis error:', err);
  // Implement fallback logic
});

client.on('connect', () => {
  console.log('Redis connected');
});

client.on('reconnecting', () => {
  console.log('Redis reconnecting');
});

client.on('ready', () => {
  console.log('Redis ready');
});
\`\`\`

### Graceful Error Handling
\`\`\`typescript
async function safeRedisOperation<T>(
  operation: () => Promise<T>, 
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback;
  }
}

// Usage
const cachedData = await safeRedisOperation(
  () => client.get('legal-ai:cache:data'),
  null
);
\`\`\`

## Advanced Features

### Transactions with MULTI/EXEC
\`\`\`typescript
const multi = client.multi();

multi.set('key1', 'value1');
multi.set('key2', 'value2');
multi.expire('key1', 3600);
multi.get('key1');

const results = await multi.exec();

// Check transaction results
results.forEach((result, index) => {
  if (result instanceof Error) {
    console.error(\`Command \${index} failed:\`, result);
  } else {
    console.log(\`Command \${index} result:\`, result);
  }
});
\`\`\`

### Lua Scripts
\`\`\`typescript
// Define script for atomic operations
const ratelimitScript = \`
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  
  local current = redis.call('GET', key)
  if current == false then
    redis.call('SETEX', key, window, 1)
    return 1
  end
  
  current = tonumber(current)
  if current < limit then
    return redis.call('INCR', key)
  else
    return -1
  end
\`;

// Execute script
const result = await client.eval(
  ratelimitScript,
  {
    keys: ['rate_limit:user:123'],
    arguments: ['10', '60'], // 10 requests per 60 seconds
  }
);

if (result === -1) {
  console.log('Rate limit exceeded');
} else {
  console.log(\`Request count: \${result}\`);
}
\`\`\`

### Streams Operations
\`\`\`typescript
// Add to stream
await client.xAdd('legal-ai:events', '*', {
  event: 'document_processed',
  documentId: '123',
  status: 'completed',
});

// Read from stream
const messages = await client.xRevRange(
  'legal-ai:events',
  '+',
  '-',
  { COUNT: 10 }
);

messages.forEach(({ id, message }) => {
  console.log(\`Event \${id}:\`, message);
});

// Consumer groups
await client.xGroupCreate('legal-ai:events', 'processors', '0', {
  MKSTREAM: true,
});

// Read as consumer
const groupMessages = await client.xReadGroup(
  'processors',
  'worker-1',
  { key: 'legal-ai:events', id: '>' },
  { COUNT: 5, BLOCK: 1000 }
);
\`\`\`

## TypeScript Integration

### Typed Redis Operations
\`\`\`typescript
import { createClient, RedisClientType } from 'redis';

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: 'contract' | 'evidence' | 'brief';
  metadata: {
    caseId: string;
    priority: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

class TypedRedisClient {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async storeDocument(doc: LegalDocument, ttl: number = 3600): Promise<boolean> {
    try {
      await this.client.setEx(
        \`document:\${doc.id}\`,
        ttl,
        JSON.stringify(doc)
      );
      return true;
    } catch (error) {
      console.error('Failed to store document:', error);
      return false;
    }
  }

  async getDocument(id: string): Promise<LegalDocument | null> {
    try {
      const data = await this.client.get(\`document:\${id}\`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  async indexDocument(doc: LegalDocument): Promise<void> {
    const multi = this.client.multi();
    
    // Add to type-specific sets
    multi.sAdd(\`documents:type:\${doc.type}\`, doc.id);
    multi.sAdd(\`documents:case:\${doc.metadata.caseId}\`, doc.id);
    multi.sAdd(\`documents:risk:\${doc.metadata.riskLevel}\`, doc.id);
    
    // Add to sorted set by priority
    multi.zAdd('documents:by_priority', {
      score: doc.metadata.priority,
      value: doc.id,
    });
    
    await multi.exec();
  }
}
\`\`\`

## Performance Best Practices

### 1. Connection Pooling
\`\`\`typescript
// Create connection pool
const createRedisPool = (size: number = 10) => {
  const clients: RedisClientType[] = [];
  
  for (let i = 0; i < size; i++) {
    const client = createClient({
      url: 'redis://localhost:6379',
    });
    clients.push(client);
  }
  
  return {
    getClient: () => {
      // Round-robin or least-used logic
      return clients[Math.floor(Math.random() * clients.length)];
    },
    closeAll: async () => {
      await Promise.all(clients.map(client => client.quit()));
    }
  };
};
\`\`\`

### 2. Efficient Key Design
\`\`\`typescript
// Good key patterns
const keys = {
  document: (id: string) => \`legal:doc:\${id}\`,
  caseDocuments: (caseId: string) => \`legal:case:\${caseId}:docs\`,
  userSession: (userId: string) => \`session:user:\${userId}\`,
  rateLimit: (ip: string) => \`rate:\${ip}:\${Math.floor(Date.now() / 60000)}\`,
};

// Use hash tags for cluster deployment
const clusterKey = (userId: string, suffix: string) => 
  \`user:\${userId}:\${suffix}\`; // Keys with same {user:123} will be on same node
\`\`\`

### 3. Memory Optimization
\`\`\`typescript
// Use appropriate data structures
class EfficientRedisCache {
  // Use hashes for objects instead of JSON strings
  async storeUserData(userId: string, data: Record<string, string>) {
    await client.hSet(\`user:\${userId}\`, data);
  }
  
  // Use sets for unique collections
  async addToUserTags(userId: string, tag: string) {
    await client.sAdd(\`user:\${userId}:tags\`, tag);
  }
  
  // Use sorted sets for rankings
  async updateScore(userId: string, score: number) {
    await client.zAdd('leaderboard', { score, value: userId });
  }
}
\`\`\``,
        metadata: { library: 'redis', version: '4.x', topic: topic || 'official-client', tokenCount: 2400 },
        snippets: [
          { 
            title: 'Basic Connection', 
            code: `const client = createClient({
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});
await client.connect();`, 
            description: 'Simple Redis connection with reconnect strategy' 
          },
          { 
            title: 'Pub/Sub Pattern', 
            code: `const subscriber = client.duplicate();
await subscriber.subscribe('legal-ai:updates', (message, channel) => {
  const data = JSON.parse(message);
  handleUpdate(data);
});`, 
            description: 'Channel subscription with message handling' 
          },
          { 
            title: 'Transaction', 
            code: `const multi = client.multi();
multi.set('key1', 'value1');
multi.expire('key1', 3600);
const results = await multi.exec();`, 
            description: 'Atomic operations with MULTI/EXEC' 
          }
        ]
      },
      '/patterns/message-queue-redis': {
        content: `# Redis Integration Patterns for Legal AI Platform

## Architecture Overview

### Multi-Client Strategy
\`\`\`typescript
// Production-ready Redis service architecture
class RedisService {
  private pool: {
    primary: Redis;      // Read/write operations
    subscriber: Redis;   // Pub/sub subscriptions  
    publisher: Redis;    // Pub/sub publishing
  };

  async initialize() {
    this.pool = {
      primary: new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: false,
        connectionName: 'legal-ai-primary',
      }),
      
      subscriber: new Redis({
        host: process.env.REDIS_HOST || 'localhost', 
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectionName: 'legal-ai-subscriber',
      }),
      
      publisher: new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'), 
        connectionName: 'legal-ai-publisher',
      }),
    };

    // Setup event handlers for each connection
    this.setupEventHandlers(this.pool.primary, 'primary');
    this.setupEventHandlers(this.pool.subscriber, 'subscriber');
    this.setupEventHandlers(this.pool.publisher, 'publisher');
  }
}
\`\`\`

## Legal Document Caching Strategy

### Hybrid Cache Architecture  
\`\`\`typescript
interface CachedDocument {
  id: string;
  content: string;
  metadata: {
    type: 'contract' | 'evidence' | 'brief' | 'citation';
    caseId: string;
    priority: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceLevel: number;
  };
  cacheTimestamp: number;
  accessCount: number;
  compressed: boolean;
}

class LegalDocumentCache {
  async storeDocument(doc: CachedDocument): Promise<void> {
    const key = \`legal:doc:\${doc.id}\`;
    
    // Store with TTL based on document importance
    const ttl = this.calculateTTL(doc);
    
    // Compress large documents
    const data = doc.content.length > 10240 
      ? await this.compress(JSON.stringify(doc))
      : JSON.stringify(doc);
    
    await redis.setex(key, ttl, data);
    
    // Index for fast retrieval
    await this.indexDocument(doc);
    
    // Notify other services
    await this.notifyDocumentStored(doc);
  }

  private calculateTTL(doc: CachedDocument): number {
    const baseTTL = 3600; // 1 hour
    
    // Critical documents stay longer
    if (doc.metadata.riskLevel === 'critical') return baseTTL * 24;
    if (doc.metadata.riskLevel === 'high') return baseTTL * 6;
    if (doc.metadata.priority > 200) return baseTTL * 4;
    
    return baseTTL;
  }
}
\`\`\`

## Real-Time Synchronization

### Document Update Notifications
\`\`\`typescript
class DocumentSyncService {
  async notifyDocumentUpdate(docId: string, operation: 'create' | 'update' | 'delete') {
    const message = {
      documentId: docId,
      operation,
      timestamp: Date.now(),
      source: 'legal-ai-service',
    };

    // Publish to specific document channel
    await publisher.publish(
      \`legal:document:\${docId}\`,
      JSON.stringify(message)
    );

    // Publish to general updates channel
    await publisher.publish(
      'legal:document:updates',
      JSON.stringify(message)
    );
  }

  async setupDocumentWatcher() {
    // Subscribe to document-specific updates
    await subscriber.psubscribe('legal:document:*');
    
    subscriber.on('pmessage', async (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleDocumentUpdate(data);
      } catch (err) {
        console.error('Error processing document update:', err);
      }
    });
  }

  private async handleDocumentUpdate(data: any) {
    switch (data.operation) {
      case 'create':
        await this.cacheDocument(data.documentId);
        break;
      case 'update':
        await this.invalidateCache(data.documentId);
        await this.cacheDocument(data.documentId);
        break;
      case 'delete':
        await this.removeFromCache(data.documentId);
        break;
    }
  }
}
\`\`\`

## Search Cache Optimization

### Intelligent Search Caching
\`\`\`typescript
class SearchCacheService {
  async cacheSearchResults(
    query: string, 
    filters: any, 
    results: any[]
  ): Promise<void> {
    const cacheKey = this.generateSearchKey(query, filters);
    const ttl = this.calculateSearchTTL(query, filters, results);
    
    const cacheData = {
      query,
      filters,
      results,
      timestamp: Date.now(),
      resultCount: results.length,
    };

    await redis.setex(cacheKey, ttl, JSON.stringify(cacheData));
    
    // Track search patterns
    await this.trackSearchPattern(query, filters);
  }

  async invalidateSearchCache(criteria: any): Promise<void> {
    // Find all search cache keys that might be affected
    const pattern = 'legal:search:*';
    const keys = await redis.keys(pattern);
    
    const pipeline = redis.pipeline();
    
    for (const key of keys) {
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (this.shouldInvalidate(data, criteria)) {
          pipeline.del(key);
        }
      }
    }
    
    await pipeline.exec();
    
    // Notify other services
    await publisher.publish(
      'legal:search:invalidate',
      JSON.stringify(criteria)
    );
  }

  private shouldInvalidate(searchData: any, criteria: any): boolean {
    // Invalidate if search involved affected document types
    if (criteria.documentTypes && searchData.filters.type) {
      return criteria.documentTypes.some((type: string) => 
        searchData.filters.type.includes(type)
      );
    }
    
    // Invalidate if search involved affected case
    if (criteria.caseId && searchData.filters.caseId === criteria.caseId) {
      return true;
    }
    
    return false;
  }
}
\`\`\`

## Error Handling and Resilience

### Circuit Breaker Pattern
\`\`\`typescript
class RedisCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        console.log('Circuit breaker open, using fallback');
        return fallback;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      console.error('Redis operation failed:', error);
      return fallback;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      console.warn('Circuit breaker opened due to failures');
    }
  }
}

// Usage
const circuitBreaker = new RedisCircuitBreaker();

async function getCachedDocument(id: string): Promise<any> {
  return circuitBreaker.execute(
    () => redis.get(\`legal:doc:\${id}\`),
    null // fallback to null if Redis fails
  );
}
\`\`\`

## Performance Monitoring

### Redis Metrics Collection
\`\`\`typescript
class RedisMonitoringService {
  private metrics = {
    operations: 0,
    hits: 0,
    misses: 0,
    errors: 0,
    avgResponseTime: 0,
  };

  async executeWithMetrics<T>(
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.operations++;

    try {
      const result = await operation();
      
      // Track hits/misses for cache operations
      if (operationType === 'get') {
        if (result) {
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
      }

      this.updateResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  private updateResponseTime(responseTime: number) {
    // Simple moving average
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
  }

  getMetrics() {
    const hitRatio = this.metrics.operations > 0 
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0;

    return {
      ...this.metrics,
      hitRatio,
      timestamp: Date.now(),
    };
  }

  async publishMetrics() {
    const metrics = this.getMetrics();
    await publisher.publish('legal:metrics:redis', JSON.stringify(metrics));
  }
}
\`\`\`

## Production Configuration

### Environment-Specific Settings
\`\`\`typescript
const getRedisConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    
    // Production optimizations
    maxRetriesPerRequest: isProduction ? 3 : 1,
    retryDelayOnFailover: isProduction ? 100 : 50,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: isProduction ? 30000 : 10000,
    
    // Connection pooling
    family: 4, // IPv4
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'legal-ai:',
    
    // Timeouts
    connectTimeout: 60000,
    commandTimeout: 5000,
    
    // TLS for production
    tls: isProduction ? {
      checkServerIdentity: false,
    } : undefined,
  };
};
\`\`\`

## Best Practices Summary

### 1. Connection Management
- Use separate connections for pub/sub and regular operations
- Implement connection pooling for high-throughput scenarios
- Set up proper event handlers for all connection states
- Use lazy connect for better startup performance

### 2. Data Organization
- Design consistent key naming patterns
- Use appropriate Redis data structures (Hash, Set, Sorted Set)
- Implement TTL strategies based on data importance
- Consider compression for large documents

### 3. Pub/Sub Architecture
- Use pattern-based subscriptions for flexible routing
- Implement message deduplication if needed
- Handle subscriber reconnection gracefully
- Separate publishers from subscribers

### 4. Error Resilience
- Implement circuit breaker pattern
- Provide fallback mechanisms
- Log errors without crashing the application
- Monitor Redis health continuously

### 5. Performance Optimization
- Use pipelines for batch operations
- Implement proper caching strategies with TTL
- Monitor cache hit rates and response times
- Use Lua scripts for complex atomic operations`,
        metadata: { library: 'redis-patterns', version: '1.0', topic: topic || 'integration-patterns', tokenCount: 3200 },
        snippets: [
          { 
            title: 'Multi-Client Setup', 
            code: `this.pool = {
  primary: new Redis({ connectionName: 'legal-ai-primary' }),
  subscriber: new Redis({ connectionName: 'legal-ai-subscriber' }),
  publisher: new Redis({ connectionName: 'legal-ai-publisher' }),
};`, 
            description: 'Separate Redis connections for different purposes' 
          },
          { 
            title: 'Document Sync', 
            code: `await publisher.publish(\`legal:document:\${docId}\`, JSON.stringify({
  documentId: docId,
  operation: 'update',
  timestamp: Date.now(),
}));`, 
            description: 'Real-time document update notifications' 
          },
          { 
            title: 'Circuit Breaker', 
            code: `return circuitBreaker.execute(
  () => redis.get(\`legal:doc:\${id}\`),
  null // fallback value
);`, 
            description: 'Resilient Redis operations with fallback' 
          }
        ]
      }
    };

    const result = libraryDocs[context7CompatibleLibraryID] || {
      content: `# ${context7CompatibleLibraryID}\n\nDocumentation not available for this library.`,
      metadata: { library: context7CompatibleLibraryID, tokenCount: 20 }
    };

    return json({ success: true, ...result, requestedTokens: tokens, timestamp: new Date().toISOString() });
    
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
