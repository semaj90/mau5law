import type { RequestHandler } from './$types';
import {
	getMissedMessages,
	registerSseConnection,
	deregisterSseConnection,
	storeMessage,
	broadcastMessage,
	nowId,
} from '$lib/server/evidence-stream';

// --- Dev in-memory message store & SSE connection registry ---
// Note: these are lightweight dev stubs. Replace with Redis/pubsub or DB-backed store in production.
type StoredMessage = {
  id: string;
  sessionId: string;
  type?: string;
  payload?: any;
  timestamp: string;
};

const messageStore: StoredMessage[] = [];
const sseConnections = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();
const encoder = new TextEncoder();

export const GET: RequestHandler = async ({ request, params, url }) => {
	const { sessionId } = params;
	if (!sessionId) {
		return new Response('Session ID required', { status: 400 });
	}
	const upgradeHeader = request.headers.get('upgrade')?.toLowerCase();
	if (upgradeHeader !== 'websocket') {
		// Non-WebSocket request - return missed messages via HTTP
		try {
			const since = url.searchParams.get('since');
			const messages = await getMissedMessages(sessionId, since || undefined);
			return new Response(
				JSON.stringify({
					sessionId,
					messages,
					timestamp: new Date().toISOString(),
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-cache',
					},
				}
			);
		} catch (error: any) {
			console.error('❌ Error getting missed messages:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	}
	// WebSocket upgrade request
	try {
		// Keep the existing behavior: advise using a dedicated WebSocket server/adapter.
		return new Response('WebSocket upgrade not supported in this route handler. Use dedicated WebSocket server.', {
			status: 426,
			headers: {
				'Upgrade': 'websocket',
				'Connection': 'Upgrade',
			},
		});
	} catch (error: any) {
		console.error('❌ WebSocket upgrade error:', error);
		return new Response('WebSocket upgrade failed', { status: 500 });
	}
};

// For development/testing - simple server-sent events alternative + publish action
export const POST: RequestHandler = async ({ request, params }) => {
	const { sessionId } = params;
	if (!sessionId) {
		return new Response('Session ID required', { status: 400 });
	}
	try {
		const body = await request.json();
		const action = body?.action;

		if (action === 'subscribe') {
			// Return server-sent events stream
			let keepAlive: ReturnType<typeof setInterval> | null = null;
			let timeout: ReturnType<typeof setTimeout> | null = null;

			const stream = new ReadableStream({
				start(controller: ReadableStreamDefaultController<Uint8Array>) {
					// Register connection for broadcasting
					registerSseConnection(sessionId, controller);

					// Send initial connection event
					const initMsg = {
						id: nowId(),
						sessionId,
						type: 'connection-established',
						payload: { timestamp: new Date().toISOString() },
						timestamp: new Date().toISOString(),
					};
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(initMsg)}\n\n`));

					// Keep-alive heartbeats
					keepAlive = setInterval(() => {
						try {
							controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
						} catch (error: any) {
							// If enqueue fails, clear interval and let cancel handle deregistration
							if (keepAlive) {
								clearInterval(keepAlive);
								keepAlive = null;
							}
						}
					}, 30000);

					// Cleanup after 1 hour (adjust as needed)
					timeout = setTimeout(() => {
						if (keepAlive) {
							clearInterval(keepAlive);
							keepAlive = null;
						}
						deregisterSseConnection(sessionId, controller);
						controller.close();
					}, 3600000);
				},
				cancel() {
					// Properly cleanup when consumer closes
					if (keepAlive) {
						clearInterval(keepAlive);
						keepAlive = null;
					}
					if (timeout) {
						clearTimeout(timeout);
						timeout = null;
					}
					try {
						// Best-effort deregistration
						deregisterSseConnection(sessionId, (this as any).controller as ReadableStreamDefaultController<Uint8Array>);
					} catch {
						// fallback: attempt to remove by iterating registry
						deregisterSseConnection(sessionId, undefined as any);
					}
				},
			});

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
				},
			});
		}

		if (action === 'publish') {
			const payload = body?.payload;
			const type = body?.type || 'message';
			const saved = storeMessage(sessionId, payload, type);
			// broadcast to any SSE and WS subscribers for this session
			broadcastMessage(sessionId, saved);
			return new Response(JSON.stringify(saved), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}

		return new Response('Invalid action', { status: 400 });
	} catch (error: any) {
		console.error('❌ SSE setup/error:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
        },
      });
    }

    if (action === 'publish') {
      const payload = body?.payload;
      const type = body?.type || 'message';
      const saved = storeMessage(sessionId, payload, type);
      // broadcast to any SSE subscribers for this session
      broadcastMessage(sessionId, saved);
      return new Response(JSON.stringify(saved), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error: any) {
    console.error('❌ SSE setup/error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
