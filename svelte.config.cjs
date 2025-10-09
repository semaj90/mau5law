// CommonJS SvelteKit config (actual adapter/preprocess can be adjusted to your project)
const adapterAuto = require("@sveltejs/adapter-auto");
const sveltePreprocess = require("svelte-preprocess");

module.exports = {
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapterAuto(),
    alias: {
      $lib: "src/lib",
    },
  },
};
