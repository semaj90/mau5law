import type { WebSocket } from "ws";

// WebSocket server for real-time updates
import { WebSocketServer } from "ws";
import { createClient } from '$lib/shims/redis-shim';

export interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}
class RealTimeServer {
  private wss: WebSocketServer;
  private redisClient: any;
  private redisSub: any;
  private clients: Map<string, ClientConnection> = new Map();
  private isInitialized = false;

  constructor(port: number = 3030) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    this.initializeRedis();
  }
  private async initializeRedis() {
    try {
      // Create Redis clients
      this.redisClient = await createClient({
        url: import.meta.env.REDIS_URL || 'redis://localhost:6379',
      });
      this.redisSub = await createClient({
        url: import.meta.env.REDIS_URL || 'redis://localhost:6379',
      });

      // Connect Redis clients
      await this.redisClient.connect();
      await this.redisSub.connect();

      // Subscribe to channels
      await this.setupRedisSubscriptions();

      this.isInitialized = true;
      console.log('✅ Redis connected and WebSocket server initialized');
    } catch (error: any) {
      console.error('❌ Redis connection failed:', error);
      // Continue without Redis - fallback to polling
    }
  }
  private async setupRedisSubscriptions() {
    const channels = [
      'evidence_update',
      'case_update',
      'poi_update',
      'report_update',
      'citation_update',
      'canvas_update',
      'user_activity',
    ];

    for (const channel of channels) {
      await this.redisSub.subscribe(channel, (message) => {
        this.broadcastToSubscribers(channel, message);
      });
    }
  }
  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        ws,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);
      console.log(`📡 Client connected: ${clientId}`);

      // Handle client messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error: any) {
          console.error('Invalid message format:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📡 Client disconnected: ${clientId}`);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connection',
          clientId,
          timestamp: new Date().toISOString(),
        })
      );
    });
  }
  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'auth':
        client.userId = message.userId;
        break;

      case 'subscribe':
        const { channels } = message;
        if (Array.isArray(channels)) {
          channels.forEach((channel) => client.subscriptions.add(channel));
        }
        break;

      case 'unsubscribe':
        const { channels: unsubChannels } = message;
        if (Array.isArray(unsubChannels)) {
          unsubChannels.forEach((channel) => client.subscriptions.delete(channel));
        }
        break;

      case 'publish':
        // Allow clients to publish updates
        this.publishUpdate(message.channel, message.data, message.userId);
        break;
    }
  }
  private broadcastToSubscribers(channel: string, message: string) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch {
      parsedMessage = { data: message };
    }
    const payload = JSON.stringify({
      type: 'update',
      channel,
      data: parsedMessage,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel) && client.ws.readyState === client.ws.OPEN) {
        try {
          client.ws.send(payload);
        } catch (error: any) {
          console.error(`Failed to send to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    });
  }
  public async publishUpdate(channel: string, data: any, userId?: string) {
    if (!this.isInitialized) return;

    const message = JSON.stringify({
      data,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.redisClient.publish(channel, message);
    } catch (error: any) {
      console.error('Failed to publish to Redis:', error);
    }
  }
  // Utility methods for specific updates
  public async publishEvidenceUpdate(
    evidenceId: string,
    action: string,
    data: any,
    userId?: string
  ) {
    await this.publishUpdate(
      'evidence_update',
      {
        evidenceId,
        action, // 'created', 'updated', 'deleted'
        data,
      },
      userId
    );
  }
  public async publishCaseUpdate(caseId: string, action: string, data: any, userId?: string) {
    await this.publishUpdate(
      'case_update',
      {
        caseId,
        action,
        data,
      },
      userId
    );
  }
  public async publishCanvasUpdate(caseId: string, action: string, data: any, userId?: string) {
    await this.publishUpdate(
      'canvas_update',
      {
        caseId,
        action,
        data,
      },
      userId
    );
  }
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  public getStats() {
    return {
      connectedClients: this.clients.size,
      redisConnected: this.isInitialized,
      uptime: process.uptime(),
    };
  }
  // Additional methods for proper lifecycle management
  public async initialize(): Promise<void> {
    await this.initializeRedis();
  }
  public async shutdown(): Promise<void> {
    try {
      // Close all WebSocket connections
      for (const [_, client] of this.clients) {
        client.ws.close();
      }
      this.clients.clear();

      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      if (this.redisSub) {
        await this.redisSub.quit();
      }
      // Close WebSocket server
      this.wss.close();

      console.log('✅ WebSocket server shut down gracefully');
    } catch (error: any) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}
// Singleton instance
let serverInstance: RealTimeServer | null = null;

export function getRealTimeServer(): RealTimeServer {
  if (!serverInstance) {
    serverInstance = new RealTimeServer();
  }
  return serverInstance;
}
export default RealTimeServer;
