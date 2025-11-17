import type { PageServerLoad } from './$types // TODO: Verify store subscription is correct for Svelte 5';
export const load: PageServerLoad = async () => {
  return {
    title: 'Evidence Analysis Workspace',
    description: 'Comprehensive AI-powered legal evidence processing',
  };
};
