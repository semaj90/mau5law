import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
// import { enhancedImages } from '@sveltejs/enhanced-img'; // Temporarily disabled due to config issue

export default defineConfig({
  plugins: [
    UnoCSS(),
    // enhancedImages(), // Temporarily disabled due to config issue
    sveltekit({
      compilerOptions: {
        hmr: true,
        emitCss: true,
      },
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    hmr: {
      port: 24678,
      host: 'localhost',
    },
  },
});
