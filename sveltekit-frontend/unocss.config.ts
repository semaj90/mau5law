import { defineConfig, presetAttributify, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    // presetWebFonts intentionally removed to avoid remote Google font fetch during dev
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  // Legal AI Platform theme colors
  theme: {
    colors: {
      yorha: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#1a1a1a',
        },
        text: {
          primary: '#e0e0e0',
          secondary: '#a0a0a0',
        },
        accent: '#ff6b6b',
        border: '#333333',
      },
    },
  },
});
