import adapter from '@sveltejs/adapter-node';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Use svelte-preprocess for a stable, compatible preprocess across environments
  preprocess: sveltePreprocess(),

  kit: {
    // Use explicit Node adapter to match the main project config
    adapter: adapter({ out: 'build' }),

    alias: {
      $lib: 'src/lib',
      $components: 'src/lib/components',
      $types: 'src/lib/types',
    },

    files: {
      assets: 'static',
      hooks: {
        client: 'src/hooks.client.ts',
        server: 'src/hooks.server.ts',
      },
      lib: 'src/lib',
      params: 'src/params',
      routes: 'src/routes',
      serviceWorker: 'src/service-worker.ts',
      appTemplate: 'src/app.html',
      errorTemplate: 'src/error.html',
    },
  },

  vitePlugin: {
    inspector: {
      holdMode: true,
    },
  },
};

export default config;
