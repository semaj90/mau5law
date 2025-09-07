import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url, fetch }) => {
  // Load any canvas-specific data here
  return {
    meta: {
      title: 'Detective Canvas - Evidence Visualization',
      description: 'Interactive canvas for visualizing and organizing evidence relationships'
    }
  };
};