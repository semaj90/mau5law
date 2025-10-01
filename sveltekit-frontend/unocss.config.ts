import {
  defineConfig,
  presetAttributify,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Roboto',
        serif: 'Merriweather',
        mono: ['JetBrains Mono', 'monospace'], // Use Google Font for mono
      },
    }),
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

// Additional presets can be added as needed, such as presetTypography, presetWind, etc.