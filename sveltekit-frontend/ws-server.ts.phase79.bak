import http from 'http';
import type { WebSocketServer  } from 'ws';
import type { getMissedMessages,
  registerWsConnection,
  deregisterWsConnection,
  storeMessage,
  broadcastMessage,
 } from './src/lib/server/evidence-stream';

// Simple standalone WS server example. If using svelte-adapter-node you can attach this to your SvelteKit handler.
// Example standalone: node dist/ws-server.js (after compiling) or run with ts-node in dev.

const PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8081;
const server = http.createServer();

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  // Expect client to provide ?sessionId=... in connection URL
  const url = req.url || '';
  const params = new URLSearchParams(url.split('?')[1]);
  const sessionId = params.get('sessionId') || 'default';

  // Register for broadcasts
  registerWsConnection(sessionId, ws as any);

  // Send an initial hello + missed messages
  ws.send(
    JSON.stringify({
      type: 'connection-established',
      sessionId,
      timestamp: new Date().toISOString(),
    })
  );
  const missed = await getMissedMessages(sessionId);
  if (missed && missed.length) {
    for (const m of missed) {
      try {
        ws.send(JSON.stringify(m));
      } catch {}
    }
  }

  ws.on('message', (raw) => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      // Support a minimal publish command from WS clients
      if (parsed?.action === 'publish') {
        const saved = storeMessage(sessionId, parsed.payload, parsed.type || 'message');
        broadcastMessage(sessionId, saved);
      }
    } catch (err) {
      // ignore parse errors
    }
  });

  ws.on('close', () => {
    deregisterWsConnection(sessionId, ws as any);
  });

  ws.on('error', () => {
    try {
      (ws as any).terminate && (ws as any).terminate();
    } catch {}
    deregisterWsConnection(sessionId, ws as any);
  });
});

server.listen(PORT, () => {
  console.log(`WS server listening on ws://localhost:${PORT} (use ?sessionId=yourSessionId)`);
});
