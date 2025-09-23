import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    typescript: true,
    script: true,
  }),

  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
      $components: 'src/lib/components',
      $stores: 'src/lib/stores',
      $utils: 'src/lib/utils',
      $types: 'src/lib/types',
      __SERVER__: path.resolve(fileURLToPath(new URL('./.svelte-kit/generated/server', import.meta.url))),
      __PUBLIC__: path.resolve(fileURLToPath(new URL('./.svelte-kit/generated/client', import.meta.url))),
    },
  },
};

export default config;
