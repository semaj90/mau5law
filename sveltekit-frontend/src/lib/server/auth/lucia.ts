import type { Lucia  } from 'lucia';
import type { drizzleAdapter  } from '@lucia-auth/adapter-drizzle';
import type { User as LuciaUser } from 'lucia';
import type { db  } from '$lib/server/db/client';
import type { users, sessions  } from '$lib/server/db/schema-postgres';

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
