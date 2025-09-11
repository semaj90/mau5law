import type { RequestHandler } from '@sveltejs/kit';

type Listener = (payload: string) => void;

interface Session {
  id: string;
  listeners: Set<Listener>;
  closed: boolean;
}

const sessions = new Map<string, Session>();

function makeSession(id: string): Session {
  const s: Session = { id, listeners: new Set(), closed: false };
  sessions.set(id, s);
  return s;
}

function getSession(id: string) {
  return sessions.get(id) ?? makeSession(id);
}

function sendToSession(id: string, obj: unknown) {
  const s = sessions.get(id);
  if (!s) return;
  const payload = JSON.stringify(obj);
  for (const l of s.listeners) l(payload);
}

function simulateProcessing(sessionId: string, files: { name: string }[]) {
  // Simulate progress events per-file and a final 'done' event.
  const total = files.length || 1;
  files.forEach((file, idx) => {
    let progress = 0;
    const key = `${file.name}-${Date.now()}-${idx}`;
    const iv = setInterval(
      () => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) progress = 100;
        sendToSession(sessionId, { type: 'progress', file: file.name, id: key, progress });
        if (progress >= 100) {
          clearInterval(iv);
          sendToSession(sessionId, { type: 'file:complete', file: file.name, id: key });
          // small delay then possibly emit overall progress
          setTimeout(() => {
            sendToSession(sessionId, { type: 'info', message: `Completed ${file.name}` });
            if (idx === total - 1) {
              sendToSession(sessionId, { type: 'done', message: 'All files processed', sessionId });
            }
          }, 200);
        }
      },
      300 + Math.random() * 400
    );
  });
}

export const POST: RequestHandler = async ({ request }) => {
  // Start a processing session. Accepts JSON: { files: [{name}], sessionId?: string }
  const body = await request.json().catch(() => ({}));
  const files = Array.isArray(body.files) ? body.files : [];
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.length
      ? body.sessionId
      : `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // ensure session exists and start simulation
  getSession(sessionId);
  setTimeout(() => simulateProcessing(sessionId, files), 50);

  return new Response(JSON.stringify({ sessionId }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};

export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId query required' }), { status: 400 });
  }

  const session = getSession(sessionId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function listener(payload: string) {
        // SSE data: line-delimited with double-newline
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      session.listeners.add(listener);

      // initial welcome event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );

      // When the client disconnects, remove the listener.
      (controller as any).onCancel = () => {
        session.listeners.delete(listener);
      };
    },
    cancel() {
      // noop
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream;charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
};
/*
 * SvelteKit Streaming API for Real-time Legal Evidence Processing
 *
 * Provides Server-Sent Events (SSE) for streaming workflow updates
 * Integrates with xState evidence processing machine for orchestrated workflows
 */

import type { RequestHandler } from './$types';
import { createActor } from 'xstate';
import {
  evidenceProcessingMachine,
  type EvidenceProcessingContext,
} from '$lib/state/evidence-processing-machine.js';

// Active processing sessions
const activeSessions = new Map<
  string,
  {
    actor: any;
    controller: ReadableStreamDefaultController;
    startTime: number;
  }
>();

// Duplicate POST export handler removed to avoid conflicts

// Control endpoint for sending events to active sessions
export const PUT: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { evidenceId, event } = body;

  const session = activeSessions.get(evidenceId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'No active session found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Send event to xState machine
    session.actor.send(event);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Event ${event.type} sent to session ${evidenceId}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Failed to send event: ${error.message}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Get session status endpoint removed to avoid duplication

// Delete/cancel session
export const DELETE: RequestHandler = async ({ url }) => {
  const evidenceId = url.searchParams.get('evidenceId');

  if (!evidenceId) {
    return new Response(JSON.stringify({ error: 'evidenceId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = activeSessions.get(evidenceId);
  if (session) {
    session.actor.send({ type: 'CANCEL_PROCESSING' });
    session.actor.stop();
    session.controller.close();
    activeSessions.delete(evidenceId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Session ${evidenceId} cancelled and removed`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else {
    return new Response(
      JSON.stringify({
        error: 'Session not found',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Helper functions
function getAvailableTransitions(state: any): string[] {
  return Object.keys(state.nextEvents || {});
}

function getOverallProgress(context: EvidenceProcessingContext): number {
  const steps = ['upload', 'analysis', 'glyph_generation', 'png_embedding', 'minio_storage'];
  let totalProgress = 0;

  for (const step of steps) {
    const stepUpdate = context.streamingUpdates.find((update) => update.step === step);
    if (stepUpdate) {
      if (stepUpdate.status === 'completed') {
        totalProgress += 20; // Each step is 20% of total
      } else if (stepUpdate.status === 'in_progress') {
        totalProgress += (stepUpdate.progress / 100) * 20;
      }
    }
  }

  return Math.min(100, Math.round(totalProgress));
}

function getCurrentStepInfo(context: EvidenceProcessingContext) {
  const inProgressUpdate = context.streamingUpdates.find(
    (update) => update.status === 'in_progress'
  );

  const lastUpdate = context.streamingUpdates[context.streamingUpdates.length - 1];

  return {
    step: inProgressUpdate?.step || 'idle',
    progress: inProgressUpdate?.progress || 0,
    message: inProgressUpdate?.message || lastUpdate?.message || 'Ready to start processing',
    status: inProgressUpdate?.status || 'pending',
  };
}
