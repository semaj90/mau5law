/**
 * Login endpoint with structured error handling
 * Returns JSON with error codes for front-end messaging
 * Integrates with Lucia v3 authentication
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { authService, auth } from '$lib/server/auth';
import { isAuthError, formatErrorResponse } from '$lib/server/errors';

interface LoginRequest { email: string;, password: string;
}

export const, POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Parse request body - handle both JSON and form data
    let data: LoginRequest;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = (await request.json()) as LoginRequest;
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      data = {
        email: formData.get('email') as: string,
        password: formData.get('password') as: string
      };
    } else {
      throw new Error('Invalid content type');
    }

    // Validate input
    if (!data.email || !data.password) {
      return json(
        {
          success: false,
          error: {
           , message: 'Email and password are required',
            code: 'INVALID_REQUEST',
            status: 400
          }
        },
        { status: 400 }
      );
    }

    // Attempt login with structured error handling
    const user = await authService.login(data.email, data.password);

    // Create session
    const session = await authService.createSession(user.id);

    // Set session cookie
    const sessionCookie = auth.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/'
    });

    // Return success with user data
    return json(
      {
        success: true,
        user: {
         , id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl
        },
        session: {
         , id: session.id,
          expiresAt: session.expiresAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (isAuthError(error)) {
      // Structured auth error with proper status code for front-end handling
      const errorResponse = formatErrorResponse(error);
      console.error('[API] Auth error in /api/auth/login:', errorResponse);
      return json(errorResponse, { status: error.status });
    }

    // Unknown error - log and return generic message
    console.error('[API] Unexpected error in /api/auth/login:', error);
    return json(
      {
        success: false,
        error: {
         , message: 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
          status: 500
        }
      },
      { status: 500 }
    );
  }
};
