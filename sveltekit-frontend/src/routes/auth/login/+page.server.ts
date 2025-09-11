import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    // Basic validation
    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    try {
      console.log('🔄 Demo login attempt for:', email);

      // Demo authentication - allow specific credentials
      if (email.toLowerCase() === 'admin@legal-ai.local' && password === 'admin123') {
        // Set a simple session cookie for demo purposes
        cookies.set('demo_session', 'authenticated', {
          path: '/',
          httpOnly: true,
          secure: false, // Set to true in production with HTTPS
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        console.log('✅ Demo login successful for:', email);
        
        // Redirect to home page instead of missing dashboard
        throw redirect(302, '/');
      } else {
        return fail(400, { error: 'Invalid credentials. Use admin@legal-ai.local / admin123' });
      }

    } catch (error: any) {
      // Handle redirect properly - don't treat it as an error
      if (error.status === 302) {
        throw error;
      }
      console.error('Login error:', error.message);
      return fail(400, { error: error.message || 'Login failed' });
    }
  }
};