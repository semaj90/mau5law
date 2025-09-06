import type { RequestHandler } from './$types';

// Simple test endpoint to verify relay auth works without any imports

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    console.log('🧪 Test relay endpoint called');
    
    // Manual session creation without any external dependencies
    const sessionId = 'test-session-' + Date.now();
    
    // Create session cookie manually
    cookies.set('auth-session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: false, // dev mode
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return new Response(JSON.stringify({ 
      success: true, 
      sessionId,
      message: 'Test session created without database',
      redirectTo: '/dashboard'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Test relay error:', error);
    return new Response(JSON.stringify({ 
      error: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};