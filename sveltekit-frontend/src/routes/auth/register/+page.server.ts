import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { EnhancedAuthService } from '$lib/services/enhanced-auth-service.js';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  register: async ({ request, cookies, getClientAddress }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const firstName = data.get('firstName') as string;
    const lastName = data.get('lastName') as string;
    const password = data.get('password') as string;
    const confirmPassword = data.get('confirmPassword') as string;
    const role = data.get('role') as string;
    const department = data.get('department') as string;
    const jurisdiction = data.get('jurisdiction') as string;
    const badgeNumber = data.get('badgeNumber') as string;

    // Basic validation
    if (!email || !firstName || !lastName || !password || !department || !jurisdiction) {
      return fail(400, { error: 'All required fields must be filled' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters' });
    }

    try {
      // Use the enhanced auth service
      const authService = new EnhancedAuthService();
      const result = await authService.register({
        email: email.toLowerCase(),
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: role || 'user'
      }, { request, cookies, getClientAddress } as any);

      if (!result.success) {
        return fail(400, { error: result.error });
      }

      // Create a session using enhanced auth service
      const clientIP = getClientAddress();
      const userAgent = request.headers.get('user-agent') || '';
      const loginResult = await authService.login({
        email: email.toLowerCase(),
        password: password,
        ipAddress: clientIP,
        userAgent: userAgent
      });

      if (loginResult.success && loginResult.session) {
        // Set session cookie
        cookies.set('session_id', loginResult.session.id, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 // 1 day
        });

        console.log('User registered and logged in successfully:', {
          userId: result.user?.id,
          email: email
        });
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      return fail(500, { error: 'An error occurred during registration. Please try again.' });
    }

    // Redirect to dashboard
    throw redirect(302, '/yorha/dashboard');
  }
};