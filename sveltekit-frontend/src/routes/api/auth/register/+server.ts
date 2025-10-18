/**
 * Registration endpoint with structured error handling
 * Returns JSON with error codes for front-end messaging
 * Validates email, password strength, and duplicate accounts
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { authService, auth } from '$lib/server/auth';
import { isAuthError, formatErrorResponse } from '$lib/server/errors';

interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Parse and validate request
    const data = (await request.json()) as RegisterRequest;

    if (!data.email || !data.password) {
      return json(
        {
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'INVALID_REQUEST',
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Register new user with structured error handling
    const newUser = await authService.register({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
    });

    // Create session for new user
    const session = await authService.createSession(newUser.id);

    // Set session cookie
    const sessionCookie = auth.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/',
    });

    // Return success with user data
    return json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          avatarUrl: newUser.avatarUrl,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isAuthError(error)) {
      // Structured auth error with proper status code for front-end handling
      const errorResponse = formatErrorResponse(error);
      console.error('[API] Auth error in /api/auth/register:', errorResponse);
      return json(errorResponse, { status: error.status });
    }

    // Unknown error - log and return generic message
    console.error('[API] Unexpected error in /api/auth/register:', error);
    return json(
      {
        success: false,
        error: {
          message: 'Registration failed. Please try again.',
          code: 'UNKNOWN_ERROR',
          status: 500,
        },
      },
      { status: 500 }
    );
  }
};
