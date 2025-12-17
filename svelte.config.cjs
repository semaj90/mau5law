// Minimal CommonJS config to help Svelte language server resolve project config
const sveltePreprocess = require('svelte-preprocess');
const adapterNode = require('@sveltejs/adapter-node');

module.exports = {
  compilerOptions: {
    runes: true, // Enable runes mode for Svelte 5
  },
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapterNode({
      out: 'build',
      precompress: false,
      envPrefix: 'VITE_', // Only expose VITE_ prefixed env vars
    }),
    alias: {
      $lib: 'src/lib',
    },
    // Disable SSR for build to avoid esbuild SSR bundling issues
    ssr: {
      noExternal: ['@sveltejs/kit'],
    },
  },
};
