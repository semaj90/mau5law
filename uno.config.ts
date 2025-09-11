import { defineConfig, presetUno, presetIcons, presetTypography } from 'unocss';

export default defineConfig({
  presets: [ presetUno(), presetIcons(), presetTypography() ],
  theme: {
    colors: {
      brand: {
        primary: '#1E3A8A',
        accent: '#F59E0B',
        subtle: '#475569'
      }
    }
  },
  shortcuts: {
    'btn': 'px-3 py-1 rounded-md bg-brand-primary text-white hover:bg-brand-primary/85 transition',
    'card': 'rounded-lg border border-gray-200 shadow-sm p-4 bg-white dark:bg-gray-800'
  }
});
