import type { RequestHandler } from './$types';

/*
 * Session Validation API Endpoint
 * GET /api/auth/session - Check current session status
 */

import { ExistingUserAuthService as UserAuthService } from '$lib/server/db/existing-user-operations.js';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const sessionId = cookies.get('session_id');
    
    if (!sessionId) {
      return json({
        success: false,
        message: 'No session found',
        data: {
          authenticated: false,
          user: null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(dev && { 'Access-Control-Allow-Origin': '*' }),
        }
      });
    }

    // Validate session
    const result = await UserAuthService.validateSession(sessionId);
    
    if (!result.success || !result.user) {
      // Clear invalid session cookie
      cookies.delete('session_id', {
        path: '/',
        httpOnly: true,
        secure: !dev,
        sameSite: 'strict',
      });

      return json({
        success: false,
        message: 'Invalid or expired session',
        data: {
          authenticated: false,
          user: null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(dev && { 'Access-Control-Allow-Origin': '*' }),
        }
      });
    }

    // Remove sensitive information from user object
    const { passwordHash, ...safeUser } = result.user;
    
    return json({
      success: true,
      message: 'Session valid',
      data: {
        authenticated: true,
        user: safeUser,
        session: {
          id: sessionId,
          expiresAt: result.session?.expiresAt,
          isActive: result.session?.isActive,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(dev && { 'Access-Control-Allow-Origin': '*' }),
      }
    });

  } catch (err: any) {
    console.error('Session validation API error:', err);

    // Clear potentially corrupted session cookie
    cookies.delete('session_id', {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'strict',
    });

    return json({
      success: false,
      message: 'Session validation failed',
      data: {
        authenticated: false,
        user: null,
      },
      code: 'SESSION_VALIDATION_ERROR',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      }
    }, { 
      status: 200, // Return 200 but with authenticated: false
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// OPTIONS handler for CORS preflight requests
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': dev ? '*' : 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
};