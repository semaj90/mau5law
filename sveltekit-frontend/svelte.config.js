import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    alias: {
      '$lib': 'src/lib',
      '$lib/*': 'src/lib/*',
      '$components': 'src/lib/components',
      '$components/*': 'src/lib/components/*',
      '$utils': 'src/lib/utils',
      '$utils/*': 'src/lib/utils/*',
      '$stores': 'src/lib/stores',
      '$stores/*': 'src/lib/stores/*',
    },
    serviceWorker: {
      register: false,
    },
    prerender: {
      handleHttpError: 'warn',
    },
  },
};

export default config;
