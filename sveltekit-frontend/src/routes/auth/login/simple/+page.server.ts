import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { simpleAuthService } from '$lib/server/auth-simple';
import { createUserSession, setSessionCookie, verifyPassword } from '$lib/server/lucia';
import { db, users, helpers } from '$lib/server/db';
// Melt UI component creation removed - replace with bits-ui declarative components
      // Set session cookie
      setSessionCookie(cookies, sessionId, expiresAt);
      console.log('✅ Session created successfully for:', userRecord.email);
    } catch (error: any) {
      console.error('Login error with PostgreSQL auth:', error);
      // Handle specific error messages
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Invalid email or password') || errorMessage.includes('Account is deactivated')) {
        return fail(400, {
          form: {
            ...form,
            errors: { email: [errorMessage] }
          }
        });
      }
      return fail(500, {
        form: {
          ...form,
          errors: { email: ['An error occurred during login. Please try again.'] }
        }
      });
    }
    // Redirect to dashboard or intended page
    throw redirect(302, '/dashboard');
  }
};