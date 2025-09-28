import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

// NOTE:
// 1. Upgraded to Vite ^6.3.5 to satisfy @sveltejs/vite-plugin-svelte ^6 peer dependency.
// 2. Removed explicit '0.0.0.0' host binding to avoid Windows firewall prompts and DNS rebinding protection issues.
// 3. Using default localhost binding (host: false) which is safer; can be overridden via CLI if needed.
// 4. Added inline guidance for enabling external access with explicit allowedHosts if required later.

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      UnoCSS(),
      sveltekit({
        compilerOptions: {
          hmr: true,
          emitCss: true,
        },
      }),
    ],
    server: {
      port: 5173,
      // host: false => only listen on localhost (Vite default). Use host: '0.0.0.0' if LAN/devcontainer required.
      host: false,
      hmr: {
        // Rely on implicit host. Use HMR port from environment when available to avoid hardcoded conflicts.
        port: Number(process.env.HMR_PORT) || 24678,
      },
      // If in the future external access is needed under Vite 6 DNS rebinding protection:
      // allowedHosts: ['your-hostname.local', 'another-host'],
    },
    optimizeDeps: {
      // Prevent occasional stale pre-bundling when switching modes
      force: mode === 'development' && process.env.VITE_FORCE_OPTIMIZE === 'true',
    },
  };
});
