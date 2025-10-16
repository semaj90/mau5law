import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess({
    typescript: true,
    postcss: true, // Needed for UnoCSS / custom PostCSS pipelines
  }),

  kit: {
    adapter: adapter(),
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
