// PHASE 72 TESTING STUB - Auth completely disabled
// DEV_BYPASS_AUTH=true in .env means no actual auth is needed

export const auth = {
  sessionCookieName: 'yorha_session',
  validateSession: async () => ({ session: null, user: null }),
  createSessionCookie: () => ({ name: 'yorha_session', value: '', attributes: {} }),
  createBlankSessionCookie: () => ({ name: 'yorha_session', value: '', attributes: {} })
};

export type Auth = typeof auth;
export type User = any;

  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

export type User = LuciaUser<typeof auth>;
