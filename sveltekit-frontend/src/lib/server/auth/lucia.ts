import { Lucia } from 'lucia';
import { drizzleAdapter } from '@lucia-auth/adapter-drizzle';
import type { User as LuciaUser } from 'lucia';
import { db } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/client';
import { users, sessions } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres';

export const auth = new Lucia(
  drizzleAdapter(db, {
    user: users,
    session: sessions,
  }),
  {
    getUserAttributes: (user) => ({
      email: user.email,
      role: user.role,
    }),
  }
);
export type Auth = typeof auth;

interface DatabaseUserAttributes {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatarUrl: string;
}

// Augment the 'lucia' module to declare DatabaseUserAttributes
declare module 'lucia' {
  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

export type User = LuciaUser<typeof auth>;
