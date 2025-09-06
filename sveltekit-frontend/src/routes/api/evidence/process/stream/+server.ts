/**
 * SvelteKit Streaming API for Real-time Legal Evidence Processing
 * 
 * Provides Server-Sent Events (SSE) for streaming workflow updates
 * Integrates with xState evidence processing machine for orchestrated workflows
 */

import type { RequestHandler } from './$types';
import { createActor } from 'xstate';
import { evidenceProcessingMachine, type EvidenceProcessingContext } from '$lib/state/evidence-processing-machine.js';

// Active processing sessions
const activeSessions = new Map<string, {
  actor: any;
  controller: ReadableStreamDefaultController;
  startTime: number;
}>();

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { evidenceId, file, neuralSpriteConfig } = body;

  if (!evidenceId) {
    return new Response(JSON.stringify({ error: 'evidenceId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create streaming response
  const stream = new ReadableStream({
    start(controller) {
      // Create xState actor for this processing session
      const actor = createActor(evidenceProcessingMachine, {
        input: {
          evidenceId,
          uploadProgress: 0,
          errors: [],
          processingTimeMs: 0,
          streamingUpdates: []
        }
      });

      // Store session for potential cancellation
      activeSessions.set(evidenceId, {
        actor,
        controller,
        startTime: Date.now()
      });

      // Subscribe to state changes for streaming updates
      actor.subscribe((state) => {
        const updateData = {
          evidenceId,
          currentState: state.value,
          context: state.context,
          timestamp: Date.now(),
          canTransition: getAvailableTransitions(state),
          progress: getOverallProgress(state.context),
          currentStep: getCurrentStepInfo(state.context)
        };

        // Send SSE update
        try {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(updateData)}\n\n`)
          );
        } catch (error) {
          console.error('Failed to send SSE update:', error);
          controller.close();
          activeSessions.delete(evidenceId);
        }

        // Handle final states
        if (state.matches('completed') || state.matches('error') || state.matches('cancelled')) {
          setTimeout(() => {
            controller.close();
            activeSessions.delete(evidenceId);
          }, 1000);
        }
      });

      // Start the processing workflow
      actor.start();

      // Simulate file upload (in real app, handle multipart upload)
      if (file) {
        const mockFile = new File([new Uint8Array(1024)], file.name || 'document.pdf', {
          type: file.type || 'application/pdf'
        });

        actor.send({
          type: 'UPLOAD_FILE',
          file: mockFile,
          evidenceId
        });

        // Configure Neural Sprite if provided
        if (neuralSpriteConfig) {
          setTimeout(() => {
            actor.send({
              type: 'CONFIGURE_NEURAL_SPRITE',
              config: neuralSpriteConfig
            });
          }, 500);
        }
      }

      // Send initial connection confirmation
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'connection_established',
          evidenceId,
          message: 'Real-time processing stream connected',
          timestamp: Date.now()
        })}\n\n`)
      );
    },

    cancel() {
      // Cleanup on client disconnect
      const session = activeSessions.get(evidenceId);
      if (session) {
        session.actor.send({ type: 'CANCEL_PROCESSING' });
        session.actor.stop();
        activeSessions.delete(evidenceId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
};

// Control endpoint for sending events to active sessions
export const PUT: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { evidenceId, event } = body;

  const session = activeSessions.get(evidenceId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'No active session found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Send event to xState machine
    session.actor.send(event);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Event ${event.type} sent to session ${evidenceId}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Failed to send event: ${error.message}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Get session status
export const GET: RequestHandler = async ({ url }) => {
  const evidenceId = url.searchParams.get('evidenceId');

  if (evidenceId) {
    const session = activeSessions.get(evidenceId);
    if (session) {
      const currentState = session.actor.getSnapshot();
      return new Response(JSON.stringify({
        evidenceId,
        status: 'active',
        currentState: currentState.value,
        progress: getOverallProgress(currentState.context),
        duration: Date.now() - session.startTime,
        context: currentState.context
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        evidenceId,
        status: 'not_found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // List all active sessions
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => {
    const snapshot = session.actor.getSnapshot();
    return {
      evidenceId: id,
      currentState: snapshot.value,
      progress: getOverallProgress(snapshot.context),
      duration: Date.now() - session.startTime
    };
  });

  return new Response(JSON.stringify({
    activeSessions: sessions.length,
    sessions
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// Delete/cancel session
export const DELETE: RequestHandler = async ({ url }) => {
  const evidenceId = url.searchParams.get('evidenceId');

  if (!evidenceId) {
    return new Response(JSON.stringify({ error: 'evidenceId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = activeSessions.get(evidenceId);
  if (session) {
    session.actor.send({ type: 'CANCEL_PROCESSING' });
    session.actor.stop();
    session.controller.close();
    activeSessions.delete(evidenceId);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Session ${evidenceId} cancelled and removed`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({
      error: 'Session not found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
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
    const stepUpdate = context.streamingUpdates.find(update => update.step === step);
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
    update => update.status === 'in_progress'
  );

  const lastUpdate = context.streamingUpdates[context.streamingUpdates.length - 1];

  return {
    step: inProgressUpdate?.step || 'idle',
    progress: inProgressUpdate?.progress || 0,
    message: inProgressUpdate?.message || lastUpdate?.message || 'Ready to start processing',
    status: inProgressUpdate?.status || 'pending'
  };
}