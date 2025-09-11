/// <reference types="vite/client" />
import { Server } from 'socket.io';
import { dev } from "$app/environment";
import type { Redis } from 'ioredis';
import { createRedisInstance, createRedisClientSet } from '$lib/server/redis';
import { createPubSubHelper } from '$lib/server/redisPubSub';
import { registerCleanup } from '$lib/server/shutdown';
import type { RequestHandler } from './$types';

// WebSocket server for real-time updates
let io: Server | null = null;
// Legacy single redis client usage replaced by dedicated pub/sub helper set.
let redisPrimary: ReturnType<typeof createRedisInstance> | null = null;
let pubSub = null as ReturnType<typeof createPubSubHelper> | null;

// Lightweight in-memory metrics (reset on process restart)
const metrics = {
  pubsubMessages: 0,
  progressMessages: 0,
  resultMessages: 0,
  errorMessages: 0,
  lastMessageAt: null as string | null,
};

// Initialize WebSocket server and Redis subscriber
function initializeWebSocket() {
  if (io) return io;

  // Create Socket.IO server
  io = new Server({
    cors: {
      origin: dev ? 'http://localhost:5173' : false,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Initialize Redis subscriber for job progress
  // Initialize Redis primary (non-subscriber) for auxiliary commands (get/set)
  try {
    redisPrimary = createRedisInstance();
  } catch {
    const RedisCtor = (require('ioredis') as any).default || (require('ioredis') as any);
    redisPrimary = new RedisCtor({
      host: import.meta.env.REDIS_HOST || 'localhost',
      port: parseInt(import.meta.env.REDIS_PORT || '6379'),
      password: import.meta.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }

  // Handle WebSocket connections
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join case-specific rooms for targeted updates
    socket.on('join-case', (caseId: string) => {
      socket.join(`case-${caseId}`);
      console.log(`📂 Client ${socket.id} joined case room: ${caseId}`);
    });

    // Join upload-specific rooms for progress tracking
    socket.on('join-upload', (uploadId: string) => {
      socket.join(`upload-${uploadId}`);
      console.log(`📤 Client ${socket.id} joined upload room: ${uploadId}`);

      // Send current progress if available
      getCurrentProgress(uploadId).then((progress) => {
        if (progress) {
          socket.emit('upload-progress', progress);
        }
      });
    });

    // Handle tensor processing subscription
    socket.on('subscribe-tensor', (jobId: string) => {
      socket.join(`tensor-${jobId}`);
      console.log(`🧮 Client ${socket.id} subscribed to tensor job: ${jobId}`);
    });

    // Handle search result streaming
    socket.on('subscribe-search', (searchId: string) => {
      socket.join(`search-${searchId}`);
      console.log(`🔍 Client ${socket.id} subscribed to search: ${searchId}`);
    });

    // Handle attention tracking
    socket.on(
      'user-attention',
      (data: {
        type: 'focus' | 'blur' | 'scroll' | 'click' | 'typing';
        timestamp: string;
        metadata?: unknown;
      }) => {
        // Track user attention for AI context switching
        trackUserAttention(socket.id, data);
      }
    );

    // Handle real-time collaboration
    socket.on('document-edit', (data: { documentId: string; change: any; userId: string }) => {
      // Broadcast document changes to other collaborators
      socket.to(`doc-${data.documentId}`).emit('document-change', {
        change: data.change,
        userId: data.userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Setup pub/sub using helper (pattern + direct channels)
  setupRedisSubscriptions();

  // Register cleanup once
  registerCleanup(() => _closeWebSocket());

  return io;
}

// Setup Redis subscriptions for job progress updates
function setupRedisSubscriptions() {
  if (!io || pubSub) return;
  pubSub = createPubSubHelper({
    patterns: ['progress:*', 'result:*', 'error:*'],
    onMessage: ({ channel, message }) => {
      metrics.pubsubMessages++;
      metrics.lastMessageAt = new Date().toISOString();
      try {
        const data = JSON.parse(message);
        if (channel.startsWith('progress:')) {
          metrics.progressMessages++;
          const uploadId = channel.split(':')[1];
          (io as Server)?.to(`upload-${uploadId}`).emit('upload-progress', {
            uploadId,
            ...data,
            timestamp: new Date().toISOString(),
          });
          if ((data as any).caseId) {
            (io as Server)?.to(`case-${(data as any).caseId}`).emit('case-progress', {
              uploadId,
              ...data,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (channel.startsWith('result:')) {
          metrics.resultMessages++;
          const jobId = channel.split(':')[1];
          (io as Server)?.to(`tensor-${jobId}`).emit('tensor-result', {
            jobId,
            result: data,
            timestamp: new Date().toISOString(),
          });
        } else if (channel.startsWith('error:')) {
          metrics.errorMessages++;
          const uploadId = channel.split(':')[1];
          (io as Server)?.to(`upload-${uploadId}`).emit('upload-error', {
            uploadId,
            error: data,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('❌ Failed to parse Redis message:', e);
      }
    },
  });
}

// Track user attention for AI context switching
async function trackUserAttention(socketId: string, data: any): Promise<void> {
  if (!redisPrimary) return;

  const attentionEvent = {
    socketId,
    ...data,
    serverTimestamp: new Date().toISOString(),
  };

  // Store in Redis with expiration (1 hour)
  await (redisPrimary as any).setex(
    `attention:${socketId}:${Date.now()}`,
    3600,
    JSON.stringify(attentionEvent)
  );

  // Trigger AI context switching if needed
  if (data.type === 'typing' && data.metadata?.query) {
    await triggerAIContextSwitching(socketId, data.metadata.query);
  }
}

// Trigger AI context switching based on user attention
async function triggerAIContextSwitching(socketId: string, query: string): Promise<void> {
  try {
    // Analyze query for legal context
    const contextResponse = await fetch('http://localhost:8080/api/context/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        socketId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (contextResponse.ok) {
      const context = await contextResponse.json();

      // Emit context suggestions to client
      io?.to(socketId).emit('ai-context-suggestion', {
        query,
        suggestions: context.suggestions,
        relevantDocuments: context.documents,
        confidence: context.confidence,
      });
    }
  } catch (error: any) {
    console.error('❌ AI context switching failed:', error);
  }
}

// Get current progress for an upload
async function getCurrentProgress(uploadId: string): Promise<any> {
  if (!redis) return null;

  try {
    const progressData = await (redisPrimary as any).get(`progress:${uploadId}`);
    return progressData ? JSON.parse(progressData) : null;
  } catch (error: any) {
    console.error('❌ Failed to get current progress:', error);
    return null;
  }
}

// Broadcast progress update to specific rooms
export function _broadcastProgress(uploadId: string, caseId: string, progress: any) {
  if (!io) return;

  const progressData = {
    uploadId,
    caseId,
    ...progress,
    timestamp: new Date().toISOString(),
  };

  // Emit to upload-specific room
  io.to(`upload-${uploadId}`).emit('upload-progress', progressData);

  // Emit to case-specific room
  io.to(`case-${caseId}`).emit('case-progress', progressData);
}

// Broadcast tensor processing results
export function _broadcastTensorResult(jobId: string, result: any) {
  if (!io) return;

  io.to(`tensor-${jobId}`).emit('tensor-result', {
    jobId,
    result,
    timestamp: new Date().toISOString(),
  });
}

// Broadcast search results in real-time
export function _broadcastSearchResults(searchId: string, results: any) {
  if (!io) return;

  io.to(`search-${searchId}`).emit('search-results', {
    searchId,
    results,
    timestamp: new Date().toISOString(),
  });
}

// HTTP handler for WebSocket endpoint
export const GET: RequestHandler = async ({ url }) => {
  const server = initializeWebSocket();

  // Return WebSocket connection info
  return new Response(
    JSON.stringify({
      status: 'WebSocket server running',
      endpoint: '/api/ws',
      features: [
        'Real-time upload progress',
        'Tensor processing updates',
        'AI context switching',
        'Document collaboration',
        'Search result streaming',
      ],
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

// Cleanup function
export function _closeWebSocket() {
  if (io) {
    io.close();
    io = null;
  }
  if (pubSub) {
    pubSub.stop().catch(() => {});
    pubSub = null;
  }
  if (redisPrimary) {
    (redisPrimary as any).disconnect?.();
    redisPrimary = null;
  }
}

// Expose metrics endpoint data (can be imported by health/metrics route)
export function _getWsMetrics() {
  return { ...metrics };
}