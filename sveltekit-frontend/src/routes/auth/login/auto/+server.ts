import { simpleAuthService } from '$lib/server/auth-simple';
import { lucia } from '$lib/server/auth';
import type { RequestHandler } from './$types';


/**
 * Auto-login endpoint for demo user
 * POST /auth/login/auto
 * Uses relay authentication service to avoid direct database timeouts
 */
export const POST: RequestHandler = async ({ cookies, getClientAddress, request }) => {
  const clientIP = getClientAddress();
  const userAgent = request.headers.get('user-agent') || '';

  try {
    // Use simple authentication with direct PostgreSQL queries
    console.log('🔄 Using simple authentication for demo user...');
    
    // Login with demo credentials
    const user = await simpleAuthService.authenticateDemoUser();
    
    console.log('✅ Demo user authenticated:', user.email);

    // Create session using Lucia
    const session = await simpleAuthService.createSession(user.id);
    
    // Set session cookie
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/'
    });

    console.log('✅ Demo user auto-login successful:', user.email);

    // Return success response instead of redirect for API endpoint
    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role
      },
      redirectTo: '/dashboard'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Demo auto-login error:', error);
    return new Response(JSON.stringify({ 
      error: 'Auto-login failed. Please try manual login.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};