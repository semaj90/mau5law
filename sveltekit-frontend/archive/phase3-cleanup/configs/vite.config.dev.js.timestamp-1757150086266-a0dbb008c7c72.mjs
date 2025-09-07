// vite.config.dev.js
import { sveltekit } from "file:///C:/Users/james/Videos/deeds-web-app/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///C:/Users/james/Videos/deeds-web-app/node_modules/vite/dist/node/index.js";
import UnoCSS from "file:///C:/Users/james/Videos/deeds-web-app/node_modules/unocss/dist/vite.mjs";
import { nodePolyfills } from "file:///C:/Users/james/Videos/deeds-web-app/node_modules/vite-plugin-node-polyfills/dist/index.js";
var vite_config_dev_default = defineConfig({
  plugins: [
    UnoCSS(),
    sveltekit({
      kit: {
        adapter: {
          fallback: "index.html"
        }
      }
    }),
    nodePolyfills({
      include: ["process", "buffer", "util", "stream", "events", "crypto", "path"],
      exclude: ["fs", "dns", "os", "os-browserify"],
      globals: {
        Buffer: true,
        global: true,
        process: {
          env: {},
          platform: "browser",
          version: "",
          cwd: () => "/",
          nextTick: (fn) => setTimeout(fn, 0)
        },
        exports: {},
        module: { exports: {} }
      },
      protocolImports: true
    })
  ],
  ssr: {
    noExternal: ["svelte", "@sveltejs/kit"],
    external: ["path-browserify", "crypto-browserify", "os-browserify"]
  },
  server: {
    port: 5174,
    strictPort: false,
    host: "0.0.0.0",
    open: "/demo/gpu-inference"
  },
  preview: {
    port: 4174,
    host: "0.0.0.0",
    open: "/demo/gpu-inference"
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "webgpu-ai": ["$lib/webgpu/webgpu-ai-engine"],
          "cognitive-router": ["$lib/ai/cognitive-smart-router"],
          "gpu-inference": ["$lib/services/cuda-vector-integration"]
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["@webgpu/types"]
  },
  define: {
    "process.env.NODE_ENV": '"development"',
    "process.env.DATABASE_URL": '"postgresql://postgres:123456@localhost:5432/legal_ai_db"',
    global: "globalThis",
    "process.platform": '"browser"',
    "process.version": '""'
  }
});
export {
  vite_config_dev_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuZGV2LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcamFtZXNcXFxcVmlkZW9zXFxcXGRlZWRzLXdlYi1hcHBcXFxcc3ZlbHRla2l0LWZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYW1lc1xcXFxWaWRlb3NcXFxcZGVlZHMtd2ViLWFwcFxcXFxzdmVsdGVraXQtZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuZGV2LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9qYW1lcy9WaWRlb3MvZGVlZHMtd2ViLWFwcC9zdmVsdGVraXQtZnJvbnRlbmQvdml0ZS5jb25maWcuZGV2LmpzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBVbm9DU1MgZnJvbSAndW5vY3NzL3ZpdGUnO1xyXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuXHRwbHVnaW5zOiBbXHJcblx0XHRVbm9DU1MoKSxcclxuXHRcdHN2ZWx0ZWtpdCh7XHJcblx0XHRcdGtpdDoge1xyXG5cdFx0XHRcdGFkYXB0ZXI6IHtcclxuXHRcdFx0XHRcdGZhbGxiYWNrOiAnaW5kZXguaHRtbCdcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pLFxyXG5cdFx0bm9kZVBvbHlmaWxscyh7XHJcblx0XHRcdGluY2x1ZGU6IFsncHJvY2VzcycsICdidWZmZXInLCAndXRpbCcsICdzdHJlYW0nLCAnZXZlbnRzJywgJ2NyeXB0bycsICdwYXRoJ10sXHJcblx0XHRcdGV4Y2x1ZGU6IFsnZnMnLCAnZG5zJywgJ29zJywgJ29zLWJyb3dzZXJpZnknXSxcclxuXHRcdFx0Z2xvYmFsczoge1xyXG5cdFx0XHRcdEJ1ZmZlcjogdHJ1ZSxcclxuXHRcdFx0XHRnbG9iYWw6IHRydWUsXHJcblx0XHRcdFx0cHJvY2Vzczoge1xyXG5cdFx0XHRcdFx0ZW52OiB7fSxcclxuXHRcdFx0XHRcdHBsYXRmb3JtOiAnYnJvd3NlcicsXHJcblx0XHRcdFx0XHR2ZXJzaW9uOiAnJyxcclxuXHRcdFx0XHRcdGN3ZDogKCkgPT4gJy8nLFxyXG5cdFx0XHRcdFx0bmV4dFRpY2s6IChmbikgPT4gc2V0VGltZW91dChmbiwgMClcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGV4cG9ydHM6IHt9LFxyXG5cdFx0XHRcdG1vZHVsZTogeyBleHBvcnRzOiB7fSB9XHJcblx0XHRcdH0sXHJcblx0XHRcdHByb3RvY29sSW1wb3J0czogdHJ1ZVxyXG5cdFx0fSlcclxuXHRdLFxyXG5cdHNzcjoge1xyXG5cdFx0bm9FeHRlcm5hbDogWydzdmVsdGUnLCAnQHN2ZWx0ZWpzL2tpdCddLFxyXG5cdFx0ZXh0ZXJuYWw6IFsncGF0aC1icm93c2VyaWZ5JywgJ2NyeXB0by1icm93c2VyaWZ5JywgJ29zLWJyb3dzZXJpZnknXVxyXG5cdH0sXHJcblx0c2VydmVyOiB7XHJcblx0XHRwb3J0OiA1MTc0LFxyXG5cdFx0c3RyaWN0UG9ydDogZmFsc2UsXHJcblx0XHRob3N0OiAnMC4wLjAuMCcsXHJcblx0XHRvcGVuOiAnL2RlbW8vZ3B1LWluZmVyZW5jZSdcclxuXHR9LFxyXG5cdHByZXZpZXc6IHtcclxuXHRcdHBvcnQ6IDQxNzQsXHJcblx0XHRob3N0OiAnMC4wLjAuMCcsXHJcblx0XHRvcGVuOiAnL2RlbW8vZ3B1LWluZmVyZW5jZSdcclxuXHR9LFxyXG5cdGJ1aWxkOiB7XHJcblx0XHR0YXJnZXQ6ICdlc25leHQnLFxyXG5cdFx0c291cmNlbWFwOiB0cnVlLFxyXG5cdFx0cm9sbHVwT3B0aW9uczoge1xyXG5cdFx0XHRvdXRwdXQ6IHtcclxuXHRcdFx0XHRtYW51YWxDaHVua3M6IHtcclxuXHRcdFx0XHRcdCd3ZWJncHUtYWknOiBbJyRsaWIvd2ViZ3B1L3dlYmdwdS1haS1lbmdpbmUnXSxcclxuXHRcdFx0XHRcdCdjb2duaXRpdmUtcm91dGVyJzogWyckbGliL2FpL2NvZ25pdGl2ZS1zbWFydC1yb3V0ZXInXSxcclxuXHRcdFx0XHRcdCdncHUtaW5mZXJlbmNlJzogWyckbGliL3NlcnZpY2VzL2N1ZGEtdmVjdG9yLWludGVncmF0aW9uJ11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdG9wdGltaXplRGVwczoge1xyXG5cdFx0ZXhjbHVkZTogWydAd2ViZ3B1L3R5cGVzJ11cclxuXHR9LFxyXG5cdGRlZmluZToge1xyXG5cdFx0J3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogJ1wiZGV2ZWxvcG1lbnRcIicsXHJcblx0XHQncHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMJzogJ1wicG9zdGdyZXNxbDovL3Bvc3RncmVzOjEyMzQ1NkBsb2NhbGhvc3Q6NTQzMi9sZWdhbF9haV9kYlwiJyxcclxuXHRcdGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxyXG5cdFx0J3Byb2Nlc3MucGxhdGZvcm0nOiAnXCJicm93c2VyXCInLFxyXG5cdFx0J3Byb2Nlc3MudmVyc2lvbic6ICdcIlwiJ1xyXG5cdH1cclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VyxTQUFTLGlCQUFpQjtBQUNsWSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFlBQVk7QUFDbkIsU0FBUyxxQkFBcUI7QUFFOUIsSUFBTywwQkFBUSxhQUFhO0FBQUEsRUFDM0IsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLElBQ1AsVUFBVTtBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0osU0FBUztBQUFBLFVBQ1IsVUFBVTtBQUFBLFFBQ1g7QUFBQSxNQUNEO0FBQUEsSUFDRCxDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsTUFDYixTQUFTLENBQUMsV0FBVyxVQUFVLFFBQVEsVUFBVSxVQUFVLFVBQVUsTUFBTTtBQUFBLE1BQzNFLFNBQVMsQ0FBQyxNQUFNLE9BQU8sTUFBTSxlQUFlO0FBQUEsTUFDNUMsU0FBUztBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsU0FBUztBQUFBLFVBQ1IsS0FBSyxDQUFDO0FBQUEsVUFDTixVQUFVO0FBQUEsVUFDVixTQUFTO0FBQUEsVUFDVCxLQUFLLE1BQU07QUFBQSxVQUNYLFVBQVUsQ0FBQyxPQUFPLFdBQVcsSUFBSSxDQUFDO0FBQUEsUUFDbkM7QUFBQSxRQUNBLFNBQVMsQ0FBQztBQUFBLFFBQ1YsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0FBQUEsTUFDdkI7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLElBQ2xCLENBQUM7QUFBQSxFQUNGO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSixZQUFZLENBQUMsVUFBVSxlQUFlO0FBQUEsSUFDdEMsVUFBVSxDQUFDLG1CQUFtQixxQkFBcUIsZUFBZTtBQUFBLEVBQ25FO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1A7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNOLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNkLFFBQVE7QUFBQSxRQUNQLGNBQWM7QUFBQSxVQUNiLGFBQWEsQ0FBQyw4QkFBOEI7QUFBQSxVQUM1QyxvQkFBb0IsQ0FBQyxnQ0FBZ0M7QUFBQSxVQUNyRCxpQkFBaUIsQ0FBQyx1Q0FBdUM7QUFBQSxRQUMxRDtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ2IsU0FBUyxDQUFDLGVBQWU7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ1Asd0JBQXdCO0FBQUEsSUFDeEIsNEJBQTRCO0FBQUEsSUFDNUIsUUFBUTtBQUFBLElBQ1Isb0JBQW9CO0FBQUEsSUFDcEIsbUJBQW1CO0FBQUEsRUFDcEI7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
