import {
  defineConfig,
  presetAttributify,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';
import { presetForms } from '@unocss/preset-forms';
import { presetRadix } from 'unocss-preset-radix';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'Fira Code:400,500,600,700',
      },
    }),
    presetForms(),
    presetRadix({
      palette: ['mauve', 'blue', 'green', 'red', 'yellow'],
      aliases: {
        primary: 'blue',
        accent: 'green',
        danger: 'red',
        warning: 'yellow',
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // Custom animations for glow effects
        'glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.7))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 1))' },
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(100%)', opacity: '1' },
        },
        // Animations for bits-ui components (fade, zoom, slide)
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'zoom-in': {
          from: { transform: 'scale(0.95)' },
          to: { transform: 'scale(1)' },
        },
        'zoom-out': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(0.95)' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-8px)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(8px)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-8px)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(8px)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-top': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-8px)' },
        },
        'slide-out-to-bottom': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(8px)' },
        },
        'slide-out-to-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-8px)' },
        },
        'slide-out-to-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(8px)' },
        },
        // Specific dialog animations
        'slide-out-to-left-1/2': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(-100%)' },
        },
        'slide-out-to-top-[48%]': {
          from: { transform: 'translateY(-50%)' },
          to: { transform: 'translateY(-48%)' },
        },
        'slide-in-from-left-1/2': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(-50%)' },
        },
        'slide-in-from-top-[48%]': {
          from: { transform: 'translateY(-48%)' },
          to: { transform: 'translateY(-50%)' },
        },
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'matrix-rain': 'matrix-rain 1s linear infinite',
        // bits-ui animations
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'zoom-in': 'zoom-in 150ms ease-out',
        'zoom-out': 'zoom-out 150ms ease-in',
        'slide-in-from-top-2': 'slide-in-from-top 150ms ease-out',
        'slide-in-from-bottom-2': 'slide-in-from-bottom 150ms ease-out',
        'slide-in-from-left-2': 'slide-in-from-left 150ms ease-out',
        'slide-in-from-right-2': 'slide-in-from-right 150ms ease-out',
        'slide-out-to-top-2': 'slide-out-to-top 150ms ease-in',
        'slide-out-to-bottom-2': 'slide-out-to-bottom 150ms ease-in',
        'slide-out-to-left-2': 'slide-out-to-left 150ms ease-in',
        'slide-out-to-right-2': 'slide-out-to-right 150ms ease-in',
        // Dialog specific
        'slide-out-to-left-1/2': 'slide-out-to-left-1/2 150ms ease-in',
        'slide-out-to-top-[48%]': 'slide-out-to-top-[48%] 150ms ease-in',
        'slide-in-from-left-1/2': 'slide-in-from-left-1/2 150ms ease-out',
        'slide-in-from-top-[48%]': 'slide-in-from-top-[48%] 150ms ease-out',
      },
    },
  },
  rules: [
    // Custom rules for shadow-glow
    ['shadow-glow', { 'box-shadow': '0 0 10px rgba(59, 130, 246, 0.5)' }],
  ],
  shortcuts: {
    // Custom effects
    'effect-glow': 'animate-glow',
    'effect-matrix': 'animate-matrix-rain',
    'cuda-active': 'animate-glow',
    'wasm-active': 'animate-glow',
    'intel-gpu-active': 'animate-glow',
    'input-gaming': 'focus:shadow-glow',

    // bits-ui component shortcuts
    'bits-tooltip-content': 'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 animate-in',
    'bits-dialog-overlay': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:animate-in data-[state=closed]:animate-out',
    'bits-select-content': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=closed]:animate-out',
    'bits-dropdown-content': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=closed]:animate-out',
    'bits-context-content': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=closed]:animate-out',
    'bits-dialog-content': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=open]:animate-in data-[state=closed]:animate-out',
    'nier-bits-dialog': 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=open]:animate-in data-[state=closed]:animate-out',
  },
});
