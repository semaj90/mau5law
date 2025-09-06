import type { RequestHandler } from './$types.js';

/**
 * XState API Endpoint - State Management & Orchestration
 * Routes to: xstate-manager.exe:8212
 */


import { ensureError } from '$lib/utils/ensure-error';
import { productionServiceClient } from "$lib/services/productionServiceClient";
import { URL } from "url";

export interface XStateEvent {
  type: string;
  data?: unknown;
  machineId?: string;
  actorId?: string;
  timestamp?: string;
}

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const eventData: XStateEvent = await request.json();
    
    if (!eventData.type) {
      return error(400, ensureError({ message: 'Event type is required' }));
    }

    // Add timestamp if not provided
    if (!eventData.timestamp) {
      eventData.timestamp = new Date().toISOString();
    }

    const result = await productionServiceClient.execute('xstate.event', {
      event: eventData,
      source: 'sveltekit-frontend'
    });

    return json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'xstate-manager',
        operation: 'event',
        event_type: eventData.type
      }
    });

  } catch (err: any) {
    console.error('XState API Error:', err);
    return error(500, `XState service unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const machineId = url.searchParams.get('machineId');
  const actorId = url.searchParams.get('actorId');

  try {
    if (machineId) {
      // Get machine state
      const result = await productionServiceClient.execute('xstate.machine.status', { 
        machineId 
      });
      return json({ success: true, data: result });
    }

    if (actorId) {
      // Get actor state
      const result = await productionServiceClient.execute('xstate.actor.status', { 
        actorId 
      });
      return json({ success: true, data: result });
    }

    // XState service overview
    const health = await productionServiceClient.checkAllServicesHealth();
    
    return json({
      service: 'xstate',
      status: 'operational',
      endpoints: {
        event: '/api/v1/xstate (POST)',
        machine_status: '/api/v1/xstate?machineId={id}',
        actor_status: '/api/v1/xstate?actorId={id}',
        machines: '/api/v1/xstate/machines',
        actors: '/api/v1/xstate/actors'
      },
      health: {
        'xstate-manager': health['xstate-manager'] || false
      },
      capabilities: [
        'Event Processing',
        'State Machine Management',
        'Actor Coordination',
        'Workflow Orchestration',
        'Real-time State Updates'
      ],
      supported_events: [
        'PROMPT',
        'SEMANTIC_SEARCH',
        'FILE_UPLOAD',
        'ACCEPT_PATCH',
        'RATE_SUGGESTION',
        'CHECK_HEALTH',
        'TRANSITION',
        'COMPLETE',
        'ERROR',
        'RESET'
      ],
      version: '1.0.0'
    });

  } catch (err: any) {
    console.error('XState GET Error:', err);
    return error(503, ensureError({ message: 'XState service health check failed' }));
  }
};