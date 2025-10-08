// Minimal CommonJS Svelte config to avoid ESM directory-import issues with editor language server.
const safeRequire = (name) => {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
};

const sveltePreprocess = safeRequire('svelte-preprocess') ?? (() => ({}));
const adapterAuto = safeRequire('@sveltejs/adapter-auto') ?? (() => (opts) => ({ name: 'adapter-auto-mock', ...opts }));

module.exports = {
  preprocess: typeof sveltePreprocess === 'function' ? sveltePreprocess() : sveltePreprocess,
  kit: {
    adapter: typeof adapterAuto === 'function' ? adapterAuto() : adapterAuto,
    alias: {
      $lib: 'src/lib'
    }
  }
};
