import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/**
 * Minimal SvelteKit configuration (ESM) — ensures tooling like svelte-check
 * can load the config. Adjust adapters and preprocessors as needed.
 */
const config = {
  preprocess: preprocess(),
  kit: {
    adapter: adapter(),
    // preserve original vite config if present
    vite: {
      // placeholder — project-level vite config will override this
    },
  },
};

export default config;
