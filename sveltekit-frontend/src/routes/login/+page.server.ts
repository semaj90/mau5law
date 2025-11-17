import { loginSchema } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/schemas/auth';
import { db } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/db/client';
import { users } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import { createUserSession, setSessionCookie, verifyPassword } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/lucia';
import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5';

// Replace load to accept the full event and pass it to superValidate
export const load: PageServerLoad = async (event) => {
  // use event.locals / event.url instead of destructuring only parts
  const localsTyped = event.locals as App.Locals;

  // If user is already logged in, redirect to dashboard
  if (localsTyped.user) {
    throw redirect(303, '/dashboard');
  }

  // Registration success banner
  const registered = event.url.searchParams.get('registered');
  const registrationSuccess =
    registered === 'true' ? 'Account created successfully! You can now sign in.' : undefined;

  // Initialize SuperForms form for initial page render.
  // Use schema-only overload for initial render
  const form = await superValidate(loginSchema);

  return { registrationSuccess, form };
};

// Actions: include the full event and use it with superValidate
export const actions: Actions = {
  default: async (event) => {
    const { cookies } = event; // request wasn't used, so only keep cookies to avoid unused variable warnings'

    // Cast the Zod schema to ValidationAdapter so TS matches the (data, adapter) overload.
    const form = await superValidate(
      await event.request.formData(),
      loginSchema // Removed 'as unknown as ValidationAdapter<Record<string, unknown>, Record<string, unknown>>'
    );
    if (!form.valid) {
      return fail(400, { form });
    }
    const { email, password } = form.data;
    try {
      // Find user by email (guard shape because db helper wiring can vary)
      let existingUser: unknown[] = [];
      try {
        // use eq directly
        existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email as string)) // Use eq directly
          .limit(1);
      } catch (e: unknown) {
        console.error('[Login] DB select failed: ', e);
        return message(form, 'Login failed (db error). Please try again.', { status: 500 });
      }
      if (!Array.isArray(existingUser) || existingUser.length === 0) {
        return message(form, 'Incorrect email or password', { status: 400 });
      }
      // Narrow the user shape for local usage
      const user = existingUser[0] as {
        id: string;
        email: string;
        hashed_password?: string | null;
        is_active?: boolean;
      };
      if (!user || !user.hashed_password) {
        return message(form, 'Incorrect email or password', { status: 400 });
      }
      // Check if user is active
      if (!user.is_active) {
        return message(form, 'Account is deactivated', { status: 403 });
      }

      // Verify password using custom lucia
      const validPassword = await verifyPassword(user.hashed_password, password as string);
      if (!validPassword) {
        console.log(`[Login] Password verification failed for ${user.email}`);
        return message(form, 'Incorrect email or password', { status: 400 });
      }

      // Create session using custom lucia
      const { sessionId, expiresAt } = await createUserSession(user.id);
      setSessionCookie(cookies, sessionId, expiresAt);

      // Dev debug: print short session id to server logs for quick verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] session set: ${sessionId.substring(0, 12)}... for ${user.email}`);
      }
      console.log(`[Login] User ${user.email} logged in successfully`);
      throw redirect(303, '/dashboard');
    } catch (err: unknown) {
      console.error('[Login] Error: ', err);
      if (err instanceof Response) throw err;
      return message(form, 'Login failed. Please try again.', { status: 500 });
    }
  },
};
