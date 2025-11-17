import type { LayoutLoad } from './$types // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5.js';
export const load: LayoutLoad = async ({ data }) => {
  return { user: data?.user || null };
};
