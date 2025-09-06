
import type { RequestHandler } from './$types.js';
import { URL } from "url";

// ======================================================================
// REAL-TIME WEBSOCKET HANDLER FOR ENHANCED LEGAL AI SYSTEM
// Supporting streaming updates, live processing results, and system monitoring
// ======================================================================

// Enhanced WebSocket message types
export interface WebSocketMessage {
  type: 
    | "evidence_processing"
    | "ai_result"
    | "vector_match"
    | "graph_update"
    | "system_health"
    | "cache_update";
  data: any;
  timestamp: Date;
  clientId?: string;
  priority?: number;
}

export interface ConnectedClient {
  id: string;
  ws: any;
  subscriptions: Set<string>;
  lastSeen: Date;
  metadata?: {
    userAgent?: string;
    userId?: string;
    sessionId?: string;
  };
}

class EnhancedWebSocketManager {
  private clients = new Map<string, ConnectedClient>();
  private messageQueue = new Map<string, WebSocketMessage[]>();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthCheck();
  }

  addClient(clientId: string, ws: any, metadata?: any) {
    const client: ConnectedClient = {
      id: clientId,
      ws,
      subscriptions: new Set(["system", "processing"]), // Default subscriptions
      lastSeen: new Date(),
      metadata,
    };

    this.clients.set(clientId, client);

    // Send welcome message with current system status
    this.sendToClient(clientId, {
      type: "system_health",
      data: {
        message: "Connected to Enhanced Legal AI System",
        clientId,
        serverTime: new Date(),
        connectedClients: this.clients.size,
      },
      timestamp: new Date(),
    });

    console.log(
      `WebSocket client connected: ${clientId} (Total: ${this.clients.size})`,
    );
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(
        `WebSocket client disconnected: ${clientId} (Remaining: ${this.clients.size})`,
      );
    }
  }

  sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        client.ws.send(JSON.stringify(message));
        client.lastSeen = new Date();
      } catch (error: any) {
        console.warn(`Failed to send message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  broadcast(
    message: WebSocketMessage,
    filter?: (client: ConnectedClient) => boolean,
  ) {
    const clients = filter
      ? Array.from(this.clients.values()).filter(filter)
      : Array.from(this.clients.values());

    let successCount = 0;
    let failureCount = 0;

    for (const client of clients) {
      try {
        if (client.ws.readyState === 1) {
          // WebSocket.OPEN
          client.ws.send(JSON.stringify(message));
          client.lastSeen = new Date();
          successCount++;
        }
      } catch (error: any) {
        console.warn(`Failed to broadcast to client ${client.id}:`, error);
        this.removeClient(client.id);
        failureCount++;
      }
    }

    console.log(
      `Broadcast sent to ${successCount} clients, ${failureCount} failures`,
    );
  }

  subscribeClient(clientId: string, subscriptions: string[]) {
    const client = this.clients.get(clientId);
    if (client) {
      subscriptions.forEach((sub) => client.subscriptions.add(sub));
      this.sendToClient(clientId, {
        type: "system_health",
        data: {
          message: "Subscriptions updated",
          subscriptions: Array.from(client.subscriptions),
        },
        timestamp: new Date(),
      });
    }
  }

  unsubscribeClient(clientId: string, subscriptions: string[]) {
    const client = this.clients.get(clientId);
    if (client) {
      subscriptions.forEach((sub) => client.subscriptions.delete(sub));
    }
  }

  // Send evidence processing updates
  broadcastEvidenceProcessing(evidenceId: string, stage: string, result: any) {
    this.broadcast(
      {
        type: "evidence_processing",
        data: {
          evidenceId,
          stage,
          result,
          status: result.status || "processing",
        },
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("processing"),
    );
  }

  // Send AI analysis results
  broadcastAIResult(evidenceId: string, resultType: string, result: any) {
    this.broadcast(
      {
        type: "ai_result",
        data: {
          evidenceId,
          resultType, // 'embedding', 'tagging', 'analysis'
          result,
          confidence: result.confidence || 0,
        },
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("ai_results"),
    );
  }

  // Send vector similarity matches
  broadcastVectorMatches(evidenceId: string, matches: any[]) {
    this.broadcast(
      {
        type: "vector_match",
        data: {
          evidenceId,
          matches: matches.map((match) => ({
            id: match.id,
            similarity: match.similarity,
            content: match.content?.slice(0, 100) + "...", // Truncate for efficiency
          })),
          totalMatches: matches.length,
        },
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("vector_search"),
    );
  }

  // Send graph relationship updates
  broadcastGraphUpdate(evidenceId: string, relationships: any[]) {
    this.broadcast(
      {
        type: "graph_update",
        data: {
          evidenceId,
          relationships: relationships.map((rel) => ({
            from: rel.from || rel.fromId,
            to: rel.to || rel.toId,
            type: rel.type,
            strength: rel.strength || rel.confidence,
          })),
          totalRelationships: relationships.length,
        },
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("graph_updates"),
    );
  }

  // Send system health updates
  broadcastSystemHealth(healthData: any) {
    this.broadcast(
      {
        type: "system_health",
        data: {
          ...healthData,
          connectedClients: this.clients.size,
          serverUptime: process.uptime(),
        },
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("system"),
    );
  }

  // Send cache performance updates
  broadcastCacheUpdate(cacheStats: any) {
    this.broadcast(
      {
        type: "cache_update",
        data: cacheStats,
        timestamp: new Date(),
      },
      (client) => client.subscriptions.has("cache_stats"),
    );
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const now = new Date();
      const staleClients: string[] = [];

      // Check for stale connections (no activity in 5 minutes)
      for (const [clientId, client] of this.clients) {
        const timeSinceLastSeen = now.getTime() - client.lastSeen.getTime();
        if (timeSinceLastSeen > 5 * 60 * 1000) {
          // 5 minutes
          staleClients.push(clientId);
        }
      }

      // Remove stale clients
      staleClients.forEach((clientId) => this.removeClient(clientId));

      // Send health ping to remaining clients
      this.broadcast({
        type: "system_health",
        data: {
          ping: "health_check",
          serverTime: now,
          connectedClients: this.clients.size,
        },
        timestamp: now,
      });
    }, 60000); // Every minute
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all connections
    for (const client of this.clients.values()) {
      try {
        client.ws.close();
      } catch (error: any) {
        console.warn("Error closing WebSocket:", error);
      }
    }

    this.clients.clear();
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      subscriptions: Array.from(this.clients.values()).reduce(
        (acc, client) => {
          client.subscriptions.forEach((sub) => {
            acc[sub] = (acc[sub] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

// Global WebSocket manager instance
const wsManager = new EnhancedWebSocketManager();

// Export manager for use in other modules
export { wsManager };

// WebSocket upgrade handler
export const GET: RequestHandler = async ({ request, url }) => {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get("upgrade");

  if (upgrade !== "websocket") {
    return new Response("WebSocket connection required", { status: 426 });
  }

  try {
    // In a real implementation, you'd handle the WebSocket upgrade here
    // This is a placeholder since SvelteKit handles WebSocket differently

    return new Response(
      JSON.stringify({
        message: "WebSocket endpoint ready",
        path: url.pathname,
        supportedTypes: [
          "evidence_processing",
          "ai_result",
          "vector_match",
          "graph_update",
          "system_health",
          "cache_update",
        ],
        instructions: {
          connect: "ws://localhost:5173/api/websocket",
          subscribe: 'Send: {"action": "subscribe", "types": ["processing", "ai_results"]}',
          unsubscribe: 'Send: {"action": "unsubscribe", "types": ["processing"]}',
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("WebSocket setup error:", error);
    return new Response("WebSocket setup failed", { status: 500 });
  }
};

// Helper functions for external use
export const webSocketHelpers = {
  broadcastEvidenceProcessing: (
    evidenceId: string,
    stage: string,
    result: any,
  ) => wsManager.broadcastEvidenceProcessing(evidenceId, stage, result),

  broadcastAIResult: (evidenceId: string, resultType: string, result: any) =>
    wsManager.broadcastAIResult(evidenceId, resultType, result),

  broadcastVectorMatches: (evidenceId: string, matches: any[]) =>
    wsManager.broadcastVectorMatches(evidenceId, matches),

  broadcastGraphUpdate: (evidenceId: string, relationships: any[]) =>
    wsManager.broadcastGraphUpdate(evidenceId, relationships),

  broadcastSystemHealth: (healthData: any) =>
    wsManager.broadcastSystemHealth(healthData),

  broadcastCacheUpdate: (cacheStats: any) =>
    wsManager.broadcastCacheUpdate(cacheStats),

  getStats: () => wsManager.getStats(),
};
