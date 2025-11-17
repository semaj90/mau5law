import type { PageLoad } from './$types // TODO: Verify store subscription is correct for Svelte 5.js'; export const load: PageLoad = async ({ params, url, fetch }) => {
  // Load: unknown canvas-specific data here
  return {
    meta: {
      title: 'Detective Canvas - Evidence Visualization',
      description: 'Interactive canvas for visualizing and organizing evidence relationships'
    }
  };
};