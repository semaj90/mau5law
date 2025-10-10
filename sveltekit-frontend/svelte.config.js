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
      // Removed drizzle-orm/node-postgres alias - using native adapter
    },
    serviceWorker: {
      register: false,
    },
    prerender: {
      handleHttpError: 'warn',
      entries: [
        '*',
        '/demo/webgpu',
        '/demo/cuda-streaming',
        '/demo/ai-assistant',
        '/demo/evidence-canvas',
        '/demo/legal-research',
        '/demo/vector-search',
        '/demo/gaming-ui',
        '/demo/performance',
        '/demo/neural-topology',
        '/demo/simd-ai',
        '/demo/realtime-comm',
        '/demo/autonomous-eng',
        '/demo/showcase',
      ],
    },
  },
};

export default config;
