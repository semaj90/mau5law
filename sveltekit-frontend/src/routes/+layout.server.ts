import type { ServerLoad } from '@sveltejs/kit';

/**
 * Simplified +layout.server.ts for HMR debugging
 * Minimal server-side loading to avoid import errors
 */

type LayoutData = {
  startupStatus: {
    initialized: boolean;
    services: Record<string, boolean>;
    errors: { message: string }[];
    startTime: number;
    initTime: number;
    bitsUICompatible: boolean;
  };
  user: unknown;
  session: unknown;
  isAuthenticated: boolean;
}

export const load: ServerLoad = async (event): Promise<LayoutData> => {
  const localsTyped = event.locals as App.Locals;

  // Simple startup status without complex imports
  const startupStatus = {
    initialized: true,
    services: {
      vite: true,
      sveltekit: true,
      basic: true
    },
    errors: [] as { message: string }[],
    startTime: Date.now(),
    initTime: 0,
    bitsUICompatible: true,
  };

  return {
    startupStatus,
    user: localsTyped?.user || null,
    session: localsTyped?.session || null,
    isAuthenticated: !!localsTyped?.user,
  };
}

