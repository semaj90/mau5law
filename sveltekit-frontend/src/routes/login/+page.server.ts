import { verifyPassword, createUserSession } from '$lib/server/lucia';
import { loginSchema } from '$lib/schemas/auth';
import { db } from '$lib/server/db/connection';
import { users } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/(ai)/dashboard');
  }
  const form = await superValidate(zod(loginSchema));
  return { form };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, zod(loginSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, form.data.email))
        .limit(1);

      if (!user || !user.hashedPassword) {
        console.warn(`[Login] User not found or has no password: ${form.data.email}`);
        return message(form, 'Invalid email or password', { status: 400 });
      }

      // Verify password
      const isValid = await verifyPassword(user.hashedPassword, form.data.password);
      if (!isValid) {
        console.warn(`[Login] Invalid password for user: ${form.data.email}`);
        return message(form, 'Invalid email or password', { status: 400 });
      }

      // Create session using Lucia v3
      const session = await auth.createSession(user.id, {});
      const sessionCookie = auth.createSessionCookie(session.id);

      // Set session cookie
      cookies.set(sessionCookie.name, sessionCookie.value, {
        ...sessionCookie.attributes,
        path: '/',
      });

      // Dev debug: print short session id to server logs for quick verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] session set: ${session.id.substring(0, 12)}... for ${user.email}`);
      }
      console.log(`[Login] User ${user.email} logged in successfully`);
    } catch (error: any) {
      console.error('[Login] Database/Auth error:', error);
      return message(form, 'Login failed. Please try again.', { status: 500 });
    }

    // Redirect after successful authentication (outside try block)
    throw redirect(303, '/(ai)/dashboard');
  },
};
