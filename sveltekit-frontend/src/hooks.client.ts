import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Default client hook: forward the event to the router unchanged.
  return await resolve(event);
};
