import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { lucia, authService } from '$lib/server/auth';

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
      console.log('🔄 Attempting login with Lucia v3...');

      // Use the new Lucia v3 auth service
      const user = await authService.login(email.toLowerCase(), password);
      
      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      // Set session cookie
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: "/",
        ...sessionCookie.attributes
      });

      console.log('✅ Login successful for:', user.email);

    } catch (error: any) {
      console.error('Login error:', error.message);
      return fail(400, { error: error.message || 'Invalid email or password' });
    }

    // Redirect to dashboard
    throw redirect(302, '/yorha/dashboard');
  }
};