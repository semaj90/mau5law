import type { RequestHandler } from './$types';
import { createActor } from 'xstate';
import {
  evidenceProcessingMachine,
  type EvidenceProcessingContext,
} from '$lib/state/evidence-processing-machine.js';

// Active processing sessions (no longer store controllers; GET opens SSE connections on demand)
const activeSessions = new Map<string, { actor: any; startTime: number }>();
// POST starts or updates a processing session (no SSE here)
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  let { evidenceId, file, neuralSpriteConfig } = body;
  if (!evidenceId) evidenceId = `evidence_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  let session = activeSessions.get(evidenceId);
  if (!session) {
    const actor = createActor(evidenceProcessingMachine, {
      input: {
        evidenceId,
        uploadProgress: 0,
        errors: [],
        processingTimeMs: 0,
        streamingUpdates: [],
      },
    });
    actor.start();
    session = { actor, startTime: Date.now() };
    activeSessions.set(evidenceId, session);
  }

  // If file provided, send event (can support multiple POSTs)
  if (file) {
    try {
      const mockFile = new File([new Uint8Array(1024)], file.name || 'document.pdf', {
        type: file.type || 'application/pdf',
      });
      session.actor.send({ type: 'UPLOAD_FILE', file: mockFile, evidenceId });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to stage file', details: String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (neuralSpriteConfig) {
    session.actor.send({ type: 'CONFIGURE_NEURAL_SPRITE', config: neuralSpriteConfig });
  }

  return new Response(
    JSON.stringify({
      evidenceId,
      status: 'started',
      streamingEndpoint: `/api/evidence/process/stream?evidenceId=${encodeURIComponent(evidenceId)}`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

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

// GET opens SSE stream for a given evidenceId
export const GET: RequestHandler = async ({ url }) => {
  const evidenceId = url.searchParams.get('evidenceId');
  if (!evidenceId) {
    return new Response(JSON.stringify({ error: 'evidenceId query param is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const session = activeSessions.get(evidenceId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'No active session for evidenceId' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // initial event
      send({ type: 'connection_established', evidenceId, timestamp: Date.now() });

      const sub = session.actor.subscribe((state: any) => {
        const update = {
          evidenceId,
          currentState: state.value,
          context: state.context,
          timestamp: Date.now(),
          progress: getOverallProgress(state.context),
          currentStep: getCurrentStepInfo(state.context),
        };
        try {
          send(update);
        } catch (e) {
          controller.close();
        }
        if (state.matches('completed') || state.matches('error') || state.matches('cancelled')) {
          setTimeout(() => {
            send({ type: 'session_complete', evidenceId });
            controller.close();
          }, 800);
        }
      });

      (controller as any).onCancel = () => {
        sub.unsubscribe?.();
      };
    },
    cancel() {
      // subscription cleaned in onCancel
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

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
