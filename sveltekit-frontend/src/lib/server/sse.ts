import { logger } from './logger';
import stream from "stream";

// lib/server/sse.ts
// Server-Sent Events helper for real-time streaming


export class SSE {
  private clients: Map<string, WritableStream> = new Map();
  private encoder = new TextEncoder();

  /**
   * Create SSE response
   */
  createResponse(): Response {
    const { readable, writable } = new TransformStream();
    
    const response = new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

    // Start heartbeat
    this.startHeartbeat(writable);
    
    return response;
  }

  /**
   * Send event to client
   */
  send(event: { type: string; data: any }): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    
    for (const [clientId, stream] of this.clients) {
      try {
        const writer = stream.getWriter();
        writer.write(this.encoder.encode(message));
        writer.releaseLock();
      } catch (error: any) {
        logger.error(`[SSE] Failed to send to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Close connection
   */
  close(): void {
    for (const [clientId, stream] of this.clients) {
      try {
        stream.close();
      } catch (error: any) {
        // Ignore close errors
      }
    }
    this.clients.clear();
  }

  private startHeartbeat(stream: WritableStream): void {
    const interval = setInterval(() => {
      try {
        const writer = stream.getWriter();
        writer.write(this.encoder.encode(`:heartbeat\n\n`));
        writer.releaseLock();
      } catch (error: any) {
        clearInterval(interval);
      }
    }, 30000); // Every 30 seconds
  }
}
