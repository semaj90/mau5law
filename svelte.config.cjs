// Minimal CommonJS config to help Svelte language server resolve project config
const sveltePreprocess = require('svelte-preprocess');
const adapterStatic = require('@sveltejs/adapter-static');

module.exports = {
  compilerOptions: {
    runes: false, // Disable runes mode due to lucide-svelte incompatibility
  },
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapterStatic({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
    alias: {
      $lib: 'src/lib',
    },
  },
};
