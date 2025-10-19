// Minimal CommonJS config to help Svelte language server resolve project config
module.exports = {
  // Keep this minimal so the language server can require it safely.
  // Add your real preprocess / kit adapter when running the app.
};
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapterAuto(),
    alias: {
      $lib: "src/lib",
    },
  },
};
