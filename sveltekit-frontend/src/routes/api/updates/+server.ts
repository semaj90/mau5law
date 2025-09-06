/// <reference types="vite/client" />

import type { RequestHandler } from './$types';

// Server-Sent Events API route for SSR-safe real-time updates
import { createClient } from "redis";
import { URL } from "url";

// SSE connection manager
class SSEConnectionManager {
  private connections: Map<string, Response> = new Map();
  private redisSubscriber: any;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.redisSubscriber = createClient({
        url: import.meta.env.REDIS_URL || "redis://localhost:6379",
      });

      await this.redisSubscriber.connect();

      // Subscribe to all update channels
      const channels = [
        "evidence_update",
        "case_update",
        "poi_update",
        "report_update",
        "citation_update",
        "canvas_update",
        "user_activity",
      ];

      for (const channel of channels) {
        await this.redisSubscriber.subscribe(channel, (message: string) => {
          this.broadcastToConnections(channel, message);
        });
      }
      this.isInitialized = true;
      console.log("✅ SSE Redis subscriber initialized");
    } catch (error: any) {
      console.error("❌ SSE Redis connection failed:", error);
    }
  }
  private broadcastToConnections(channel: string, message: string) {
    const data = {
      channel,
      data: JSON.parse(message),
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all active SSE connections
    for (const [connectionId, response] of this.connections) {
      try {
        // Send SSE formatted message
        const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
        // Note: In a real implementation, you'd need to handle the response stream
        console.log(
          `Broadcasting to SSE connection ${connectionId}:`,
          sseMessage,
        );
      } catch (error: any) {
        console.error(`Failed to send to connection ${connectionId}:`, error);
        this.connections.delete(connectionId);
      }
    }
  }
  addConnection(connectionId: string, response: Response) {
    this.connections.set(connectionId, response);
  }
  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
  }
  getConnectionCount(): number {
    return this.connections.size;
  }
}
// Global SSE manager instance
const sseManager = new SSEConnectionManager();

export const GET: RequestHandler = async ({ url, request }) => {
  // Initialize SSE manager if not already done
  await sseManager.initialize();

  // Get connection parameters
  const userId = url.searchParams.get("userId");
  const subscriptions = url.searchParams.get("subscriptions")?.split(",") || [];
  const connectionId = `${userId || "anonymous"}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = {
        type: "connection_established",
        connectionId,
        userId,
        subscriptions,
        timestamp: new Date().toISOString(),
      };

      controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

      // Store connection for broadcasting
      // Note: This is a simplified approach - in production, you'd store the controller
      console.log(`SSE connection established: ${connectionId}`);

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            `data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`,
          );
        } catch (error: any) {
          console.error("Heartbeat failed:", error);
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        sseManager.removeConnection(connectionId);
        controller.close();
        console.log(`SSE connection closed: ${connectionId}`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
};

// Health check endpoint
export const POST: RequestHandler = async () => {
  const status = {
    sseConnections: sseManager.getConnectionCount(),
    redisInitialized: sseManager["isInitialized"],
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(status), {
    headers: { "Content-Type": "application/json" },
  });
};
