// src/hooks.server.ts - SvelteKit hooks for Lucia v3 authentication
import { lucia } from '$lib/server/auth';
import { createWebSocketServer } from '$lib/server/webSocketServer';
import type { Handle } from '@sveltejs/kit';

interface DatabaseUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  name: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __qloraWebSocketServer: unknown;
}

// Initialize Redis service on server startup
// Note: Redis service auto-initializes on import
console.log('🚀 [hooks.server.ts] Redis service imported successfully');

// Initialize WebSocket server for binary QLoRA streaming
console.log('🔌 [hooks.server.ts] Initializing Binary QLoRA WebSocket server...');
try {
  const wss = createWebSocketServer();
  console.log('✅ [hooks.server.ts] Binary QLoRA WebSocket server ready');

  // Store WebSocket server reference for potential use in routes
  globalThis.__qloraWebSocketServer = wss;
} catch (error) {
  console.error('❌ [hooks.server.ts] WebSocket server initialization failed:', error);
}

console.log('📋 [hooks.server.ts] Starting request handling...');

export const handle: Handle = async ({ event, resolve }) => {
  // Extract session ID from cookies
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  // Validate the session
  const { session, user } = await lucia.validateSession(sessionId);

  // If session is fresh, set new session cookie
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes,
    });
  }

  // If session is invalid, clear the session cookie
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes,
    });
  }

  // Attach user and session to locals for use in load functions and routes
  event.locals.user = user
    ? {
        id: user.id,
        email: user.email,
        role:
          ((user as DatabaseUser).role as
            | 'admin'
            | 'lead_prosecutor'
            | 'prosecutor'
            | 'paralegal'
            | 'investigator'
            | 'analyst'
            | 'viewer'
            | 'user') || 'user',
      }
    : null;
  event.locals.session = session;

  return resolve(event);
};